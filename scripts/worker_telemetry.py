import os
import json
import time
import redis
import mysql.connector
from mysql.connector import Error

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
    'telemetry_interactions': 'page_interactions',
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
        except Error:
            self.db_conn = None

    def process_queues(self):
        self.connect_db()
        if not self.db_conn:
            return

        cursor = self.db_conn.cursor()

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

        except Exception:
            pass
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
        except Error:
            self.db_conn.rollback()

if __name__ == "__main__":
    worker = TelemetryWorker()
    while True:
        try:
            worker.process_queues()
        except Exception:
            pass
        time.sleep(FLUSH_INTERVAL)