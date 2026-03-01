# scripts/worker_backups.py
import os
import sys
import glob
import time
import subprocess
import json
import redis
import gzip
import hashlib
from datetime import datetime
import mysql.connector
from dotenv import load_dotenv

# Requiere instalación previa: pip install cryptography
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.primitives import padding
from cryptography.hazmat.backends import default_backend

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
            host=DB_HOST, user=DB_USER, password=DB_PASS, database=DB_NAME
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

def encrypt_file(file_path):
    key_str = os.getenv('BACKUP_ENCRYPTION_KEY', 'default_rosaura_secret_key_2026')
    key = hashlib.sha256(key_str.encode()).digest() # Obtener exactamente 32 bytes para AES-256
    iv = os.urandom(16)
    cipher = Cipher(algorithms.AES(key), modes.CBC(iv), backend=default_backend())
    encryptor = cipher.encryptor()
    padder = padding.PKCS7(128).padder()
    
    enc_path = file_path + ".enc"
    try:
        with open(file_path, "rb") as f_in, open(enc_path, "wb") as f_out:
            f_out.write(iv)
            while chunk := f_in.read(64 * 1024):
                padded_chunk = padder.update(chunk)
                f_out.write(encryptor.update(padded_chunk))
            f_out.write(encryptor.update(padder.finalize()))
            f_out.write(encryptor.finalize())
        return enc_path
    except Exception as e:
        log(f"Error al cifrar: {str(e)}")
        return None

def decrypt_file(enc_path):
    key_str = os.getenv('BACKUP_ENCRYPTION_KEY', 'default_rosaura_secret_key_2026')
    key = hashlib.sha256(key_str.encode()).digest()
    
    dec_path = enc_path.replace(".enc", "")
    try:
        with open(enc_path, "rb") as f_in, open(dec_path, "wb") as f_out:
            iv = f_in.read(16)
            cipher = Cipher(algorithms.AES(key), modes.CBC(iv), backend=default_backend())
            decryptor = cipher.decryptor()
            unpadder = padding.PKCS7(128).unpadder()
            
            while chunk := f_in.read(64 * 1024):
                decrypted_chunk = decryptor.update(chunk)
                f_out.write(unpadder.update(decrypted_chunk))
            f_out.write(unpadder.update(decryptor.finalize()))
            f_out.write(unpadder.finalize())
        return dec_path
    except Exception as e:
        log(f"Error al descifrar (Clave incorrecta o archivo corrupto): {str(e)}")
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
            
        # Comprimir
        gz_filepath = filepath + ".gz"
        with open(filepath, 'rb') as f_in, gzip.open(gz_filepath, 'wb') as f_out:
            f_out.writelines(f_in)
            
        # Cifrar
        enc_filepath = encrypt_file(gz_filepath)
        
        # Limpiar residuos en texto plano y comprimidos sin cifrar
        os.remove(filepath)
        os.remove(gz_filepath)
        
        if enc_filepath:
            os.chmod(enc_filepath, 0o600)
            return True
        return False
    except subprocess.CalledProcessError as e:
        log(f"❌ Error ejecutando mysqldump: {e.stderr.decode('utf-8')}")
        if os.path.exists(filepath): os.remove(filepath)
        return False

def create_auto_backup():
    date_str = datetime.now().strftime('%Y-%m-%d_%H-%M-%S')
    filename = f"auto_backup_{date_str}.sql"
    if execute_mysqldump(filename):
        log(f"✅ Copia automática generada y cifrada: {filename}.gz.enc")
        return True
    return False

def clean_old_backups(retention_count):
    search_pattern = os.path.join(BACKUP_DIR, "auto_backup_*.sql.gz.enc")
    files = glob.glob(search_pattern)
    files.sort(key=os.path.getmtime, reverse=True)
    
    if len(files) > retention_count:
        files_to_delete = files[retention_count:]
        for file in files_to_delete:
            try:
                os.remove(file)
                log(f"🗑️ Backup antiguo eliminado: {os.path.basename(file)}")
            except Exception as e:
                log(f"❌ Error al eliminar backup {os.path.basename(file)}: {str(e)}")

