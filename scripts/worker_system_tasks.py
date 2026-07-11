import os
import json
import time
import threading
import inspect
import mysql.connector
from mysql.connector import Error
import redis
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime
import random
import urllib.parse
import requests
import pymysql
import typesense
import logging
from dotenv import load_dotenv

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

SMTP_HOST = os.getenv('SMTP_HOST', '')
SMTP_PORT = int(os.getenv('SMTP_PORT', 587))
SMTP_USER = os.getenv('SMTP_USER', '')
SMTP_PASS = os.getenv('SMTP_PASS', '')
SMTP_FROM_EMAIL = os.getenv('SMTP_FROM_EMAIL', '')
SMTP_FROM_NAME = os.getenv('SMTP_FROM_NAME', 'Project Rosaura')

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
            'socket_keepalive': True
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

def process_email(payload):
    email_type = payload.get('type')
    user_id = payload.get('user_id')
    
    if email_type == 'subscription_confirmation':
        tier_name = payload.get('tierName', 'Premium')
        billing_period = payload.get('billingPeriod', 'Mensual')
        
        conn = None
        try:
            conn = get_db_connection()
            cursor = conn.cursor(dictionary=True)
            cursor.execute("SELECT email, username FROM users WHERE id = %s", (user_id,))
            user_data = cursor.fetchone()
            
            if user_data:
                user_email = user_data['email']
                username = user_data['username']
                
                if not SMTP_HOST or not SMTP_USER:
                    Logger.error("SMTP configuration is missing. Cannot send email.")
                    return

                msg = MIMEMultipart('alternative')
                msg['Subject'] = "Â¡Gracias por tu suscripciÃ³n!"
                msg['From'] = f"{SMTP_FROM_NAME} <{SMTP_FROM_EMAIL}>"
                msg['To'] = user_email
                
                html = f"""
                <!DOCTYPE html>
                <html>
                <body style='margin: 0; padding: 0; background-color: #f5f5fa; font-family: Arial, sans-serif;'>
                    <div style='padding: 20px; background-color: #f5f5fa; color: #111;'>
                        <div style='max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 30px; border-radius: 8px; border: 1px solid #00000020;'>
                            <h2 style='color: #111111; margin-top: 0;'>Â¡Gracias por tu suscripciÃ³n!</h2>
                            <p style='color: #666666; font-size: 15px; line-height: 1.5;'>Hola {username}, hemos procesado exitosamente tu pago y tu suscripciÃ³n a {tier_name} ({billing_period}) estÃ¡ activa.</p>
                            <p style='color: #666666; font-size: 15px; line-height: 1.5;'>Puedes empezar a disfrutar de tus nuevos beneficios de inmediato.</p>
                        </div>
                    </div>
                </body>
                </html>
                """
                msg.attach(MIMEText(html, 'html'))
                
                if SMTP_PORT == 465:
                    server = smtplib.SMTP_SSL(SMTP_HOST, SMTP_PORT)
                else:
                    server = smtplib.SMTP(SMTP_HOST, SMTP_PORT)
                    server.starttls()
                server.login(SMTP_USER, SMTP_PASS)
                server.sendmail(SMTP_FROM_EMAIL, user_email, msg.as_string())
                server.quit()
                Logger.info(f"Subscription confirmation email sent to {user_email}")
            else:
                Logger.error(f"User {user_id} not found for email dispatch")
        except Exception as e:
            Logger.error(f"Failed to process subscription email: {e}")
        finally:
            if conn and conn.is_connected():
                cursor.close()
                conn.close()
                
    elif email_type == 'upcoming_renewal':
        tier_name = payload.get('tierName', 'Premium')
        billing_period = payload.get('billingPeriod', 'monthly')
        renewal_date = payload.get('renewalDate', '')
        
        billing_period_es = 'Anual' if billing_period == 'yearly' else 'Mensual'
        
        conn = None
        try:
            conn = get_db_connection()
            cursor = conn.cursor(dictionary=True)
            cursor.execute("SELECT email, username FROM users WHERE id = %s", (user_id,))
            user_data = cursor.fetchone()
            
            if user_data:
                user_email = user_data['email']
                username = user_data['username']
                
                if not SMTP_HOST or not SMTP_USER:
                    Logger.error("SMTP configuration is missing. Cannot send renewal email.")
                    return

                msg = MIMEMultipart('alternative')
                msg['Subject'] = "Recordatorio: Tu suscripciÃ³n estÃ¡ por renovarse"
                msg['From'] = f"{SMTP_FROM_NAME} <{SMTP_FROM_EMAIL}>"
                msg['To'] = user_email
                
                html = f"""
                <!DOCTYPE html>
                <html>
                <body style='margin: 0; padding: 0; background-color: #f5f5fa; font-family: Arial, sans-serif;'>
                    <div style='padding: 20px; background-color: #f5f5fa; color: #111;'>
                        <div style='max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 30px; border-radius: 8px; border: 1px solid #00000020;'>
                            <h2 style='color: #111111; margin-top: 0;'>Recordatorio de renovaciÃ³n</h2>
                            <p style='color: #666666; font-size: 15px; line-height: 1.5;'>Hola {username},</p>
                            <p style='color: #666666; font-size: 15px; line-height: 1.5;'>Te recordamos que tu suscripciÃ³n a <strong>{tier_name} ({billing_period_es})</strong> se renovarÃ¡ automÃ¡ticamente el prÃ³ximo <strong>{renewal_date}</strong>.</p>
                            <p style='color: #666666; font-size: 15px; line-height: 1.5;'>Si deseas continuar disfrutando de tus beneficios, no necesitas hacer nada. Si prefieres cancelar, puedes hacerlo desde la configuraciÃ³n de tu cuenta antes de esta fecha.</p>
                        </div>
                    </div>
                </body>
                </html>
                """
                msg.attach(MIMEText(html, 'html'))
                
                if SMTP_PORT == 465:
                    server = smtplib.SMTP_SSL(SMTP_HOST, SMTP_PORT)
                else:
                    server = smtplib.SMTP(SMTP_HOST, SMTP_PORT)
                    server.starttls()
                server.login(SMTP_USER, SMTP_PASS)
                server.sendmail(SMTP_FROM_EMAIL, user_email, msg.as_string())
                server.quit()
                Logger.info(f"Renewal reminder email sent to {user_email}")
            else:
                Logger.error(f"User {user_id} not found for renewal email dispatch")
        except Exception as e:
            Logger.error(f"Failed to process renewal email: {e}")
        finally:
            if conn and conn.is_connected():
                cursor.close()
                conn.close()
    else:
        Logger.warning(f"Unknown email type: {email_type}")

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
                elif queue_name == QUEUE_EMAILS:
                    if payload:
                        process_email(payload)
                
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
    last_renewal_check = 0
    DELETION_INTERVAL = 3600
    MAINTENANCE_INTERVAL = 86400
    RENEWAL_CHECK_INTERVAL = 86400
    
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

        if current_time - last_renewal_check >= RENEWAL_CHECK_INTERVAL:
            Logger.info("Scheduler evaluating upcoming subscription renewals.")
            conn = None
            try:
                conn = get_db_connection()
                cursor = conn.cursor(dictionary=True)
                cursor.execute("""
                    SELECT id, user_id, tier, billing_period, current_period_end 
                    FROM subscriptions 
                    WHERE status = 'active' 
                    AND current_period_end BETWEEN NOW() + INTERVAL 6 DAY AND NOW() + INTERVAL 8 DAY
                """)
                upcoming_subs = cursor.fetchall()
                
                for sub in upcoming_subs:
                    if not r:
                        r = get_redis_connection()
                    if r:
                        renewal_date = sub['current_period_end'].strftime('%Y-%m-%d')
                        redis_key = f"notified:renewal:{sub['id']}:{renewal_date}"
                        if not r.exists(redis_key):
                            tier_name = 'Premium' if sub['tier'] == 2 else ('BÃ¡sico' if sub['tier'] == 0 else 'Pro')
                            payload = json.dumps({
                                'type': 'upcoming_renewal',
                                'user_id': sub['user_id'],
                                'tierName': tier_name,
                                'billingPeriod': sub['billing_period'],
                                'renewalDate': renewal_date
                            })
                            r.rpush(QUEUE_EMAILS, payload)
                            r.set(redis_key, "1", ex=30*86400) # expire in 30 days
                            Logger.info(f"Scheduler dispatched renewal reminder for User ID {sub['user_id']} (Sub ID: {sub['id']})")
                
                last_renewal_check = time.time()
            except Exception as e:
                Logger.error(f"Scheduler fault during renewal evaluation: {e}")
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

