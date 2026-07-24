import boto3
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
ENV_PATH = os.path.join(BASE_DIR, '.env')
load_dotenv(dotenv_path=ENV_PATH)

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

DB_HOST = os.getenv('DB_HOST')
DB_PORT = int(os.getenv('DB_PORT') or 3306)
DB_USER = os.getenv('DB_USER')
DB_PASS = os.getenv('DB_PASS')
DB_NAME = os.getenv('DB_IDENTITY_NAME')

DB_TEL_HOST = os.getenv('DB_TELEMETRY_HOST')
DB_TEL_NAME = os.getenv('DB_TELEMETRY_NAME')
DB_TEL_USER = os.getenv('DB_TELEMETRY_USER')
DB_TEL_PASS = os.getenv('DB_TELEMETRY_PASSWORD')

REDIS_HOST = os.getenv('REDIS_HOST')
REDIS_PORT = int(os.getenv('REDIS_PORT') or 6379)
REDIS_PASS = os.getenv('REDIS_PASS')

S3_ENDPOINT = os.getenv("AWS_ENDPOINT")
if S3_ENDPOINT and not S3_ENDPOINT.startswith("http"):
    S3_ENDPOINT = "http://" + S3_ENDPOINT + ":9000"
    
S3_BUCKET = os.getenv("AWS_BUCKET")
s3 = boto3.client('s3',
    endpoint_url=S3_ENDPOINT,
    aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID"),
    aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY")
)
APP_ROOT_PATH = os.getenv('APP_ROOT_PATH')
QUEUE_ACCOUNT_DELETION = 'queue:account_deletion'
QUEUE_EMAILS = 'queue:emails'

SMTP_HOST = os.getenv('SMTP_HOST')
SMTP_PORT = int(os.getenv('SMTP_PORT') or 465)
SMTP_USER = os.getenv('SMTP_USER')
SMTP_PASS = os.getenv('SMTP_PASS')
SMTP_FROM_EMAIL = os.getenv('SMTP_FROM_EMAIL')
SMTP_FROM_NAME = os.getenv('SMTP_FROM_NAME')

def get_db_connection():
    return mysql.connector.connect(
        host=DB_HOST,
        port=DB_PORT,
        user=DB_USER,
        password=DB_PASS,
        database=DB_NAME
    )

DB_CANVASES_NAME = os.getenv('DB_CANVASES_NAME', 'db_canvases')

def get_canvases_db_connection():
    return mysql.connector.connect(
        host=DB_HOST,
        port=DB_PORT,
        user=DB_USER,
        password=DB_PASS,
        database=DB_CANVASES_NAME
    )

def get_telemetry_db_connection():
    return mysql.connector.connect(
        host=DB_TEL_HOST,
        port=DB_PORT,
        user=DB_TEL_USER,
        password=DB_TEL_PASS,
        database=DB_TEL_NAME
    )

def get_redis_connection():
    client_args = {
        'host': REDIS_HOST,
        'port': REDIS_PORT,
        'decode_responses': True,
        'socket_timeout': 30,
        'socket_connect_timeout': 10,
        'retry_on_timeout': True
    }
    if REDIS_PASS:
        client_args['password'] = REDIS_PASS
    r = redis.Redis(**client_args)
    r.ping()
    return r

