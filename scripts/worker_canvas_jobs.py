import os
import time
import json
from dotenv import load_dotenv

ENV_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '.env'))
load_dotenv(dotenv_path=ENV_PATH)

import zlib
import pymysql
import redis
import threading
import traceback
import logging
import math
import uuid
import shutil
import mysql.connector
from zlib import decompress
from PIL import Image
from datetime import datetime
import boto3
import io

S3_ENDPOINT = os.getenv("AWS_ENDPOINT")
if S3_ENDPOINT and not S3_ENDPOINT.startswith("http"):
    S3_ENDPOINT = "http://" + S3_ENDPOINT + ":9000"
S3_ACCESS_KEY = os.getenv("AWS_ACCESS_KEY_ID")
S3_SECRET_KEY = os.getenv("AWS_SECRET_ACCESS_KEY")
S3_BUCKET = os.getenv("AWS_BUCKET")

def get_s3_client():
    return boto3.client(
        's3',
        endpoint_url=S3_ENDPOINT,
        aws_access_key_id=S3_ACCESS_KEY,
        aws_secret_access_key=S3_SECRET_KEY,
        region_name='us-east-1'
    )

logging.basicConfig(level=logging.INFO, format='%(asctime)s [%(threadName)s] %(levelname)s: %(message)s')

IS_DOCKER = os.path.exists('/.dockerenv') or os.getenv('DOCKER_CONTAINER') == 'true'

DB_HOST = os.getenv("DB_HOST", "db" if IS_DOCKER else "127.0.0.1")
if not IS_DOCKER and DB_HOST == "db":
    DB_HOST = "127.0.0.1"
DB_PORT = int(os.getenv("DB_PORT")) if os.getenv("DB_PORT") else 3306
DB_USER = os.getenv("DB_USER")
DB_PASS = os.getenv("DB_PASS")
DB_NAME = os.getenv("DB_CANVASES_NAME")
DB_IDENTITY_NAME = os.getenv("DB_IDENTITY_NAME")

REDIS_HOST = os.getenv("REDIS_HOST", "redis" if IS_DOCKER else "127.0.0.1")
if not IS_DOCKER and REDIS_HOST == "redis":
    REDIS_HOST = "127.0.0.1"
REDIS_PORT = int(os.getenv("REDIS_PORT")) if os.getenv("REDIS_PORT") else 6379
REDIS_PASS = os.getenv("REDIS_PASS")

SNAPSHOTS_DIR = os.getenv("SNAPSHOTS_DIR") or "/var/www/html/storage/private/snapshots"
SYNC_INTERVAL = int(os.getenv("WORKER_CANVAS_SYNC_INTERVAL") or os.getenv("WORKER_RESETS_SYNC_INTERVAL") or 10)
THUMBNAILS_DIR = os.getenv("THUMBNAILS_DIR") or "/var/www/html/storage/public/thumbnails"
ARCHIVE_DIR = os.getenv("SNAPSHOTS_ARCHIVE_DIR") or "/var/www/html/storage/private/backups"

SCALE_FACTOR = int(os.getenv("SNAPSHOT_SCALE_FACTOR") or 2)

def get_redis_client():
    candidate_hosts = [REDIS_HOST, "127.0.0.1", "localhost"] if REDIS_HOST else ["127.0.0.1", "localhost"]
    seen = set()
    hosts = [h for h in candidate_hosts if h and not (h in seen or seen.add(h))]
    for host in hosts:
        try:
            r = redis.Redis(
                host=host, port=REDIS_PORT or 6379, password=REDIS_PASS,
                socket_keepalive=True, retry_on_timeout=True,
                health_check_interval=60, socket_timeout=60
            )
            r.ping()
            return r
        except Exception:
            pass
    return redis.Redis(
        host=REDIS_HOST, port=REDIS_PORT or 6379, password=REDIS_PASS,
        socket_keepalive=True, retry_on_timeout=True,
        health_check_interval=60, socket_timeout=60
    )

def get_db_connection():
    candidate_hosts = [DB_HOST, "127.0.0.1", "localhost"] if DB_HOST else ["127.0.0.1", "localhost"]
    seen = set()
    hosts = [h for h in candidate_hosts if h and not (h in seen or seen.add(h))]
    for host in hosts:
        try:
            return pymysql.connect(
                host=host, port=DB_PORT or 3306, user=DB_USER, password=DB_PASS, database=DB_NAME,
                cursorclass=pymysql.cursors.DictCursor
            )
        except Exception:
            pass
    return pymysql.connect(
        host=DB_HOST, port=DB_PORT or 3306, user=DB_USER, password=DB_PASS, database=DB_NAME,
        cursorclass=pymysql.cursors.DictCursor
    )

