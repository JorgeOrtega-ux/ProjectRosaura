import os
import json
import time
import threading
import inspect
import mysql.connector
import redis
from datetime import datetime
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
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


# ==========================================
# Configuración de Entorno
# ==========================================
DB_HOST = os.getenv('DB_HOST', 'db')
DB_USER = os.getenv('DB_USER', 'root')
DB_PASS = os.getenv('DB_PASS', 'root')
DB_NAME = os.getenv('DB_NAME', 'db_identity')

# Variables para Base de Datos de Telemetría (Limpieza)
DB_TEL_HOST = os.getenv('DB_TELEMETRY_HOST', 'db')
DB_TEL_NAME = os.getenv('DB_TELEMETRY_NAME', 'db_telemetry')
DB_TEL_USER = os.getenv('DB_TELEMETRY_USER', 'system_web_executor')
DB_TEL_PASS = os.getenv('DB_TELEMETRY_PASSWORD', 'secret')

REDIS_HOST = os.getenv('REDIS_HOST', 'redis')
REDIS_PORT = int(os.getenv('REDIS_PORT', 6379))
REDIS_PASS = os.getenv('REDIS_PASS', None)

APP_ROOT_PATH = os.getenv('APP_ROOT_PATH', '/app')

QUEUE_ACCOUNT_DELETION = 'queue:account_deletion'
QUEUE_EMAILS = 'queue:emails' # Lista para futuro uso


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
    if REDIS_PASS:
        return redis.Redis(host=REDIS_HOST, port=REDIS_PORT, password=REDIS_PASS, decode_responses=True)
    return redis.Redis(host=REDIS_HOST, port=REDIS_PORT, decode_responses=True)


# ==========================================
# LÓGICA: ELIMINACIÓN DE CUENTAS
# ==========================================
def send_deletion_email(to_email, username, reason):
    smtp_host = os.getenv('SMTP_HOST')
    if not smtp_host:
        Logger.warning("SMTP no configurado. Se omite envío de correo.")
        return

    smtp_port = int(os.getenv('SMTP_PORT', 587))
    smtp_user = os.getenv('SMTP_USER')
    smtp_pass = os.getenv('SMTP_PASS')
    smtp_from = os.getenv('SMTP_FROM_EMAIL', smtp_user)
    app_name = os.getenv('APP_NAME', 'ProjectRosaura')

    msg = MIMEMultipart('alternative')
    msg['Subject'] = f"Tu cuenta en {app_name} ha sido eliminada permanentemente"
    msg['From'] = f"{app_name} <{smtp_from}>"
    msg['To'] = to_email

    html_content = f"""
    <html>
    <body style="font-family: Arial, sans-serif; color: #333; line-height: 1.6;">
        <h2 style="color: #d9534f;">Hola, {username}</h2>
        <p>Te notificamos de manera oficial que tu cuenta en <b>{app_name}</b> y todos tus datos asociados han sido eliminados de manera permanente de nuestros servidores.</p>
        <p><b>Razón o contexto de la eliminación:</b> {reason}</p>
        <p>Esta acción es irreversible y tu información ya no podrá ser recuperada.</p>
        <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
        <p style="font-size: 12px; color: #999;">Este es un mensaje automático de seguridad, por favor no respondas a este correo directo.</p>
    </body>
    </html>
    """
    msg.attach(MIMEText(html_content, 'html'))

    try:
        server = smtplib.SMTP(smtp_host, smtp_port)
        server.ehlo()
        server.starttls()
        if smtp_user and smtp_pass:
            server.login(smtp_user, smtp_pass)
        server.sendmail(smtp_from, [to_email], msg.as_string())
        server.quit()
        Logger.info(f"Correo transaccional de eliminación enviado exitosamente a {to_email}")
    except Exception as e:
        Logger.error(f"Fallo de red/SMTP al enviar correo a {to_email}: {e}")


