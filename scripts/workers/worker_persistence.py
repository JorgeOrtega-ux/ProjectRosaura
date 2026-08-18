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
import sys

# Ensure scripts dir is in path
_script_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if _script_dir not in sys.path:
    sys.path.append(_script_dir)
from workers.worker_system_tasks import init_cassandra_schemas

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

TIMELAPSE_DIR = os.path.join(BASE_DIR, 'storage', 'timelapses')
os.makedirs(TIMELAPSE_DIR, exist_ok=True)
os.makedirs(os.path.join(TIMELAPSE_DIR, 'snapshots'), exist_ok=True)

def parse_size_str(size_val):
    try:
        s = str(size_val).lower().strip()
        if 'x' in s:
            parts = s.split('x')
            return int(parts[0]), int(parts[1])
        v = int(s)
        return v, v
    except Exception:
        return 64, 64

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

    cassandra_cluster = None
    cassandra_session = None

    def connect_cassandra():
        nonlocal cassandra_cluster, cassandra_session
        try:
            print(f"[*] Connecting to Cassandra for Pixel History at {CASSANDRA_HOST}:{CASSANDRA_PORT}...")
            cassandra_cluster = Cluster([CASSANDRA_HOST], port=CASSANDRA_PORT, connect_timeout=10)
            cassandra_session = cassandra_cluster.connect()
            # Initialize schema from CQL files
            init_cassandra_schemas(cassandra_session)
            cassandra_session.set_keyspace(CASSANDRA_KEYSPACE)
            print("[+] Cassandra connected and Pixel History schema verified.")
            return True
        except Exception as e:
            print(f"[!] Cassandra Pixel History initialization/connection error: {e}")
            if cassandra_cluster:
                try:
                    cassandra_cluster.shutdown()
                except:
                    pass
            cassandra_cluster = None
            cassandra_session = None
            return False

    connect_cassandra()

    canvas_uuid_cache = {}
    canvas_size_cache = {}
    
    db_conn = None

    def ensure_db_conn():
        nonlocal db_conn
        if db_conn:
            try:
                db_conn.ping(reconnect=True)
                return db_conn
            except Exception:
                try:
                    db_conn.close()
                except:
                    pass
        db_conn = get_db_connection()
        return db_conn

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
                        conn = ensure_db_conn()
                        if conn:
                            cursor = conn.cursor()
                            cursor.execute("SELECT uuid, size FROM canvases WHERE id = %s", (canvas_id,))
                            row = cursor.fetchone()
                            if row:
                                canvas_uuid = row[0]
                                canvas_size = row[1]
                                canvas_uuid_cache[canvas_id] = canvas_uuid
                                canvas_size_cache[canvas_id] = canvas_size
                            cursor.close()
                    
                    if not canvas_uuid:
                        print(f"[!] Could not resolve UUID for canvas {canvas_id}. Skipping.")
                        continue

                    # Batch insert pixel history to Cassandra & append JSONL timelapse events
                    if msgs:
                        timelapse_lines = []
                        active_timelapse_file = os.path.join(TIMELAPSE_DIR, f"canvas_{canvas_id}_active.jsonl")

                        if not os.path.exists(active_timelapse_file):
                            init_w, init_h = parse_size_str(canvas_size)
                            init_t = int(time.time() * 1000)
                            timelapse_lines.append(json.dumps({"t": init_t, "type": "init", "w": init_w, "h": init_h}) + "\n")

                        if not cassandra_session:
                            connect_cassandra()
                        
                        if cassandra_session:
                            try:
                                batch = BatchStatement()
                                insert_stmt = cassandra_session.prepare("""
                                    INSERT INTO canvas_pixel_history (canvas_id, x, y, placed_at, user_id, color_hex)
                                    VALUES (?, ?, ?, ?, ?, ?)
                                """)
                                for msg_id, field_dict in msgs:
                                    try:
                                        msg_ts_ms = int(msg_id.decode('utf-8').split('-')[0])
                                        placed_at = datetime.fromtimestamp(msg_ts_ms / 1000.0)
                                    except Exception:
                                        msg_ts_ms = int(time.time() * 1000)
                                        placed_at = datetime.now()

                                    # Check for special canvas events
                                    if b'type' in field_dict:
                                        evt_type = field_dict[b'type'].decode('utf-8')
                                        if evt_type == 'canvas_clear_area':
                                            x1 = int(field_dict.get(b'x1', b'0'))
                                            y1 = int(field_dict.get(b'y1', b'0'))
                                            x2 = int(field_dict.get(b'x2', b'0'))
                                            y2 = int(field_dict.get(b'y2', b'0'))
                                            timelapse_lines.append(json.dumps({"t": msg_ts_ms, "type": "clear", "x1": x1, "y1": y1, "x2": x2, "y2": y2}) + "\n")
                                        elif evt_type == 'canvas_resize':
                                            w_val = int(field_dict[b'w']) if b'w' in field_dict else 64
                                            h_val = int(field_dict[b'h']) if b'h' in field_dict else w_val
                                            timelapse_lines.append(json.dumps({"t": msg_ts_ms, "type": "resize", "w": w_val, "h": h_val}) + "\n")
                                        elif evt_type == 'canvas_reset':
                                            size_str = field_dict[b'size'].decode('utf-8') if b'size' in field_dict else '64x64'
                                            w_val, h_val = parse_size_str(size_str)
                                            timelapse_lines.append(json.dumps({"t": msg_ts_ms, "type": "reset", "w": w_val, "h": h_val}) + "\n")
                                    elif b'u' in field_dict and b'x' in field_dict and b'y' in field_dict:
                                        try:
                                            u_val = int(field_dict[b'u'])
                                            x_val = int(field_dict[b'x'])
                                            y_val = int(field_dict[b'y'])
                                            c_val = field_dict[b'c'].decode('utf-8') if b'c' in field_dict else 'transparent'
                                            
                                            batch.add(insert_stmt, (
                                                int(canvas_id),
                                                x_val,
                                                y_val,
                                                placed_at,
                                                u_val,
                                                c_val
                                            ))
                                            timelapse_lines.append(json.dumps({"t": msg_ts_ms, "type": "pixel", "x": x_val, "y": y_val, "c": c_val, "u": u_val}) + "\n")
                                        except Exception as item_err:
                                            print(f"[!] Error parsing pixel history item: {item_err}")
                                
                                if len(batch) > 0:
                                    cassandra_session.execute(batch)
                                    print(f"[+] Persisted {len(batch)} pixel history records to Cassandra for canvas {canvas_id}.")
                            except Exception as cass_err:
                                print(f"[!] Error bulk inserting pixel history to Cassandra: {cass_err}")
                                cassandra_session = None
                                cassandra_cluster = None

                        if timelapse_lines:
                            try:
                                with open(active_timelapse_file, "a", encoding="utf-8") as f_tl:
                                    f_tl.writelines(timelapse_lines)
                            except Exception as tl_err:
                                print(f"[!] Error writing timelapse JSONL for canvas {canvas_id}: {tl_err}")
                    
                    msg_ids = [msg_id_b for msg_id_b, _ in msgs]
                    r.xack(stream_name, CONSUMER_GROUP, *msg_ids)
                    r.xdel(stream_name, *msg_ids)
                    r.sadd("canvases:dirty_states", canvas_id)
                    
                    print(f"[+] Processed {len(msgs)} stream events for canvas {canvas_id}.")
                    
                    # Increment total_pixels counter in canvases table
                    conn = ensure_db_conn()
                    if conn:
                        cursor = conn.cursor()
                        try:
                            cursor.execute("UPDATE canvases SET total_pixels = total_pixels + %s WHERE id = %s", (len(msgs), canvas_id))
                            conn.commit()
                        except Exception as e:
                            print(f"[!] Error updating total_pixels for canvas {canvas_id}: {e}")
                        finally:
                            cursor.close()
        except Exception as e:
            print(f"[!] Error processing Streams to disk: {e}")

        conn = ensure_db_conn()
        if conn:
            cursor = conn.cursor()
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

                        # Upload active timelapse file to S3
                        active_tl = os.path.join(TIMELAPSE_DIR, f"canvas_{canvas_id_str}_active.jsonl")
                        if os.path.exists(active_tl):
                            try:
                                with open(active_tl, "rb") as f_tl_s3:
                                    s3.put_object(
                                        Bucket=S3_BUCKET,
                                        Key=f"timelapses/canvas_{canvas_id_str}_active.jsonl",
                                        Body=f_tl_s3.read(),
                                        ContentType="application/x-ndjson"
                                    )
                            except Exception as s3_tl_err:
                                print(f"[!] Error uploading active timelapse to S3: {s3_tl_err}")
                conn.commit()
            except Exception as e:
                print(f"[!] Error saving Snapshots to DB/S3: {e}")
                conn.rollback()
            finally:
                cursor.close()
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
            
            # Auto-initialize schema from CQL files
            init_cassandra_schemas(cassandra_session)
            cassandra_session.set_keyspace(CASSANDRA_KEYSPACE)
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
                                'created_at': created_at_dt,
                                'reply_to': msg_data.get('reply_to'),
                                'reply_to_username': msg_data.get('reply_to_username'),
                                'reply_to_message': msg_data.get('reply_to_message')
                            })
                        except Exception as e:
                            print(f"[!] Error parsing message from Redis, discarding: {e}")
                    
                    if insert_data:
                        try:
                            # Batch insert to Cassandra
                            insert_stmt = cassandra_session.prepare("""
                                INSERT INTO canvas_chat_messages (canvas_id, created_at, uuid, user_id, message, attachments, file_size, visibility, deleted_by, delete_reason, reply_to, reply_to_username, reply_to_message)
                                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
                                    None,
                                    item['reply_to'],
                                    item['reply_to_username'],
                                    item['reply_to_message']
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

def recent_colors_persistence_thread():
    print("[*] Starting Recent Colors Persistence Thread (MySQL)...")
    r = get_redis_client()
    if not r:
        print("[!] Recent colors thread could not connect to Redis.")
        return

    sync_interval = 15  # seconds

    while True:
        try:
            # Pop or get dirty user/canvas IDs from Redis set
            dirty_keys = r.smembers("canvas:recent_colors:dirty")
            if dirty_keys:
                r.delete("canvas:recent_colors:dirty")
                
                db_conn = get_db_connection()
                if db_conn:
                    cursor = db_conn.cursor()
                    try:
                        for key_b in dirty_keys:
                            key_str = key_b.decode('utf-8')
                            parts = key_str.split(':')
                            if len(parts) == 2:
                                canvas_id = parts[0]
                                user_id = parts[1]
                                
                                redis_key = f"canvas:{canvas_id}:recent_colors:{user_id}"
                                colors_raw = r.get(redis_key)
                                if colors_raw:
                                    colors_str = colors_raw.decode('utf-8')
                                    # Insert/Update in MySQL
                                    query = """
                                        INSERT INTO canvas_recent_colors (user_id, canvas_id, colors)
                                        VALUES (%s, %s, %s)
                                        ON DUPLICATE KEY UPDATE colors = VALUES(colors)
                                    """
                                    cursor.execute(query, (user_id, canvas_id, colors_str))
                        db_conn.commit()
                        print(f"[+] Persisted {len(dirty_keys)} recent colors modifications to MySQL.")
                    except Exception as sql_err:
                        print(f"[!] Error syncing recent colors to MySQL: {sql_err}")
                        db_conn.rollback()
                        # Re-add keys to set so they get retried next iteration
                        for key_b in dirty_keys:
                            r.sadd("canvas:recent_colors:dirty", key_b)
                    finally:
                        cursor.close()
                        db_conn.close()
                else:
                    print("[!] MySQL inaccessible for recent colors, keeping in Redis set.")
                    # Re-add keys to set
                    for key_b in dirty_keys:
                        r.sadd("canvas:recent_colors:dirty", key_b)
        except Exception as e:
            print(f"[!] Error processing recent colors: {e}")

        time.sleep(sync_interval)

def main():
    print("[*] Starting Unified Persistence Worker (Canvas + Chat + Recent Colors)...")
    
    t1 = threading.Thread(target=canvas_persistence_thread, daemon=True, name="CanvasPersistence")
    t2 = threading.Thread(target=chat_persistence_thread, daemon=True, name="ChatPersistence")
    t3 = threading.Thread(target=recent_colors_persistence_thread, daemon=True, name="RecentColorsPersistence")
    
    t1.start()
    t2.start()
    t3.start()
    
    while True:
        time.sleep(1)

if __name__ == "__main__":
    main()
