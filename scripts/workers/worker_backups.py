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
import uuid
from cassandra.cluster import Cluster
from cassandra.query import dict_factory

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
ENV_PATH = os.path.join(BASE_DIR, '.env')

BACKUP_DIR = os.path.join(BASE_DIR, 'storage', 'private', 'backups')
MAINTENANCE_FILE = os.path.join(BASE_DIR, 'storage', 'private', 'system', '.maintenance')

load_dotenv(dotenv_path=ENV_PATH)

APP_TIMEZONE = os.getenv('APP_TIMEZONE')
if APP_TIMEZONE:
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

def get_required_env(var_name):
    val = os.getenv(var_name)
    if val is None or val.strip() == '':
        raise ValueError(f"Environment variable '{var_name}' is missing or empty.")
    return val

try:
    DB_HOST = get_required_env('DB_HOST')
    DB_PORT = int(get_required_env('DB_PORT'))
    DB_USER = get_required_env('DB_USER')
    DB_PASS = os.getenv('DB_PASS')
    DB_IDENTITY_NAME = get_required_env('DB_IDENTITY_NAME')
    DATABASES_TO_BACKUP = [DB_IDENTITY_NAME]
    REDIS_HOST = get_required_env('REDIS_HOST')
    REDIS_PORT = int(get_required_env('REDIS_PORT'))
    REDIS_PASS = os.getenv('REDIS_PASS')
    BACKUP_ENCRYPTION_KEY = get_required_env('BACKUP_ENCRYPTION_KEY')
except ValueError as e:
    Logger.critical(str(e))
    sys.exit(1)

CASSANDRA_HOST = os.getenv('CASSANDRA_HOST') or 'cassandra'
try:
    CASSANDRA_PORT = int(os.getenv('CASSANDRA_PORT') or 9042)
except ValueError:
    CASSANDRA_PORT = 9042

class CassandraJSONEncoder(json.JSONEncoder):
    def default(self, obj):
        import decimal
        if isinstance(obj, datetime):
            return {"__type__": "datetime", "value": obj.isoformat()}
        elif isinstance(obj, uuid.UUID):
            return {"__type__": "uuid", "value": str(obj)}
        elif isinstance(obj, bytes):
            return {"__type__": "bytes", "value": obj.hex()}
        elif isinstance(obj, set):
            return list(obj)
        elif isinstance(obj, decimal.Decimal):
            return float(obj)
        return super().default(obj)

def cassandra_json_decoder(dct):
    if isinstance(dct, dict) and "__type__" in dct:
        if dct["__type__"] == "datetime":
            return datetime.fromisoformat(dct["value"])
        elif dct["__type__"] == "uuid":
            return uuid.UUID(dct["value"])
        elif dct["__type__"] == "bytes":
            return bytes.fromhex(dct["value"])
    return dct

def get_cassandra_connection_with_retries(max_retries=5):
    retries = 0
    while retries < max_retries:
        try:
            cluster = Cluster([CASSANDRA_HOST], port=CASSANDRA_PORT, connect_timeout=10)
            session = cluster.connect()
            return cluster, session
        except Exception as e:
            Logger.warning(f"Connection attempt to Cassandra failed: {str(e)}")
        retries += 1
        wait_time = 2 ** retries
        Logger.warning(f"Network failure detected with Cassandra. Retrying in {wait_time}s. Attempt {retries}/{max_retries}")
        time.sleep(wait_time)
    raise Exception("Failed to establish Cassandra connection after multiple attempts.")