def process_deletion(payload):
    user_id = payload.get('user_id')
    email = payload.get('email')
    username = payload.get('username')
    reason = payload.get('reason', 'account_deleted_by_admin')
    
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        if not email or not username:
            cursor.execute("SELECT email, username FROM users WHERE id = %s", (user_id,))
            row = cursor.fetchone()
            if row:
                email = row['email']
                username = row['username']
        
        cursor.execute("SELECT uuid, profile_picture FROM users WHERE id = %s", (user_id,))
        user_data = cursor.fetchone()
        
        if user_data:
            profile_pic = user_data.get('profile_picture')
            uuid_str = user_data.get('uuid')
            
            if profile_pic and 'fallbacks/avatar-default.png' not in profile_pic:
                if '/public/' in profile_pic:
                    pic_relative = profile_pic[profile_pic.find('public/'):]
                else:
                    pic_relative = profile_pic.lstrip('/')
                    
                pic_path = os.path.join(APP_ROOT_PATH, pic_relative)
                if os.path.exists(pic_path) and os.path.isfile(pic_path):
                    try:
                        os.remove(pic_path)
                        Logger.info(f"Archivo físico de perfil eliminado: {pic_path}")
                    except Exception as e:
                        Logger.error(f"Error al eliminar foto actual: {e}")
            
            if uuid_str:
                orphan_default = os.path.join(APP_ROOT_PATH, f"public/storage/profilePictures/default/{uuid_str}.png")
                if os.path.exists(orphan_default) and os.path.isfile(orphan_default):
                    try:
                        os.remove(orphan_default)
                        Logger.info(f"Avatar default huérfano eliminado: {orphan_default}")
                    except Exception as e:
                        pass
        
        Logger.info(f"Eliminando físicamente al usuario ID: {user_id}")
        cursor.execute("DELETE FROM users WHERE id = %s", (user_id,))
        conn.commit()
        Logger.info(f"Usuario ID: {user_id} eliminado con éxito de la base de datos.")
        
        if email and username:
            send_deletion_email(email, username, reason)
        
    except mysql.connector.Error as err:
        Logger.error(f"Error MySQL al borrar usuario {user_id}: {err}")
    except Exception as e:
        Logger.error(f"Error inesperado al borrar usuario {user_id}: {e}")
    finally:
        if conn and conn.is_connected():
            cursor.close()
            conn.close()


# ==========================================
# LÓGICA: MANTENIMIENTO (Conserje)
# ==========================================
def heal_default_avatars():
    Logger.info("[TAREA] Iniciando sanación de avatares...")
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        fallback_path = 'public/assets/img/fallbacks/avatar-default.png'
        cursor.execute("SELECT id, username, uuid FROM users WHERE profile_picture = %s", (fallback_path,))
        users = cursor.fetchall()
        
        if not users:
            Logger.info("No hay avatares que sanar el día de hoy.")
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
                    full_path = os.path.join(APP_ROOT_PATH, rel_path)
                    
                    os.makedirs(os.path.dirname(full_path), exist_ok=True)
                    
                    with open(full_path, 'wb') as f:
                        f.write(response.content)
                        
                    os.chmod(full_path, 0o644)
                        
                    cursor.execute("UPDATE users SET profile_picture = %s WHERE id = %s", (rel_path, user_id))
                    conn.commit()
                    Logger.info(f"[ÉXITO] Avatar sanado para usuario: {username}")
                else:
                    Logger.warning(f"[FALLO] La API bloqueó la petición o no mandó imagen (Content-Type: {content_type}) para {username}")
                    
            except requests.exceptions.RequestException as e:
                Logger.error(f"[ERROR RED] No se pudo descargar avatar para {username}: {e}")
                
    except mysql.connector.Error as err:
        Logger.error(f"[ERROR DB] Fallo de MySQL en sanación: {err}")
    finally:
        if conn and conn.is_connected():
            cursor.close()
            conn.close()

def cleanup_old_telemetry():
    Logger.info("[TAREA] Iniciando limpieza de telemetría antigua (más de 90 días)...")
    conn = None
    try:
        conn = get_telemetry_db_connection()
        cursor = conn.cursor()
        
        tables = ['api_latency', 'pageviews', 'page_interactions', 'auth_events']
        total_deleted = 0
        
        for table in tables:
            cursor.execute(f"DELETE FROM {table} WHERE created_at < NOW() - INTERVAL 90 DAY")
            deleted = cursor.rowcount
            total_deleted += deleted
            if deleted > 0:
                Logger.info(f"Limpieza en {table}: {deleted} registros eliminados.")
            
        conn.commit()
        Logger.info(f"[ÉXITO] Limpieza de telemetría finalizada. Total: {total_deleted} registros liberados.")
    except mysql.connector.Error as err:
        Logger.error(f"[ERROR DB] Fallo de MySQL limpiando telemetría: {err}")
    finally:
        if conn and conn.is_connected():
            cursor.close()
            conn.close()

