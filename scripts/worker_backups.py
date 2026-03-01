# scripts/worker_backups.py
import os
import sys
import glob
import time
import subprocess
from datetime import datetime
import mysql.connector
from dotenv import load_dotenv

# Configurar rutas
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ENV_PATH = os.path.join(BASE_DIR, '.env')
BACKUP_DIR = os.path.join(BASE_DIR, 'storage', 'backups')

# Cargar variables de entorno del archivo .env de PHP
load_dotenv(dotenv_path=ENV_PATH)

DB_HOST = os.getenv('DB_HOST', 'localhost')
DB_USER = os.getenv('DB_USER', 'root')
DB_PASS = os.getenv('DB_PASS', '')
DB_NAME = os.getenv('DB_NAME', 'projectrosaura')

# Frecuencia base del "latido" del worker (en segundos)
WORKER_TICK_SECONDS = 10

def log(message):
    print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] {message}", flush=True)

def get_server_config():
    try:
        conn = mysql.connector.connect(
            host=DB_HOST,
            user=DB_USER,
            password=DB_PASS,
            database=DB_NAME
        )
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT auto_backup_enabled, auto_backup_frequency_hours, auto_backup_retention_count FROM server_config WHERE id = 1")
        config = cursor.fetchone()
        cursor.close()
        conn.close()
        return config
    except Exception as e:
        log(f"Error al conectar con la base de datos: {str(e)}")
        return None

def create_backup():
    if not os.path.exists(BACKUP_DIR):
        os.makedirs(BACKUP_DIR)
        
    date_str = datetime.now().strftime('%Y-%m-%d_%H-%M-%S')
    filename = f"auto_backup_{date_str}.sql"
    filepath = os.path.join(BACKUP_DIR, filename)
    
    dump_cmd = ["mysqldump", "-h", DB_HOST, "-u", DB_USER, DB_NAME]
    
    # Usar variables de entorno para evitar exposición de credenciales
    env = os.environ.copy()
    if DB_PASS:
        env["MYSQL_PWD"] = DB_PASS

    try:
        with open(filepath, 'w') as f:
            subprocess.run(dump_cmd, env=env, stdout=f, stderr=subprocess.PIPE, check=True)
            
        # Restringir permisos del archivo (Solo dueño)
        os.chmod(filepath, 0o600)
        
        log(f"✅ Copia de seguridad generada con éxito: {filename}")
        return True
    except subprocess.CalledProcessError as e:
        log(f"❌ Error ejecutando mysqldump: {e.stderr.decode('utf-8')}")
        if os.path.exists(filepath):
            os.remove(filepath)
        return False

def clean_old_backups(retention_count):
    search_pattern = os.path.join(BACKUP_DIR, "auto_backup_*.sql")
    files = glob.glob(search_pattern)
    
    # Ordenar por fecha de modificación (los más recientes primero)
    files.sort(key=os.path.getmtime, reverse=True)
    
    if len(files) > retention_count:
        files_to_delete = files[retention_count:]
        for file in files_to_delete:
            try:
                os.remove(file)
                log(f"🗑️ Backup antiguo eliminado por límite de retención: {os.path.basename(file)}")
            except Exception as e:
                log(f"❌ Error al eliminar backup antiguo {os.path.basename(file)}: {str(e)}")

def run_worker_cycle():
    config = get_server_config()
    
    if not config:
        return 
        
    if config['auto_backup_enabled'] != 1:
        return 
        
    freq_hours = config['auto_backup_frequency_hours']
    retention_count = config['auto_backup_retention_count']

    is_test_mode = (freq_hours == 0)
    target_seconds = 10 if is_test_mode else (float(freq_hours) * 3600.0)
    
    search_pattern = os.path.join(BACKUP_DIR, "auto_backup_*.sql")
    existing_backups = glob.glob(search_pattern)
    
    should_backup = False
    
    if not existing_backups:
        log("No hay backups automáticos previos. Se forzará la creación inicial.")
        should_backup = True
    else:
        existing_backups.sort(key=os.path.getmtime, reverse=True)
        latest_backup = existing_backups[0]
        mod_time = os.path.getmtime(latest_backup)
        time_diff_seconds = time.time() - mod_time
        
        if time_diff_seconds >= target_seconds:
            label = "10 segundos (Modo Prueba)" if is_test_mode else f"{freq_hours} hrs"
            log(f"Han pasado {int(time_diff_seconds)}s desde el último backup. Objetivo: {label}. Iniciando respaldo...")
            should_backup = True
            
    if should_backup:
        if create_backup():
            clean_old_backups(retention_count)

def main():
    log("==================================================")
    log("🚀 Iniciando Worker de Backups (Modo Reactivo)...")
    log(f"⏱️ El worker leerá los ajustes de la web cada {WORKER_TICK_SECONDS} segundos.")
    log("==================================================")
    
    while True:
        try:
            run_worker_cycle()
        except Exception as e:
            log(f"⚠️ Error crítico en el ciclo del worker: {str(e)}")
            
        time.sleep(WORKER_TICK_SECONDS)

if __name__ == "__main__":
    sys.stdout.reconfigure(encoding='utf-8')
    main()