def system_tasks_thread():
    worker_loop()



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

REDIS_HOST = os.getenv('REDIS_HOST', 'redis')
REDIS_PORT = int(os.getenv('REDIS_PORT', 6379))
REDIS_PASSWORD = os.getenv('REDIS_PASS', None)

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
                'socket_keepalive': True
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
                host=DB_TEL_HOST,
                database=DB_TEL_NAME,
                user=DB_TEL_USER,
                password=DB_TEL_PASS
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

def telemetry_thread():
    Logger.info("Telemetry ingestion worker node online.")
    worker = TelemetryWorker()
    while True:
        try:
            worker.process_queues()
        except Exception as e:
            Logger.error(f"Unhandled exception detected in telemetry loop: {e}")
        time.sleep(FLUSH_INTERVAL)

logger = logging.getLogger('TypesenseSync')
load_dotenv()

TS_HOST = os.environ.get('TYPESENSE_HOST', 'typesense')
TS_PORT = os.environ.get('TYPESENSE_PORT', '8108')
TS_PROTOCOL = os.environ.get('TYPESENSE_PROTOCOL', 'http')
TS_API_KEY = os.environ.get('TYPESENSE_API_KEY', '')

TS_SYNC_INTERVAL = int(os.environ.get('TYPESENSE_SYNC_INTERVAL', 60))

