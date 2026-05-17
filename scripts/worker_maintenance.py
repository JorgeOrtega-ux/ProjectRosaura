import os
import time
import random
import urllib.parse
import mysql.connector
import requests
import json
import inspect
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

# ==========================================
# Configuración de Entorno
# ==========================================
DB_HOST = os.getenv('DB_HOST', 'db')
DB_USER = os.getenv('DB_USER', 'root')
DB_PASS = os.getenv('DB_PASS', 'root')
DB_NAME = os.getenv('DB_NAME', 'db_identity')

# Ruta base de la app dentro del contenedor (para guardar los avatares)
APP_ROOT_PATH = os.getenv('APP_ROOT_PATH', '/app')

def get_db_connection():
    """Establece la conexión con la base de datos MySQL"""
    return mysql.connector.connect(
        host=DB_HOST,
        user=DB_USER,
        password=DB_PASS,
        database=DB_NAME
    )

# ==========================================
# TAREAS DE MANTENIMIENTO
# ==========================================

def heal_default_avatars():
    """
    Tarea 1: Busca usuarios con el avatar de emergencia (fallback) 
    e intenta conectarse a ui-avatars.com para generarles sus iniciales.
    Si tiene éxito, guarda la imagen y actualiza la base de datos.
    """
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
        
        # 1. EL DISFRAZ: Simulamos ser Google Chrome para que la API no nos bloquee
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
                # Enviamos los headers en la petición
                response = requests.get(url, headers=headers, timeout=5)
                
                # 2. VALIDACIÓN ESTRICTA: Revisar que nos manden una imagen
                content_type = response.headers.get('Content-Type', '')
                
                if response.status_code == 200 and 'image' in content_type:
                    file_name = f"{uuid_str}.png"
                    rel_path = f"public/storage/profilePictures/default/{file_name}"
                    full_path = os.path.join(APP_ROOT_PATH, rel_path)
                    
                    os.makedirs(os.path.dirname(full_path), exist_ok=True)
                    
                    with open(full_path, 'wb') as f:
                        f.write(response.content)
                        
                    # 3. PERMISOS: Dar permisos lectura para que Apache/PHP la pueda mostrar
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

def future_maintenance_tasks():
    """
    Espacio preparado para:
    - lift_expired_suspensions()
    - cleanup_orphan_images()
    - clear_expired_tokens()
    """
    pass

# ==========================================
# CICLO PRINCIPAL (DAEMON)
# ==========================================

def maintenance_loop():
    """
    Bucle principal del Conserje. Ejecuta las tareas y luego duerme.
    """
    Logger.info("Worker de mantenimiento iniciado. Intervalo: 24 horas.")
    
    while True:
        Logger.info("--- Iniciando ciclo de limpieza y mantenimiento ---")
        
        # Ejecutar Tareas
        heal_default_avatars()
        future_maintenance_tasks()
        
        Logger.info("--- Ciclo terminado. Worker dormirá por 24 horas ---")
        
        # Dormir 24 horas (86400 segundos)
        time.sleep(86400)

if __name__ == "__main__":
    maintenance_loop()