def backup_cassandra_db(cassandra_temp_dir, cassandra_schema_filter=None):
    cluster = None
    try:
        Logger.info("Starting Cassandra backup process...")
        cluster, session = get_cassandra_connection_with_retries(max_retries=3)
        
        excluded_keyspaces = {"system", "system_schema", "system_auth", "system_traces", "system_distributed", "system_views", "system_virtual_schema"}
        user_keyspaces = [k for k in cluster.metadata.keyspaces.keys() if k not in excluded_keyspaces and not k.startswith("system")]
        
        if cassandra_schema_filter is not None:
            user_keyspaces = [k for k in user_keyspaces if k in cassandra_schema_filter]
            
        Logger.info(f"Keyspaces to backup in Cassandra: {user_keyspaces}")
        
        schemas = {}
        data_dir = os.path.join(cassandra_temp_dir, 'data')
        os.makedirs(data_dir, exist_ok=True)
        
        for ks in user_keyspaces:
            ks_metadata = cluster.metadata.keyspaces[ks]
            
            # Export schemas
            if cassandra_schema_filter is None:
                schemas[ks] = ks_metadata.export_as_string()
                target_tables = list(ks_metadata.tables.keys())
            else:
                cql_parts = []
                full_cql = ks_metadata.export_as_string()
                keyspace_cql = full_cql.split(';')[0].strip() + ';'
                cql_parts.append(keyspace_cql)
                cql_parts.append(f"USE {ks};")
                
                if hasattr(ks_metadata, 'user_types'):
                    for udt in ks_metadata.user_types.values():
                        if hasattr(udt, 'as_cql_query'):
                            cql_parts.append(udt.as_cql_query())
                        elif hasattr(udt, 'export_as_string'):
                            cql_parts.append(udt.export_as_string())
                            
                target_tables = cassandra_schema_filter[ks]
                for table in target_tables:
                    if table in ks_metadata.tables:
                        t_metadata = ks_metadata.tables[table]
                        cql_parts.append(t_metadata.export_as_string())
                        for idx in ks_metadata.indexes.values():
                            if idx.table_name == table:
                                cql_parts.append(idx.as_cql_query())
                                
                schemas[ks] = "\n\n".join(cql_parts)
                
            ks_data_dir = os.path.join(data_dir, ks)
            os.makedirs(ks_data_dir, exist_ok=True)
            
            session.set_keyspace(ks)
            session.row_factory = dict_factory
            
            for table in target_tables:
                if table not in ks_metadata.tables:
                    continue
                Logger.info(f"Backing up Cassandra table: {ks}.{table}")
                rows = list(session.execute(f"SELECT * FROM {table}"))
                
                table_file = os.path.join(ks_data_dir, f"{table}.json")
                with open(table_file, 'w', encoding='utf-8') as f:
                    json.dump(rows, f, cls=CassandraJSONEncoder, indent=4)
                    
        schemas_file = os.path.join(cassandra_temp_dir, 'keyspace_schemas.json')
        with open(schemas_file, 'w', encoding='utf-8') as f:
            json.dump(schemas, f, indent=4)
            
        Logger.info("Cassandra backup completed successfully.")
    except Exception as e:
        Logger.error(f"Error during Cassandra backup: {str(e)}")
        raise e
    finally:
        if cluster:
            cluster.shutdown()

def filter_sql_file(input_path, output_path, schema_filter):
    import re
    db_create_pattern = re.compile(r'^CREATE DATABASE\s+.*`([^`]+)`', re.IGNORECASE)
    db_use_pattern = re.compile(r'^USE\s+`([^`]+)`', re.IGNORECASE)
    table_structure_pattern = re.compile(r'^-- Table structure for table\s+`([^`]+)`', re.IGNORECASE)
    table_data_pattern = re.compile(r'^-- Dumping data for table\s+`([^`]+)`', re.IGNORECASE)
    
    current_db = None
    skip_mode = False
    
    with open(input_path, 'r', encoding='utf-8', errors='ignore') as infile, \
         open(output_path, 'w', encoding='utf-8') as outfile:
        
        for line in infile:
            db_create_match = db_create_pattern.search(line)
            if db_create_match:
                db_name = db_create_match.group(1)
                if schema_filter and db_name not in schema_filter:
                    skip_mode = True
                else:
                    skip_mode = False
                if not skip_mode:
                    outfile.write(line)
                continue
                
            db_use_match = db_use_pattern.search(line)
            if db_use_match:
                current_db = db_use_match.group(1)
                if schema_filter and current_db not in schema_filter:
                    skip_mode = True
                else:
                    skip_mode = False
                if not skip_mode:
                    outfile.write(line)
                continue
                
            struct_match = table_structure_pattern.search(line)
            if struct_match:
                table_name = struct_match.group(1)
                if current_db and schema_filter:
                    if current_db not in schema_filter or table_name not in schema_filter[current_db]:
                        skip_mode = True
                    else:
                        skip_mode = False
                else:
                    skip_mode = False
                    
            data_match = table_data_pattern.search(line)
            if data_match:
                table_name = data_match.group(1)
                if current_db and schema_filter:
                    if current_db not in schema_filter or table_name not in schema_filter[current_db]:
                        skip_mode = True
                    else:
                        skip_mode = False
                else:
                    skip_mode = False
            
            if not skip_mode:
                outfile.write(line)

