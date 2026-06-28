# scripts/worker_canvas_operations.py
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

logging.basicConfig(level=logging.INFO, format='%(asctime)s [%(threadName)s] %(levelname)s: %(message)s')

# Configuraciones Globales
DB_HOST = os.getenv("DB_HOST", "db")
DB_PORT = int(os.getenv("DB_PORT", 3306))
DB_USER = os.getenv("DB_USER", "system_web_executor")
DB_PASS = os.getenv("DB_PASS", "")
DB_NAME = os.getenv("DB_CANVASES_NAME", "db_canvases")

REDIS_HOST = os.getenv("REDIS_HOST", "redis")
REDIS_PORT = int(os.getenv("REDIS_PORT", 6379))
REDIS_PASS = os.getenv("REDIS_PASS", None)

SNAPSHOTS_DIR = os.getenv("SNAPSHOTS_DIR", "/app/storage/public/snapshots")
SYNC_INTERVAL = int(os.getenv("WORKER_RESETS_SYNC_INTERVAL", 10))

def get_redis_client():
    return redis.Redis(host=REDIS_HOST, port=REDIS_PORT, password=REDIS_PASS)

def get_db_connection():
    return pymysql.connect(
        host=DB_HOST, port=DB_PORT, user=DB_USER, password=DB_PASS, database=DB_NAME,
        cursorclass=pymysql.cursors.DictCursor
    )

# ==========================================
# 1. EJECUTOR DE REDIMENSIONES (RESIZE)
# ==========================================
def process_resize_task(r, db, task_data):
    try:
        canvas_id = int(task_data.get('canvas_id'))
        old_size_meta = int(task_data.get('old_size'))
        new_size = int(task_data.get('new_size'))

        logging.info(f"Redimensionando lienzo {canvas_id} hacia {new_size}x{new_size}")

        state_key = f"canvas:{canvas_id}:state"
        old_state = r.get(state_key)

        if not old_state:
            raise ValueError(f"Estado binario no encontrado para lienzo {canvas_id}.")

        actual_len = len(old_state)
        expected_size = old_size_meta * old_size_meta

        # AUTO-CORRECCIÓN SI HAY DESINCRONIZACIÓN ENTRE DB Y REDIS
        if actual_len != expected_size:
            logging.warning(f"Desincronización detectada. Metadata esperaba {expected_size} bytes, Redis tiene {actual_len} bytes.")
            real_old_size = int(math.sqrt(actual_len))
            logging.warning(f"Auto-corrigiendo tamaño base a {real_old_size}x{real_old_size} para procesar correctamente.")
            old_size = real_old_size
        else:
            old_size = old_size_meta

        # Transformación Matemática Binaria
        new_state = bytearray([255] * (new_size * new_size))
        limit = min(old_size, new_size)
        
        for y in range(limit):
            for x in range(limit):
                old_idx = (y * old_size) + x
                new_idx = (y * new_size) + x
                new_state[new_idx] = old_state[old_idx]

        new_state_bytes = bytes(new_state)
        r.set(state_key, new_state_bytes)

        with db.cursor() as cursor:
            cursor.execute("UPDATE canvases SET size = %s WHERE id = %s", (new_size, canvas_id))
            compressed_state = zlib.compress(new_state_bytes)
            cursor.execute("""
                INSERT INTO canvas_snapshots (canvas_id, snapshot_data) 
                VALUES (%s, %s) ON DUPLICATE KEY UPDATE snapshot_data = %s, last_updated = CURRENT_TIMESTAMP
            """, (canvas_id, compressed_state, compressed_state))
            db.commit()

        # Limpiar y notificar
        r.delete(f"canvas:{canvas_id}:resize_lock")
        r.publish("admin:canvas_events", json.dumps({
            "type": "canvas_resize_completed", "canvas_id": canvas_id, "new_size": new_size
        }))
        logging.info(f"Redimensión de lienzo {canvas_id} completada exitosamente.")

    except Exception as e:
        logging.error(f"Error crítico en Resize: {str(e)}")
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
            # Inicialización Lazy
            if r is None: r = get_redis_client()
            if db is None: db = get_db_connection()
            
            # Reconexión manual (Fix de PyMySQL Deprecation)
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

# ==========================================
# 2. EJECUTOR DE REINICIOS (RESETS)
# ==========================================
def process_reset_task(r, db, task_data):
    canvas_id = task_data['canvas_id']
    take_snapshot = task_data.get('take_snapshot', 1)
    canvas_size = task_data.get('canvas_size', 64)
    
    logging.info(f"Iniciando reseteo para lienzo ID {canvas_id}.")

    try:
        # Respaldar estado actual
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

        # Solicitar Snapshot en Alta Calidad si aplica
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

        # Crear matriz en blanco
        size_int = int(str(canvas_size).split('x')[0]) if 'x' in str(canvas_size) else int(canvas_size)
        empty_state = bytes([255] * (size_int * size_int))
        compressed_empty = zlib.compress(empty_state)
        
        # Limpiar DB y Redis
        with db.cursor() as cursor:
            cursor.execute("""
                INSERT INTO canvas_snapshots (canvas_id, snapshot_data, last_updated)
                VALUES (%s, %s, CURRENT_TIMESTAMP) ON DUPLICATE KEY UPDATE snapshot_data = %s, last_updated = CURRENT_TIMESTAMP
            """, (canvas_id, compressed_empty, compressed_empty))
            db.commit()
            
        r.set(state_key, empty_state) 
        
        # Eliminar snapshot público
        snapshot_path = os.path.join(SNAPSHOTS_DIR, f"canvas_{canvas_id}.png")
        if os.path.exists(snapshot_path):
            try:
                os.remove(snapshot_path)
                logging.info(f"Imagen pública eliminada para lienzo {canvas_id}.")
            except Exception as e:
                logging.error(f"No se pudo eliminar imagen pública {canvas_id}: {e}")
        
        # Liberar y notificar
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
            
            # Reconexión manual (Fix de PyMySQL Deprecation)
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