def process_deletion(payload):
    user_id = payload.get('user_id')
    if not user_id:
        return

    conn_id = None
    conn_can = None
    conn_tel = None
    try:
        # 1. Fetch user data (UUID, profile picture) from db_identity
        conn_id = get_db_connection()
        cursor_id = conn_id.cursor(dictionary=True)
        cursor_id.execute("SELECT uuid, profile_picture FROM users WHERE id = %s", (user_id,))
        user_data = cursor_id.fetchone()
        
        uuid_str = user_data.get('uuid') if user_data else None
        
        # 2. File Cleanup: Profile Picture
        if user_data:
            profile_pic = user_data.get('profile_picture')
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

        # 3. Clean user_templates files on disk & purge db_canvases
        try:
            conn_can = get_canvases_db_connection()
            cursor_can = conn_can.cursor(dictionary=True)
            
            # Remove template files on disk created by this user
            cursor_can.execute("SELECT file_path FROM user_templates WHERE user_id = %s", (user_id,))
            templates = cursor_can.fetchall()
            for tmpl in templates:
                t_path = tmpl.get('file_path')
                if t_path:
                    full_t_path = os.path.join(APP_ROOT_PATH, t_path.lstrip('/'))
                    if os.path.exists(full_t_path) and os.path.isfile(full_t_path):
                        try:
                            os.remove(full_t_path)
                            Logger.info(f"User template file purged from disk: {full_t_path}")
                        except Exception as e:
                            Logger.error(f"Failed to remove template file: {e}")

            # Purge db_canvases tables
            cursor_can.execute("DELETE FROM user_templates WHERE user_id = %s", (user_id,))
            cursor_can.execute("DELETE FROM canvas_snapshots_likes WHERE user_id = %s", (user_id,))
            cursor_can.execute("DELETE FROM canvas_chat_messages WHERE user_id = %s", (user_id,))
            cursor_can.execute("DELETE FROM canvas_chat_reports WHERE reporter_user_id = %s", (user_id,))
            if uuid_str:
                cursor_can.execute("DELETE FROM canvas_chat_restrictions WHERE user_id = %s OR restricted_by = %s OR user_id = %s OR restricted_by = %s", (str(user_id), str(user_id), uuid_str, uuid_str))
            else:
                cursor_can.execute("DELETE FROM canvas_chat_restrictions WHERE user_id = %s OR restricted_by = %s", (str(user_id), str(user_id)))
            cursor_can.execute("DELETE FROM canvas_favorites WHERE user_id = %s", (user_id,))
            cursor_can.execute("DELETE FROM canvas_access_requests WHERE user_id = %s", (user_id,))
            cursor_can.execute("DELETE FROM canvas_members WHERE user_id = %s", (user_id,))
            cursor_can.execute("DELETE FROM canvas_user_roles WHERE user_id = %s", (user_id,))
            cursor_can.execute("DELETE FROM canvas_invites WHERE created_by = %s", (user_id,))
            cursor_can.execute("DELETE FROM canvases WHERE owner_id = %s", (user_id,))
            
            conn_can.commit()
            Logger.info(f"db_canvases user data successfully purged for User ID: {user_id}")
        except Exception as e:
            Logger.error(f"Error purging db_canvases for User ID {user_id}: {e}")
        finally:
            if conn_can and conn_can.is_connected():
                cursor_can.close()
                conn_can.close()

        # 4. db_telemetry purge by UUID
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

        # 5. db_identity purge:
        Logger.info(f"Executing master record eradication in db_identity for User ID: {user_id}")
        
        # Disassociate financial purchase records to preserve accounting logs (user_id = NULL)
        financial_tables = ['subscriptions', 'payment_history', 'store_purchases']
        for ft in financial_tables:
            try:
                cursor_id.execute(f"UPDATE {ft} SET user_id = NULL WHERE user_id = %s", (user_id,))
            except Exception as fe:
                Logger.warning(f"Financial record anonymization notice ({ft}): {fe}")

        # Delete non-financial user records
        identity_tables = [
            'user_perks', 'custom_palettes', 'user_flags', 'user_preferences',
            'profile_changes_log', 'user_restrictions', 'auth_tokens', 'sessions',
            'user_roles', 'verification_codes', 'personal_access_tokens'
        ]
        for table in identity_tables:
            try:
                cursor_id.execute(f"DELETE FROM {table} WHERE user_id = %s", (user_id,))
            except mysql.connector.Error:
                pass

        try:
            cursor_id.execute("UPDATE moderation_logs SET admin_id = NULL WHERE admin_id = %s", (user_id,))
            cursor_id.execute("DELETE FROM moderation_logs WHERE user_id = %s", (user_id,))
        except Exception:
            pass

        cursor_id.execute("DELETE FROM users WHERE id = %s", (user_id,))
        conn_id.commit()
        Logger.info(f"User ID {user_id} eradicated successfully from all 3 databases and storage arrays.")
        
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
                msg['Subject'] = "Thank you for your subscription!"
                msg['From'] = f"{SMTP_FROM_NAME} <{SMTP_FROM_EMAIL}>"
                msg['To'] = user_email
                
                html = f"""
                <!DOCTYPE html>
                <html>
                <body style='margin: 0; padding: 0; background-color: #f5f5fa; font-family: Arial, sans-serif;'>
                    <div style='padding: 20px; background-color: #f5f5fa; color: #111;'>
                        <div style='max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 30px; border-radius: 8px; border: 1px solid #00000020;'>
                            <h2 style='color: #111111; margin-top: 0;'>Thank you for your subscription!</h2>
                            <p style='color: #666666; font-size: 15px; line-height: 1.5;'>Hi {username}, we have successfully processed your payment and your {tier_name} ({billing_period}) subscription is active.</p>
                            <p style='color: #666666; font-size: 15px; line-height: 1.5;'>You can start enjoying your new perks right away.</p>
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
        
        billing_period_display = 'Yearly' if billing_period == 'yearly' else 'Monthly'
        
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
                msg['Subject'] = "Reminder: Your subscription is about to renew"
                msg['From'] = f"{SMTP_FROM_NAME} <{SMTP_FROM_EMAIL}>"
                msg['To'] = user_email
                
                html = f"""
                <!DOCTYPE html>
                <html>
                <body style='margin: 0; padding: 0; background-color: #f5f5fa; font-family: Arial, sans-serif;'>
                    <div style='padding: 20px; background-color: #f5f5fa; color: #111;'>
                        <div style='max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 30px; border-radius: 8px; border: 1px solid #00000020;'>
                            <h2 style='color: #111111; margin-top: 0;'>Renewal Reminder</h2>
                            <p style='color: #666666; font-size: 15px; line-height: 1.5;'>Hi {username},</p>
                            <p style='color: #666666; font-size: 15px; line-height: 1.5;'>This is a reminder that your <strong>{tier_name} ({billing_period_display})</strong> subscription will automatically renew on <strong>{renewal_date}</strong>.</p>
                            <p style='color: #666666; font-size: 15px; line-height: 1.5;'>If you wish to continue enjoying your benefits, you don't need to do anything. If you prefer to cancel, you can do so from your account settings before this date.</p>
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
    elif email_type == 'welcome':
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
                    Logger.error("SMTP configuration is missing. Cannot send welcome email.")
                    return

                msg = MIMEMultipart('alternative')
                msg['Subject'] = "Welcome to Project Rosaura!"
                msg['From'] = f"{SMTP_FROM_NAME} <{SMTP_FROM_EMAIL}>"
                msg['To'] = user_email
                
                html = f"""
                <!DOCTYPE html>
                <html>
                <body style='margin: 0; padding: 0; background-color: #f5f5fa; font-family: Arial, sans-serif;'>
                    <div style='padding: 20px; background-color: #f5f5fa; color: #111;'>
                        <div style='max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 30px; border-radius: 8px; border: 1px solid #00000020;'>
                            <h2 style='color: #111111; margin-top: 0;'>Welcome to our platform!</h2>
                            <p style='color: #666666; font-size: 15px; line-height: 1.5;'>Hi {username}, we are thrilled to have you here.</p>
                            <p style='color: #666666; font-size: 15px; line-height: 1.5;'>Your registration was successful, and you can now start exploring all our features.</p>
                            <p style='color: #666666; font-size: 15px; line-height: 1.5;'>If you have any questions, feel free to reach out to our support team.</p>
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
                Logger.info(f"Welcome email sent to {user_email}")
            else:
                Logger.error(f"User {user_id} not found for welcome email dispatch")
        except Exception as e:
            Logger.error(f"Failed to process welcome email: {e}")
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
    last_maintenance_check = 0
    last_renewal_check = 0
    MAINTENANCE_INTERVAL = 86400
    RENEWAL_CHECK_INTERVAL = 86400
    EXPIRATION_CHECK_INTERVAL = 3600
    last_expiration_check = 0
    
    while True:
        current_time = time.time()

        if current_time - last_renewal_check >= RENEWAL_CHECK_INTERVAL:
            Logger.info("Scheduler evaluating upcoming subscription renewals.")
            conn = None
            try:
                conn = get_db_connection()
                cursor = conn.cursor(dictionary=True)
                cursor.execute("""
                    SELECT s.id, s.user_id, s.tier, s.billing_period, s.current_period_end, t.name as tier_name
                    FROM subscriptions s
                    LEFT JOIN subscription_tiers t ON s.tier = t.tier_level
                    WHERE s.status = 'active' 
                    AND s.current_period_end BETWEEN NOW() + INTERVAL 6 DAY AND NOW() + INTERVAL 8 DAY
                """)
                upcoming_subs = cursor.fetchall()
                
                for sub in upcoming_subs:
                    if not r:
                        r = get_redis_connection()
                    if r:
                        renewal_date = sub['current_period_end'].strftime('%Y-%m-%d')
                        redis_key = f"notified:renewal:{sub['id']}:{renewal_date}"
                        if not r.exists(redis_key):
                            tier_name = sub['tier_name'] or ''
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

        if current_time - last_expiration_check >= EXPIRATION_CHECK_INTERVAL:
            Logger.info("Scheduler evaluating expired subscriptions for immediate cancellation (zero grace days).")
            conn = None
            try:
                conn = get_db_connection()
                cursor = conn.cursor(dictionary=True)
                cursor.execute("""
                    SELECT id, user_id FROM subscriptions 
                    WHERE status IN ('active', 'past_due') 
                    AND current_period_end IS NOT NULL 
                    AND current_period_end <= NOW()
                """)
                expired_subs = cursor.fetchall()
                for sub in expired_subs:
                    s_id = sub['id']
                    u_id = sub['user_id']
                    cursor.execute("UPDATE subscriptions SET status = 'canceled', canceled_at = NOW() WHERE id = %s", (s_id,))
                    cursor.execute("UPDATE users SET subscription_tier = 0 WHERE id = %s", (u_id,))
                    conn.commit()
                    Logger.info(f"Subscription ID {s_id} for User ID {u_id} reached end of period and was canceled immediately.")
                last_expiration_check = time.time()
            except Exception as e:
                Logger.error(f"Scheduler fault during subscription expiration evaluation: {e}")
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

REDIS_HOST = os.getenv('REDIS_HOST')
REDIS_PORT = int(os.getenv('REDIS_PORT')) if os.getenv('REDIS_PORT') else None
REDIS_PASSWORD = os.getenv('REDIS_PASS')

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

TS_HOST = os.environ.get('TYPESENSE_HOST')
TS_PORT = os.environ.get('TYPESENSE_PORT')
TS_PROTOCOL = os.environ.get('TYPESENSE_PROTOCOL')
TS_API_KEY = os.environ.get('TYPESENSE_API_KEY')

TS_SYNC_INTERVAL = int(os.environ.get('TYPESENSE_SYNC_INTERVAL') or 60)

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
            db_canvases = os.getenv('DB_CANVASES_NAME')
            connection = pymysql.connect(
                host=DB_HOST,
                user=DB_USER,
                password=DB_PASS,
                database=db_canvases,
                cursorclass=pymysql.cursors.SSDictCursor
            )

            with connection:
                with connection.cursor() as cursor:
                    cursor.execute("SELECT id, uuid, name, owner_id, privacy, UNIX_TIMESTAMP(created_at) as created_at FROM canvases")
                    
                    total_synced = 0
                    while True:
                        canvases = cursor.fetchmany(1000)
                        if not canvases:
                            break
                            
                        documents = []
                        for c in canvases:
                            documents.append({
                                'id': str(c['id']),
                                'uuid': c['uuid'],
                                'name': c['name'],
                                'owner_id': c['owner_id'] if c['owner_id'] else 0,
                                'privacy': c['privacy'],
                                'created_at': int(c['created_at']) if c['created_at'] else 0
                            })
                        
                        if documents:
                            client.collections['canvases'].documents.import_(documents, {'action': 'upsert'})
                            total_synced += len(documents)
                    
                    if total_synced > 0:
                        logger.info(f"Sync completed: {total_synced} canvases indexed/updated in batches.")
                    else:
                        logger.info("No canvases in database to index.")
                        
        except Exception as e:
            logger.error(f"Error during sync cycle: {e}")

        time.sleep(TS_SYNC_INTERVAL)

def template_tokens_reset_thread():
    Logger.info("Starting Template Tokens Reset Thread (running every 60s)...")
    while True:
        try:
            conn = get_db_connection()
            if conn:
                with conn.cursor() as cursor:
                    cursor.execute("""
                        UPDATE users 
                        SET template_tokens_used = 0, template_tokens_reset_at = NULL 
                        WHERE template_tokens_reset_at IS NOT NULL 
                          AND template_tokens_reset_at <= NOW()
                    """)
                    conn.commit()
                conn.close()
        except Exception as e:
            Logger.error(f"Error in template_tokens_reset_thread: {e}")

        time.sleep(60)

if __name__ == "__main__":
    Logger.info("STARTING UNIFIED SYSTEM TASKS WORKER...")
    threading.Thread(target=scheduler_loop, daemon=True, name="Thread-Scheduler").start()
    threading.Thread(target=system_tasks_thread, daemon=True, name="Thread-SystemTasks").start()
    threading.Thread(target=telemetry_thread, daemon=True, name="Thread-Telemetry").start()
    threading.Thread(target=typesense_thread, daemon=True, name="Thread-Typesense").start()
    threading.Thread(target=template_tokens_reset_thread, daemon=True, name="Thread-TemplateTokensReset").start()
    
    while True:
        time.sleep(1)