def restore_cassandra_db(cassandra_temp_dir, schema_filter=None):
    import re
    cluster = None
    try:
        Logger.info("Starting Cassandra restoration process...")
        cluster, session = get_cassandra_connection_with_retries(max_retries=3)
        
        schemas_file = os.path.join(cassandra_temp_dir, 'keyspace_schemas.json')
        if not os.path.exists(schemas_file):
            Logger.warning("No Cassandra schema backup file found.")
            return
            
        with open(schemas_file, 'r', encoding='utf-8') as f:
            schemas = json.load(f)
            
        for ks, cql_schema in schemas.items():
            if schema_filter and ks not in schema_filter:
                Logger.info(f"Skipping Cassandra keyspace: {ks} (not in restore filter)")
                continue
                
            Logger.info(f"Recreating Cassandra keyspace: {ks}")
            
            selected_tables = None
            if schema_filter and ks in schema_filter:
                selected_tables = schema_filter[ks]
                
            if selected_tables is None:
                try:
                    session.execute(f"DROP KEYSPACE IF EXISTS {ks}")
                except Exception as e:
                    Logger.warning(f"Error dropping keyspace {ks}: {str(e)}")
                    
            lines = cql_schema.split('\n')
            cleaned_lines = []
            for line in lines:
                stripped = line.strip()
                if stripped.startswith('--') or stripped.startswith('//'):
                    continue
                cleaned_lines.append(line)
            cleaned_content = '\n'.join(cleaned_lines)
            statements = cleaned_content.split(';')
            
            if selected_tables is not None:
                filtered_statements = []
                for stmt in statements:
                    stmt_lower = stmt.lower().strip()
                    if not stmt_lower:
                        continue
                    
                    if stmt_lower.startswith('create keyspace') or stmt_lower.startswith('use ') or stmt_lower.startswith('create type'):
                        s = stmt
                        if stmt_lower.startswith('create keyspace') and 'if not exists' not in stmt_lower:
                            s = stmt.replace('CREATE KEYSPACE', 'CREATE KEYSPACE IF NOT EXISTS').replace('create keyspace', 'CREATE KEYSPACE IF NOT EXISTS')
                        if stmt_lower.startswith('create type') and 'if not exists' not in stmt_lower:
                            s = stmt.replace('CREATE TYPE', 'CREATE TYPE IF NOT EXISTS').replace('create type', 'CREATE TYPE IF NOT EXISTS')
                        filtered_statements.append(s)
                        continue
                        
                    if stmt_lower.startswith('create table'):
                        match = re.search(r'create\s+table\s+(?:[a-zA-Z0-9_]+\.)?([a-zA-Z0-9_]+)', stmt_lower)
                        if match:
                            tbl = match.group(1)
                            if tbl in selected_tables:
                                filtered_statements.append(f"DROP TABLE IF EXISTS {ks}.{tbl}")
                                filtered_statements.append(stmt)
                        continue
                        
                    if stmt_lower.startswith('create index') or stmt_lower.startswith('create custom index'):
                        match = re.search(r'on\s+(?:[a-zA-Z0-9_]+\.)?([a-zA-Z0-9_]+)', stmt_lower)
                        if match:
                            tbl = match.group(1)
                            if tbl in selected_tables:
                                filtered_statements.append(stmt)
                        continue
                statements = filtered_statements
            
            for stmt in statements:
                stmt = stmt.strip()
                if not stmt:
                    continue
                try:
                    session.execute(stmt)
                except Exception as stmt_err:
                    Logger.error(f"Error executing statement in keyspace {ks}: {stmt}. Error: {str(stmt_err)}")
                    raise stmt_err
                    
        data_dir = os.path.join(cassandra_temp_dir, 'data')
        if os.path.exists(data_dir):
            for ks in os.listdir(data_dir):
                ks_dir = os.path.join(data_dir, ks)
                if not os.path.isdir(ks_dir):
                    continue
                
                if schema_filter and ks not in schema_filter:
                    continue
                    
                session.set_keyspace(ks)
                
                for table_json in os.listdir(ks_dir):
                    if not table_json.endswith('.json'):
                        continue
                    table = table_json[:-5]
                    
                    if schema_filter and table not in schema_filter[ks]:
                        continue
                        
                    table_path = os.path.join(ks_dir, table_json)
                    with open(table_path, 'r', encoding='utf-8') as f:
                        rows = json.load(f, object_hook=cassandra_json_decoder)
                        
                    if not rows:
                        Logger.info(f"No rows to restore for Cassandra table: {ks}.{table}")
                        continue
                        
                    Logger.info(f"Restoring {len(rows)} rows to Cassandra table: {ks}.{table}")
                    try:
                        session.execute(f"TRUNCATE {table}")
                    except Exception as e:
                        Logger.warning(f"Failed to truncate {ks}.{table}: {str(e)}")
                        
                    columns = list(rows[0].keys())
                    placeholders = ", ".join(["?" for _ in columns])
                    query = f"INSERT INTO {table} ({', '.join(columns)}) VALUES ({placeholders})"
                    prepared = session.prepare(query)
                    
                    for row in rows:
                        try:
                            session.execute(prepared, [row[col] for col in columns])
                        except Exception as ins_err:
                            Logger.error(f"Failed to insert row {row} into {ks}.{table}: {str(ins_err)}")
                            raise ins_err
                            
        Logger.info("Cassandra restoration completed successfully.")
    except Exception as e:
        Logger.error(f"Error during Cassandra restoration: {str(e)}")
        raise e
    finally:
        if cluster:
            cluster.shutdown()

