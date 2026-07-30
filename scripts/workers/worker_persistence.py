import os
import time
import json
import redis
import mysql.connector
import threading
from zlib import compress
import boto3
import botocore
import uuid
from dotenv import load_dotenv
from cassandra.cluster import Cluster
from cassandra.query import BatchStatement
from datetime import datetime

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
ENV_PATH = os.path.join(BASE_DIR, '.env')
load_dotenv(dotenv_path=ENV_PATH)

S3_ENDPOINT = os.getenv("AWS_ENDPOINT")
if S3_ENDPOINT and not S3_ENDPOINT.startswith("http"):
    S3_ENDPOINT = "http://" + S3_ENDPOINT + ":9000"
S3_ACCESS_KEY = os.getenv("AWS_ACCESS_KEY_ID")
S3_SECRET_KEY = os.getenv("AWS_SECRET_ACCESS_KEY")
S3_BUCKET = os.getenv("AWS_BUCKET")

def get_s3_client():
    return boto3.client(
        's3',
        endpoint_url=S3_ENDPOINT,
        aws_access_key_id=S3_ACCESS_KEY,
        aws_secret_access_key=S3_SECRET_KEY,
        region_name='us-east-1'
    )

REDIS_HOST = os.getenv("REDIS_HOST")
REDIS_PORT = int(os.getenv("REDIS_PORT") or 6379)
REDIS_PASS = os.getenv("REDIS_PASS")

DB_HOST = os.getenv("DB_HOST")
DB_PORT = int(os.getenv("DB_PORT") or 3306)
DB_USER = os.getenv("DB_USER")
DB_PASS = os.getenv("DB_PASS")
DB_NAME = os.getenv("DB_CANVASES_NAME")

CASSANDRA_HOST = os.getenv("CASSANDRA_HOST") or "cassandra"
CASSANDRA_PORT = int(os.getenv("CASSANDRA_PORT") or 9042)
CASSANDRA_KEYSPACE = os.getenv("CASSANDRA_KEYSPACE") or "db_canvases_nosql"

# Canvas Persistence Config
CANVAS_SYNC_INTERVAL = int(os.getenv("WORKER_CANVAS_SYNC_INTERVAL") or 5)
CANVAS_BATCH_SIZE = int(os.getenv("WORKER_CANVAS_BATCH_SIZE") or 5000)

CONSUMER_GROUP = "canvas_workers"
CONSUMER_NAME = "worker-1"

# Chat Persistence Config
CHAT_SYNC_INTERVAL = int(os.getenv("WORKER_CHAT_SYNC_INTERVAL") or 2)
CHAT_BATCH_SIZE = int(os.getenv("WORKER_CHAT_BATCH_SIZE") or 50)

def get_db_connection():
    try:
        return mysql.connector.connect(
            host=DB_HOST,
            port=DB_PORT,
            user=DB_USER,
            password=DB_PASS,
            database=DB_NAME
        )
    except Exception as e:
        print(f"[!] Error connecting to MySQL: {e}")
        return None

def get_redis_client():
    try:
        r = redis.Redis(host=REDIS_HOST, port=REDIS_PORT, password=REDIS_PASS, db=0, decode_responses=False)
        r.ping()
        return r
    except Exception as e:
        print(f"[!] Error connecting to Redis: {e}")
        return None

