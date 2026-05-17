import os
import sys
import glob
import time
import subprocess
import json
import redis
import gzip
import hashlib
import inspect
import shutil
import tarfile
import tempfile
from datetime import datetime
import mysql.connector
from mysql.connector import Error
from dotenv import load_dotenv

from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.primitives import padding
from cryptography.hazmat.backends import default_backend

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ENV_PATH = os.path.join(BASE_DIR, '.env')
BACKUP_DIR = os.path.join(BASE_DIR, 'storage', 'backups')
MAINTENANCE_FILE = os.path.join(BASE_DIR, 'storage', 'system', '.maintenance')

load_dotenv(dotenv_path=ENV_PATH)

APP_TIMEZONE = os.getenv('APP_TIMEZONE', 'UTC')
os.environ['TZ'] = APP_TIMEZONE
if hasattr(time, 'tzset'):
    time.tzset()

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

def get_required_env(var_name):
    val = os.getenv(var_name)
    if val is None or val.strip() == '':
        raise ValueError(f"Critical Failure: Environment variable '{var_name}' is not defined.")
    return val

try:
    DB_HOST = get_required_env('DB_HOST')
    DB_USER = get_required_env('DB_USER')
    DB_PASS = os.getenv('DB_PASS', '') 

    DB_IDENTITY_NAME = get_required_env('DB_IDENTITY_NAME')
    DATABASES_TO_BACKUP = [DB_IDENTITY_NAME]

    REDIS_HOST = get_required_env('REDIS_HOST')
    REDIS_PORT = int(get_required_env('REDIS_PORT'))
    REDIS_PASS = os.getenv('REDIS_PASS', '')

    BACKUP_ENCRYPTION_KEY = get_required_env('BACKUP_ENCRYPTION_KEY')
except ValueError as e:
    Logger.error(str(e))
    sys.exit(1)

WORKER_TICK_SECONDS = 3 

def conectar_bd_con_reintentos(max_reintentos=5):
    reintentos = 0
    while reintentos < max_reintentos:
        try:
            conexion = mysql.connector.connect(
                host=DB_HOST,
                user=DB_USER,
                password=DB_PASS,
                database=DB_IDENTITY_NAME
            )
            if conexion.is_connected():
                return conexion
        except Error as e:
            reintentos += 1
            tiempo_espera = 2 ** reintentos 
            Logger.warning(f"⚠️ Network failure detected with MySQL ({DB_HOST}). Retrying in {tiempo_espera}s... ({reintentos}/{max_reintentos})")
            time.sleep(tiempo_espera)
            
    raise Exception("Failed to connect to the database after multiple attempts.")

def get_redis_connection():
    try:
        r = redis.Redis(host=REDIS_HOST, port=REDIS_PORT, password=REDIS_PASS, decode_responses=True)
        r.ping()
        return r
    except Exception as e:
        Logger.error(f"Redis connection error: {str(e)}")
        return None

def get_server_config():
    try:
        conn = conectar_bd_con_reintentos(max_reintentos=3)
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT auto_backup_enabled, auto_backup_frequency_hours, auto_backup_retention_count, backup_schema_config FROM server_config WHERE id = 1")
        config = cursor.fetchone()
        cursor.close()
        conn.close()
        return config
    except Exception as e:
        Logger.error(f"Error fetching server configuration (MySQL unreachable): {str(e)}")
        return None

def encrypt_file(file_path):
    key = hashlib.sha256(BACKUP_ENCRYPTION_KEY.encode()).digest() 
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
        Logger.error(f"Encryption error: {str(e)}")
        return None

def decrypt_file(enc_path):
    key = hashlib.sha256(BACKUP_ENCRYPTION_KEY.encode()).digest()
    
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
        Logger.error(f"Decryption error (Invalid key or corrupted file): {str(e)}")
        return None

