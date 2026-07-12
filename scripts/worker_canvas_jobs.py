import os
import time
import json
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

logging.basicConfig(level=logging.INFO, format='%(asctime)s [%(threadName)s] %(levelname)s: %(message)s')

DB_HOST = os.getenv("DB_HOST", "db")
DB_PORT = int(os.getenv("DB_PORT", 3306))
DB_USER = os.getenv("DB_USER", "system_web_executor")
DB_PASS = os.getenv("DB_PASS", "")
DB_NAME = os.getenv("DB_CANVASES_NAME", "db_canvases")
DB_IDENTITY_NAME = os.getenv("DB_IDENTITY_NAME", "db_identity")

REDIS_HOST = os.getenv("REDIS_HOST", "redis")
REDIS_PORT = int(os.getenv("REDIS_PORT", 6379))
REDIS_PASS = os.getenv("REDIS_PASS", None)

SNAPSHOTS_DIR = os.getenv("SNAPSHOTS_DIR", "/app/storage/public/snapshots")
SYNC_INTERVAL = int(os.getenv("WORKER_RESETS_SYNC_INTERVAL", 10))
THUMBNAILS_DIR = os.getenv("THUMBNAILS_DIR", "/app/storage/public/thumbnails")
ARCHIVE_DIR = os.getenv("SNAPSHOTS_ARCHIVE_DIR", "/app/storage/public/snapshots_archive")
TIMELAPSE_DIR = os.getenv("TIMELAPSE_DIR", "/app/storage/private/canvases/timelapses")
SCALE_FACTOR = int(os.getenv("SNAPSHOT_SCALE_FACTOR", 10))

def get_redis_client():
    return redis.Redis(host=REDIS_HOST, port=REDIS_PORT, password=REDIS_PASS)