WORKER_TICK_SECONDS = 3 

def get_db_connection_with_retries(max_retries=5):
    retries = 0
    while retries < max_retries:
        try:
            connection = mysql.connector.connect(
                host=DB_HOST,
                port=DB_PORT,
                user=DB_USER,
                password=DB_PASS,
                database=DB_IDENTITY_NAME
            )
            if connection.is_connected():
                return connection
        except Error:
            pass
        retries += 1
        wait_time = 2 ** retries 
        Logger.warning(f"Network failure detected with MySQL. Retrying in {wait_time}s. Attempt {retries}/{max_retries}")
        time.sleep(wait_time)
    raise Exception("Failed to establish database connection after multiple attempts.")

def get_redis_connection():
    candidate_hosts = [REDIS_HOST, "127.0.0.1", "localhost"] if REDIS_HOST else ["127.0.0.1", "localhost"]
    seen = set()
    hosts = [h for h in candidate_hosts if h and not (h in seen or seen.add(h))]

    for host in hosts:
        try:
            client = redis.Redis(
                host=host,
                port=REDIS_PORT or 6379,
                password=REDIS_PASS,
                decode_responses=True,
                socket_timeout=30,
                socket_connect_timeout=10,
                socket_keepalive=True,
                retry_on_timeout=True
            )
            client.ping()
            return client
        except Exception:
            pass
    Logger.error("Redis connection initialization failed on all candidate hosts.")
    return None