def create_backup_archive(filename_base, modules, schema_dict=None):
    if not os.path.exists(BACKUP_DIR):
        os.makedirs(BACKUP_DIR)
        
    temp_dir = tempfile.mkdtemp()
    manifest = {
        "created_at": datetime.now().isoformat(),
        "modules": modules,
        "type": "custom" if schema_dict else "full"
    }
    
    try:
        # 1. Base de datos
        if modules.get('db', True):
            db_filepath = os.path.join(temp_dir, 'database.sql')
            env = os.environ.copy()
            if DB_PASS:
                env["MYSQL_PWD"] = DB_PASS

            with open(db_filepath, 'w', encoding='utf-8') as f:
                if not schema_dict:
                    dump_cmd = ["mysqldump", "-h", DB_HOST, "-u", DB_USER, "--skip-ssl", "--databases"] + DATABASES_TO_BACKUP
                    subprocess.run(dump_cmd, env=env, stdout=f, stderr=subprocess.PIPE, check=True)
                else:
                    for db_name, tables in schema_dict.items():
                        if not tables: 
                            continue
                        f.write(f"\n-- --------------------------------------------------------\n")
                        f.write(f"-- GENERATED FOR DATABASE: {db_name}\n")
                        f.write(f"-- --------------------------------------------------------\n")
                        f.write(f"CREATE DATABASE IF NOT EXISTS `{db_name}`;\n")
                        f.write(f"USE `{db_name}`;\n\n")
                        f.flush()

                        dump_cmd = ["mysqldump", "-h", DB_HOST, "-u", DB_USER, "--skip-ssl", db_name] + tables
                        subprocess.run(dump_cmd, env=env, stdout=f, stderr=subprocess.PIPE, check=True)
                        f.flush()

        # 2. Archivos Físicos (Fotos subidas)
        if modules.get('avatars_uploaded', False):
            src_uploaded = os.path.join(BASE_DIR, 'public', 'storage', 'profilePictures', 'uploaded')
            dest_uploaded = os.path.join(temp_dir, 'files', 'profilePictures', 'uploaded')
            if os.path.exists(src_uploaded):
                shutil.copytree(src_uploaded, dest_uploaded)

        # 3. Archivos Físicos (Fotos por defecto)
        if modules.get('avatars_default', False):
            src_default = os.path.join(BASE_DIR, 'public', 'storage', 'profilePictures', 'default')
            dest_default = os.path.join(temp_dir, 'files', 'profilePictures', 'default')
            if os.path.exists(src_default):
                shutil.copytree(src_default, dest_default)

        # Escribir manifest
        with open(os.path.join(temp_dir, 'manifest.json'), 'w') as f:
            json.dump(manifest, f, indent=4)

        # Comprimir a tar.gz
        archive_filename = f"{filename_base}.tar.gz"
        archive_filepath = os.path.join(BACKUP_DIR, archive_filename)
        
        with tarfile.open(archive_filepath, "w:gz") as tar:
            tar.add(temp_dir, arcname=os.path.basename(archive_filename.replace('.tar.gz', '')))

        # Encriptar (.tar.gz.enc)
        enc_filepath = encrypt_file(archive_filepath)
        
        os.remove(archive_filepath)
        shutil.rmtree(temp_dir, ignore_errors=True)
        
        if enc_filepath:
            os.chmod(enc_filepath, 0o600)
            return True
        return False
        
    except subprocess.CalledProcessError as e:
        Logger.error(f"❌ Error executing mysqldump: {e.stderr.decode('utf-8')}")
        shutil.rmtree(temp_dir, ignore_errors=True)
        return False
    except Exception as e:
        Logger.error(f"❌ General OS/Execution Error during archiving: {str(e)}")
        shutil.rmtree(temp_dir, ignore_errors=True)
        return False

def create_auto_backup(schema_dict=None):
    date_str = datetime.now().strftime('%Y-%m-%d_%H-%M-%S')
    filename_base = f"auto_backup_{date_str}"
    
    # Auto-backup por defecto respalda BD completa, pero podrías extenderlo a leer de server_config
    modules = {'db': True, 'avatars_uploaded': False, 'avatars_default': False}
    
    if create_backup_archive(filename_base, modules, schema_dict):
        Logger.info(f"✅ Automatic backup generated and encrypted: {filename_base}.tar.gz.enc")
        return True
    return False

def copy_tree_overwrite(src, dst):
    """ Función auxiliar para sobrescribir directorios recursivamente """
    if not os.path.exists(dst):
        os.makedirs(dst)
    for item in os.listdir(src):
        s = os.path.join(src, item)
        d = os.path.join(dst, item)
        if os.path.isdir(s):
            copy_tree_overwrite(s, d)
        else:
            shutil.copy2(s, d)