def canvas_persistence_thread():
    print("[*] Starting Canvas Persistence Thread (Files + DB)...")
    
    r = get_redis_client()
    if not r:
        print("[!] Canvas thread could not connect to Redis on any host.")
        return

    canvas_uuid_cache = {}
    canvas_size_cache = {}

    while True:
        try:
            keys = r.keys("canvas:*:stream")
            streams = {}
            for key in keys:
                stream_name = key.decode('utf-8')
                try:
                    r.xgroup_create(stream_name, CONSUMER_GROUP, id='0', mkstream=True)
                except redis.exceptions.ResponseError as e:
                    if "BUSYGROUP" not in str(e):
                        print(f"[!] Error creating group for {stream_name}: {e}")
                streams[stream_name] = '>'
            
            if streams:
                messages = r.xreadgroup(CONSUMER_GROUP, CONSUMER_NAME, streams, count=CANVAS_BATCH_SIZE, block=1000)
                for stream_name_b, msgs in messages:
                    if not msgs: continue
                    stream_name = stream_name_b.decode('utf-8')
                    canvas_id = stream_name.split(":")[1]
                    
                    canvas_uuid = canvas_uuid_cache.get(canvas_id)
                    canvas_size = canvas_size_cache.get(canvas_id)
                    if not canvas_uuid or not canvas_size:
                        db_conn = get_db_connection()
                        if db_conn:
                            cursor = db_conn.cursor()
                            cursor.execute("SELECT uuid, size FROM canvases WHERE id = %s", (canvas_id,))
                            row = cursor.fetchone()
                            if row:
                                canvas_uuid = row[0]
                                canvas_size = row[1]
                                canvas_uuid_cache[canvas_id] = canvas_uuid
                                canvas_size_cache[canvas_id] = canvas_size
                            cursor.close()
                            db_conn.close()
                    
                    if not canvas_uuid:
                        print(f"[!] Could not resolve UUID for canvas {canvas_id}. Skipping.")
                        continue
                    
                    msg_ids = [msg_id_b for msg_id_b, _ in msgs]
                    r.xack(stream_name, CONSUMER_GROUP, *msg_ids)
                    r.xdel(stream_name, *msg_ids)
                    r.sadd("canvases:dirty_states", canvas_id)
                    
                    print(f"[+] Processed {len(msgs)} stream events for canvas {canvas_id}.")
                    
                    # Increment total_pixels counter in canvases table
                    db_conn = get_db_connection()
                    if db_conn:
                        cursor = db_conn.cursor()
                        try:
                            cursor.execute("UPDATE canvases SET total_pixels = total_pixels + %s WHERE id = %s", (len(msgs), canvas_id))
                            db_conn.commit()
                        except Exception as e:
                            print(f"[!] Error updating total_pixels for canvas {canvas_id}: {e}")
                        finally:
                            cursor.close()
                            db_conn.close()
        except Exception as e:
            print(f"[!] Error processing Streams to disk: {e}")

        db_conn = get_db_connection()
        if db_conn:
            cursor = db_conn.cursor()
            try:
                dirty_canvases_bytes = r.smembers("canvases:dirty_states")
                if dirty_canvases_bytes:
                    r.delete("canvases:dirty_states")
                    s3 = get_s3_client()
                    for canvas_id_bytes in dirty_canvases_bytes:
                        canvas_id_str = canvas_id_bytes.decode('utf-8')
                        state_key = f"canvas:{canvas_id_str}:state"
                        canvas_bytes = r.get(state_key)
                        if canvas_bytes:
                            compressed_data = compress(canvas_bytes)
                            s3_key = f"active_snapshots/canvas_{canvas_id_str}.bin"
                            try:
                                s3.put_object(Bucket=S3_BUCKET, Key=s3_key, Body=compressed_data)
                                query = """
                                    INSERT INTO canvas_snapshots (canvas_id, s3_key, snapshot_data) 
                                    VALUES (%s, %s, NULL)
                                    ON DUPLICATE KEY UPDATE s3_key = VALUES(s3_key), snapshot_data = NULL, last_updated = CURRENT_TIMESTAMP
                                """
                                cursor.execute(query, (canvas_id_str, s3_key))
                                r.sadd("canvases:pending_snapshots", canvas_id_str)
                                print(f"[+] Active snapshot uploaded to S3 and DB updated for canvas {canvas_id_str}")
                            except Exception as s3_err:
                                print(f"[!] Error uploading snapshot to S3 for canvas {canvas_id_str}: {s3_err}")
                db_conn.commit()
            except Exception as e:
                print(f"[!] Error saving Snapshots to DB/S3: {e}")
                db_conn.rollback()
            finally:
                cursor.close()
                db_conn.close()
        else:
            print("[!] MySQL inaccessible for canvas snapshots.")

        time.sleep(CANVAS_SYNC_INTERVAL)


