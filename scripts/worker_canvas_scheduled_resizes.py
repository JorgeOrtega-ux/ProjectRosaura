# scripts/worker_canvas_scheduled_resizes.py
import time
import os
import json
import logging
import mysql.connector
import redis
from datetime import datetime

logging.basicConfig(level=logging.INFO, format='%(asctime)s - WORKER SCHEDULED RESIZES - %(levelname)s - %(message)s')

DB_HOST = 'db'
DB_USER = os.getenv('DB_USER', 'rosaura_user')
DB_PASS = os.getenv('DB_PASS', 'rosaura_password')
DB_NAME = os.getenv('DB_CANVASES_NAME', 'db_canvases')
REDIS_HOST = 'redis'
REDIS_PORT = 6379
REDIS_PASS = os.getenv('REDIS_PASS', '')

def get_db_connection():
    try:
        return mysql.connector.connect(
            host=DB_HOST,
            user=DB_USER,
            password=DB_PASS,
            database=DB_NAME
        )
    except mysql.connector.Error as err:
        logging.error(f"Database connection error: {err}")
        return None

def get_redis_client():
    try:
        return redis.Redis(host=REDIS_HOST, port=REDIS_PORT, password=REDIS_PASS, decode_responses=True)
    except redis.RedisError as err:
        logging.error(f"Redis connection error: {err}")
        return None

def process_scheduled_resizes():
    conn = get_db_connection()
    if not conn:
        return

    r = get_redis_client()
    if not r:
        conn.close()
        return

    cursor = conn.cursor(dictionary=True)
    
    try:
        # Busca expansiones programadas donde la fecha en UTC ya se cumplió
        query = """
            SELECT rs.canvas_id, rs.target_size, rs.timer_action, c.size as old_size
            FROM canvas_resize_settings rs
            JOIN canvases c ON rs.canvas_id = c.id
            WHERE rs.is_active = 1 AND rs.next_resize_at <= UTC_TIMESTAMP()
        """
        cursor.execute(query)
        pending_resizes = cursor.fetchall()

        for pr in pending_resizes:
            canvas_id = pr['canvas_id']
            old_size = int(pr['old_size'])
            target_size = int(pr['target_size'])
            timer_action = pr['timer_action']

            logging.info(f"Triggering scheduled resize for Canvas ID {canvas_id} (Target: {target_size})")

            # Inyecta la tarea en la cola del worker que hace el redimensionamiento real
            task = {
                'canvas_id': canvas_id,
                'old_size': old_size,
                'new_size': target_size
            }
            r.lpush("canvases:pending_resizes", json.dumps(task))
            
            # Bloquea la UI para notificar a los usuarios en vivo
            lock_key = f"canvas:{canvas_id}:resize_lock"
            r.setex(lock_key, 60, "1")
            
            r.publish("admin:canvas_events", json.dumps({
                'type': 'canvas_locked_resize',
                'canvas_id': canvas_id,
                'new_size': target_size
            }))

            # Apagamos el is_active en la BD para que no se dispare de nuevo
            update_query = "UPDATE canvas_resize_settings SET is_active = 0 WHERE canvas_id = %s"
            cursor.execute(update_query, (canvas_id,))
            conn.commit()

            # Limpia la llave en Redis que maneja el timer del frontend si es necesario
            redis_key = f"canvas:next_resize:{canvas_id}"
            if timer_action == 'stop' or timer_action == 'none':
                r.delete(redis_key)

    except Exception as e:
        logging.error(f"Error processing scheduled resizes: {e}")
        conn.rollback()
    finally:
        cursor.close()
        conn.close()

if __name__ == "__main__":
    logging.info("Starting Scheduled Resizes Worker...")
    while True:
        process_scheduled_resizes()
        time.sleep(10) # Revisa cada 10 segundos