def parse_size(size_val):
    size_str = str(size_val).lower().strip()
    if 'x' in size_str:
        parts = size_str.split('x')
        w = int(parts[0])
        h = int(parts[1]) if len(parts) > 1 else w
        return w, h
    else:
        v = int(size_str)
        return v, v

def process_resize_task(r, db, task_data):
    try:
        canvas_id = int(task_data.get('canvas_id'))
        old_size_meta_raw = task_data.get('old_size', '64x64')
        new_size_raw = task_data.get('new_size', '64x64')
        
        old_w, old_h = parse_size(old_size_meta_raw)
        new_w, new_h = parse_size(new_size_raw)

        logging.info(f"Resizing canvas {canvas_id} from {old_w}x{old_h} to {new_w}x{new_h}")

        state_key = f"canvas:{canvas_id}:state"
        old_state = r.get(state_key)

        if not old_state:
            raise ValueError(f"Binary state not found for canvas {canvas_id}.")

        actual_len = len(old_state)
        expected_size = old_w * old_h * 4

        if actual_len != expected_size:
            logging.warning(f"DesincronizaciÃ³n detectada. Metadata esperaba {expected_size} bytes, Redis tiene {actual_len} bytes.")
            real_old_size = int(math.sqrt(actual_len // 4))
            logging.warning(f"Auto-correcting base size to {real_old_size}x{real_old_size} for correct processing.")
            old_w, old_h = real_old_size, real_old_size

        new_state = bytearray([0, 0, 0, 0] * (new_w * new_h))
        limit_x = min(old_w, new_w)
        limit_y = min(old_h, new_h)
        
        for y in range(limit_y):
            for x in range(limit_x):
                old_idx = ((y * old_w) + x) * 4
                new_idx = ((y * new_w) + x) * 4
                if old_idx + 3 < len(old_state) and new_idx + 3 < len(new_state):
                    new_state[new_idx] = old_state[old_idx]
                    new_state[new_idx+1] = old_state[old_idx+1]
                    new_state[new_idx+2] = old_state[old_idx+2]
                    new_state[new_idx+3] = old_state[old_idx+3]

        new_state_bytes = bytes(new_state)
        r.set(state_key, new_state_bytes)

        new_size_db_str = f"{new_w}x{new_h}"

        with db.cursor() as cursor:
            cursor.execute("UPDATE canvases SET size = %s WHERE id = %s", (new_size_db_str, canvas_id))
            compressed_state = zlib.compress(new_state_bytes)
            cursor.execute("""
                INSERT INTO canvas_snapshots (canvas_id, snapshot_data) 
                VALUES (%s, %s) ON DUPLICATE KEY UPDATE snapshot_data = %s, last_updated = CURRENT_TIMESTAMP
            """, (canvas_id, compressed_state, compressed_state))
            db.commit()

        stream_key = f"canvas:{canvas_id}:stream"
        r.xadd(stream_key, {
            "type": "canvas_resize",
            "old_size": f"{old_w}x{old_h}",
            "new_size": f"{new_w}x{new_h}",
            "w": str(new_w),
            "h": str(new_h)
        })

        r.delete(f"canvas:{canvas_id}:resize_lock")
        r.publish("admin:canvas_events", json.dumps({
            "type": "canvas_resize_completed", "canvas_id": canvas_id, "new_size": new_size_db_str
        }))
        logging.info(f"Canvas resize for {canvas_id} completed successfully.")

    except Exception as e:
        logging.error(f"Error crÃ­tico en Resize: {str(e)}")
        if 'canvas_id' in locals():
            r.delete(f"canvas:{canvas_id}:resize_lock")
            r.publish("admin:canvas_events", json.dumps({
                "type": "canvas_resize_error", "canvas_id": canvas_id, "error": str(e)
            }))

def resize_listener_thread():
    logging.info("Iniciando Hilo Listener de Resizes...")
    r = None
    db = None
    
    while True:
        try:
            if r is None: r = get_redis_client()
            if db is None: db = get_db_connection()
            
            result = r.blpop("canvases:pending_resizes", timeout=30)
            
            if result:
                _, task_json = result
                task_data = json.loads(task_json.decode('utf-8') if isinstance(task_json, bytes) else task_json)
                try:
                    db.ping(reconnect=False)
                except Exception:
                    db = get_db_connection()
                process_resize_task(r, db, task_data)
                
        except Exception as e:
            logging.error(f"Fallo en bucle de Resize Listener: {e}")
            db = None
            r = None
            time.sleep(5)

def process_reset_task(r, db, task_data):
    canvas_id = task_data['canvas_id']
    take_snapshot = task_data.get('take_snapshot', 1)
    canvas_size = task_data.get('canvas_size', '64x64')
    
    logging.info(f"Starting reset for canvas ID {canvas_id}.")

    try:
        state_key = f"canvas:{canvas_id}:state"
        current_state = r.get(state_key)
        
        if take_snapshot and current_state:
            compressed_state = zlib.compress(current_state)
            r.set(f"canvas:{canvas_id}:temp_snapshot", compressed_state)
            r.sadd("canvases:pending_snapshots", canvas_id)

        try:
            db.ping(reconnect=False)
        except Exception:
            db = get_db_connection()

        size_w, size_h = parse_size(canvas_size)
        empty_state = b'\x00\x00\x00\x00' * (size_w * size_h)
        compressed_empty = zlib.compress(empty_state)
        
        with db.cursor() as cursor:
            cursor.execute("""
                INSERT INTO canvas_snapshots (canvas_id, snapshot_data, last_updated)
                VALUES (%s, %s, CURRENT_TIMESTAMP) ON DUPLICATE KEY UPDATE snapshot_data = %s, last_updated = CURRENT_TIMESTAMP
            """, (canvas_id, compressed_empty, compressed_empty))
            db.commit()
            
        r.set(state_key, empty_state) 
        
        snapshot_path = os.path.join(SNAPSHOTS_DIR, f"canvas_{canvas_id}.png")
        if os.path.exists(snapshot_path):
            try:
                os.remove(snapshot_path)
                logging.info(f"Public image deleted for canvas {canvas_id}.")
            except Exception as e:
                logging.error(f"Could not delete public image {canvas_id}: {e}")
        
        stream_key = f"canvas:{canvas_id}:stream"
        r.xadd(stream_key, {
            "type": "canvas_reset",
            "canvas_id": str(canvas_id),
            "size": str(canvas_size)
        })

        r.delete(f"canvas:{canvas_id}:reset_lock")
        r.publish("admin:canvas_events", json.dumps({"type": "canvas_cleared", "canvas_id": canvas_id, "next_reset_at": None}))
        logging.info(f"Canvas reset for {canvas_id} completed successfully.")

    except Exception as e:
        logging.error(f"Fatal error during reset of canvas {canvas_id}: {e}")
        r.delete(f"canvas:{canvas_id}:reset_lock")

def reset_listener_thread():
    logging.info("Iniciando Hilo Listener de Resets...")
    r = None
    db = None
    
    while True:
        try:
            if r is None: r = get_redis_client()
            if db is None: db = get_db_connection()
            
            result = r.blpop("canvases:pending_resets", timeout=30)
            
            if result:
                _, task_json = result
                task_data = json.loads(task_json.decode('utf-8') if isinstance(task_json, bytes) else task_json)
                try:
                    db.ping(reconnect=False)
                except Exception:
                    db = get_db_connection()
                process_reset_task(r, db, task_data)
                
        except Exception as e:
            logging.error(f"Fallo en bucle de Reset Listener: {e}")
            db = None
            r = None
            time.sleep(5)

def scheduler_thread():
    logging.info("Iniciando Hilo Scheduler Maestro (Cron)...")
    r = None
    db = None
    
    while True:
        try:
            if r is None: r = get_redis_client()
            if db is None: db = get_db_connection()
            
            try:
                db.ping(reconnect=False)
            except Exception:
                db = get_db_connection()
            
            with db.cursor() as cursor:
                cursor.execute("""
                    SELECT rs.canvas_id, rs.target_size, c.size as old_size
                    FROM canvas_resize_settings rs JOIN canvases c ON rs.canvas_id = c.id
                    WHERE rs.is_active = 1 AND rs.next_resize_at <= UTC_TIMESTAMP()
                """)
                for pr in cursor.fetchall():
                    canvas_id = pr['canvas_id']
                    logging.info(f"Scheduler: Triggering Resize for canvas {canvas_id}")
                    
                    r.lpush("canvases:pending_resizes", json.dumps({
                        'canvas_id': canvas_id, 'old_size': str(pr['old_size']), 'new_size': str(pr['target_size'])
                    }))
                    r.setex(f"canvas:{canvas_id}:resize_lock", 60, "1")
                    r.publish("admin:canvas_events", json.dumps({
                        'type': 'canvas_locked_resize', 'canvas_id': canvas_id, 'new_size': pr['target_size']
                    }))
                    cursor.execute("UPDATE canvas_resize_settings SET is_active = 0 WHERE canvas_id = %s", (canvas_id,))
                    r.delete(f"canvas:next_resize:{canvas_id}")
                
                cursor.execute("""
                    SELECT r.canvas_id, r.take_snapshot, c.size as canvas_size 
                    FROM canvas_reset_settings r JOIN canvases c ON r.canvas_id = c.id
                    WHERE r.is_active = 1 AND r.next_reset_at <= UTC_TIMESTAMP()
                """)
                for pr in cursor.fetchall():
                    canvas_id = pr['canvas_id']
                    logging.info(f"Scheduler: Triggering Reset for canvas {canvas_id}")
                    
                    r.lpush("canvases:pending_resets", json.dumps({
                        'canvas_id': canvas_id, 'take_snapshot': pr['take_snapshot'], 'canvas_size': str(pr['canvas_size'])
                    }))
                    r.setex(f"canvas:{canvas_id}:reset_lock", 300, "1")
                    r.publish("admin:canvas_events", json.dumps({"type": "canvas_locked", "canvas_id": canvas_id}))
                    cursor.execute("UPDATE canvas_reset_settings SET is_active = 0 WHERE canvas_id = %s", (canvas_id,))
                    r.delete(f"canvas:next_reset:{canvas_id}")
                
                force_resets = r.smembers("canvases:force_resets")
                for b_canvas_id in force_resets:
                    canvas_id = int(b_canvas_id)
                    logging.info(f"Scheduler: Triggering FORCED Reset for canvas {canvas_id}")
                    cursor.execute("SELECT size FROM canvases WHERE id = %s", (canvas_id,))
                    res = cursor.fetchone()
                    
                    opts_json = r.hget("canvases:force_resets_options", b_canvas_id)
                    take_snapshot = 1
                    if opts_json:
                        opts = json.loads(opts_json)
                        take_snapshot = int(opts.get('take_snapshot', 1))
                        r.hdel("canvases:force_resets_options", b_canvas_id)
                    
                    r.lpush("canvases:pending_resets", json.dumps({
                        'canvas_id': canvas_id, 'take_snapshot': take_snapshot, 'canvas_size': str(res['size']) if res else '64x64'
                    }))
                    r.setex(f"canvas:{canvas_id}:reset_lock", 300, "1")
                    r.publish("admin:canvas_events", json.dumps({"type": "canvas_locked", "canvas_id": canvas_id}))
                    r.srem("canvases:force_resets", b_canvas_id)

                force_snapshots = r.smembers("canvases:force_snapshots")
                for b_canvas_id in force_snapshots:
                    canvas_id = int(b_canvas_id)
                    logging.info(f"Scheduler: Triggering Manual Snapshot for canvas {canvas_id}")
                    state_key = f"canvas:{canvas_id}:state"
                    current_state = r.get(state_key)
                    if current_state:
                        try:
                            compressed_state = zlib.compress(current_state if isinstance(current_state, bytes) else current_state.encode('latin1'))
                            cursor.execute("""
                                INSERT INTO canvas_snapshots (canvas_id, snapshot_data, last_updated)
                                VALUES (%s, %s, CURRENT_TIMESTAMP) ON DUPLICATE KEY UPDATE snapshot_data = %s, last_updated = CURRENT_TIMESTAMP
                            """, (canvas_id, compressed_state, compressed_state))
                        except Exception as ex_snap:
                            logging.error(f"Error persisting current state for manual snapshot canvas {canvas_id}: {ex_snap}")

                    r.setex(f"canvas:{canvas_id}:snapshot_lock", 300, "1")
                    r.sadd("canvases:pending_snapshots", canvas_id)
                    r.srem("canvases:force_snapshots", b_canvas_id)
                
                db.commit()
                
        except Exception as e:
            logging.error(f"Fallo en Hilo Scheduler Maestro: {e}")
            if db is not None:
                try: db.rollback() 
                except: pass
            db = None
            r = None
            
        time.sleep(SYNC_INTERVAL)


THUMBNAIL_MAX_SIZE = int(os.getenv("THUMBNAIL_MAX_SIZE") or 512)
ARCHIVE_MAX_SIZE = int(os.getenv("ARCHIVE_MAX_SIZE") or 2048)

PALETTES_FILE_PATH = os.getenv("PALETTES_FILE_PATH") or "/var/www/html/public/assets/data/palettes.json"
APP_PALETTES = {}

def load_palettes():
    global APP_PALETTES
    try:
        if os.path.exists(PALETTES_FILE_PATH):
            with open(PALETTES_FILE_PATH, 'r', encoding='utf-8') as f:
                data = json.load(f)
                for pal_id, pal_data in data.items():
                    raw_colors = pal_data.get('colors', [])
                    APP_PALETTES[pal_id] = [c.get('hex', '#000000') if isinstance(c, dict) else c for c in raw_colors]
            print(f"[+] Palettes successfully loaded from {PALETTES_FILE_PATH}")
        else:
            raise FileNotFoundError("JSON file does not exist at path.")
    except Exception as e:
        print(f"[!] Error loading palettes from {PALETTES_FILE_PATH}: {e}")
        APP_PALETTES['default'] = [
            '#000000', '#1A1A1A', '#333333', '#4D4D4D', '#666666', '#808080', '#999999', '#B3B3B3', '#CCCCCC', '#E6E6E6', '#F2F2F2', '#FFFFFF',
            '#FF0000', '#FF8000', '#FFFF00', '#80FF00', '#00FF00', '#00FF80', '#00FFFF', '#0080FF', '#0000FF', '#8000FF', '#FF00FF', '#FF0080',
            '#800000', '#804000', '#808000', '#408000', '#008000', '#008040', '#008080', '#004080', '#000080', '#400080', '#800080', '#800040'
        ]

def hex_to_rgba(hex_color):
    hex_color = hex_color.lstrip('#')
    return tuple(int(hex_color[i:i+2], 16) for i in (0, 2, 4)) + (255,)

def get_color(palette_id, index):
    if index == 255:
        return (255, 255, 255, 255) 
        
    palette = APP_PALETTES.get(palette_id, APP_PALETTES.get('default', []))
    
    if index < len(palette):
        return hex_to_rgba(palette[index])
        
    return (255, 0, 255, 255)

def get_db_connection_thumbnails():
    try:
        return mysql.connector.connect(
            host=DB_HOST,
            user=DB_USER,
            password=DB_PASS,
            database=DB_NAME
        )
    except Exception as e:
        print(f"[!] Error connecting to MySQL in Snapshots Worker: {e}")
        return None

def parse_size(size_str):
    try:
        if 'x' in size_str.lower():
            parts = size_str.lower().split('x')
            return int(parts[0]), int(parts[1])
        return int(size_str), int(size_str)
    except:
        return 64, 64

def get_max_snapshots_per_tier(tier):
    if tier == 0:
        return 10
    elif tier == 1:
        return 25
    elif tier == 2:
        return 100
    else:
        return -1 # Ultra (Ilimitado)

def process_canvas_image(r, db_conn, canvas_id, compressed_data, size_str, palette_id, owner_tier, canvas_uuid):
    try:
        width, height = parse_size(size_str)
        
        raw_bytes = decompress(compressed_data) if compressed_data else b""
        expected_size = width * height * 4
        
        if len(raw_bytes) < expected_size:
            raw_bytes += b'\x00\x00\x00\x00' * ((expected_size - len(raw_bytes)) // 4)
            
        img = Image.new('RGBA', (width, height), color=(0, 0, 0, 0))
        pixels = img.load()
        
        for y in range(height):
            for x in range(width):
                idx = (y * width + x) * 4
                if idx + 3 < len(raw_bytes):
                    r_c = raw_bytes[idx]
                    g_c = raw_bytes[idx+1]
                    b_c = raw_bytes[idx+2]
                    a_c = raw_bytes[idx+3]
                    pixels[x, y] = (r_c, g_c, b_c, a_c)
            
        scale_w = THUMBNAIL_MAX_SIZE / width
        scale_h = THUMBNAIL_MAX_SIZE / height
        thumb_scale = min(scale_w, scale_h, SCALE_FACTOR)
        thumb_width = max(1, int(width * thumb_scale))
        thumb_height = max(1, int(height * thumb_scale))

        img_thumb = img.resize((thumb_width, thumb_height), Image.NEAREST)
        bg_thumb = Image.new('RGB', (thumb_width, thumb_height), (255, 255, 255))
        if img_thumb.mode == 'RGBA':
            bg_thumb.paste(img_thumb, mask=img_thumb.split()[3])
        else:
            bg_thumb.paste(img_thumb)
        
        thumb_io = io.BytesIO()
        bg_thumb.save(thumb_io, "PNG", optimize=True)
        thumb_io.seek(0)
        s3 = get_s3_client()
        try:
            s3.put_object(Bucket=S3_BUCKET, Key=f"thumbnails/canvas_{canvas_uuid}.png", Body=thumb_io, ContentType='image/png')
        except Exception as e:
            print(f"[!] Error uploading thumbnail to S3: {e}")
            return False

        
        if r.exists(f"canvas:{canvas_id}:reset_lock") or r.exists(f"canvas:{canvas_id}:snapshot_lock"):
            
            max_snapshots = get_max_snapshots_per_tier(owner_tier)
            
            if max_snapshots != -1:
                try:
                    cursor = db_conn.cursor(dictionary=True) if hasattr(db_conn, 'cursor') and hasattr(db_conn.cursor(), 'dictionary') else db_conn.cursor()
                    cursor.execute("SELECT COUNT(*) as cnt FROM canvas_snapshots_history WHERE canvas_id = %s", (canvas_id,))
                    row = cursor.fetchone()
                    current_count = row['cnt'] if isinstance(row, dict) else row[0]
                    cursor.close()
                    
                    if current_count >= max_snapshots and max_snapshots > 0:
                        num_to_delete = current_count - max_snapshots + 1
                        print(f"[-] Canvas {canvas_id} reached limit ({current_count}/{max_snapshots}). Purging oldest {num_to_delete} snapshot(s)...")
                        
                        cursor_del = db_conn.cursor(dictionary=True) if hasattr(db_conn, 'cursor') and hasattr(db_conn.cursor(), 'dictionary') else db_conn.cursor()
                        cursor_del.execute("""
                            SELECT id, file_path 
                            FROM canvas_snapshots_history 
                            WHERE canvas_id = %s 
                            ORDER BY created_at ASC 
                            LIMIT %s
                        """, (canvas_id, num_to_delete))
                        oldest_recs = cursor_del.fetchall()
                        cursor_del.close()

                        for rec in oldest_recs:
                            old_id = rec['id'] if isinstance(rec, dict) else rec[0]
                            old_file = rec['file_path'] if isinstance(rec, dict) else rec[1]

                            if old_file:
                                try: s3.delete_object(Bucket=S3_BUCKET, Key=old_file.lstrip('/'))
                                except Exception: pass

                            try:
                                cursor_rm = db_conn.cursor()
                                cursor_rm.execute("DELETE FROM canvas_snapshots_history WHERE id = %s", (old_id,))
                                db_conn.commit()
                                cursor_rm.close()
                            except Exception as e:
                                print(f"[!] Error deleting DB record for snapshot {old_id}: {e}")

                except Exception as e:
                    print(f"[!] Error verifying snapshot quota for canvas {canvas_id}: {e}")

            scale_arch_w = ARCHIVE_MAX_SIZE / width
            scale_arch_h = ARCHIVE_MAX_SIZE / height
            arch_scale = min(scale_arch_w, scale_arch_h, SCALE_FACTOR)
            
            arch_width = max(1, int(width * arch_scale))
            arch_height = max(1, int(height * arch_scale))
            
            img_archive = img.resize((arch_width, arch_height), Image.NEAREST)
            bg_archive = Image.new('RGB', (arch_width, arch_height), (255, 255, 255))
            if img_archive.mode == 'RGBA':
                bg_archive.paste(img_archive, mask=img_archive.split()[3])
            else:
                bg_archive.paste(img_archive)

            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            archive_filename = f"canvas_{canvas_id}_{timestamp}.png"
            
            s3 = get_s3_client()
            archive_key = f"snapshots_archive/{canvas_uuid}/{archive_filename}"
            arch_io = io.BytesIO()
            bg_archive.save(arch_io, "PNG", optimize=True)
            arch_io.seek(0)
            try:
                s3.put_object(Bucket=S3_BUCKET, Key=archive_key, Body=arch_io, ContentType='image/png')
                print(f"[+] Historical file saved to S3 successfully: {archive_key}")
            except Exception as e:
                print(f"[!] Error uploading archive to S3: {e}")
                return False

            snapshot_uuid = str(uuid.uuid4())
            public_filepath = f"snapshots_archive/{canvas_uuid}/{archive_filename}"
            
            try:
                cursor = db_conn.cursor()
                insert_query = """
                    INSERT INTO canvas_snapshots_history (canvas_id, snapshot_uuid, file_path)
                    VALUES (%s, %s, %s)
                """
                cursor.execute(insert_query, (canvas_id, snapshot_uuid, public_filepath))
                db_conn.commit()
                cursor.close()
                print(f"[+] Historical record saved in DB with UUID: {snapshot_uuid}")
            except Exception as e:
                print(f"[!] Error saving history to DB: {e}")

            r.set(f"canvas:{canvas_id}:snapshot_done", "1", ex=60)
            r.delete(f"canvas:{canvas_id}:snapshot_lock")
            
        return True
    except Exception as e:
        print(f"[!] Error processing PNG image for canvas {canvas_id}: {e}")
def thumbnails_thread():
    logging.info("Starting Snapshots Worker (Tiering Logic Injected)...")
    
    
    
    load_palettes()
    
    try:
        r = redis.Redis(
            host=REDIS_HOST, 
            port=REDIS_PORT, 
            password=REDIS_PASS, 
            db=0, 
            decode_responses=True 
        )
        r.ping()
        print("[+] Connected to Redis successfully.")
    except Exception as e:
        print(f"[!] Could not connect to Redis: {e}")
        return

    while True:
        try:
            pending_canvases = r.smembers("canvases:pending_snapshots")
            
            if pending_canvases:
                db_conn = get_db_connection_thumbnails()
                if db_conn:
                    cursor = db_conn.cursor()
                    
                    for canvas_id in pending_canvases:
                        query = f"""
                            SELECT s.snapshot_data, c.size, c.palette_id, IFNULL(u.subscription_tier, 2) as tier, c.uuid
                            FROM canvases c
                            LEFT JOIN canvas_snapshots s ON s.canvas_id = c.id
                            LEFT JOIN {DB_IDENTITY_NAME}.users u ON c.owner_id = u.id
                            WHERE c.id = %s
                        """
                        cursor.execute(query, (canvas_id,))
                        result = cursor.fetchone()
                        
                        if result:
                            r_bin = get_redis_client()
                            temp_snap = r_bin.get(f"canvas:{canvas_id}:temp_snapshot")
                            if temp_snap:
                                snapshot_data = temp_snap
                                r_bin.delete(f"canvas:{canvas_id}:temp_snapshot")
                            else:
                                snapshot_data = result[0]
                                
                            size_str = result[1] if result[1] else '64'
                            palette_id = result[2] if result[2] else 'default'
                            owner_tier = result[3]
                            canvas_uuid = result[4]
                            
                            print(f"[DEBUG] Thumbnails thread canvas_id={canvas_id}, size_str='{size_str}', has_snapshot={bool(snapshot_data)}")
                            if snapshot_data:
                                success = process_canvas_image(r, db_conn, canvas_id, snapshot_data, size_str, palette_id, owner_tier, canvas_uuid)
                                if success:
                                    r.srem("canvases:pending_snapshots", canvas_id)
                                    print(f"[+] Thumbnail/Snapshot processed: canvas_{canvas_id}.png")
                            else:
                                r.srem("canvases:pending_snapshots", canvas_id)
                        else:
                            r.srem("canvases:pending_snapshots", canvas_id)
                            
                    cursor.close()
                    db_conn.close()
        except Exception as e:
            print(f"[!] Error in main cycle of Snapshot Worker: {e}")

        time.sleep(SYNC_INTERVAL)

import subprocess
import urllib.parse
def draw_image_listener_thread():
    logging.info("Starting Draw Image listener thread...")
    r = get_redis_client()
    while True:
        try:
            item = r.blpop("queue:canvas_draw_image", timeout=30)
            if item:
                _, task_json = item
                task_data = json.loads(task_json)
                url = task_data.get('url')
                canvas_id = task_data.get('canvas_id')
                x = task_data.get('x', 0)
                y = task_data.get('y', 0)
                w = task_data.get('w', 0)
                h = task_data.get('h', 0)
                angle = task_data.get('angle', 0)
                
                logging.info(f"Received draw_image task for canvas {canvas_id} at {x},{y} w={w} h={h} a={angle}")
                
                # Broadcast lock event so frontend blocks the canvas
                r.publish("admin:canvas_events", json.dumps({
                    "type": "canvas_locked_inject", "canvas_id": canvas_id
                }))
                
                try:
                    # S3 setup
                    bucket = os.getenv('AWS_BUCKET')
                    public_url = os.getenv('AWS_PUBLIC_URL').rstrip('/') if os.getenv('AWS_PUBLIC_URL') else ''
                    key = url.replace(f"{public_url}/{bucket}/", "")
                    key = urllib.parse.urlparse(key).path.lstrip('/')
                    
                    s3_client = get_s3_client()
                    
                    import tempfile
                    with tempfile.NamedTemporaryFile(delete=False, suffix='.png') as temp_file:
                        temp_path = temp_file.name
                        s3_client.download_file(bucket, key, temp_path)
                    
                    script_path = os.path.abspath(os.path.join(os.path.dirname(__file__), 'draw_image.py'))
                    cmd = ["python", script_path, temp_path, str(canvas_id), "--x", str(x), "--y", str(y), "--w", str(w), "--h", str(h), "--angle", str(angle)]
                    logging.info(f"Executing: {' '.join(cmd)}")
                    
                    result = subprocess.run(cmd, capture_output=True, text=True)
                    logging.info(f"Draw script output: {result.stdout}")
                    if result.stderr:
                        logging.error(f"Draw script error: {result.stderr}")
                        
                    os.remove(temp_path)
                    
                    if result.returncode != 0:
                        raise Exception(f"Draw script exited with code {result.returncode}: {result.stderr}")
                    
                    # Parse affected chunks from the draw script's stdout
                    affected_chunks = []
                    for line in result.stdout.strip().split('\n'):
                        line = line.strip()
                        if line.startswith('{"affected_chunks"'):
                            try:
                                parsed = json.loads(line)
                                affected_chunks = parsed.get('affected_chunks', [])
                            except json.JSONDecodeError:
                                pass
                    
                    # Broadcast completed event so frontend reloads the canvas state
                    r.publish("admin:canvas_events", json.dumps({
                        "type": "canvas_inject_completed", "canvas_id": canvas_id,
                        "affected_chunks": affected_chunks,
                        "x": x,
                        "y": y,
                        "w": w,
                        "h": h,
                        "angle": angle,
                        "image_url": url
                    }))
                    
                    stream_key = f"canvas:{canvas_id}:stream"
                    r.xadd(stream_key, {
                        "type": "template_inject",
                        "x": str(x),
                        "y": str(y),
                        "w": str(w),
                        "h": str(h),
                        "angle": str(angle),
                        "image_url": str(url)
                    })
                    logging.info(f"Canvas inject for {canvas_id} completed successfully. Affected chunks: {len(affected_chunks)}")
                    
                except Exception as draw_err:
                    logging.error(f"Error in draw_image processing: {draw_err}")
                    r.publish("admin:canvas_events", json.dumps({
                        "type": "canvas_inject_error", "canvas_id": canvas_id, "error": str(draw_err)
                    }))
                
        except Exception as e:
            logging.error(f"Error in Draw Image listener: {e}")
            time.sleep(1)

if __name__ == "__main__":
    logging.info("INICIANDO WORKER UNIFICADO DE CANVAS (RESETS, RESIZES, THUMBNAILS)...")
    
    threading.Thread(target=resize_listener_thread, daemon=True, name="Thread-Resize").start()
    threading.Thread(target=reset_listener_thread, daemon=True, name="Thread-Reset").start()
    threading.Thread(target=scheduler_thread, daemon=True, name="Thread-Scheduler").start()
    threading.Thread(target=thumbnails_thread, daemon=True, name="Thread-Thumbnails").start()
    threading.Thread(target=draw_image_listener_thread, daemon=True, name="Thread-DrawImage").start()
    
    while True:
        time.sleep(1)
