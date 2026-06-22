import os
import json
import time
import threading
import inspect
import mysql.connector
import redis
from datetime import datetime
import random
import urllib.parse
import requests

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

        # LOGS ACTUALIZADOS A CARPETA PRIVADA
        log_dir = os.path.join(BASE_DIR, 'storage', 'private', 'logs', category)
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

DB_HOST = os.getenv('DB_HOST', 'db')
DB_USER = os.getenv('DB_USER', 'root')
DB_PASS = os.getenv('DB_PASS', 'root')
DB_NAME = os.getenv('DB_NAME', 'db_identity')

DB_TEL_HOST = os.getenv('DB_TELEMETRY_HOST', 'db')
DB_TEL_NAME = os.getenv('DB_TELEMETRY_NAME', 'db_telemetry')
DB_TEL_USER = os.getenv('DB_TELEMETRY_USER', 'system_web_executor')
DB_TEL_PASS = os.getenv('DB_TELEMETRY_PASSWORD', 'secret')

REDIS_HOST = os.getenv('REDIS_HOST', 'redis')
REDIS_PORT = int(os.getenv('REDIS_PORT', 6379))
REDIS_PASS = os.getenv('REDIS_PASS', None)

APP_ROOT_PATH = os.getenv('APP_ROOT_PATH', '/app')
QUEUE_ACCOUNT_DELETION = 'queue:account_deletion'
QUEUE_EMAILS = 'queue:emails'

def get_db_connection():
    return mysql.connector.connect(
        host=DB_HOST,
        user=DB_USER,
        password=DB_PASS,
        database=DB_NAME
    )

def get_telemetry_db_connection():
    return mysql.connector.connect(
        host=DB_TEL_HOST,
        user=DB_TEL_USER,
        password=DB_TEL_PASS,
        database=DB_TEL_NAME
    )

def get_redis_connection():
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
        if REDIS_PASS:
            client_args['password'] = REDIS_PASS
        
        client = redis.Redis(**client_args)
        client.ping()
        return client
    except Exception as e:
        Logger.error(f"Redis connection initialization failed: {str(e)}")
        return None

def process_deletion(payload):
    user_id = payload.get('user_id')
    conn_id = None
    conn_tel = None
    try:
        conn_id = get_db_connection()
        cursor_id = conn_id.cursor(dictionary=True)
        cursor_id.execute("SELECT uuid, profile_picture FROM users WHERE id = %s", (user_id,))
        user_data = cursor_id.fetchone()
        
        if user_data:
            profile_pic = user_data.get('profile_picture')
            uuid_str = user_data.get('uuid')
            
            # Traducción de ruta virtual a física para limpieza
            if profile_pic and 'fallbacks/avatar-default.png' not in profile_pic:
                pic_relative = profile_pic.lstrip('/').replace('public/storage/', 'storage/public/')
                pic_path = os.path.join(APP_ROOT_PATH, pic_relative)
                
                if os.path.exists(pic_path) and os.path.isfile(pic_path):
                    try:
                        os.remove(pic_path)
                        Logger.info(f"Physical profile resource purged: {pic_path}")
                    except Exception as e:
                        Logger.error(f"Failed to purge profile resource: {e}")
            
            if uuid_str:
                orphan_default = os.path.join(APP_ROOT_PATH, f"storage/public/profilePictures/default/{uuid_str}.png")
                if os.path.exists(orphan_default) and os.path.isfile(orphan_default):
                    try:
                        os.remove(orphan_default)
                        Logger.info(f"Orphaned default resource purged: {orphan_default}")
                    except Exception:
                        pass

            if uuid_str:
                try:
                    conn_tel = get_telemetry_db_connection()
                    cursor_tel = conn_tel.cursor()
                    telemetry_tables = ['api_latency', 'pageviews', 'auth_events']
                    total_tel_deleted = 0
                    
                    for table in telemetry_tables:
                        try:
                            cursor_tel.execute(f"DELETE FROM {table} WHERE user_uuid = %s", (uuid_str,))
                            total_tel_deleted += cursor_tel.rowcount
                        except mysql.connector.Error as e:
                            Logger.warning(f"Telemetry cleanup warning (Table {table}): {e}")

                    conn_tel.commit()
                    Logger.info(f"Telemetry logs successfully purged for UUID {uuid_str}. Total rows affected: {total_tel_deleted}")
                except mysql.connector.Error as err:
                    Logger.error(f"Telemetry database connection failed for UUID {uuid_str}: {err}")
                finally:
                    if conn_tel and conn_tel.is_connected():
                        cursor_tel.close()
                        conn_tel.close()

        Logger.info(f"Executing master record eradication for User ID: {user_id}")
        tables_to_clean = ['sessions', 'user_roles', 'profile_logs', 'verification_codes', 'personal_access_tokens']
        
        for table in tables_to_clean:
            try:
                cursor_id.execute(f"DELETE FROM {table} WHERE user_id = %s", (user_id,))
            except mysql.connector.Error:
                pass 

        cursor_id.execute("DELETE FROM users WHERE id = %s", (user_id,))
        conn_id.commit()
        Logger.info(f"User ID {user_id} eradicated successfully from all logical systems and storage arrays.")
        
    except mysql.connector.Error as err:
        Logger.error(f"Relational database error during user eradication sequence ({user_id}): {err}")
    except Exception as e:
        Logger.error(f"Unexpected fault during user eradication sequence ({user_id}): {e}")
    finally:
        if conn_id and conn_id.is_connected():
            cursor_id.close()
            conn_id.close()

