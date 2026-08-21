import os
import time
import json
from dotenv import load_dotenv

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
ENV_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '.env'))
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
import numpy as np

try:
    from scripts.workers.timelapse_video_renderer import render_timelapse_to_mp4
except ImportError:
    try:
        from timelapse_video_renderer import render_timelapse_to_mp4
    except ImportError:
        render_timelapse_to_mp4 = None

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

DB_HOST = os.getenv("DB_HOST")
DB_PORT = int(os.getenv("DB_PORT") or 3306)
DB_USER = os.getenv("DB_USER")
DB_PASS = os.getenv("DB_PASS")
DB_NAME = os.getenv("DB_CANVASES_NAME")
DB_IDENTITY_NAME = os.getenv("DB_IDENTITY_NAME")

REDIS_HOST = os.getenv("REDIS_HOST")
REDIS_PORT = int(os.getenv("REDIS_PORT") or 6379)
REDIS_PASS = os.getenv("REDIS_PASS")

def get_absolute_path(env_val, default_val):
    path = os.getenv(env_val) or default_val
    if os.path.exists('/app') and path.startswith('/var/www/html'):
        path = path.replace('/var/www/html', '/app', 1)
    return path

SNAPSHOTS_DIR = get_absolute_path("SNAPSHOTS_DIR", "/var/www/html/storage/private/snapshots")
SYNC_INTERVAL = int(os.getenv("WORKER_CANVAS_SYNC_INTERVAL") or 10)
THUMBNAILS_DIR = get_absolute_path("THUMBNAILS_DIR", "/var/www/html/storage/public/thumbnails")

SCALE_FACTOR = int(os.getenv("SNAPSHOT_SCALE_FACTOR") or 2)

def get_redis_client():
    r = redis.Redis(
        host=REDIS_HOST, port=REDIS_PORT, password=REDIS_PASS,
        socket_keepalive=True,
        health_check_interval=60, socket_timeout=60
    )
    r.ping()
    return r

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

def compute_chunk_crc_map(canvas_arr, affected_chunks, chunk_size=512):
    """Calcula firmas CRC32 para los cuadrantes afectados."""
    h, w, _ = canvas_arr.shape
    crc_map = {}
    for chunk_key in affected_chunks:
        try:
            cx_str, cy_str = chunk_key.split(',')
            cx, cy = int(cx_str), int(cy_str)
            start_x = cx * chunk_size
            start_y = cy * chunk_size
            end_x = min(w, start_x + chunk_size)
            end_y = min(h, start_y + chunk_size)
            if start_x < w and start_y < h:
                chunk_slice = canvas_arr[start_y:end_y, start_x:end_x]
                crc_val = zlib.crc32(chunk_slice.tobytes()) & 0xffffffff
                crc_map[chunk_key] = format(crc_val, '08x')
        except Exception as e:
            logging.warning(f"Error computing CRC for chunk {chunk_key}: {e}")
    return crc_map

