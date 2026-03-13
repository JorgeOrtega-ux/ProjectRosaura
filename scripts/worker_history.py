# scripts/worker_history.py

import os
import json
import time
import logging
import redis
import mysql.connector
from mysql.connector import Error
from dotenv import load_dotenv

# Configurar logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - HistoryWorker - %(levelname)s - %(message)s',
    handlers=[logging.StreamHandler()]
)

# Cargar variables de entorno (asumiendo que está en la raíz)
dotenv_path = os.path.join(os.path.dirname(__file__), '..', '.env')
load_dotenv(dotenv_path)

# Configuración Redis
REDIS_HOST = os.getenv('REDIS_HOST', '127.0.0.1')
REDIS_PORT = int(os.getenv('REDIS_PORT', 6379))
REDIS_PASSWORD = os.getenv('REDIS_PASSWORD', None)

# Configuración MySQL
DB_HOST = os.getenv('DB_HOST', '127.0.0.1')
DB_USER = os.getenv('DB_USER', 'root')
DB_PASS = os.getenv('DB_PASSWORD', '')
DB_NAME = os.getenv('DB_NAME', 'projectrosaura')

def get_db_connection():
    try:
        connection = mysql.connector.connect(
            host=DB_HOST,
            user=DB_USER,
            password=DB_PASS,
            database=DB_NAME
        )
        return connection
    except Error as e:
        logging.error(f"Error conectando a MySQL: {e}")
        return None

def process_history_queues():
    try:
        r = redis.Redis(host=REDIS_HOST, port=REDIS_PORT, password=REDIS_PASSWORD, decode_responses=True)
        r.ping()
        logging.info("Conectado a Redis exitosamente.")
    except Exception as e:
        logging.error(f"No se pudo conectar a Redis: {e}")
        return

    db = get_db_connection()
    if not db:
        return

    cursor = db.cursor()
    BATCH_SIZE = 100 # Procesar de 100 en 100 eventos

    logging.info("Iniciando loop del Worker de Historial...")

    while True:
        try:
            # reconectar db si se cayó
            if not db.is_connected():
                db = get_db_connection()
                cursor = db.cursor()

            # ---------------------------------------------------------
            # 1. PROCESAR HISTORIAL DE REPRODUCCIÓN (WATCH HISTORY)
            # ---------------------------------------------------------
            watch_events = []
            for _ in range(BATCH_SIZE):
                item = r.lpop('queue:history:watch')
                if not item:
                    break
                try:
                    data = json.loads(item)
                    # user_id, video_id, timestamp
                    watch_events.append((data['user_id'], data['video_id'], data['timestamp']))
                except Exception as e:
                    logging.error(f"Error parseando evento watch: {e}")

            if watch_events:
                # Usamos ON DUPLICATE KEY UPDATE para actualizar la fecha si el usuario vuelve a ver el video
                watch_query = """
                    INSERT INTO user_watch_history (user_id, video_id, last_watched_at) 
                    VALUES (%s, %s, %s)
                    ON DUPLICATE KEY UPDATE last_watched_at = VALUES(last_watched_at)
                """
                cursor.executemany(watch_query, watch_events)
                db.commit()
                logging.info(f"Insertados/Actualizados {len(watch_events)} registros de historial de reproducción.")

            # ---------------------------------------------------------
            # 2. PROCESAR HISTORIAL DE BÚSQUEDA (SEARCH HISTORY)
            # ---------------------------------------------------------
            search_events = []
            for _ in range(BATCH_SIZE):
                item = r.lpop('queue:history:search')
                if not item:
                    break
                try:
                    data = json.loads(item)
                    search_events.append((data['user_id'], data['query'], data['timestamp']))
                except Exception as e:
                    logging.error(f"Error parseando evento search: {e}")

            if search_events:
                search_query = """
                    INSERT INTO user_search_history (user_id, search_query, created_at) 
                    VALUES (%s, %s, %s)
                """
                cursor.executemany(search_query, search_events)
                db.commit()
                logging.info(f"Insertados {len(search_events)} registros de historial de búsqueda.")

        except Exception as e:
            logging.error(f"Error en el ciclo del worker: {e}")
            try:
                db.rollback()
            except:
                pass

        # Dormir 5 segundos antes de volver a revisar las colas
        time.sleep(5)

if __name__ == "__main__":
    process_history_queues()