def heal_default_avatars():
    Logger.info("Initiating automated avatar healing process.")
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        fallback_path = 'public/assets/img/fallbacks/avatar-default.png'
        cursor.execute("SELECT id, username, uuid FROM users WHERE profile_picture = %s", (fallback_path,))
        users = cursor.fetchall()
        
        if not users:
            Logger.info("Avatar integrity check passed. No anomalies detected.")
            return

        allowed_colors = ['2563eb', '16a34a', '7c3aed', 'dc2626', 'ea580c', '374151']
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
        
        for user in users:
            user_id = user['id']
            username = user['username']
            uuid_str = user['uuid']
            initial = username[0].upper() if username else 'U'
            color = random.choice(allowed_colors)
            url = f"https://ui-avatars.com/api/?name={urllib.parse.quote(initial)}&background={color}&color=fff&size=512&font-size=0.5"
            
            try:
                response = requests.get(url, headers=headers, timeout=5)
                content_type = response.headers.get('Content-Type', '')
                
                if response.status_code == 200 and 'image' in content_type:
                    file_name = f"{uuid_str}.png"
                    # Se mantiene la ruta virtual (DB) pero se escribe a la física
                    rel_path = f"public/storage/profilePictures/default/{file_name}"
                    full_path = os.path.join(APP_ROOT_PATH, f"storage/public/profilePictures/default/{file_name}")
                    
                    os.makedirs(os.path.dirname(full_path), exist_ok=True)
                    with open(full_path, 'wb') as f:
                        f.write(response.content)
                    os.chmod(full_path, 0o644)
                    
                    cursor.execute("UPDATE users SET profile_picture = %s WHERE id = %s", (rel_path, user_id))
                    conn.commit()
                    Logger.info(f"Avatar resource restored for reference entity: {username}")
                else:
                    Logger.warning(f"External API fulfillment failed (Content-Type: {content_type}) for entity {username}")
                    
            except requests.exceptions.RequestException as e:
                Logger.error(f"Network transport error resolving external asset for {username}: {e}")
                
    except mysql.connector.Error as err:
        Logger.error(f"Relational database fault during healing execution: {err}")
    finally:
        if conn and conn.is_connected():
            cursor.close()
            conn.close()