class ResilientStreamConsumer:
    """
    Consumer resiliente para Redis Streams con:
    - Consumer Groups (XREADGROUP)
    - Confirmación transaccional (XACK)
    - Detección y recuperación de tareas huérfanas (XAUTOCLAIM / XPENDING)
    - Dead Letter Queue (DLQ tras max_retries)
    - Drenado de colas legacy (BLPOP / RPOP fallback) para retrocompatibilidad total
    """
    def __init__(self, r, stream_key, group_name, legacy_queue_key=None, max_retries=3, claim_idle_ms=120000):
        self.r = r
        self.stream_key = stream_key
        self.group_name = group_name
        self.legacy_queue_key = legacy_queue_key
        self.max_retries = max_retries
        self.claim_idle_ms = claim_idle_ms
        self.consumer_name = f"worker-{uuid.uuid4().hex[:8]}"
        self._ensure_group()
        self._last_claim_time = 0

    def _ensure_group(self):
        try:
            self.r.xgroup_create(self.stream_key, self.group_name, id='0', mkstream=True)
            logging.info(f"Consumer group '{self.group_name}' ready on stream '{self.stream_key}'.")
        except redis.exceptions.ResponseError as e:
            if "BUSYGROUP" not in str(e):
                logging.warning(f"Note on xgroup_create for {self.stream_key}: {e}")

    def fetch_task(self, block_ms=2000):
        """
        Obtiene la siguiente tarea disponible:
        1. Mensajes pendientes en PEL propio (reintentos)
        2. Auto-claim de tareas abandonadas por otros workers (stalled)
        3. Nuevos mensajes del Stream ('>')
        4. Fallback a colas legacy si no hay tareas en el stream
        Retorna (task_data, ack_callback, fail_callback) o (None, None, None)
        """
        # 1. Verificar si hay mensajes pendientes no confirmados en el PEL de este consumidor
        try:
            pending_entries = self.r.xreadgroup(
                self.group_name, self.consumer_name,
                {self.stream_key: '0'}, count=1
            )
            if pending_entries:
                for s_key, msgs in pending_entries:
                    if msgs:
                        msg_id, fields = msgs[0]
                        item = self._build_stream_item(msg_id, fields)
                        if item[0] is not None:
                            return item
        except Exception as p_err:
            pass

        now = time.time()
        # 2. Periódicamente revisar y reclamar tareas pendientes huérfanas de otros workers
        if now - self._last_claim_time > 30:
            self._last_claim_time = now
            try:
                claimed = self.r.xautoclaim(
                    self.stream_key, self.group_name, self.consumer_name,
                    min_idle_time=self.claim_idle_ms, start_id='0-0', count=10
                )
                if claimed and len(claimed) > 1 and claimed[1]:
                    for msg_id, fields in claimed[1]:
                        item = self._build_stream_item(msg_id, fields)
                        if item[0] is not None:
                            return item
            except Exception:
                pass

        # 3. Leer nuevos mensajes del grupo
        try:
            entries = self.r.xreadgroup(
                self.group_name, self.consumer_name,
                {self.stream_key: '>'}, count=1, block=block_ms
            )
            if entries:
                for s_key, msgs in entries:
                    if msgs:
                        msg_id, fields = msgs[0]
                        item = self._build_stream_item(msg_id, fields)
                        if item[0] is not None:
                            return item
        except redis.exceptions.ResponseError as err:
            if "NOGROUP" in str(err):
                self._ensure_group()
            else:
                logging.error(f"Error reading from stream {self.stream_key}: {err}")
        except Exception as e:
            logging.error(f"Error reading from stream {self.stream_key}: {e}")

        # Fallback a cola legacy si está configurada
        if self.legacy_queue_key:
            try:
                legacy_item = self.r.rpop(self.legacy_queue_key)
                if legacy_item:
                    task_json = legacy_item.decode('utf-8') if isinstance(legacy_item, bytes) else legacy_item
                    task_data = json.loads(task_json)
                    
                    def legacy_ack():
                        pass
                    
                    def legacy_fail(err):
                        self._route_to_dlq(task_data, err, is_legacy=True)
                        
                    return task_data, legacy_ack, legacy_fail
            except Exception as leg_err:
                logging.error(f"Error reading from legacy queue {self.legacy_queue_key}: {leg_err}")

        return None, None, None

    def _build_stream_item(self, msg_id, fields):
        msg_id_str = msg_id.decode('utf-8') if isinstance(msg_id, bytes) else str(msg_id)
        task_data = {}
        try:
            if b'payload' in fields:
                raw_p = fields[b'payload']
                task_data = json.loads(raw_p.decode('utf-8') if isinstance(raw_p, bytes) else raw_p)
            elif 'payload' in fields:
                raw_p = fields['payload']
                task_data = json.loads(raw_p if isinstance(raw_p, str) else raw_p.decode('utf-8'))
            else:
                for k, v in fields.items():
                    k_str = k.decode('utf-8') if isinstance(k, bytes) else str(k)
                    v_str = v.decode('utf-8') if isinstance(v, bytes) else str(v)
                    try:
                        task_data[k_str] = json.loads(v_str)
                    except Exception:
                        task_data[k_str] = v_str
        except Exception as p_err:
            logging.error(f"Error decoding stream payload {msg_id_str}: {p_err}")
            self._route_to_dlq({"raw_fields": str(fields)}, p_err)
            try:
                self.r.xack(self.stream_key, self.group_name, msg_id)
                self.r.xdel(self.stream_key, msg_id)
            except Exception:
                pass
            return None, None, None

        def ack_cb():
            try:
                self.r.xack(self.stream_key, self.group_name, msg_id)
                self.r.xdel(self.stream_key, msg_id)
            except Exception as ack_err:
                logging.warning(f"Error executing XACK for {msg_id_str}: {ack_err}")

        def fail_cb(err):
            try:
                pending = self.r.xpending_range(self.stream_key, self.group_name, min=msg_id, max=msg_id, count=1)
                delivery_count = 1
                if pending and len(pending) > 0:
                    delivery_count = pending[0].get('times_delivered', 1)

                if delivery_count >= self.max_retries:
                    logging.error(f"Job {msg_id_str} en {self.stream_key} superó max retries ({delivery_count}). Moviendo a DLQ.")
                    self._route_to_dlq(task_data, err, msg_id=msg_id_str)
                    self.r.xack(self.stream_key, self.group_name, msg_id)
                    self.r.xdel(self.stream_key, msg_id)
                else:
                    logging.warning(f"Job {msg_id_str} en {self.stream_key} falló (intento {delivery_count}/{self.max_retries}): {err}.")
            except Exception as f_err:
                logging.error(f"Error handling task failure for {msg_id_str}: {f_err}")

        return task_data, ack_cb, fail_cb

    def _route_to_dlq(self, task_data, error, msg_id=None, is_legacy=False):
        try:
            dlq_entry = {
                "stream": self.stream_key,
                "msg_id": str(msg_id or "legacy"),
                "error": str(error),
                "payload": json.dumps(task_data),
                "traceback": traceback.format_exc(),
                "failed_at": datetime.utcnow().isoformat()
            }
            self.r.xadd("stream:dead_letter", {"data": json.dumps(dlq_entry)})
            self.r.rpush("queue:dead_letter", json.dumps(dlq_entry))
            self.r.publish("admin:canvas_events", json.dumps({
                "type": "job_dlq_alert",
                "stream": self.stream_key,
                "error": str(error),
                "timestamp": int(time.time())
            }))
            logging.info(f"Task successfully routed to Dead Letter Queue (DLQ).")
        except Exception as dlq_err:
            logging.error(f"Critical error sending to DLQ: {dlq_err}")

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
            logging.info(f"Binary state for canvas {canvas_id} not found in Redis. Attempting to load from DB/S3...")
            with db.cursor() as cursor:
                cursor.execute("SELECT snapshot_data, s3_key FROM canvas_snapshots WHERE canvas_id = %s LIMIT 1", (canvas_id,))
                snap_row = cursor.fetchone()
                if snap_row:
                    if snap_row.get('snapshot_data'):
                        try:
                            old_state = zlib.decompress(snap_row['snapshot_data'])
                        except Exception:
                            old_state = snap_row['snapshot_data']
                    elif snap_row.get('s3_key'):
                        try:
                            s3 = get_s3_client()
                            obj = s3.get_object(Bucket=S3_BUCKET, Key=snap_row['s3_key'])
                            old_state = zlib.decompress(obj['Body'].read())
                        except Exception as e:
                            logging.warning(f"Could not load snapshot from S3: {e}")
            if not old_state:
                logging.info(f"No existing snapshot found for canvas {canvas_id}. Generating empty state.")
                old_state = b'\x00\x00\x00\x00' * (old_w * old_h)

        actual_len = len(old_state)
        expected_size = old_w * old_h * 4

        if actual_len != expected_size:
            logging.warning(f"Desincronización detectada. Metadata esperaba {expected_size} bytes, Redis tiene {actual_len} bytes.")
            real_old_size = int(math.sqrt(actual_len // 4)) if actual_len >= 4 else 64
            logging.warning(f"Auto-correcting base size to {real_old_size}x{real_old_size} for correct processing.")
            old_w, old_h = real_old_size, real_old_size
            if actual_len < old_w * old_h * 4:
                old_state = old_state + (b'\x00\x00\x00\x00' * ((old_w * old_h * 4 - actual_len) // 4))

        # Vectorized array copy with NumPy (SIMD accelerated, zero Python loop overhead)
        old_arr = np.frombuffer(old_state, dtype=np.uint8).reshape((old_h, old_w, 4))
        new_arr = np.zeros((new_h, new_w, 4), dtype=np.uint8)
        
        limit_x = min(old_w, new_w)
        limit_y = min(old_h, new_h)
        
        new_arr[:limit_y, :limit_x] = old_arr[:limit_y, :limit_x]
        new_state_bytes = new_arr.tobytes()

        r.set(state_key, new_state_bytes)

        new_size_db_str = f"{new_w}x{new_h}"

        with db.cursor() as cursor:
            cursor.execute("UPDATE canvases SET size = %s WHERE id = %s", (new_size_db_str, canvas_id))
            compressed_state = zlib.compress(new_state_bytes)
            s3_key = f"active_snapshots/canvas_{canvas_id}.bin"
            try:
                s3 = get_s3_client()
                s3.put_object(Bucket=S3_BUCKET, Key=s3_key, Body=compressed_state)
            except Exception as s3_err:
                print(f"[!] Error uploading resized snapshot to S3: {s3_err}")
            cursor.execute("""
                INSERT INTO canvas_snapshots (canvas_id, s3_key, snapshot_data) 
                VALUES (%s, %s, NULL) ON DUPLICATE KEY UPDATE s3_key = %s, snapshot_data = NULL, last_updated = CURRENT_TIMESTAMP
            """, (canvas_id, s3_key, s3_key))
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
        logging.error(f"Error crítico en Resize: {str(e)}")
        if 'canvas_id' in locals():
            r.delete(f"canvas:{canvas_id}:resize_lock")
            r.publish("admin:canvas_events", json.dumps({
                "type": "canvas_resize_error", "canvas_id": canvas_id, "error": str(e)
            }))
        raise e

def resize_listener_thread():
    logging.info("Iniciando Hilo Listener de Resizes (Redis Streams + DLQ)...")
    r = None
    db = None
    consumer = None
    
    while True:
        try:
            if r is None: r = get_redis_client()
            if db is None: db = get_db_connection()
            if consumer is None:
                consumer = ResilientStreamConsumer(
                    r,
                    stream_key="stream:canvas_resizes",
                    group_name="group:canvas_resizes",
                    legacy_queue_key="canvases:pending_resizes",
                    max_retries=3,
                    claim_idle_ms=60000
                )
            
            task_data, ack_cb, fail_cb = consumer.fetch_task(block_ms=2000)
            if task_data is not None:
                try:
                    db.ping(reconnect=False)
                except Exception:
                    db = get_db_connection()
                
                try:
                    process_resize_task(r, db, task_data)
                    ack_cb()
                except Exception as proc_err:
                    logging.error(f"Error en process_resize_task: {proc_err}")
                    fail_cb(proc_err)
                
        except Exception as e:
            logging.error(f"Fallo en bucle de Resize Listener: {e}")
            db = None
            r = None
            consumer = None
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
        s3_key = f"active_snapshots/canvas_{canvas_id}.bin"
        try:
            s3 = get_s3_client()
            s3.put_object(Bucket=S3_BUCKET, Key=s3_key, Body=compressed_empty)
        except Exception as s3_err:
            print(f"[!] Error uploading empty snapshot to S3: {s3_err}")
        
        canvas_uuid = None
        with db.cursor() as cursor:
            cursor.execute("SELECT uuid FROM canvases WHERE id = %s", (canvas_id,))
            canvas_row = cursor.fetchone()
            if canvas_row:
                canvas_uuid = canvas_row['uuid']

            cursor.execute("""
                INSERT INTO canvas_snapshots (canvas_id, s3_key, snapshot_data, last_updated)
                VALUES (%s, %s, NULL, CURRENT_TIMESTAMP) ON DUPLICATE KEY UPDATE s3_key = %s, snapshot_data = NULL, last_updated = CURRENT_TIMESTAMP
            """, (canvas_id, s3_key, s3_key))
            db.commit()
            
        r.set(state_key, empty_state) 
        
        snapshot_path = os.path.join(SNAPSHOTS_DIR, f"canvas_{canvas_id}.png")
        if os.path.exists(snapshot_path):
            try:
                os.remove(snapshot_path)
                logging.info(f"Public image deleted for canvas {canvas_id}.")
            except Exception as e:
                logging.error(f"Could not delete public image {canvas_id}: {e}")
                
        # Delete S3 thumbnail
        if canvas_uuid:
            try:
                s3 = get_s3_client()
                s3.delete_object(Bucket=S3_BUCKET, Key=f"thumbnails/canvas_{canvas_uuid}.webp")
                logging.info(f"S3 thumbnail deleted for canvas {canvas_uuid}.")
            except Exception as e:
                logging.error(f"Could not delete S3 thumbnail for canvas {canvas_uuid}: {e}")

        # Delete local thumbnails
        for filename in [f"canvas_{canvas_id}.webp", f"canvas_{canvas_uuid}.webp" if canvas_uuid else None]:
            if not filename:
                continue
            local_thumb_path = os.path.join(THUMBNAILS_DIR, filename)
            if os.path.exists(local_thumb_path):
                try:
                    os.remove(local_thumb_path)
                    logging.info(f"Local thumbnail deleted: {filename}")
                except Exception as e:
                    logging.error(f"Could not delete local thumbnail {filename}: {e}")
        
        stream_key = f"canvas:{canvas_id}:stream"
        r.xadd(stream_key, {
            "type": "canvas_reset",
            "canvas_id": str(canvas_id),
            "size": str(canvas_size)
        })

        active_tl_path = os.path.join(BASE_DIR, 'storage', 'timelapses', f"canvas_{canvas_id}_active.jsonl")
        try:
            w_res, h_res = parse_size(canvas_size)
            with open(active_tl_path, "w", encoding="utf-8") as f_tl_reset:
                f_tl_reset.write(json.dumps({"t": int(time.time() * 1000), "type": "init", "w": w_res, "h": h_res}) + "\n")
        except Exception as tl_res_err:
            logging.error(f"Error resetting active timelapse for canvas {canvas_id}: {tl_res_err}")

        r.delete(f"canvas:{canvas_id}:reset_lock")
        r.publish("admin:canvas_events", json.dumps({"type": "canvas_cleared", "canvas_id": canvas_id, "next_reset_at": None}))
        logging.info(f"Canvas reset for {canvas_id} completed successfully.")

    except Exception as e:
        logging.error(f"Fatal error during reset of canvas {canvas_id}: {e}")
        r.delete(f"canvas:{canvas_id}:reset_lock")

def reset_listener_thread():
    logging.info("Iniciando Hilo Listener de Resets (Redis Streams + DLQ)...")
    r = None
    db = None
    consumer = None
    
    while True:
        try:
            if r is None: r = get_redis_client()
            if db is None: db = get_db_connection()
            if consumer is None:
                consumer = ResilientStreamConsumer(
                    r,
                    stream_key="stream:canvas_resets",
                    group_name="group:canvas_resets",
                    legacy_queue_key="canvases:pending_resets",
                    max_retries=3,
                    claim_idle_ms=60000
                )
            
            task_data, ack_cb, fail_cb = consumer.fetch_task(block_ms=2000)
            if task_data is not None:
                try:
                    db.ping(reconnect=False)
                except Exception:
                    db = get_db_connection()
                
                try:
                    process_reset_task(r, db, task_data)
                    ack_cb()
                except Exception as proc_err:
                    logging.error(f"Error en process_reset_task: {proc_err}")
                    fail_cb(proc_err)
                
        except Exception as e:
            logging.error(f"Fallo en bucle de Reset Listener: {e}")
            db = None
            r = None
            consumer = None
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
                    
                    resize_payload = {
                        'canvas_id': canvas_id, 'old_size': str(pr['old_size']), 'new_size': str(pr['target_size'])
                    }
                    r.xadd("stream:canvas_resizes", {"payload": json.dumps(resize_payload)})
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
                    
                    reset_payload = {
                        'canvas_id': canvas_id, 'take_snapshot': pr['take_snapshot'], 'canvas_size': str(pr['canvas_size'])
                    }
                    r.xadd("stream:canvas_resets", {"payload": json.dumps(reset_payload)})
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
                    
                    forced_reset_payload = {
                        'canvas_id': canvas_id, 'take_snapshot': take_snapshot, 'canvas_size': str(res['size']) if res else '64x64'
                    }
                    r.xadd("stream:canvas_resets", {"payload": json.dumps(forced_reset_payload)})
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
                            s3_key = f"active_snapshots/canvas_{canvas_id}.bin"
                            s3 = get_s3_client()
                            s3.put_object(Bucket=S3_BUCKET, Key=s3_key, Body=compressed_state)
                            cursor.execute("""
                                INSERT INTO canvas_snapshots (canvas_id, s3_key, snapshot_data, last_updated)
                                VALUES (%s, %s, NULL, CURRENT_TIMESTAMP) ON DUPLICATE KEY UPDATE s3_key = %s, snapshot_data = NULL, last_updated = CURRENT_TIMESTAMP
                            """, (canvas_id, s3_key, s3_key))
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

PALETTES_FILE_PATH = get_absolute_path("PALETTES_FILE_PATH", "/var/www/html/public/assets/data/palettes.json")
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

_cassandra_cluster = None
_cassandra_session = None

def get_cassandra_session():
    global _cassandra_cluster, _cassandra_session
    if _cassandra_session is not None:
        try:
            return _cassandra_session
        except Exception:
            _cassandra_session = None
            _cassandra_cluster = None
            
    try:
        from cassandra.cluster import Cluster
        CASSANDRA_HOST = os.getenv("CASSANDRA_HOST") or "cassandra"
        CASSANDRA_PORT = int(os.getenv("CASSANDRA_PORT") or 9042)
        CASSANDRA_KEYSPACE = os.getenv("CASSANDRA_KEYSPACE") or "db_canvases_nosql"
        logging.info(f"Connecting to Cassandra at {CASSANDRA_HOST}:{CASSANDRA_PORT}...")
        _cassandra_cluster = Cluster([CASSANDRA_HOST], port=CASSANDRA_PORT, connect_timeout=10)
        _cassandra_session = _cassandra_cluster.connect()
        _cassandra_session.set_keyspace(CASSANDRA_KEYSPACE)
        logging.info("Cassandra session cached successfully.")
        return _cassandra_session
    except Exception as e:
        logging.error(f"Failed to connect to Cassandra in Canvas Jobs worker: {e}")
        _cassandra_cluster = None
        _cassandra_session = None
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
            
        img = Image.frombytes('RGBA', (width, height), raw_bytes)
            
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
        bg_thumb.save(thumb_io, "WEBP", quality=80)
        thumb_io.seek(0)
        s3 = get_s3_client()
        try:
            s3.put_object(Bucket=S3_BUCKET, Key=f"thumbnails/canvas_{canvas_uuid}.webp", Body=thumb_io, ContentType='image/webp')
        except Exception as e:
            print(f"[!] Error uploading thumbnail to S3: {e}")
            return False

        # S3 upload successful. Local saving skipped since CanvasRepository now loads directly from S3/MinIO.
        pass

        
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

                        owner_id = None
                        try:
                            cur_owner = db_conn.cursor()
                            cur_owner.execute("SELECT owner_id FROM canvases WHERE id = %s", (canvas_id,))
                            row_o = cur_owner.fetchone()
                            if row_o:
                                owner_id = row_o[0]
                            cur_owner.close()
                        except Exception:
                            pass

                        for rec in oldest_recs:
                            old_id = rec['id'] if isinstance(rec, dict) else rec[0]
                            old_file = rec['file_path'] if isinstance(rec, dict) else rec[1]

                            if old_file:
                                try: s3.delete_object(Bucket=S3_BUCKET, Key=old_file.lstrip('/'))
                                except Exception: pass

                            try:
                                cursor_rm = db_conn.cursor()
                                cursor_rm.execute("DELETE FROM canvas_snapshots_history WHERE id = %s", (old_id,))
                                if owner_id:
                                    try:
                                        cursor_rm.execute("""
                                            UPDATE db_identity.users 
                                            SET storage_used_bytes = GREATEST(0, storage_used_bytes - 51200) 
                                            WHERE id = %s
                                        """, (owner_id,))
                                    except Exception:
                                        pass
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
            
            # Archive and freeze active timelapse JSONL for this snapshot
            timelapse_path_s3 = None
            active_tl_path = os.path.join(BASE_DIR, 'storage', 'timelapses', f"canvas_{canvas_id}_active.jsonl")
            snap_tl_dir = os.path.join(BASE_DIR, 'storage', 'timelapses', 'snapshots')
            os.makedirs(snap_tl_dir, exist_ok=True)
            snap_tl_path = os.path.join(snap_tl_dir, f"{snapshot_uuid}.jsonl")

            timelapse_data = None
            if os.path.exists(active_tl_path):
                try:
                    with open(active_tl_path, "r", encoding="utf-8") as f_in:
                        timelapse_data = f_in.read()
                except Exception as e:
                    print(f"[!] Error reading active timelapse for canvas {canvas_id}: {e}")

            if not timelapse_data:
                try:
                    s3_active_tl = s3.get_object(Bucket=S3_BUCKET, Key=f"timelapses/canvas_{canvas_id}_active.jsonl")
                    timelapse_data = s3_active_tl['Body'].read().decode('utf-8')
                except Exception:
                    timelapse_data = None

            if not timelapse_data:
                w_snap, h_snap = parse_size(size_str)
                timelapse_data = json.dumps({"t": int(time.time() * 1000), "type": "init", "w": w_snap, "h": h_snap}) + "\n"

            try:
                with open(snap_tl_path, "w", encoding="utf-8") as f_snap_out:
                    f_snap_out.write(timelapse_data)
            except Exception as snap_write_err:
                print(f"[!] Error writing local snapshot timelapse: {snap_write_err}")

            s3_timelapse_key = f"snapshots_timelapse/{canvas_uuid}/{snapshot_uuid}.jsonl"
            try:
                s3.put_object(
                    Bucket=S3_BUCKET,
                    Key=s3_timelapse_key,
                    Body=timelapse_data.encode('utf-8'),
                    ContentType="application/x-ndjson"
                )
                timelapse_path_s3 = s3_timelapse_key
                print(f"[+] Snapshot timelapse saved to S3: {s3_timelapse_key}")
            except Exception as s3_snap_tl_err:
                print(f"[!] Error uploading snapshot timelapse to S3: {s3_snap_tl_err}")

            try:
                cursor = db_conn.cursor()
                insert_query = """
                    INSERT INTO canvas_snapshots_history (canvas_id, snapshot_uuid, file_path, timelapse_path)
                    VALUES (%s, %s, %s, %s)
                """
                cursor.execute(insert_query, (canvas_id, snapshot_uuid, public_filepath, timelapse_path_s3))
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
                            SELECT s.snapshot_data, c.size, c.palette_id, IFNULL(u.subscription_tier, 2) as tier, c.uuid, s.s3_key
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
                                if not snapshot_data and result[5]:
                                    try:
                                        s3 = get_s3_client()
                                        s3_obj = s3.get_object(Bucket=S3_BUCKET, Key=result[5])
                                        snapshot_data = s3_obj['Body'].read()
                                    except Exception as s3_err:
                                        print(f"[!] Error fetching active snapshot from S3 for canvas {canvas_id}: {s3_err}")
                                        snapshot_data = None
                                
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
                                    # Invalidate home feed cache so home.php reflects the new thumbnail
                                    try:
                                        feed_cache_pattern = "canvases:home:feed:*"
                                        feed_keys = r.keys(feed_cache_pattern)
                                        if feed_keys:
                                            r.delete(*feed_keys)
                                            print(f"[+] Home feed cache invalidated: {len(feed_keys)} key(s) cleared.")
                                        # Store thumbnail version timestamp (cache-buster for browser)
                                        import time as _time
                                        r.set(f"canvas:{canvas_uuid}:thumbnail_version", int(_time.time()))
                                        print(f"[+] Thumbnail version timestamp set for canvas_uuid={canvas_uuid}")
                                    except Exception as cache_err:
                                        print(f"[!] Could not invalidate home feed cache: {cache_err}")
                            else:
                                r.srem("canvases:pending_snapshots", canvas_id)
                        else:
                            r.srem("canvases:pending_snapshots", canvas_id)
                            
                    cursor.close()
                    db_conn.close()
        except Exception as e:
            print(f"[!] Error in main cycle of Snapshot Worker: {e}")

        time.sleep(SYNC_INTERVAL)

import urllib.parse

def execute_canvas_draw_image(r, canvas_id, image_path, start_x, start_y, target_w, target_h, rotate_angle, user_id=None):
    logging.info(f"Fetching canvas info for ID {canvas_id}...")
    db_conn = get_db_connection()
    try:
        with db_conn.cursor() as cursor:
            cursor.execute("SELECT size FROM canvases WHERE id = %s", (canvas_id,))
            canvas_row = cursor.fetchone()
    finally:
        db_conn.close()

    if not canvas_row:
        raise Exception(f"Canvas with ID {canvas_id} does not exist.")

    size_str = canvas_row.get('size', '100x100')
    try:
        width, height = map(int, size_str.split('x'))
    except Exception:
        width, height = 100, 100
        
    logging.info(f"Canvas ID {canvas_id} dimensions: {width}x{height}")

    img = Image.open(image_path).convert("RGBA")

    # Resize if specified
    if target_w > 0 and target_h > 0:
        img = img.resize((target_w, target_h), Image.Resampling.LANCZOS)
        
    # Rotate if specified
    if rotate_angle != 0:
        img = img.rotate(-rotate_angle, expand=True, resample=Image.Resampling.BICUBIC)
        new_w, new_h = img.size
        cx = start_x + (target_w / 2.0 if target_w > 0 else img.width / 2.0)
        cy = start_y + (target_h / 2.0 if target_h > 0 else img.height / 2.0)
        start_x = int(cx - new_w / 2.0)
        start_y = int(cy - new_h / 2.0)

    img_width, img_height = img.size
    logging.info(f"Processed image dimensions: {img_width}x{img_height}")

    state_key = f"canvas:{canvas_id}:state"
    raw_state = r.get(state_key)
    
    expected_size = width * height * 4
    if not raw_state or len(raw_state) != expected_size:
        logging.warning(f"Redis state for canvas {canvas_id} size mismatch or missing. Checking cold storage snapshot.")
        db_conn_snap = get_db_connection()
        try:
            with db_conn_snap.cursor() as cursor:
                cursor.execute("SELECT snapshot_data, s3_key FROM canvas_snapshots WHERE canvas_id = %s LIMIT 1", (canvas_id,))
                snap_row = cursor.fetchone()
                if snap_row:
                    if snap_row.get('s3_key'):
                        try:
                            s3_client = get_s3_client()
                            s3_obj = s3_client.get_object(Bucket=S3_BUCKET, Key=snap_row['s3_key'])
                            raw_state = zlib.decompress(s3_obj['Body'].read())
                        except Exception:
                            raw_state = None
                    if not raw_state and snap_row.get('snapshot_data'):
                        try:
                            raw_state = zlib.decompress(snap_row['snapshot_data'])
                        except Exception:
                            raw_state = None
        except Exception as snap_fetch_err:
            logging.error(f"Error fetching snapshot for canvas {canvas_id}: {snap_fetch_err}")
        finally:
            db_conn_snap.close()

        if not raw_state or len(raw_state) != expected_size:
            logging.warning(f"Snapshot not found or size mismatch. Resetting buffer.")
            raw_state = b'\x00\x00\x00\x00' * (width * height)

    # 1. High performance NumPy vectorization for blending
    canvas_arr = np.frombuffer(raw_state, dtype=np.uint8).reshape((height, width, 4)).copy()
    img_arr = np.array(img, dtype=np.uint8) # Shape: (img_height, img_width, 4)
    
    # Calculate clipping boundaries
    c_x1 = max(0, start_x)
    c_y1 = max(0, start_y)
    c_x2 = min(width, start_x + img_width)
    c_y2 = min(height, start_y + img_height)
    
    changed = 0
    pixels_to_persist = []
    affected_chunks = []
    chunk_crc_map = {}
    CHUNK_SIZE = 512
    
    if c_x1 < c_x2 and c_y1 < c_y2:
        img_x1 = c_x1 - start_x
        img_y1 = c_y1 - start_y
        img_x2 = img_x1 + (c_x2 - c_x1)
        img_y2 = img_y1 + (c_y2 - c_y1)
        
        img_sub = img_arr[img_y1:img_y2, img_x1:img_x2]
        canvas_sub = canvas_arr[c_y1:c_y2, c_x1:c_x2]
        
        # Alpha mask (alpha >= 128)
        alpha_mask = img_sub[..., 3] >= 128
        
        if np.any(alpha_mask):
            # Opaque replacement: set alpha to 255
            replacement = img_sub.copy()
            replacement[..., 3] = 255
            
            # Vectorized assignment
            canvas_sub[alpha_mask] = replacement[alpha_mask]
            canvas_arr[c_y1:c_y2, c_x1:c_x2] = canvas_sub
            changed = int(np.count_nonzero(alpha_mask))
            
            # Calculate affected chunks
            min_chunk_x = c_x1 // CHUNK_SIZE
            max_chunk_x = (c_x2 - 1) // CHUNK_SIZE
            min_chunk_y = c_y1 // CHUNK_SIZE
            max_chunk_y = (c_y2 - 1) // CHUNK_SIZE
            
            chunk_set = set()
            for cy in range(min_chunk_y, max_chunk_y + 1):
                for cx in range(min_chunk_x, max_chunk_x + 1):
                    chunk_set.add(f"{cx},{cy}")
            affected_chunks = sorted(list(chunk_set))
            chunk_crc_map = compute_chunk_crc_map(canvas_arr, affected_chunks, CHUNK_SIZE)
            
            # Extract coordinates for Cassandra persistence in batch
            if user_id is not None:
                ys, xs = np.where(alpha_mask)
                global_xs = c_x1 + xs
                global_ys = c_y1 + ys
                colors = img_sub[alpha_mask]
                for gx, gy, col in zip(global_xs, global_ys, colors):
                    c_hex = f"#{col[0]:02x}{col[1]:02x}{col[2]:02x}"
                    pixels_to_persist.append((int(gx), int(gy), c_hex))

    logging.info(f"Saving new state to Redis ({changed} new pixels in {len(affected_chunks)} chunks)...")
    r.set(state_key, canvas_arr.tobytes())
    r.sadd("canvases:dirty_states", canvas_id)
    logging.info("Image drawing successfully completed.")

    if pixels_to_persist and user_id is not None:
        try:
            session = get_cassandra_session()
            if session:
                from cassandra.query import BatchStatement
                logging.info(f"Persisting {len(pixels_to_persist)} template pixels using cached Cassandra session...")
                insert_stmt = session.prepare("""
                    INSERT INTO canvas_pixel_history (canvas_id, x, y, placed_at, user_id, color_hex)
                    VALUES (?, ?, ?, ?, ?, ?)
                """)
                
                batch_size = 500
                placed_at = datetime.now()
                
                for i in range(0, len(pixels_to_persist), batch_size):
                    chunk = pixels_to_persist[i:i + batch_size]
                    batch = BatchStatement()
                    for cx, cy, c_hex in chunk:
                        batch.add(insert_stmt, (
                            int(canvas_id),
                            cx,
                            cy,
                            placed_at,
                            int(user_id),
                            c_hex
                        ))
                    session.execute(batch)
                logging.info(f"Successfully persisted {len(pixels_to_persist)} template pixels to Cassandra.")
            else:
                logging.error("Unable to persist to Cassandra: no cached session available.")
        except Exception as cass_err:
            logging.error(f"Error persisting template pixels to Cassandra: {cass_err}")
            global _cassandra_cluster, _cassandra_session
            _cassandra_cluster = None
            _cassandra_session = None

        # Increment total_pixels counter in MySQL canvases table
        db_conn = get_db_connection()
        if db_conn:
            try:
                with db_conn.cursor() as cursor:
                    cursor.execute("UPDATE canvases SET total_pixels = total_pixels + %s WHERE id = %s", (len(pixels_to_persist), canvas_id))
                db_conn.commit()
                logging.info(f"Updated total_pixels count in MySQL by {len(pixels_to_persist)}")
            except Exception as sql_err:
                logging.error(f"Error updating total_pixels count in MySQL: {sql_err}")
            finally:
                db_conn.close()

    return {
        "changed": changed,
        "affected_chunks": affected_chunks,
        "chunk_crc_map": chunk_crc_map
    }

def draw_image_listener_thread():
    logging.info("Starting Draw Image listener thread (Redis Streams + DLQ)...")
    r = None
    consumer = None
    while True:
        try:
            if r is None:
                r = get_redis_client()
                consumer = ResilientStreamConsumer(
                    r,
                    stream_key="stream:canvas_draw_image",
                    group_name="group:canvas_draw_image",
                    legacy_queue_key="queue:canvas_draw_image",
                    max_retries=3,
                    claim_idle_ms=60000
                )
            
            task_data, ack_cb, fail_cb = consumer.fetch_task(block_ms=2000)
            if task_data is not None:
                url = task_data.get('url')
                canvas_id = task_data.get('canvas_id')
                user_id = task_data.get('user_id')
                x = int(task_data.get('x', 0))
                y = int(task_data.get('y', 0))
                w = int(task_data.get('w', 0))
                h = int(task_data.get('h', 0))
                angle = float(task_data.get('angle', 0))
                
                logging.info(f"Received draw_image task for canvas {canvas_id} at {x},{y} w={w} h={h} a={angle} user={user_id}")
                
                inject_lock_key = f"canvas:{canvas_id}:inject_lock"
                r.setex(inject_lock_key, 60, "1")
                r.publish("admin:canvas_events", json.dumps({
                    "type": "canvas_locked_inject", "canvas_id": canvas_id
                }))
                
                temp_path = None
                try:
                    bucket = os.getenv('AWS_BUCKET')
                    public_url = os.getenv('AWS_PUBLIC_URL', '').rstrip('/')
                    key = url.replace(f"{public_url}/{bucket}/", "")
                    key = urllib.parse.urlparse(key).path.lstrip('/')
                    
                    s3_client = get_s3_client()
                    
                    import tempfile
                    with tempfile.NamedTemporaryFile(delete=False, suffix='.png') as temp_file:
                        temp_path = temp_file.name
                        s3_client.download_file(bucket, key, temp_path)
                    
                    logging.info(f"Drawing template image in-process for canvas {canvas_id}...")
                    draw_res = execute_canvas_draw_image(r, canvas_id, temp_path, x, y, w, h, angle, user_id=user_id)
                    affected_chunks = draw_res.get('affected_chunks', [])
                    chunk_crc_map = draw_res.get('chunk_crc_map', {})
                    
                    # Broadcast completed event so frontend reloads only dirty chunks
                    r.publish("admin:canvas_events", json.dumps({
                        "type": "canvas_inject_completed", "canvas_id": canvas_id,
                        "affected_chunks": affected_chunks,
                        "chunk_crc_map": chunk_crc_map,
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
                    ack_cb()
                    
                except Exception as draw_err:
                    logging.error(f"Error in draw_image processing: {draw_err}")
                    r.publish("admin:canvas_events", json.dumps({
                        "type": "canvas_inject_error", "canvas_id": canvas_id, "error": str(draw_err)
                    }))
                    fail_cb(draw_err)
                finally:
                    if temp_path and os.path.exists(temp_path):
                        try:
                            os.remove(temp_path)
                        except Exception:
                            pass
                    r.delete(inject_lock_key)
                    
        except Exception as e:
            logging.error(f"Error in Draw Image listener: {e}")
            r = None
            consumer = None
            time.sleep(2)

def timelapse_video_listener_thread():
    logging.info("Starting Timelapse Video Export listener thread (Redis Streams + DLQ)...")
    r = None
    consumer = None
    while True:
        try:
            if r is None:
                r = get_redis_client()
                consumer = ResilientStreamConsumer(
                    r,
                    stream_key="stream:canvas_timelapse_video",
                    group_name="group:canvas_timelapse_video",
                    legacy_queue_key="queue:canvas_timelapse_video",
                    max_retries=3,
                    claim_idle_ms=300000
                )
            
            task_data, ack_cb, fail_cb = consumer.fetch_task(block_ms=2000)
            if task_data is not None:
                snapshot_uuid = task_data.get('snapshot_uuid')
                canvas_uuid = task_data.get('canvas_uuid', 'default')
                duration = float(task_data.get('duration', 30))
                quality = str(task_data.get('quality', '1080p')).lower()
                fps = int(task_data.get('fps', 30))
                
                quality_map = {
                    '720p': 1280,
                    '1080p': 1920,
                    '4k': 3840
                }
                target_max_dim = int(task_data.get('target_max_dim', quality_map.get(quality, 1920)))
                
                logging.info(f"Received timelapse MP4 export task for snapshot {snapshot_uuid} (duration: {duration}s, quality: {quality}, target_max_dim: {target_max_dim})")
                
                if not render_timelapse_to_mp4:
                    err_msg = "render_timelapse_to_mp4 function not available"
                    logging.error(err_msg)
                    fail_cb(Exception(err_msg))
                    continue

                local_jsonl = os.path.join(BASE_DIR, 'storage', 'timelapses', 'snapshots', f"{snapshot_uuid}.jsonl")
                s3_key_jsonl = f"snapshots_timelapse/{canvas_uuid}/{snapshot_uuid}.jsonl"
                
                s3 = get_s3_client()
                if not os.path.exists(local_jsonl):
                    try:
                        os.makedirs(os.path.dirname(local_jsonl), exist_ok=True)
                        s3.download_file(S3_BUCKET, s3_key_jsonl, local_jsonl)
                    except Exception as dl_err:
                        logging.error(f"Could not download snapshot JSONL {s3_key_jsonl}: {dl_err}")
                
                if not os.path.exists(local_jsonl):
                    r.setex(f"video:snapshot:{snapshot_uuid}:{int(duration)}:{quality}", 60, json.dumps({
                        "status": "error", "message": "Timelapse data not found"
                    }))
                    fail_cb(Exception(f"Timelapse data not found for snapshot {snapshot_uuid}"))
                    continue
                
                local_video_dir = os.path.join(BASE_DIR, 'storage', 'timelapses', 'videos')
                os.makedirs(local_video_dir, exist_ok=True)
                local_video_path = os.path.join(local_video_dir, f"{snapshot_uuid}_{int(duration)}s_{quality}.mp4")
                
                lock_key = f"lock:timelapse_job:{snapshot_uuid}_{int(duration)}s_{quality}"
                max_timeout = 90 if quality != '4k' else 150

                try:
                    render_res = render_timelapse_to_mp4(
                        local_jsonl, 
                        local_video_path, 
                        duration_seconds=duration, 
                        target_max_dim=target_max_dim, 
                        fps=fps,
                        max_timeout_sec=max_timeout
                    )
                    
                    s3_video_key = f"snapshots_videos/{canvas_uuid}/{snapshot_uuid}_{int(duration)}s_{quality}.mp4"
                    try:
                        with open(local_video_path, 'rb') as f_vid:
                            s3.put_object(
                                Bucket=S3_BUCKET,
                                Key=s3_video_key,
                                Body=f_vid,
                                ContentType='video/mp4'
                            )
                        logging.info(f"[+] Timelapse MP4 uploaded to S3: {s3_video_key}")
                    except Exception as s3_vid_err:
                        logging.warning(f"[!] Could not upload timelapse MP4 to S3: {s3_vid_err}")
                    
                    public_url = os.getenv('AWS_PUBLIC_URL', '').rstrip('/')
                    if public_url:
                        full_url = f"{public_url}/{S3_BUCKET}/{s3_video_key}?v={int(time.time())}"
                    else:
                        full_url = f"/storage/timelapses/videos/{snapshot_uuid}_{int(duration)}s_{quality}.mp4?v={int(time.time())}"
                    
                    res_payload = {
                        "status": "ready",
                        "url": full_url,
                        "s3_key": s3_video_key,
                        "duration": render_res["duration"],
                        "quality": quality,
                        "width": render_res["width"],
                        "height": render_res["height"],
                        "size_bytes": render_res["size_bytes"]
                    }
                    r.setex(f"video:snapshot:{snapshot_uuid}:{int(duration)}:{quality}", 86400 * 7, json.dumps(res_payload))
                    r.setex(f"video:snapshot:{snapshot_uuid}:{int(duration)}", 86400 * 7, json.dumps(res_payload))
                    r.publish(f"timelapse:video_ready:{snapshot_uuid}:{int(duration)}:{quality}", json.dumps(res_payload))
                    r.publish(f"timelapse:video_ready:{snapshot_uuid}:{int(duration)}", json.dumps(res_payload))
                    logging.info(f"[+] Timelapse video task completed for snapshot {snapshot_uuid} in {render_res.get('elapsed_seconds', '?')}s")
                    ack_cb()
                except Exception as render_err:
                    logging.error(f"[!] Timelapse render failed or timed out for {snapshot_uuid}: {render_err}")
                    err_payload = {
                        "status": "error",
                        "message": f"Error al generar video timelapse ({str(render_err)})"
                    }
                    r.setex(f"video:snapshot:{snapshot_uuid}:{int(duration)}:{quality}", 60, json.dumps(err_payload))
                    r.publish(f"timelapse:video_ready:{snapshot_uuid}:{int(duration)}:{quality}", json.dumps(err_payload))
                    fail_cb(render_err)
                finally:
                    try:
                        r.delete(lock_key)
                    except Exception:
                        pass
                    
        except Exception as e:
            logging.error(f"Error in Timelapse Video listener: {e}")
            r = None
            consumer = None
            time.sleep(2)

if __name__ == "__main__":
    logging.info("INICIANDO WORKER UNIFICADO DE CANVAS (RESETS, RESIZES, THUMBNAILS, VIDEOS)...")
    
    threading.Thread(target=resize_listener_thread, daemon=True, name="Thread-Resize").start()
    threading.Thread(target=reset_listener_thread, daemon=True, name="Thread-Reset").start()
    threading.Thread(target=scheduler_thread, daemon=True, name="Thread-Scheduler").start()
    threading.Thread(target=thumbnails_thread, daemon=True, name="Thread-Thumbnails").start()
    threading.Thread(target=draw_image_listener_thread, daemon=True, name="Thread-DrawImage").start()
    threading.Thread(target=timelapse_video_listener_thread, daemon=True, name="Thread-TimelapseVideo").start()
    
    while True:
        time.sleep(1)