def process_manual_backups():
    r = get_redis_connection()
    if not r:
        return

    job_data_raw = r.lpop('backup_queue')
    
    if job_data_raw:
        try:
            job_data = json.loads(job_data_raw)
            job_id = job_data.get('job_id')
            job_type = job_data.get('type')
            job_key = f"backup_job:{job_id}"
            
            if job_type == 'manual':
                r.hset(job_key, mapping={'status': 'processing', 'message': 'Generando y cifrando archivo...'})
                log(f"⚙️ Procesando solicitud de backup ID: {job_id}")
                
                date_str = datetime.now().strftime('%Y-%m-%d_%H-%M-%S')
                filename = f"backup_manual_{date_str}.sql"
                
                if execute_mysqldump(filename):
                    log(f"✅ Copia manual generada: {filename}.gz.enc")
                    r.hset(job_key, mapping={'status': 'completed', 'message': 'Copia de seguridad creada y cifrada con éxito.'})
                else:
                    r.hset(job_key, mapping={'status': 'failed', 'message': 'Error interno al generar el respaldo.'})
                    
            elif job_type == 'restore':
                backup_file = job_data.get('backup_file')
                r.hset(job_key, mapping={'status': 'processing', 'message': 'Descifrando y restaurando base de datos...'})
                log(f"⚙️ Procesando restauración del archivo: {backup_file} (ID: {job_id})")
                
                enc_filepath = os.path.join(BACKUP_DIR, backup_file)
                if not os.path.exists(enc_filepath):
                    r.hset(job_key, mapping={'status': 'failed', 'message': 'El archivo cifrado no existe.'})
                    return
                
                # Descifrar
                gz_filepath = decrypt_file(enc_filepath)
                if not gz_filepath:
                    r.hset(job_key, mapping={'status': 'failed', 'message': 'Error al descifrar (Clave inválida o archivo corrupto).'})
                    return
                
                # Descomprimir
                sql_filepath = gz_filepath.replace('.gz', '')
                try:
                    with gzip.open(gz_filepath, 'rb') as f_in, open(sql_filepath, 'wb') as f_out:
                        f_out.writelines(f_in)
                except Exception as e:
                    os.remove(gz_filepath)
                    r.hset(job_key, mapping={'status': 'failed', 'message': 'Error al descomprimir el archivo.'})
                    return
                
                # Restaurar MySQL
                restore_cmd = ["mysql", "-h", DB_HOST, "-u", DB_USER, DB_NAME]
                env = os.environ.copy()
                if DB_PASS:
                    env["MYSQL_PWD"] = DB_PASS
                    
                try:
                    with open(sql_filepath, 'r') as f:
                        subprocess.run(restore_cmd, env=env, stdin=f, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True)
                    log(f"✅ Base de datos restaurada correctamente desde: {backup_file}")
                    r.hset(job_key, mapping={'status': 'completed', 'message': 'Base de datos restaurada correctamente.'})
                except subprocess.CalledProcessError as e:
                    log(f"❌ Error restaurando mysql: {e.stderr.decode('utf-8')}")
                    r.hset(job_key, mapping={'status': 'failed', 'message': 'Error de MySQL al restaurar los datos.'})
                finally:
                    # Limpiar rastros descifrados
                    if os.path.exists(gz_filepath): os.remove(gz_filepath)
                    if os.path.exists(sql_filepath): os.remove(sql_filepath)
                
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
    
    search_pattern = os.path.join(BACKUP_DIR, "auto_backup_*.sql.gz.enc")
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
    log("🚀 Iniciando Worker de Backups Seguros (AES-256)...")
    log(f"⏱️ El worker buscará tareas manuales/automáticas cada {WORKER_TICK_SECONDS} segundos.")
    log("==================================================")
    
    while True:
        try:
            process_manual_backups()
            run_worker_cycle()
        except Exception as e:
            log(f"⚠️ Error crítico en el ciclo del worker: {str(e)}")
            
        time.sleep(WORKER_TICK_SECONDS)

if __name__ == "__main__":
    sys.stdout.reconfigure(encoding='utf-8')
    main()