def cleanup_old_telemetry():
    Logger.info("Initiating historical telemetry log aggregation and clearance.")
    conn = None
    try:
        conn = get_telemetry_db_connection()
        cursor = conn.cursor()
        tables = ['api_latency', 'pageviews', 'auth_events']
        total_deleted = 0
        
        for table in tables:
            cursor.execute(f"DELETE FROM {table} WHERE created_at < NOW() - INTERVAL 90 DAY")
            deleted = cursor.rowcount
            total_deleted += deleted
            if deleted > 0:
                Logger.info(f"Clearance executed on {table}. Records terminated: {deleted}")
            
        conn.commit()
        Logger.info(f"Telemetry log clearance routine finished. Total storage blocks freed: {total_deleted}")
    except mysql.connector.Error as err:
        Logger.error(f"Relational database fault during telemetry clearance: {err}")
    finally:
        if conn and conn.is_connected():
            cursor.close()
            conn.close()

def future_maintenance_tasks():
    pass

def worker_loop():
    queues_to_listen = [QUEUE_ACCOUNT_DELETION, QUEUE_EMAILS]
    Logger.info(f"Primary worker daemon operating. Subscribing to queues: {', '.join(queues_to_listen)}")
    
    r = get_redis_connection()
    
    while True:
        try:
            if not r:
                r = get_redis_connection()
                if not r:
                    time.sleep(5)
                    continue

            result = r.blpop(queues_to_listen, timeout=15)
            if result:
                queue_name, payload_str = result
                payload = json.loads(payload_str)
                if queue_name == QUEUE_ACCOUNT_DELETION:
                    if payload and 'user_id' in payload:
                        process_deletion(payload)
                
        except redis.RedisError as re:
            Logger.error(f"Redis pipeline interrupt or socket timeout on primary thread: {re}")
            r = None 
            time.sleep(5)
        except Exception as e:
            Logger.error(f"Unhandled exception in worker daemon cycle: {e}")
            time.sleep(5)

def scheduler_loop():
    Logger.info("Cron scheduler daemon initialized.")
    r = get_redis_connection()
    last_deletion_check = 0
    last_maintenance_check = 0
    DELETION_INTERVAL = 3600
    MAINTENANCE_INTERVAL = 86400
    
    while True:
        current_time = time.time()
        
        if current_time - last_deletion_check >= DELETION_INTERVAL:
            Logger.info("Scheduler evaluating deletion grace period metrics.")
            conn = None
            try:
                conn = get_db_connection()
                cursor = conn.cursor(dictionary=True)
                cursor.execute("SELECT id FROM users WHERE deletion_scheduled_at IS NOT NULL AND deletion_scheduled_at <= NOW()")
                users_to_delete = cursor.fetchall()
                
                for user in users_to_delete:
                    user_id = user['id']
                    payload = json.dumps({"user_id": user_id})
                    if not r:
                        r = get_redis_connection()
                    if r:
                        r.rpush(QUEUE_ACCOUNT_DELETION, payload)
                        Logger.info(f"Scheduler dispatched deletion mandate for User ID {user_id} to internal queue.")
                    
                last_deletion_check = time.time()
            except Exception as e:
                Logger.error(f"Scheduler fault during entity termination evaluation: {e}")
            finally:
                if conn and conn.is_connected():
                    cursor.close()
                    conn.close()

        if current_time - last_maintenance_check >= MAINTENANCE_INTERVAL:
            Logger.info("Scheduler activating periodic structural maintenance cycles.")
            try:
                heal_default_avatars()
                cleanup_old_telemetry()
                future_maintenance_tasks()
                last_maintenance_check = time.time()
            except Exception as e:
                Logger.error(f"Scheduler fault during maintenance execution array: {e}")

        time.sleep(60)

if __name__ == "__main__":
    scheduler_thread = threading.Thread(target=scheduler_loop, daemon=True)
    scheduler_thread.start()
    worker_loop()