# ==========================================
# 3. PROGRAMADOR MAESTRO (SCHEDULER)
# ==========================================
def scheduler_thread():
    logging.info("Iniciando Hilo Scheduler Maestro (Cron)...")
    r = None
    db = None
    
    while True:
        try:
            if r is None: r = get_redis_client()
            if db is None: db = get_db_connection()
            
            # Reconexión manual (Fix de PyMySQL Deprecation)
            try:
                db.ping(reconnect=False)
            except Exception:
                db = get_db_connection()
            
            with db.cursor() as cursor:
                # A) Procesar Resizes Programados
                cursor.execute("""
                    SELECT rs.canvas_id, rs.target_size, rs.timer_action, c.size as old_size
                    FROM canvas_resize_settings rs JOIN canvases c ON rs.canvas_id = c.id
                    WHERE rs.is_active = 1 AND rs.next_resize_at <= UTC_TIMESTAMP()
                """)
                for pr in cursor.fetchall():
                    canvas_id = pr['canvas_id']
                    logging.info(f"Programador: Disparando Resize para lienzo {canvas_id}")
                    
                    r.lpush("canvases:pending_resizes", json.dumps({
                        'canvas_id': canvas_id, 'old_size': int(pr['old_size']), 'new_size': int(pr['target_size'])
                    }))
                    r.setex(f"canvas:{canvas_id}:resize_lock", 60, "1")
                    r.publish("admin:canvas_events", json.dumps({
                        'type': 'canvas_locked_resize', 'canvas_id': canvas_id, 'new_size': int(pr['target_size'])
                    }))
                    cursor.execute("UPDATE canvas_resize_settings SET is_active = 0 WHERE canvas_id = %s", (canvas_id,))
                    if pr['timer_action'] in ['stop', 'none']:
                        r.delete(f"canvas:next_resize:{canvas_id}")
                
                # B) Procesar Resets Programados
                cursor.execute("""
                    SELECT r.canvas_id, r.take_snapshot, r.timer_action, c.size as canvas_size 
                    FROM canvas_reset_settings r JOIN canvases c ON r.canvas_id = c.id
                    WHERE r.is_active = 1 AND r.next_reset_at <= UTC_TIMESTAMP()
                """)
                for pr in cursor.fetchall():
                    canvas_id = pr['canvas_id']
                    logging.info(f"Programador: Disparando Reset para lienzo {canvas_id}")
                    
                    r.lpush("canvases:pending_resets", json.dumps({
                        'canvas_id': canvas_id, 'take_snapshot': pr['take_snapshot'], 'canvas_size': pr['canvas_size']
                    }))
                    r.setex(f"canvas:{canvas_id}:reset_lock", 300, "1")
                    r.publish("admin:canvas_events", json.dumps({"type": "canvas_locked", "canvas_id": canvas_id}))
                    cursor.execute("UPDATE canvas_reset_settings SET is_active = 0 WHERE canvas_id = %s", (canvas_id,))
                    r.delete(f"canvas:next_reset:{canvas_id}")
                
                # C) Procesar Resets Forzados Manuales (Desde el Panel de Admin)
                force_resets = r.smembers("canvases:force_resets")
                for b_canvas_id in force_resets:
                    canvas_id = int(b_canvas_id)
                    logging.info(f"Programador: Disparando Reset FORZADO para lienzo {canvas_id}")
                    cursor.execute("SELECT size FROM canvases WHERE id = %s", (canvas_id,))
                    res = cursor.fetchone()
                    
                    r.lpush("canvases:pending_resets", json.dumps({
                        'canvas_id': canvas_id, 'take_snapshot': 1, 'canvas_size': res['size'] if res else 64
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

if __name__ == "__main__":
    logging.info("INICIANDO WORKER UNIFICADO DE OPERACIONES DE LIENZO (RESETS & RESIZES)...")
    
    # Iniciar los hilos como Daemons para que mueran si el proceso principal se apaga
    threading.Thread(target=resize_listener_thread, daemon=True, name="Thread-Resize").start()
    threading.Thread(target=reset_listener_thread, daemon=True, name="Thread-Reset").start()
    threading.Thread(target=scheduler_thread, daemon=True, name="Thread-Scheduler").start()
    
    # Mantener el proceso principal vivo
    while True:
        time.sleep(1)