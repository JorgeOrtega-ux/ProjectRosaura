# scripts/worker_backups.py
import os
import sys
import glob
import time
import subprocess
import json
import redis
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

REDIS_HOST = os.getenv('REDIS_HOST', '127.0.0.1')
REDIS_PORT = int(os.getenv('REDIS_PORT', 6379))
REDIS_PASS = os.getenv('REDIS_PASS', '')

# Frecuencia base del "latido" del worker (en segundos)
# Reducido a 3 para procesar trabajos manuales rápidamente
WORKER_TICK_SECONDS = 3 

def log(message):
    print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] {message}", flush=True)

def get_redis_connection():
    try:
        r = redis.Redis(host=REDIS_HOST, port=REDIS_PORT, password=REDIS_PASS, decode_responses=True)
        r.ping()
        return r
    except Exception as e:
        log(f"Error de conexión con Redis: {str(e)}")
        return None

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

def execute_mysqldump(filename):
    if not os.path.exists(BACKUP_DIR):
        os.makedirs(BACKUP_DIR)
        
    filepath = os.path.join(BACKUP_DIR, filename)
    dump_cmd = ["mysqldump", "-h", DB_HOST, "-u", DB_USER, DB_NAME]
    
    env = os.environ.copy()
    if DB_PASS:
        env["MYSQL_PWD"] = DB_PASS

    try:
        with open(filepath, 'w') as f:
            subprocess.run(dump_cmd, env=env, stdout=f, stderr=subprocess.PIPE, check=True)
            
        os.chmod(filepath, 0o600)
        return True
    except subprocess.CalledProcessError as e:
        log(f"❌ Error ejecutando mysqldump: {e.stderr.decode('utf-8')}")
        if os.path.exists(filepath):
            os.remove(filepath)
        return False

def create_auto_backup():
    date_str = datetime.now().strftime('%Y-%m-%d_%H-%M-%S')
    filename = f"auto_backup_{date_str}.sql"
    if execute_mysqldump(filename):
        log(f"✅ Copia de seguridad automática generada: {filename}")
        return True
    return False

def clean_old_backups(retention_count):
    search_pattern = os.path.join(BACKUP_DIR, "auto_backup_*.sql")
    files = glob.glob(search_pattern)
    
    files.sort(key=os.path.getmtime, reverse=True)
    
    if len(files) > retention_count:
        files_to_delete = files[retention_count:]
        for file in files_to_delete:
            try:
                os.remove(file)
                log(f"🗑️ Backup antiguo eliminado por límite de retención: {os.path.basename(file)}")
            except Exception as e:
                log(f"❌ Error al eliminar backup antiguo {os.path.basename(file)}: {str(e)}")

def process_manual_backups():
    r = get_redis_connection()
    if not r:
        return

    # Usamos LPOP en lugar de BLPOP para no bloquear el worker y permitir que los backups automáticos funcionen
    job_data_raw = r.lpop('backup_queue')
    
    if job_data_raw:
        try:
            job_data = json.loads(job_data_raw)
            job_id = job_data.get('job_id')
            job_key = f"backup_job:{job_id}"
            
            # Actualizar estado a procesando
            r.hset(job_key, mapping={'status': 'processing', 'message': 'Generando archivo de respaldo...'})
            log(f"⚙️ Procesando solicitud manual de backup ID: {job_id}")
            
            date_str = datetime.now().strftime('%Y-%m-%d_%H-%M-%S')
            filename = f"backup_manual_{date_str}.sql"
            
            if execute_mysqldump(filename):
                log(f"✅ Copia de seguridad manual generada: {filename}")
                r.hset(job_key, mapping={'status': 'completed', 'message': 'Copia de seguridad creada con éxito.'})
            else:
                r.hset(job_key, mapping={'status': 'failed', 'message': 'Error interno al generar el respaldo.'})
                
        except Exception as e:
            log(f"❌ Error al procesar trabajo manual de Redis: {str(e)}")

def run_worker_cycle():
    config = get_server_config()
    
    if not config or config['auto_backup_enabled'] != 1:
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
        if create_auto_backup():
            clean_old_backups(retention_count)

def main():
    log("==================================================")
    log("🚀 Iniciando Worker de Backups (Modo Mixto)...")
    log(f"⏱️ El worker buscará tareas manuales/automáticas cada {WORKER_TICK_SECONDS} segundos.")
    log("==================================================")
    
    while True:
        try:
            # 1. Atender tareas manuales encoladas por el admin
            process_manual_backups()
            
            # 2. Revisar si toca un backup automático
            run_worker_cycle()
            
        except Exception as e:
            log(f"⚠️ Error crítico en el ciclo del worker: {str(e)}")
            
        time.sleep(WORKER_TICK_SECONDS)

if __name__ == "__main__":
    sys.stdout.reconfigure(encoding='utf-8')
    main()