def get_server_config():
    try:
        conn = get_db_connection_with_retries(max_retries=3)
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT auto_backup_enabled, auto_backup_frequency_hours, auto_backup_retention_count, backup_schema_config FROM server_config WHERE id = 1")
        config = cursor.fetchone()
        cursor.close()
        conn.close()
        return config
    except Exception as e:
        Logger.error(f"Failed to fetch server configuration: {str(e)}")
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
        Logger.error(f"File encryption process failed: {str(e)}")
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
        Logger.error(f"File decryption process failed. Key invalid or file corrupted: {str(e)}")
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
        if modules.get('db', True):
            mysql_schema = {}
            cassandra_schema = {}
            
            cluster_temp = None
            cassandra_keyspaces = set()
            try:
                cluster_temp, session_temp = get_cassandra_connection_with_retries(max_retries=1)
                excluded_ks = {"system", "system_schema", "system_auth", "system_traces", "system_distributed", "system_views", "system_virtual_schema"}
                cassandra_keyspaces = {k for k in cluster_temp.metadata.keyspaces.keys() if k not in excluded_ks and not k.startswith("system")}
            except Exception as e:
                Logger.warning(f"Could not connect to Cassandra during schema split: {str(e)}")
            finally:
                if cluster_temp:
                    cluster_temp.shutdown()
                    
            if schema_dict:
                for db_name, tables in schema_dict.items():
                    if db_name in cassandra_keyspaces:
                        cassandra_schema[db_name] = tables
                    else:
                        mysql_schema[db_name] = tables
            
            if not schema_dict or mysql_schema:
                db_filepath = os.path.join(temp_dir, 'database.sql')
                env = os.environ.copy()
                if DB_PASS:
                    env["MYSQL_PWD"] = DB_PASS

                with open(db_filepath, 'w', encoding='utf-8') as f:
                    if not schema_dict:
                        dump_cmd = ["mysqldump", "-h", DB_HOST, "-u", DB_USER, "--skip-ssl", "--no-tablespaces", "--databases"] + DATABASES_TO_BACKUP
                        subprocess.run(dump_cmd, env=env, stdout=f, stderr=subprocess.PIPE, check=True)
                    else:
                        for db_name, tables in mysql_schema.items():
                            if not tables: 
                                continue
                            f.write(f"\n-- --------------------------------------------------------\n")
                            f.write(f"-- GENERATED FOR DATABASE: {db_name}\n")
                            f.write(f"-- --------------------------------------------------------\n")
                            f.write(f"CREATE DATABASE IF NOT EXISTS `{db_name}`;\n")
                            f.write(f"USE `{db_name}`;\n\n")
                            f.flush()
                            dump_cmd = ["mysqldump", "-h", DB_HOST, "-u", DB_USER, "--skip-ssl", "--no-tablespaces", db_name] + tables
                            subprocess.run(dump_cmd, env=env, stdout=f, stderr=subprocess.PIPE, check=True)
                            f.flush()
                            
            if not schema_dict or cassandra_schema:
                cassandra_temp_dir = os.path.join(temp_dir, 'cassandra')
                os.makedirs(cassandra_temp_dir, exist_ok=True)
                try:
                    backup_cassandra_db(cassandra_temp_dir, cassandra_schema_filter=cassandra_schema if schema_dict else None)
                except Exception as e:
                    Logger.error(f"Cassandra backup failed: {str(e)}")
                    raise e

        if modules.get('avatars_uploaded', False):
            src_uploaded = os.path.join(BASE_DIR, 'storage', 'public', 'profilePictures', 'uploaded')
            dest_uploaded = os.path.join(temp_dir, 'files', 'profilePictures', 'uploaded')
            if os.path.exists(src_uploaded):
                shutil.copytree(src_uploaded, dest_uploaded)

        if modules.get('avatars_default', False):
            src_default = os.path.join(BASE_DIR, 'storage', 'public', 'profilePictures', 'default')
            dest_default = os.path.join(temp_dir, 'files', 'profilePictures', 'default')
            if os.path.exists(src_default):
                shutil.copytree(src_default, dest_default)

        with open(os.path.join(temp_dir, 'manifest.json'), 'w') as f:
            json.dump(manifest, f, indent=4)

        archive_filename = f"{filename_base}.tar.gz"
        archive_filepath = os.path.join(BACKUP_DIR, archive_filename)
        
        with tarfile.open(archive_filepath, "w:gz") as tar:
            tar.add(temp_dir, arcname=os.path.basename(archive_filename.replace('.tar.gz', '')))

        enc_filepath = encrypt_file(archive_filepath)
        os.remove(archive_filepath)
        
        if enc_filepath:
            os.chmod(enc_filepath, 0o644)
            
            # Create metadata file next to the backup file
            try:
                meta_filepath = enc_filepath.replace('.tar.gz.enc', '.meta.json')
                schema_meta = {}
                if schema_dict:
                    schema_meta = schema_dict
                else:
                    schema_meta = {}
                    # Resolve full schema for MySQL
                    try:
                        import mysql.connector
                        conn = mysql.connector.connect(host=DB_HOST, user=DB_USER, password=DB_PASS)
                        cursor = conn.cursor()
                        for db_name in DATABASES_TO_BACKUP:
                            cursor.execute(f"SHOW TABLES FROM `{db_name}`")
                            schema_meta[db_name] = [r[0] for r in cursor.fetchall()]
                        conn.close()
                    except Exception as mysql_err:
                        Logger.warning(f"Could not resolve MySQL schema for metadata: {str(mysql_err)}")
                        
                    # Resolve full schema for Cassandra
                    try:
                        cluster_meta, session_meta = get_cassandra_connection_with_retries(max_retries=1)
                        excluded_ks = {"system", "system_schema", "system_auth", "system_traces", "system_distributed", "system_views", "system_virtual_schema"}
                        cassandra_ks = [k for k in cluster_meta.metadata.keyspaces.keys() if k not in excluded_ks and not k.startswith("system")]
                        for ks in cassandra_ks:
                            ks_metadata = cluster_meta.metadata.keyspaces[ks]
                            schema_meta[ks] = list(ks_metadata.tables.keys())
                        cluster_meta.shutdown()
                    except Exception as cassandra_err:
                        Logger.warning(f"Could not resolve Cassandra schema for metadata: {str(cassandra_err)}")
                
                meta_data = {
                    "type": "custom" if schema_dict else "full",
                    "modules": modules,
                    "created_at": time.strftime('%Y-%m-%d %H:%M:%S'),
                    "schema": schema_meta
                }
                with open(meta_filepath, 'w', encoding='utf-8') as mf:
                    json.dump(meta_data, mf, indent=4)
                os.chmod(meta_filepath, 0o644)
            except Exception as meta_err:
                Logger.warning(f"Failed to create backup metadata file: {str(meta_err)}")
                
            shutil.rmtree(temp_dir, ignore_errors=True)
            return True
            
        shutil.rmtree(temp_dir, ignore_errors=True)
        return False
        
    except subprocess.CalledProcessError as e:
        Logger.error(f"Subprocess execution error during database dump: {e.stderr.decode('utf-8')}")
        shutil.rmtree(temp_dir, ignore_errors=True)
        return False
    except Exception as e:
        Logger.error(f"General system error during archive creation: {str(e)}")
        shutil.rmtree(temp_dir, ignore_errors=True)
        return False