def future_maintenance_tasks():
    pass


# ==========================================
# LOOPS PRINCIPALES
# ==========================================
def worker_loop():
    """
    Hilo bloqueante que escucha constantemente las colas de Redis.
    Puede escuchar múltiples colas simultáneamente.
    """
    r = get_redis_connection()
    queues_to_listen = [QUEUE_ACCOUNT_DELETION, QUEUE_EMAILS]
    Logger.info(f"Worker unificado iniciado, escuchando colas: {', '.join(queues_to_listen)}...")
    
    while True:
        try:
            # blpop con lista de colas. Retorna una tupla: (nombre_cola, valor)
            result = r.blpop(queues_to_listen, timeout=0)
            if result:
                queue_name, payload_str = result
                payload = json.loads(payload_str)
                
                if queue_name == QUEUE_ACCOUNT_DELETION:
                    if payload and 'user_id' in payload:
                        process_deletion(payload)
                
                # elif queue_name == QUEUE_EMAILS:
                #    process_emails(payload)
                
        except redis.RedisError as re:
            Logger.error(f"Error de conexión con Redis en hilo principal: {re}")
            time.sleep(5)
        except Exception as e:
            Logger.error(f"Error en el worker loop: {e}")
            time.sleep(5)


def scheduler_loop():
    """
    Hilo orquestador (cron) unificado basado en diferencias de tiempo (delta time).
    No bloquea la ejecución de otras tareas cuando duerme.
    """
    Logger.info("Scheduler orquestador iniciado.")
    r = get_redis_connection()
    
    # Inicializamos en 0 para que se ejecuten inmediatamente al encender el contenedor
    last_deletion_check = 0
    last_maintenance_check = 0

    # Intervalos de tiempo en segundos
    DELETION_INTERVAL = 3600  # 60 minutos
    MAINTENANCE_INTERVAL = 86400  # 24 horas
    
    while True:
        current_time = time.time()
        
        # --- TAREA 1: Borrado de cuentas programado ---
        if current_time - last_deletion_check >= DELETION_INTERVAL:
            Logger.info("Scheduler: Revisando expiración del periodo de gracia de cuentas...")
            conn = None
            try:
                conn = get_db_connection()
                cursor = conn.cursor(dictionary=True)
                
                cursor.execute("SELECT id FROM users WHERE deletion_scheduled_at IS NOT NULL AND deletion_scheduled_at <= NOW()")
                users_to_delete = cursor.fetchall()
                
                for user in users_to_delete:
                    user_id = user['id']
                    payload = json.dumps({"user_id": user_id})
                    r.rpush(QUEUE_ACCOUNT_DELETION, payload)
                    Logger.info(f"Scheduler empujó el ID {user_id} a la cola de eliminación.")
                    
                last_deletion_check = time.time() # Actualizamos el reloj
            except Exception as e:
                Logger.error(f"Error en scheduler (Cuentas): {e}")
            finally:
                if conn and conn.is_connected():
                    cursor.close()
                    conn.close()

        # --- TAREA 2: Tareas de mantenimiento (Avatares, etc.) ---
        if current_time - last_maintenance_check >= MAINTENANCE_INTERVAL:
            Logger.info("Scheduler: Ejecutando tareas de mantenimiento periódico...")
            try:
                heal_default_avatars()
                cleanup_old_telemetry() # <--- Llamada añadida aquí
                future_maintenance_tasks()
                last_maintenance_check = time.time() # Actualizamos el reloj
            except Exception as e:
                Logger.error(f"Error en scheduler (Mantenimiento): {e}")

        # El scheduler duerme solo 60 segundos antes de volver a verificar el reloj
        time.sleep(60)


if __name__ == "__main__":
    # Iniciar el scheduler en un hilo secundario
    scheduler_thread = threading.Thread(target=scheduler_loop, daemon=True)
    scheduler_thread.start()
    
    # Ejecutar el worker bloqueante (escucha de colas) en el hilo principal
    worker_loop()