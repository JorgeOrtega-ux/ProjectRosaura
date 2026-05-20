import os
import json
import time
import redis
import mysql.connector
from mysql.connector import Error
import logging

# Configuración básica de logs para no perder errores en silencio
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

REDIS_HOST = os.getenv('REDIS_HOST', 'redis')
REDIS_PORT = int(os.getenv('REDIS_PORT', 6379))
REDIS_PASSWORD = os.getenv('REDIS_PASS', None)

DB_HOST = os.getenv('DB_TELEMETRY_HOST', 'db')
DB_NAME = os.getenv('DB_TELEMETRY_NAME', 'db_telemetry')
DB_USER = os.getenv('DB_TELEMETRY_USER', 'system_web_executor')
DB_PASS = os.getenv('DB_TELEMETRY_PASSWORD', 'secret')

QUEUES = {
    'telemetry_api_latency': 'api_latency',
    'telemetry_pageviews': 'pageviews',
    'telemetry_auth': 'auth_events'
}

BATCH_SIZE = 500
FLUSH_INTERVAL = 5

class TelemetryWorker:
    def __init__(self):
        self.r = redis.Redis(host=REDIS_HOST, port=REDIS_PORT, password=REDIS_PASSWORD, decode_responses=True)
        self.db_conn = None
        self.connect_db()

    def connect_db(self):
        if self.db_conn and self.db_conn.is_connected():
            return
        
        try:
            self.db_conn = mysql.connector.connect(
                host=DB_HOST,
                database=DB_NAME,
                user=DB_USER,
                password=DB_PASS
            )
        except Error as e:
            logging.error(f"Error conectando a BD Telemetría: {e}")
            self.db_conn = None

    def process_queues(self):
        self.connect_db()
        if not self.db_conn:
            return

        cursor = self.db_conn.cursor()

        try:
            for queue_name, table_name in QUEUES.items():
                # 1. LECTURA EN BLOQUE USANDO REDIS PIPELINE
                pipe = self.r.pipeline()
                for _ in range(BATCH_SIZE):
                    pipe.lpop(queue_name)
                
                raw_items = pipe.execute()
                
                batch = []
                raw_payloads = [] # Guardamos las cadenas crudas para posible recuperación
                
                for item in raw_items:
                    if item:
                        try:
                            batch.append(json.loads(item))
                            raw_payloads.append(item)
                        except json.JSONDecodeError:
                            logging.error(f"JSON corrupto ignorado en {queue_name}: {item}")
                            continue
                
                if batch:
                    self.insert_batch(cursor, table_name, queue_name, batch, raw_payloads)

        except Exception as e:
            logging.error(f"Error crítico al procesar colas: {e}")
        finally:
            if cursor:
                cursor.close()

    def insert_batch(self, cursor, table_name, queue_name, batch, raw_payloads):
        if not batch:
            return

        # 1. PREGUNTAR A MYSQL: ¿Qué columnas existen realmente en esta tabla?
        try:
            cursor.execute(f"SHOW COLUMNS FROM {table_name}")
            valid_columns = {row[0] for row in cursor.fetchall()}
        except Error as e:
            logging.error(f"Fallo al consultar esquema de {table_name}: {e}")
            return

        # 2. Recopilar TODAS las llaves únicas presentes en el lote JSON
        all_keys = set()
        for item in batch:
            all_keys.update(item.keys())
            
        # 3. FILTRO MAESTRO: Intersectar. Solo usar llaves del JSON que SÍ existan en la tabla MySQL
        keys = list(all_keys.intersection(valid_columns))
        
        if not keys:
            logging.error(f"Ninguna llave del payload coincide con las columnas de {table_name}")
            return

        columns = ', '.join(keys)
        placeholders = ', '.join(['%s'] * len(keys))
        
        sql = f"INSERT INTO {table_name} ({columns}) VALUES ({placeholders})"
        
        # Usar .get(key) para rellenar con None (NULL) si a un registro le falta el dato
        values = [tuple(item.get(key) for key in keys) for item in batch]

        try:
            cursor.executemany(sql, values)
            self.db_conn.commit()
            # logging.info(f"Insertados {len(batch)} registros en {table_name}") # Descomentar para debug intenso
        except Error as e:
            self.db_conn.rollback()
            logging.error(f"Fallo MySQL en {table_name}: {e}. Enviando {len(batch)} registros a DLQ.")
            
            # MANEJO REAL DE ERRORES: Reinyectar a Dead Letter Queue (DLQ)
            dlq_name = f"{queue_name}_dlq"
            try:
                self.r.rpush(dlq_name, *raw_payloads)
            except Exception as redis_err:
                logging.critical(f"Fallo catastrófico al guardar en DLQ ({dlq_name}): {redis_err}")

if __name__ == "__main__":
    logging.info("Worker de Telemetría Iniciado.")
    worker = TelemetryWorker()
    while True:
        try:
            worker.process_queues()
        except Exception as e:
            logging.error(f"Excepción no controlada en el loop principal: {e}")
        time.sleep(FLUSH_INTERVAL)