def process_manual_backups():
    r = get_redis_connection()
    if not r:
        return

    job_data_raw = r.lpop('backup_queue')
    
    if job_data_raw:
        job_type = None
        try:
            job_data = json.loads(job_data_raw)
            job_id = job_data.get('job_id')
            job_type = job_data.get('type')
            modules = job_data.get('modules', {'db': True, 'avatars_uploaded': False, 'avatars_default': False})
            job_key = f"backup_job:{job_id}"
            
            if job_type == 'manual':
                r.hset(job_key, mapping={'status': 'processing', 'message': 'Generando volcado completo del sistema...'})
                Logger.info(f"⚙️ Processing FULL backup request ID: {job_id}")
                
                date_str = datetime.now().strftime('%Y-%m-%d_%H-%M-%S')
                filename_base = f"backup_manual_full_{date_str}"
                
                if create_backup_archive(filename_base, modules):
                    Logger.info(f"✅ Manual backup (Full/Modular) generated: {filename_base}.tar.gz.enc")
                    r.hset(job_key, mapping={'status': 'completed', 'message': 'Backup modular creado exitosamente.'})
                else:
                    r.hset(job_key, mapping={'status': 'failed', 'message': 'Error interno generando el backup.'})

            elif job_type == 'manual_custom':
                schema = job_data.get('schema')
                r.hset(job_key, mapping={'status': 'processing', 'message': 'Estructurando base de datos y archivos...'})
                Logger.info(f"⚙️ Processing CUSTOM backup request ID: {job_id}")
                
                date_str = datetime.now().strftime('%Y-%m-%d_%H-%M-%S')
                filename_base = f"backup_manual_custom_{date_str}"
                
                if create_backup_archive(filename_base, modules, schema_dict=schema):
                    Logger.info(f"✅ Manual backup (Custom/Modular) generated: {filename_base}.tar.gz.enc")
                    r.hset(job_key, mapping={'status': 'completed', 'message': 'Backup personalizado creado exitosamente.'})
                else:
                    r.hset(job_key, mapping={'status': 'failed', 'message': 'Error interno generando el backup.'})
                    
            elif job_type == 'restore':
                backup_file = job_data.get('backup_file')
                r.hset(job_key, mapping={'status': 'processing', 'message': 'Desencriptando y restaurando módulos...'})
                Logger.info(f"⚙️ Processing restoration of file: {backup_file} (ID: {job_id})")
                
                enc_filepath = os.path.join(BACKUP_DIR, backup_file)
                archive_filepath = None
                temp_extract_dir = tempfile.mkdtemp()

                try:
                    if not os.path.exists(enc_filepath):
                        r.hset(job_key, mapping={'status': 'failed', 'message': 'El archivo cifrado no existe.'})
                        return
                    
                    archive_filepath = decrypt_file(enc_filepath)
                    if not archive_filepath:
                        r.hset(job_key, mapping={'status': 'failed', 'message': 'Error de desencriptación (Llave inválida o archivo corrupto).'})
                        return
                    
                    try:
                        with tarfile.open(archive_filepath, "r:gz") as tar:
                            tar.extractall(path=temp_extract_dir)
                    except Exception as e:
                        r.hset(job_key, mapping={'status': 'failed', 'message': 'Error descomprimiendo el archivo.'})
                        return
                    
                    extracted_items = os.listdir(temp_extract_dir)
                    if len(extracted_items) == 1 and os.path.isdir(os.path.join(temp_extract_dir, extracted_items[0])):
                        base_extract_dir = os.path.join(temp_extract_dir, extracted_items[0])
                    else:
                        base_extract_dir = temp_extract_dir

                    # Restaurar Base de Datos (si existe en el backup)
                    sql_filepath = os.path.join(base_extract_dir, 'database.sql')
                    if os.path.exists(sql_filepath):
                        restore_cmd = ["mysql", "-h", DB_HOST, "-u", DB_USER, "--skip-ssl"]
                        env = os.environ.copy()
                        if DB_PASS:
                            env["MYSQL_PWD"] = DB_PASS
                            
                        try:
                            with open(sql_filepath, 'r') as f:
                                subprocess.run(restore_cmd, env=env, stdin=f, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True)
                            Logger.info(f"✅ Base de datos restaurada desde: {backup_file}")
                        except subprocess.CalledProcessError as e:
                            Logger.error(f"❌ Error restoring mysql: {e.stderr.decode('utf-8')}")
                            r.hset(job_key, mapping={'status': 'failed', 'message': 'Error MySQL al restaurar datos.'})
                            return

                    # Restaurar Archivos (si existen en el backup)
                    files_dir = os.path.join(base_extract_dir, 'files')
                    if os.path.exists(files_dir):
                        src_uploaded = os.path.join(files_dir, 'profilePictures', 'uploaded')
                        dest_uploaded = os.path.join(BASE_DIR, 'public', 'storage', 'profilePictures', 'uploaded')
                        if os.path.exists(src_uploaded):
                            copy_tree_overwrite(src_uploaded, dest_uploaded)
                            Logger.info(f"✅ Fotos de perfil (Subidas) restauradas.")

                        src_default = os.path.join(files_dir, 'profilePictures', 'default')
                        dest_default = os.path.join(BASE_DIR, 'public', 'storage', 'profilePictures', 'default')
                        if os.path.exists(src_default):
                            copy_tree_overwrite(src_default, dest_default)
                            Logger.info(f"✅ Fotos de perfil (Default) restauradas.")

                    r.hset(job_key, mapping={'status': 'completed', 'message': 'Sistemas y archivos restaurados correctamente.'})
                
                finally:
                    if archive_filepath and os.path.exists(archive_filepath): os.remove(archive_filepath)
                    shutil.rmtree(temp_extract_dir, ignore_errors=True)
                    
                    if os.path.exists(MAINTENANCE_FILE):
                        os.remove(MAINTENANCE_FILE)
                        Logger.info("🔓 Physical maintenance lock removed. System is back online.")
                    else:
                        Logger.warning("⚠️ No physical maintenance lock found to remove.")
                
        except Exception as e:
            Logger.error(f"❌ Error processing Redis job: {str(e)}")
            if os.path.exists(MAINTENANCE_FILE):
                os.remove(MAINTENANCE_FILE)
                Logger.warning("🔓 Emergency physical maintenance lock removal executed.")
        finally:
            try:
                r.delete('lock:backup_in_progress')
                if job_type == 'restore':
                    r.delete('system_status:restoring')
            except Exception as lock_err:
                Logger.error(f"❌ Failed to release Redis locks: {str(lock_err)}")

