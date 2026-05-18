import os
import json
import time
import redis
import mysql.connector
from mysql.connector import Error

# Configuración desde variables de entorno
REDIS_HOST = os.getenv('REDIS_HOST', 'redis')
REDIS_PORT = int(os.getenv('REDIS_PORT', 6379))
REDIS_PASSWORD = os.getenv('REDIS_PASS', None) # <-- Se cambió a REDIS_PASS

DB_HOST = os.getenv('DB_TELEMETRY_HOST', 'mysql')
DB_NAME = os.getenv('DB_TELEMETRY_NAME', 'db_telemetry')
DB_USER = os.getenv('DB_TELEMETRY_USER', 'rosaura_telemetry')
DB_PASS = os.getenv('DB_TELEMETRY_PASSWORD', 'secret')

# Colas de Redis
QUEUES = {
    'telemetry_api_latency': 'api_latency',
    'telemetry_pageviews': 'pageviews',
    'telemetry_canvas': 'canvas_interactions',
    'telemetry_auth': 'auth_events'
}

BATCH_SIZE = 500
FLUSH_INTERVAL = 5 # Segundos

def get_db_connection():
    try:
        return mysql.connector.connect(
            host=DB_HOST,
            database=DB_NAME,
            user=DB_USER,
            password=DB_PASS
        )
    except Error as e:
        print(f"Error conectando a MySQL: {e}")
        return None

def process_queues():
    r = redis.Redis(host=REDIS_HOST, port=REDIS_PORT, password=REDIS_PASSWORD, decode_responses=True)
    db_conn = get_db_connection()
    
    if not db_conn:
        return

    cursor = db_conn.cursor()

    try:
        for queue_name, table_name in QUEUES.items():
            batch = []
            while len(batch) < BATCH_SIZE:
                item = r.lpop(queue_name)
                if not item:
                    break
                try:
                    batch.append(json.loads(item))
                except json.JSONDecodeError:
                    continue
            
            if batch:
                insert_batch(cursor, db_conn, table_name, batch)

    finally:
        cursor.close()
        db_conn.close()

def insert_batch(cursor, db_conn, table_name, batch):
    if not batch:
        return

    keys = batch[0].keys()
    columns = ', '.join(keys)
    placeholders = ', '.join(['%s'] * len(keys))
    
    sql = f"INSERT INTO {table_name} ({columns}) VALUES ({placeholders})"
    values = [tuple(item.get(key) for key in keys) for item in batch]

    try:
        cursor.executemany(sql, values)
        db_conn.commit()
        print(f"Insertados {cursor.rowcount} registros en {table_name}")
    except Error as e:
        print(f"Error en bulk insert para {table_name}: {e}")
        db_conn.rollback()

if __name__ == "__main__":
    print("Iniciando Worker de Telemetría...")
    while True:
        try:
            process_queues()
        except Exception as e:
            print(f"Error crítico en el worker: {e}")
        time.sleep(FLUSH_INTERVAL)