def chat_persistence_thread():
    print("[*] Starting Chat Persistence Thread (Cassandra)...")
    r = get_redis_client()
    if not r:
        print("[!] Chat thread could not connect to Redis on any host.")
        return

    cassandra_cluster = None
    cassandra_session = None

    def connect_cassandra():
        nonlocal cassandra_cluster, cassandra_session
        try:
            print(f"[*] Connecting to Cassandra at {CASSANDRA_HOST}:{CASSANDRA_PORT}...")
            cassandra_cluster = Cluster([CASSANDRA_HOST], port=CASSANDRA_PORT, connect_timeout=10)
            cassandra_session = cassandra_cluster.connect()
            
            # Auto-initialize schema
            cassandra_session.execute(f"""
                CREATE KEYSPACE IF NOT EXISTS {CASSANDRA_KEYSPACE}
                WITH replication = {{'class': 'SimpleStrategy', 'replication_factor': 1}}
            """)
            cassandra_session.set_keyspace(CASSANDRA_KEYSPACE)
            cassandra_session.execute("""
                CREATE TABLE IF NOT EXISTS canvas_chat_messages (
                    canvas_id int,
                    created_at timestamp,
                    uuid text,
                    user_id int,
                    message text,
                    attachments text,
                    file_size bigint,
                    visibility text,
                    deleted_by text,
                    delete_reason text,
                    PRIMARY KEY (canvas_id, created_at, uuid)
                ) WITH CLUSTERING ORDER BY (created_at DESC, uuid ASC)
            """)
            cassandra_session.execute("CREATE INDEX IF NOT EXISTS ON canvas_chat_messages (uuid)")
            cassandra_session.execute("CREATE INDEX IF NOT EXISTS ON canvas_chat_messages (user_id)")
            print("[+] Cassandra connected and schema verified.")
            return True
        except Exception as e:
            print(f"[!] Cassandra initialization/connection error: {e}")
            if cassandra_cluster:
                try:
                    cassandra_cluster.shutdown()
                except:
                    pass
            cassandra_cluster = None
            cassandra_session = None
            return False

    # Attempt initial connection
    connect_cassandra()

    while True:
        try:
            # Check Redis queue
            queue_len = r.llen('canvas_chat_queue')
            if queue_len > 0:
                # If Cassandra is not connected, try to connect now
                if not cassandra_session:
                    if not connect_cassandra():
                        print("[!] Cassandra offline, keeping messages in Redis queue...")
                        time.sleep(CHAT_SYNC_INTERVAL)
                        continue

                limit = min(queue_len, CHAT_BATCH_SIZE)
                raw_messages = r.lrange('canvas_chat_queue', 0, limit - 1)
                if raw_messages:
                    insert_data = []
                    for raw_msg in raw_messages:
                        try:
                            msg_data = json.loads(raw_msg.decode('utf-8'))
                            created_at_str = msg_data.get('created_at')
                            if created_at_str:
                                try:
                                    created_at_dt = datetime.strptime(created_at_str, '%Y-%m-%d %H:%M:%S')
                                except ValueError:
                                    created_at_dt = datetime.now()
                            else:
                                created_at_dt = datetime.now()

                            insert_data.append({
                                'uuid': msg_data.get('uuid') or str(uuid.uuid4()),
                                'canvas_id': int(msg_data['canvas_id']),
                                'user_id': int(msg_data['user_id']),
                                'message': msg_data['message'],
                                'attachments': msg_data.get('attachments'), # this is already a JSON string or None
                                'file_size': int(msg_data.get('file_size') or 0),
                                'created_at': created_at_dt
                            })
                        except Exception as e:
                            print(f"[!] Error parsing message from Redis, discarding: {e}")
                    
                    if insert_data:
                        try:
                            # Batch insert to Cassandra
                            insert_stmt = cassandra_session.prepare("""
                                INSERT INTO canvas_chat_messages (canvas_id, created_at, uuid, user_id, message, attachments, file_size, visibility, deleted_by, delete_reason)
                                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                            """)
                            
                            batch = BatchStatement()
                            for item in insert_data:
                                batch.add(insert_stmt, (
                                    item['canvas_id'],
                                    item['created_at'],
                                    item['uuid'],
                                    item['user_id'],
                                    item['message'],
                                    item['attachments'],
                                    item['file_size'],
                                    'visible',
                                    None,
                                    None
                                ))
                            
                            cassandra_session.execute(batch)
                            
                            # Update total_messages in MySQL
                            db_conn = get_db_connection()
                            if db_conn:
                                cursor = db_conn.cursor()
                                try:
                                    canvas_msg_counts = {}
                                    for item in insert_data:
                                        c_id = item['canvas_id']
                                        canvas_msg_counts[c_id] = canvas_msg_counts.get(c_id, 0) + 1
                                    for c_id, count in canvas_msg_counts.items():
                                        cursor.execute("UPDATE canvases SET total_messages = total_messages + %s WHERE id = %s", (count, c_id))
                                    db_conn.commit()
                                except Exception as mysql_err:
                                    print(f"[!] MySQL total_messages update error: {mysql_err}")
                                finally:
                                    cursor.close()
                                    db_conn.close()
                            
                            print(f"[+] Bulk inserted {len(insert_data)} chat messages into Cassandra.")
                            # Trim Redis queue only after successful Cassandra insert
                            r.ltrim('canvas_chat_queue', limit, -1)

                        except Exception as cass_err:
                            print(f"[!] Error bulk inserting chat to Cassandra: {cass_err}")
                            # Force reconnect Cassandra next run if connection seems lost
                            cassandra_session = None
                            cassandra_cluster = None
                        
        except Exception as e:
            print(f"[!] Error processing chat messages from Redis: {e}")

        time.sleep(CHAT_SYNC_INTERVAL)

def main():
    print("[*] Starting Unified Persistence Worker (Canvas + Chat)...")
    
    t1 = threading.Thread(target=canvas_persistence_thread, daemon=True, name="CanvasPersistence")
    t2 = threading.Thread(target=chat_persistence_thread, daemon=True, name="ChatPersistence")
    
    t1.start()
    t2.start()
    
    while True:
        time.sleep(1)

if __name__ == "__main__":
    main()