def run_worker_cycle():
    config = get_server_config()
    
    if not config or config['auto_backup_enabled'] != 1:
        return 
        
    freq_hours = config['auto_backup_frequency_hours']
    raw_schema = config.get('backup_schema_config', '{}')
    
    parsed_schema = None
    try:
        parsed_schema = json.loads(raw_schema)
        if not parsed_schema or not isinstance(parsed_schema, dict):
            parsed_schema = None
    except Exception:
        parsed_schema = None

    is_test_mode = (freq_hours == 0)
    target_seconds = 10 if is_test_mode else (float(freq_hours) * 3600.0)
    
    search_pattern = os.path.join(BACKUP_DIR, "auto_backup_*.tar.gz.enc")
    existing_backups = glob.glob(search_pattern)
    
    should_backup = False
    
    if not existing_backups:
        Logger.info("No previous automatic backups found. Forcing initial backup.")
        should_backup = True
    else:
        existing_backups.sort(key=os.path.getmtime, reverse=True)
        latest_backup = existing_backups[0]
        mod_time = os.path.getmtime(latest_backup)
        time_diff_seconds = time.time() - mod_time
        
        if time_diff_seconds >= target_seconds:
            label = "10 seconds (Test Mode)" if is_test_mode else f"{freq_hours} hrs"
            Logger.info(f"{int(time_diff_seconds)}s have passed since the last backup. Target: {label}. Starting backup of selected schema...")
            should_backup = True
            
    if should_backup:
        create_auto_backup(schema_dict=parsed_schema)

def main():
    Logger.info("==================================================")
    Logger.info("🚀 Starting Multi-DB & File Backup Worker (AES-256)...")
    Logger.warning("⚠️ Strict Architecture Mode: Environment validation active.")
    Logger.info(f"⏱️ Looking for tasks every {WORKER_TICK_SECONDS} seconds.")
    Logger.info(f"🌐 Target Host (Native Docker): {DB_HOST}")
    Logger.info("==================================================")
    
    Logger.info("🔄 Verifying initial connection to MySQL with retry logic...")
    try:
        conn = conectar_bd_con_reintentos(max_reintentos=6)
        conn.close()
        Logger.info("✅ Secure connection to MySQL established. Starting cycles...")
    except Exception as e:
        Logger.error(f"❌ CRITICAL FAILURE: Could not connect to MySQL after multiple attempts. Dying with honor... {str(e)}")
        sys.exit(1)
    
    while True:
        try:
            process_manual_backups()
            run_worker_cycle()
        except Exception as e:
            Logger.error(f"⚠️ Critical error in worker cycle: {str(e)}")
            
        time.sleep(WORKER_TICK_SECONDS)

if __name__ == "__main__":
    sys.stdout.reconfigure(encoding='utf-8')
    main()