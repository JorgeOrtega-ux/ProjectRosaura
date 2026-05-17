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

# Configuración de Entorno
DB_HOST = os.getenv('DB_HOST', 'db')
DB_USER = os.getenv('DB_USER', 'root')
DB_PASS = os.getenv('DB_PASS', 'root')
DB_NAME = os.getenv('DB_NAME', 'db_identity')

REDIS_HOST = os.getenv('REDIS_HOST', 'redis')
REDIS_PORT = int(os.getenv('REDIS_PORT', 6379))
REDIS_PASS = os.getenv('REDIS_PASS', None)

QUEUE_NAME = 'queue:account_deletion'

def get_db_connection():
    return mysql.connector.connect(
        host=DB_HOST,
        user=DB_USER,
        password=DB_PASS,
        database=DB_NAME
    )

def get_redis_connection():
    if REDIS_PASS:
        return redis.Redis(host=REDIS_HOST, port=REDIS_PORT, password=REDIS_PASS, decode_responses=True)
    return redis.Redis(host=REDIS_HOST, port=REDIS_PORT, decode_responses=True)

def send_deletion_email(to_email, username, reason):
    """
    Envía un correo transaccional informando sobre la eliminación permanente de la cuenta
    usando la configuración SMTP del sistema.
    """
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
    """
    Ejecuta el hard delete en la base de datos y borra las imágenes físicas.
    Además, envía la alerta al correo del usuario fuera del proceso bloqueante de PHP.
    """
    user_id = payload.get('user_id')
    email = payload.get('email')
    username = payload.get('username')
    reason = payload.get('reason', 'account_deleted_by_admin')
    
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        # En caso de que la alerta venga del scheduler pasivo y no traiga email/username, los buscamos
        if not email or not username:
            cursor.execute("SELECT email, username FROM users WHERE id = %s", (user_id,))
            row = cursor.fetchone()
            if row:
                email = row['email']
                username = row['username']
        
        # Buscar el uuid y la foto de perfil para borrarlos del almacenamiento físico antes de hacer drop en base de datos
        cursor.execute("SELECT uuid, profile_picture FROM users WHERE id = %s", (user_id,))
        user_data = cursor.fetchone()
        
        if user_data:
            profile_pic = user_data.get('profile_picture')
            uuid_str = user_data.get('uuid')
            
            base_path = os.getenv('APP_ROOT_PATH', '/app')
            
            # 1. Borrar la foto asignada actualmente
            if profile_pic and 'fallbacks/avatar-default.png' not in profile_pic:
                if '/public/' in profile_pic:
                    pic_relative = profile_pic[profile_pic.find('public/'):]
                else:
                    pic_relative = profile_pic.lstrip('/')
                    
                pic_path = os.path.join(base_path, pic_relative)
                if os.path.exists(pic_path) and os.path.isfile(pic_path):
                    try:
                        os.remove(pic_path)
                        Logger.info(f"Archivo físico de perfil eliminado: {pic_path}")
                    except Exception as e:
                        Logger.error(f"Error al eliminar foto actual: {e}")
            
            # 2. Borrar avatares huerfanos default
            if uuid_str:
                orphan_default = os.path.join(base_path, f"public/storage/profilePictures/default/{uuid_str}.png")
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
        
        # Ya que la limpieza ha finalizado exitosamente en la DB, enviamos la notificación
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

def worker_loop():
    """
    Hilo bloqueante que escucha constantemente la cola de Redis.
    Procesa las peticiones instantáneas (Admin) o las que inyecta el cron.
    """
    r = get_redis_connection()
    Logger.info(f"Worker de eliminación iniciado y escuchando la cola '{QUEUE_NAME}'...")
    
    while True:
        try:
            # BLPOP bloquea hasta que haya un elemento
            _, payload_str = r.blpop(QUEUE_NAME, timeout=0)
            payload = json.loads(payload_str)
            
            if payload and 'user_id' in payload:
                process_deletion(payload)
                
        except redis.RedisError as re:
            Logger.error(f"Error de conexión con Redis: {re}")
            time.sleep(5)
        except Exception as e:
            Logger.error(f"Error en el worker loop: {e}")
            time.sleep(5)

def scheduler_loop():
    """
    Hilo que actúa como cron. Revisa la base de datos cada hora
    buscando usuarios cuyo periodo de gracia haya expirado.
    """
    Logger.info("Scheduler de eliminación iniciado. Revisando cada 60 minutos.")
    r = get_redis_connection()
    
    while True:
        conn = None
        try:
            conn = get_db_connection()
            cursor = conn.cursor(dictionary=True)
            
            # Buscar usuarios cuyo periodo de gracia expiró
            cursor.execute("SELECT id FROM users WHERE deletion_scheduled_at IS NOT NULL AND deletion_scheduled_at <= NOW()")
            users_to_delete = cursor.fetchall()
            
            for user in users_to_delete:
                user_id = user['id']
                payload = json.dumps({"user_id": user_id})
                r.rpush(QUEUE_NAME, payload)
                Logger.info(f"Scheduler empujó el ID {user_id} a la cola de eliminación.")
                
        except mysql.connector.Error as err:
            Logger.error(f"Error MySQL en el scheduler: {err}")
        except Exception as e:
            Logger.error(f"Error en el scheduler loop: {e}")
        finally:
            if conn and conn.is_connected():
                cursor.close()
                conn.close()
                
        # Dormir 60 minutos (3600 seg) antes de la siguiente revisión
        time.sleep(3600)

if __name__ == "__main__":
    # Iniciar el scheduler en un hilo secundario (daemon)
    scheduler_thread = threading.Thread(target=scheduler_loop, daemon=True)
    scheduler_thread.start()
    
    # Ejecutar el worker bloqueante en el hilo principal
    worker_loop()