def create_auto_backup(schema_dict=None):
    date_str = datetime.now().strftime('%Y-%m-%d_%H-%M-%S')
    filename_base = f"auto_backup_{date_str}"
    modules = {'db': True, 'avatars_uploaded': False, 'avatars_default': False}
    if create_backup_archive(filename_base, modules, schema_dict):
        Logger.info(f"Automatic backup generated and encrypted successfully: {filename_base}.tar.gz.enc")
        return True
    return False

def copy_tree_overwrite(src, dst):
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

    try:
        job_data_raw = r.lpop('backup_queue')
    except redis.RedisError as e:
        Logger.error(f"Redis queue read timeout or network failure: {str(e)}")
        return
    
    if job_data_raw:
        job_type = None
        try:
            job_data = json.loads(job_data_raw)
            job_id = job_data.get('job_id')
            job_type = job_data.get('type')
            modules = job_data.get('modules', {'db': True, 'avatars_uploaded': False, 'avatars_default': False})
            job_key = f"backup_job:{job_id}"
            
            if job_type == 'manual':
                r.hset(job_key, mapping={'status': 'processing', 'message': 'processing_full_backup'})
                Logger.info(f"Processing FULL backup request ID: {job_id}")
                date_str = datetime.now().strftime('%Y-%m-%d_%H-%M-%S')
                filename_base = f"backup_manual_full_{date_str}"
                
                if create_backup_archive(filename_base, modules):
                    Logger.info(f"Manual backup completed: {filename_base}.tar.gz.enc")
                    r.hset(job_key, mapping={'status': 'completed', 'message': 'backup_success'})
                else:
                    r.hset(job_key, mapping={'status': 'failed', 'message': 'backup_internal_error'})

            elif job_type == 'manual_custom':
                schema = job_data.get('schema')
                r.hset(job_key, mapping={'status': 'processing', 'message': 'processing_custom_backup'})
                Logger.info(f"Processing CUSTOM backup request ID: {job_id}")
                date_str = datetime.now().strftime('%Y-%m-%d_%H-%M-%S')
                filename_base = f"backup_manual_custom_{date_str}"
                
                if create_backup_archive(filename_base, modules, schema_dict=schema):
                    Logger.info(f"Manual custom backup completed: {filename_base}.tar.gz.enc")
                    r.hset(job_key, mapping={'status': 'completed', 'message': 'backup_success'})
                else:
                    r.hset(job_key, mapping={'status': 'failed', 'message': 'backup_internal_error'})
                    
            elif job_type == 'restore':
                backup_file = job_data.get('backup_file')
                schema = job_data.get('schema') # Selected tables/databases dict or None
                r.hset(job_key, mapping={'status': 'processing', 'message': 'processing_restoration'})
                Logger.info(f"Processing restoration sequence for file: {backup_file} (ID: {job_id})")
                
                enc_filepath = os.path.join(BACKUP_DIR, backup_file)
                archive_filepath = None
                temp_extract_dir = tempfile.mkdtemp()

                try:
                    if not os.path.exists(enc_filepath):
                        r.hset(job_key, mapping={'status': 'failed', 'message': 'err_file_not_found'})
                        return
                    
                    archive_filepath = decrypt_file(enc_filepath)
                    if not archive_filepath:
                        r.hset(job_key, mapping={'status': 'failed', 'message': 'err_decryption_failed'})
                        return
                    
                    try:
                        with tarfile.open(archive_filepath, "r:gz") as tar:
                            tar.extractall(path=temp_extract_dir)
                    except Exception:
                        r.hset(job_key, mapping={'status': 'failed', 'message': 'err_archive_extraction'})
                        return
                    
                    extracted_items = os.listdir(temp_extract_dir)
                    if len(extracted_items) == 1 and os.path.isdir(os.path.join(temp_extract_dir, extracted_items[0])):
                        base_extract_dir = os.path.join(temp_extract_dir, extracted_items[0])
                    else:
                        base_extract_dir = temp_extract_dir

                    sql_filepath = os.path.join(base_extract_dir, 'database.sql')
                    if os.path.exists(sql_filepath):
                        env = os.environ.copy()
                        if DB_PASS:
                            env["MYSQL_PWD"] = DB_PASS
                            
                        restore_sql_path = sql_filepath
                        if schema:
                            # Apply MySQL table filter
                            filtered_sql_path = os.path.join(base_extract_dir, 'filtered_database.sql')
                            try:
                                Logger.info(f"Filtering MySQL dump for selective restore with tables: {schema}")
                                filter_sql_file(sql_filepath, filtered_sql_path, schema)
                                restore_sql_path = filtered_sql_path
                            except Exception as fe:
                                Logger.error(f"Failed to filter SQL file during restore: {str(fe)}. Restoring full SQL instead.")
                                
                        restore_cmd = ["mysql", "-h", DB_HOST, "-u", DB_USER, "--skip-ssl"]
                        try:
                            with open(restore_sql_path, 'r') as f:
                                subprocess.run(restore_cmd, env=env, stdin=f, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True)
                            Logger.info(f"Database restoration successful from source: {backup_file}")
                        except subprocess.CalledProcessError as e:
                            Logger.error(f"MySQL restoration error: {e.stderr.decode('utf-8')}")
                            r.hset(job_key, mapping={'status': 'failed', 'message': 'err_database_restoration'})
                            return

                    cassandra_dir = os.path.join(base_extract_dir, 'cassandra')
                    if os.path.exists(cassandra_dir):
                        try:
                            restore_cassandra_db(cassandra_dir, schema_filter=schema)
                            Logger.info(f"Cassandra database restoration successful from source: {backup_file}")
                        except Exception as e:
                            Logger.error(f"Cassandra restoration error: {str(e)}")
                            r.hset(job_key, mapping={'status': 'failed', 'message': 'err_cassandra_restoration'})
                            return
                    else:
                        Logger.info("No Cassandra backup directory found in archive. Skipping Cassandra restore.")

                    files_dir = os.path.join(base_extract_dir, 'files')
                    if os.path.exists(files_dir):
                        src_uploaded = os.path.join(files_dir, 'profilePictures', 'uploaded')
                        dest_uploaded = os.path.join(BASE_DIR, 'storage', 'public', 'profilePictures', 'uploaded')
                        if os.path.exists(src_uploaded):
                            copy_tree_overwrite(src_uploaded, dest_uploaded)
                            Logger.info("Uploaded profile pictures restored successfully.")

                        src_default = os.path.join(files_dir, 'profilePictures', 'default')
                        dest_default = os.path.join(BASE_DIR, 'storage', 'public', 'profilePictures', 'default')
                        if os.path.exists(src_default):
                            copy_tree_overwrite(src_default, dest_default)
                            Logger.info("Default profile pictures restored successfully.")

                    r.hset(job_key, mapping={'status': 'completed', 'message': 'restoration_success'})
                
                finally:
                    if archive_filepath and os.path.exists(archive_filepath): os.remove(archive_filepath)
                    shutil.rmtree(temp_extract_dir, ignore_errors=True)
                    if os.path.exists(MAINTENANCE_FILE):
                        os.remove(MAINTENANCE_FILE)
                        Logger.info("Physical maintenance lock removed. System operation restored.")
                    else:
                        Logger.warning("Maintenance lock not found during cleanup procedure.")
                
        except Exception as e:
            Logger.error(f"Job processing pipeline failure: {str(e)}")
            if os.path.exists(MAINTENANCE_FILE):
                os.remove(MAINTENANCE_FILE)
                Logger.warning("Emergency maintenance lock removal executed due to exception.")
        finally:
            try:
                r.delete('lock:backup_in_progress')
                if job_type == 'restore':
                    r.delete('system_status:restoring')
            except Exception as lock_err:
                Logger.error(f"Failed to release Redis synchronization locks: {str(lock_err)}")

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
        Logger.info("No previous automated backups detected. Initializing first cycle.")
        should_backup = True
    else:
        existing_backups.sort(key=os.path.getmtime, reverse=True)
        latest_backup = existing_backups[0]
        mod_time = os.path.getmtime(latest_backup)
        time_diff_seconds = time.time() - mod_time
        
        if time_diff_seconds >= target_seconds:
            label = "10 seconds (Test Mode)" if is_test_mode else f"{freq_hours} hrs"
            Logger.info(f"Time threshold reached. Target: {label}. Initiating automated backup procedure.")
            should_backup = True
            
    if should_backup:
        create_auto_backup(schema_dict=parsed_schema)

