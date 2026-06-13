import os
import json
import time
import inspect
import redis
import mysql.connector
from mysql.connector import Error
from datetime import datetime

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

class Logger:
    @staticmethod
    def write(level, message, category='worker'):
        date_str = datetime.now().strftime('%Y-%m-%d')
        time_str = datetime.now().strftime('%H:%M:%S')
        print(f"[{date_str} {time_str}] [{level.upper()}] {message}")
        try:
            frame = inspect.currentframe().f_back.f_back
            caller_file = os.path.basename(frame.f_code.co_filename)
            caller_line = frame.f_lineno
        except Exception:
            caller_file = 'Unknown'
            caller_line = 'Unknown'

        log_data = {
            "timestamp": f"{date_str} {time_str}",
            "level": level.upper(),
            "category": category,
            "message": message,
            "source": f"{caller_file}:{caller_line}"
        }

        log_dir = os.path.join(BASE_DIR, 'logs', category)
        if not os.path.exists(log_dir):
            os.makedirs(log_dir, exist_ok=True)
            with open(os.path.join(log_dir, '.htaccess'), 'w') as f:
                f.write("Deny from all\nOptions -Indexes")

        log_file = os.path.join(log_dir, f"{date_str}.log")
        with open(log_file, 'a', encoding='utf-8') as f:
            f.write(json.dumps(log_data, ensure_ascii=False) + '\n')

    @staticmethod
    def info(message): Logger.write('info', message, 'worker')
    @staticmethod
    def error(message): Logger.write('error', message, 'worker')
    @staticmethod
    def warning(message): Logger.write('warning', message, 'worker')
    @staticmethod
    def critical(message): Logger.write('critical', message, 'worker')

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
        self.r = self.init_redis()
        self.db_conn = None
        self.connect_db()

    def init_redis(self):
        try:
            client_args = {
                'host': REDIS_HOST,
                'port': REDIS_PORT,
                'decode_responses': True,
                'socket_timeout': 30,
                'socket_connect_timeout': 10,
                'socket_keepalive': True,
                'retry_on_timeout': True
            }
            if REDIS_PASSWORD:
                client_args['password'] = REDIS_PASSWORD
                
            client = redis.Redis(**client_args)
            client.ping()
            return client
        except Exception as e:
            Logger.critical(f"Redis initialization protocol failed in Telemetry Worker: {e}")
            return None

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
            Logger.error(f"Telemetry database connection protocol failure: {e}")
            self.db_conn = None

    def process_queues(self):
        if not self.r:
            self.r = self.init_redis()
            if not self.r:
                return

        self.connect_db()
        if not self.db_conn:
            return

        cursor = self.db_conn.cursor()

        try:
            for queue_name, table_name in QUEUES.items():
                pipe = self.r.pipeline()
                for _ in range(BATCH_SIZE):
                    pipe.lpop(queue_name)
                
                try:
                    raw_items = pipe.execute()
                except redis.RedisError as e:
                    Logger.error(f"Redis pipeline execution timeout or fault on queue {queue_name}: {e}")
                    self.r = None
                    break
                
                batch = []
                raw_payloads = []
                
                for item in raw_items:
                    if item:
                        try:
                            batch.append(json.loads(item))
                            raw_payloads.append(item)
                        except json.JSONDecodeError:
                            Logger.error(f"Corrupted JSON payload intercepted and discarded in queue {queue_name}: {item}")
                            continue
                
                if batch:
                    self.insert_batch(cursor, table_name, queue_name, batch, raw_payloads)

        except Exception as e:
            Logger.critical(f"Critical execution error during queue processing cycle: {e}")
        finally:
            if cursor:
                cursor.close()

    def insert_batch(self, cursor, table_name, queue_name, batch, raw_payloads):
        if not batch:
            return

        try:
            cursor.execute(f"SHOW COLUMNS FROM {table_name}")
            valid_columns = {row[0] for row in cursor.fetchall()}
        except Error as e:
            Logger.error(f"Schema evaluation failed for structural table {table_name}: {e}")
            return

        all_keys = set()
        for item in batch:
            all_keys.update(item.keys())
            
        keys = list(all_keys.intersection(valid_columns))
        
        if not keys:
            Logger.error(f"Payload schema mismatch. Keys rejected for table {table_name}")
            return

        columns = ', '.join(keys)
        placeholders = ', '.join(['%s'] * len(keys))
        sql = f"INSERT INTO {table_name} ({columns}) VALUES ({placeholders})"
        values = [tuple(item.get(key) for key in keys) for item in batch]

        try:
            cursor.executemany(sql, values)
            self.db_conn.commit()
        except Error as e:
            self.db_conn.rollback()
            Logger.error(f"MySQL transactional insertion failed on {table_name}: {e}. Routing {len(batch)} payloads to DLQ.")
            dlq_name = f"{queue_name}_dlq"
            try:
                self.r.rpush(dlq_name, *raw_payloads)
            except Exception as redis_err:
                Logger.critical(f"Catastrophic failure writing payloads to Dead Letter Queue ({dlq_name}): {redis_err}")

if __name__ == "__main__":
    Logger.info("Telemetry ingestion worker node online.")
    worker = TelemetryWorker()
    while True:
        try:
            worker.process_queues()
        except Exception as e:
            Logger.error(f"Unhandled exception detected in main worker loop: {e}")
        time.sleep(FLUSH_INTERVAL)