def typesense_thread():
    if not TS_API_KEY:
        logger.error("TYPESENSE_API_KEY not configured in .env.")
        return

    client = typesense.Client({
        'nodes': [{
            'host': TS_HOST,
            'port': TS_PORT,
            'protocol': TS_PROTOCOL,
        }],
        'api_key': TS_API_KEY,
        'connection_timeout_seconds': 5
    })

    schema = {
        'name': 'canvases',
        'fields': [
            {'name': 'id', 'type': 'string'},
            {'name': 'uuid', 'type': 'string'},
            {'name': 'name', 'type': 'string'},
            {'name': 'owner_id', 'type': 'int32', 'optional': True},
            {'name': 'privacy', 'type': 'string', 'facet': True},
            {'name': 'scope_type', 'type': 'string', 'facet': True},
            {'name': 'created_at', 'type': 'int64'}
        ]
    }

    try:
        client.collections['canvases'].retrieve()
        logger.info("'canvases' collection already exists in Typesense.")
    except typesense.exceptions.ObjectNotFound:
        try:
            client.collections.create(schema)
            logger.info("'canvases' collection created successfully for the first time.")
        except Exception as e:
            logger.error(f"Critical error creating Typesense schema: {e}")
            return

    logger.info(f"Starting sync loop (every {TS_SYNC_INTERVAL} seconds)...")

    while True:
        try:
            db_canvases = os.getenv('DB_CANVASES_NAME', 'db_canvases')
            connection = pymysql.connect(
                host=DB_HOST,
                user=DB_USER,
                password=DB_PASS,
                database=db_canvases,
                cursorclass=pymysql.cursors.DictCursor
            )

            with connection:
                with connection.cursor() as cursor:
                    cursor.execute("SELECT id, uuid, name, owner_id, privacy, scope_type, UNIX_TIMESTAMP(created_at) as created_at FROM canvases")
                    canvases = cursor.fetchall()
                    
                    documents = []
                    for c in canvases:
                        documents.append({
                            'id': str(c['id']),
                            'uuid': c['uuid'],
                            'name': c['name'],
                            'owner_id': c['owner_id'] if c['owner_id'] else 0,
                            'privacy': c['privacy'],
                            'scope_type': c['scope_type'] if c['scope_type'] else 'personal',
                            'created_at': int(c['created_at']) if c['created_at'] else 0
                        })
                    
                    if documents:
                        client.collections['canvases'].documents.import_(documents, {'action': 'upsert'})
                        logger.info(f"Sync completed: {len(documents)} canvases indexed/updated.")
                    else:
                        logger.info("No canvases in database to index.")
                        
        except Exception as e:
            logger.error(f"Error during sync cycle: {e}")

        time.sleep(TS_SYNC_INTERVAL)

if __name__ == "__main__":
    Logger.info("INICIANDO WORKER UNIFICADO DE TAREAS DE SISTEMA (MANTENIMIENTO, CORREOS, TELEMETRIA, TYPESENSE)...")
    threading.Thread(target=scheduler_loop, daemon=True, name="Thread-Scheduler").start()
    threading.Thread(target=system_tasks_thread, daemon=True, name="Thread-SystemTasks").start()
    threading.Thread(target=telemetry_thread, daemon=True, name="Thread-Telemetry").start()
    threading.Thread(target=typesense_thread, daemon=True, name="Thread-Typesense").start()
    
    while True:
        time.sleep(1)