def main():
    Logger.info("Worker initialization sequence started: Multi-DB Backup Module (AES-256)")
    Logger.info("Strict architecture constraints enforced.")
    Logger.info(f"Target relational database host: {DB_HOST}")
    
    try:
        conn = get_db_connection_with_retries(max_retries=6)
        conn.close()
        Logger.info("Initial relational database connection verified successfully.")
    except Exception as e:
        Logger.critical(f"Process terminated. Database connection threshold exceeded: {str(e)}")
        sys.exit(1)

    try:
        Logger.info(f"Target NoSQL database host: {CASSANDRA_HOST}:{CASSANDRA_PORT}")
        cluster, session = get_cassandra_connection_with_retries(max_retries=6)
        cluster.shutdown()
        Logger.info("Initial Cassandra database connection verified successfully.")
    except Exception as e:
        Logger.critical(f"Process terminated. Cassandra connection threshold exceeded: {str(e)}")
        sys.exit(1)
    
    while True:
        try:
            process_manual_backups()
            run_worker_cycle()
        except Exception as e:
            Logger.error(f"Cycle iteration aborted due to exception: {str(e)}")
            
        time.sleep(WORKER_TICK_SECONDS)

if __name__ == "__main__":
    sys.stdout.reconfigure(encoding='utf-8')
    main()