def get_db_connection():
    return pymysql.connect(
        host=DB_HOST, port=DB_PORT, user=DB_USER, password=DB_PASS, database=DB_NAME,
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

        logging.info(f"Redimensionando lienzo {canvas_id} de {old_w}x{old_h} hacia {new_w}x{new_h}")

        state_key = f"canvas:{canvas_id}:state"
        old_state = r.get(state_key)

        if not old_state:
            raise ValueError(f"Estado binario no encontrado para lienzo {canvas_id}.")

        actual_len = len(old_state)
        expected_size = old_w * old_h

        if actual_len != expected_size:
            logging.warning(f"DesincronizaciÃ³n detectada. Metadata esperaba {expected_size} bytes, Redis tiene {actual_len} bytes.")
            real_old_size = int(math.sqrt(actual_len))
            logging.warning(f"Auto-corrigiendo tamaÃ±o base a {real_old_size}x{real_old_size} para procesar correctamente.")
            old_w, old_h = real_old_size, real_old_size

        new_state = bytearray([255] * (new_w * new_h))
        limit_x = min(old_w, new_w)
        limit_y = min(old_h, new_h)
        
        for y in range(limit_y):
            for x in range(limit_x):
                old_idx = (y * old_w) + x
                new_idx = (y * new_w) + x
                new_state[new_idx] = old_state[old_idx]

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

        r.delete(f"canvas:{canvas_id}:resize_lock")
        r.publish("admin:canvas_events", json.dumps({
            "type": "canvas_resize_completed", "canvas_id": canvas_id, "new_size": new_size_db_str
        }))
        logging.info(f"RedimensiÃ³n de lienzo {canvas_id} completada exitosamente.")

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
            
            try:
                db.ping(reconnect=False)
            except Exception:
                db = get_db_connection()
            
            result = r.blpop("canvases:pending_resizes", timeout=30)
            
            if result:
                _, task_json = result
                task_data = json.loads(task_json.decode('utf-8') if isinstance(task_json, bytes) else task_json)
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
    
    logging.info(f"Iniciando reseteo para lienzo ID {canvas_id}.")

    try:
        state_key = f"canvas:{canvas_id}:state"
        current_state = r.get(state_key)
        
        with db.cursor() as cursor:
            if current_state:
                compressed_state = zlib.compress(current_state)
                cursor.execute("""
                    INSERT INTO canvas_snapshots (canvas_id, snapshot_data, last_updated)
                    VALUES (%s, %s, CURRENT_TIMESTAMP) ON DUPLICATE KEY UPDATE snapshot_data = %s, last_updated = CURRENT_TIMESTAMP
                """, (canvas_id, compressed_state, compressed_state))
                db.commit()

        if take_snapshot:
            r.sadd("canvases:pending_snapshots", canvas_id)
            snapshot_done_key = f"canvas:{canvas_id}:snapshot_done"
            waited = 0
            while not r.exists(snapshot_done_key) and waited < 60:
                time.sleep(1)
                waited += 1
            if r.exists(snapshot_done_key):
                r.delete(snapshot_done_key)
            else:
                logging.warning(f"Timeout esperando snapshot HQ del lienzo {canvas_id}.")

        size_w, size_h = parse_size(canvas_size)
        empty_state = bytes([255] * (size_w * size_h))
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
                logging.info(f"Imagen pÃºblica eliminada para lienzo {canvas_id}.")
            except Exception as e:
                logging.error(f"No se pudo eliminar imagen pÃºblica {canvas_id}: {e}")
        
        r.delete(f"canvas:{canvas_id}:reset_lock")
        r.publish("admin:canvas_events", json.dumps({"type": "canvas_cleared", "canvas_id": canvas_id, "next_reset_at": None}))
        logging.info(f"Reseteo de lienzo {canvas_id} completado exitosamente.")

    except Exception as e:
        logging.error(f"Error fatal durante reseteo de lienzo {canvas_id}: {e}")
        r.delete(f"canvas:{canvas_id}:reset_lock")

def reset_listener_thread():
    logging.info("Iniciando Hilo Listener de Resets...")
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
            
            result = r.blpop("canvases:pending_resets", timeout=30)
            
            if result:
                _, task_json = result
                task_data = json.loads(task_json.decode('utf-8') if isinstance(task_json, bytes) else task_json)
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
                    SELECT rs.canvas_id, rs.target_size, rs.timer_action, c.size as old_size
                    FROM canvas_resize_settings rs JOIN canvases c ON rs.canvas_id = c.id
                    WHERE rs.is_active = 1 AND rs.next_resize_at <= UTC_TIMESTAMP()
                """)
                for pr in cursor.fetchall():
                    canvas_id = pr['canvas_id']
                    logging.info(f"Programador: Disparando Resize para lienzo {canvas_id}")
                    
                    r.lpush("canvases:pending_resizes", json.dumps({
                        'canvas_id': canvas_id, 'old_size': str(pr['old_size']), 'new_size': str(pr['target_size'])
                    }))
                    r.setex(f"canvas:{canvas_id}:resize_lock", 60, "1")
                    r.publish("admin:canvas_events", json.dumps({
                        'type': 'canvas_locked_resize', 'canvas_id': canvas_id, 'new_size': pr['target_size']
                    }))
                    cursor.execute("UPDATE canvas_resize_settings SET is_active = 0 WHERE canvas_id = %s", (canvas_id,))
                    if pr['timer_action'] in ['stop', 'none']:
                        r.delete(f"canvas:next_resize:{canvas_id}")
                
                cursor.execute("""
                    SELECT r.canvas_id, r.take_snapshot, r.timer_action, c.size as canvas_size 
                    FROM canvas_reset_settings r JOIN canvases c ON r.canvas_id = c.id
                    WHERE r.is_active = 1 AND r.next_reset_at <= UTC_TIMESTAMP()
                """)
                for pr in cursor.fetchall():
                    canvas_id = pr['canvas_id']
                    logging.info(f"Programador: Disparando Reset para lienzo {canvas_id}")
                    
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
                    logging.info(f"Programador: Disparando Reset FORZADO para lienzo {canvas_id}")
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
                
                db.commit()
                
        except Exception as e:
            logging.error(f"Fallo en Hilo Scheduler Maestro: {e}")
            if db is not None:
                try: db.rollback() 
                except: pass
            db = None
            r = None
            
        time.sleep(SYNC_INTERVAL)


THUMBNAIL_MAX_SIZE = int(os.getenv("THUMBNAIL_MAX_SIZE", 512)) # Max pÃƒÂ­xeles para tarjetas web
ARCHIVE_MAX_SIZE = int(os.getenv("ARCHIVE_MAX_SIZE", 4096))    # Max pÃƒÂ­xeles para histÃƒÂ³ricos

PALETTES_FILE_PATH = os.getenv("PALETTES_FILE_PATH", "/app/public/assets/data/palettes.json")
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
            raise FileNotFoundError("El archivo JSON no existe en la ruta.")
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
        return 1
    elif tier == 1:
        return 5
    else:
        return -1 # Advanced (Ilimitado)

def process_canvas_image(r, db_conn, canvas_id, compressed_data, size_str, palette_id, owner_tier, canvas_uuid):
    try:
        raw_bytes = decompress(compressed_data)
        
        width, height = parse_size(size_str)
        expected_size = width * height
        
        if len(raw_bytes) < expected_size:
            raw_bytes += bytes([255] * (expected_size - len(raw_bytes)))
            
        img = Image.new('RGBA', (width, height), color=(255, 255, 255, 255))
        pixels = img.load()
        
        for i in range(expected_size):
            byte_val = raw_bytes[i]
            x = i % width
            y = i // width
            pixels[x, y] = get_color(palette_id, byte_val)
            
        scale_w = THUMBNAIL_MAX_SIZE / width
        scale_h = THUMBNAIL_MAX_SIZE / height
        thumb_scale = min(scale_w, scale_h, SCALE_FACTOR)
        
        thumb_width = max(1, int(width * thumb_scale))
        thumb_height = max(1, int(height * thumb_scale))

        img_thumb = img.resize((thumb_width, thumb_height), Image.NEAREST)
        
        filepath = os.path.join(THUMBNAILS_DIR, f"canvas_{canvas_id}.png")
        img_thumb.save(filepath, "PNG", optimize=True)
        
        if r.exists(f"canvas:{canvas_id}:reset_lock"):
            
            max_snapshots = get_max_snapshots_per_tier(owner_tier)
            can_save_history = True
            
            if max_snapshots != -1:
                try:
                    cursor = db_conn.cursor()
                    cursor.execute("SELECT COUNT(*) FROM canvas_snapshots_history WHERE canvas_id = %s", (canvas_id,))
                    current_count = cursor.fetchone()[0]
                    cursor.close()
                    
                    if current_count >= max_snapshots:
                        can_save_history = False
                except Exception as e:
                    print(f"[!] Error verifying snapshot quota for canvas {canvas_id}: {e}")
                    can_save_history = False 
            
            if not can_save_history:
                print(f"[-] Canvas {canvas_id} exceeded its historical snapshots limit ({max_snapshots}). Purging the oldest...")
                timelapse_src = os.path.join(TIMELAPSE_DIR, str(canvas_uuid), "live", f"live_canvas_{canvas_uuid}.jsonl")
                if os.path.exists(timelapse_src):
                    os.remove(timelapse_src)
            else:
                scale_arch_w = ARCHIVE_MAX_SIZE / width
                scale_arch_h = ARCHIVE_MAX_SIZE / height
                arch_scale = min(scale_arch_w, scale_arch_h, SCALE_FACTOR)
                
                arch_width = max(1, int(width * arch_scale))
                arch_height = max(1, int(height * arch_scale))
                
                img_archive = img.resize((arch_width, arch_height), Image.NEAREST)

                timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                archive_filename = f"canvas_{canvas_id}_{timestamp}.png"
                
                canvas_archive_dir = os.path.join(ARCHIVE_DIR, str(canvas_uuid))
                os.makedirs(canvas_archive_dir, exist_ok=True)
                
                archive_filepath = os.path.join(canvas_archive_dir, archive_filename)
                
                img_archive.save(archive_filepath, "PNG", optimize=True)
                print(f"[+] Historical file saved successfully ({arch_width}x{arch_height}): {archive_filepath}")

                snapshot_uuid = str(uuid.uuid4())
                public_filepath = f"public/storage/snapshots_archive/{canvas_uuid}/{archive_filename}"
                
                timelapse_src = os.path.join(TIMELAPSE_DIR, str(canvas_uuid), "live", f"live_canvas_{canvas_uuid}.jsonl")
                timelapse_dest_filename = f"snapshot_{snapshot_uuid}.jsonl"
                
                snapshots_dir = os.path.join(TIMELAPSE_DIR, str(canvas_uuid), "snapshots")
                os.makedirs(snapshots_dir, exist_ok=True)
                
                timelapse_dest = os.path.join(snapshots_dir, timelapse_dest_filename)
                
                timelapse_db_path = None
                
                if os.path.exists(timelapse_src):
                    try:
                        shutil.move(timelapse_src, timelapse_dest)
                        timelapse_db_path = f"private/canvases/timelapses/{canvas_uuid}/snapshots/{timelapse_dest_filename}"
                        print(f"[+] Timelapse successfully converted to historical: {timelapse_dest_filename}")
                    except Exception as e:
                        print(f"[!] Error moving timelapse JSONL file for canvas {canvas_id}: {e}")
                else:
                    print(f"[-] 'live_canvas' file not found for canvas {canvas_id}. Base snapshot will be saved without timelapse.")

                try:
                    cursor = db_conn.cursor()
                    insert_query = """
                        INSERT INTO canvas_snapshots_history (canvas_id, snapshot_uuid, file_path, timelapse_file_path)
                        VALUES (%s, %s, %s, %s)
                    """
                    cursor.execute(insert_query, (canvas_id, snapshot_uuid, public_filepath, timelapse_db_path))
                    db_conn.commit()
                    cursor.close()
                    print(f"[+] Historical record saved in DB with UUID: {snapshot_uuid}")
                except Exception as e:
                    print(f"[!] Error saving history to DB: {e}")

            r.set(f"canvas:{canvas_id}:snapshot_done", "1", ex=60)
            
        return True
    except Exception as e:
        print(f"[!] Error processing PNG image for canvas {canvas_id}: {e}")
        return False

def thumbnails_thread():
    logging.info("Starting Snapshots Worker (Tiering Logic Injected)...")
    
    os.makedirs(THUMBNAILS_DIR, exist_ok=True)
    os.makedirs(ARCHIVE_DIR, exist_ok=True)
    os.makedirs(TIMELAPSE_DIR, exist_ok=True)
    
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
                            FROM canvas_snapshots s
                            JOIN canvases c ON s.canvas_id = c.id
                            LEFT JOIN {DB_IDENTITY_NAME}.users u ON c.owner_id = u.id
                            WHERE s.canvas_id = %s
                        """
                        cursor.execute(query, (canvas_id,))
                        result = cursor.fetchone()
                        
                        if result and result[0]:
                            snapshot_data = result[0]
                            size_str = result[1] if result[1] else '64'
                            palette_id = result[2] if result[2] else 'default'
                            owner_tier = result[3]
                            canvas_uuid = result[4]
                            
                            success = process_canvas_image(r, db_conn, canvas_id, snapshot_data, size_str, palette_id, owner_tier, canvas_uuid)
                            if success:
                                r.srem("canvases:pending_snapshots", canvas_id)
                                print(f"[+] Thumbnail/Snapshot processed: canvas_{canvas_id}.png")
                        else:
                            r.srem("canvases:pending_snapshots", canvas_id)
                            
                    cursor.close()
                    db_conn.close()
        except Exception as e:
            print(f"[!] Error in main cycle of Snapshot Worker: {e}")

        time.sleep(SYNC_INTERVAL)

if __name__ == "__main__":
    logging.info("INICIANDO WORKER UNIFICADO DE CANVAS (RESETS, RESIZES, THUMBNAILS)...")
    
    threading.Thread(target=resize_listener_thread, daemon=True, name="Thread-Resize").start()
    threading.Thread(target=reset_listener_thread, daemon=True, name="Thread-Reset").start()
    threading.Thread(target=scheduler_thread, daemon=True, name="Thread-Scheduler").start()
    threading.Thread(target=thumbnails_thread, daemon=True, name="Thread-Thumbnails").start()
    
    while True:
        time.sleep(1)
