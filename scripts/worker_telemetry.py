import os
import json
import time
import redis
import mysql.connector
from mysql.connector import Error

# Configuración desde variables de entorno
REDIS_HOST = os.getenv('REDIS_HOST', 'redis')
REDIS_PORT = int(os.getenv('REDIS_PORT', 6379))
REDIS_PASSWORD = os.getenv('REDIS_PASS', None)

DB_HOST = os.getenv('DB_TELEMETRY_HOST', 'db')
DB_NAME = os.getenv('DB_TELEMETRY_NAME', 'db_telemetry')
DB_USER = os.getenv('DB_TELEMETRY_USER', 'system_web_executor')
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

class TelemetryWorker:
    def __init__(self):
        self.r = redis.Redis(host=REDIS_HOST, port=REDIS_PORT, password=REDIS_PASSWORD, decode_responses=True)
        self.db_conn = None
        self.connect_db()

    def connect_db(self):
        if self.db_conn and self.db_conn.is_connected():
            return
        
        try:
            print(f"Intentando conectar a MySQL ({DB_HOST})...")
            self.db_conn = mysql.connector.connect(
                host=DB_HOST,
                database=DB_NAME,
                user=DB_USER,
                password=DB_PASS
            )
            print("✅ Conexión a MySQL establecida con éxito.")
        except Error as e:
            print(f"❌ Error conectando a MySQL: {e}")
            self.db_conn = None

    def process_queues(self):
        # Asegurar que la conexión a DB esté viva
        self.connect_db()
        if not self.db_conn:
            return

        cursor = self.db_conn.cursor()
        total_inserted = 0

        try:
            for queue_name, table_name in QUEUES.items():
                batch = []
                while len(batch) < BATCH_SIZE:
                    item = self.r.lpop(queue_name)
                    if not item:
                        break
                    try:
                        batch.append(json.loads(item))
                    except json.JSONDecodeError:
                        continue
                
                if batch:
                    self.insert_batch(cursor, table_name, batch)
                    total_inserted += len(batch)

            if total_inserted > 0:
                print(f"[{time.strftime('%Y-%m-%d %H:%M:%S')}] Procesados y guardados {total_inserted} eventos de telemetría.")
            else:
                # Opcional: imprimir latido para saber que el worker sigue vivo
                print(f"[{time.strftime('%Y-%m-%d %H:%M:%S')}] Colas vacías. Esperando nuevos eventos...")

        except Exception as e:
            print(f"Error procesando colas: {e}")
        finally:
            cursor.close()

    def insert_batch(self, cursor, table_name, batch):
        if not batch:
            return

        keys = batch[0].keys()
        columns = ', '.join(keys)
        placeholders = ', '.join(['%s'] * len(keys))
        
        sql = f"INSERT INTO {table_name} ({columns}) VALUES ({placeholders})"
        values = [tuple(item.get(key) for key in keys) for item in batch]

        try:
            cursor.executemany(sql, values)
            self.db_conn.commit()
        except Error as e:
            print(f"❌ Error en bulk insert para {table_name}: {e}")
            self.db_conn.rollback()

if __name__ == "__main__":
    print("🚀 Iniciando Worker de Telemetría v2.0...")
    worker = TelemetryWorker()
    
    while True:
        try:
            worker.process_queues()
        except Exception as e:
            print(f"❌ Error crítico en el ciclo principal del worker: {e}")
            
        time.sleep(FLUSH_INTERVAL)