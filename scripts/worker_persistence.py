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
REDIS_PORT = int(os.getenv("REDIS_PORT")) if os.getenv("REDIS_PORT") else None
REDIS_PASS = os.getenv("REDIS_PASS")

DB_HOST = os.getenv("DB_HOST")
DB_USER = os.getenv("DB_USER")
DB_PASS = os.getenv("DB_PASS")
DB_NAME = os.getenv("DB_CANVASES_NAME")

# Canvas Persistence Config
CANVAS_SYNC_INTERVAL = int(os.getenv("WORKER_CANVAS_SYNC_INTERVAL") or os.getenv("WORKER_TIMELAPSE_SYNC_INTERVAL") or 5)
CANVAS_BATCH_SIZE = int(os.getenv("WORKER_CANVAS_BATCH_SIZE") or os.getenv("WORKER_TIMELAPSE_BATCH_SIZE") or 5000)

CONSUMER_GROUP = "canvas_workers"
CONSUMER_NAME = "worker-1"

# Chat Persistence Config
CHAT_SYNC_INTERVAL = int(os.getenv("WORKER_CHAT_SYNC_INTERVAL")) if os.getenv("WORKER_CHAT_SYNC_INTERVAL") else 2
CHAT_BATCH_SIZE = int(os.getenv("WORKER_CHAT_BATCH_SIZE")) if os.getenv("WORKER_CHAT_BATCH_SIZE") else 50

def get_db_connection():
    candidate_hosts = [DB_HOST, "127.0.0.1", "localhost"] if DB_HOST else ["127.0.0.1", "localhost"]
    seen = set()
    hosts = [h for h in candidate_hosts if h and not (h in seen or seen.add(h))]
    
    last_err = None
    for host in hosts:
        try:
            return mysql.connector.connect(
                host=host,
                port=int(os.getenv("DB_PORT", 3306)),
                user=DB_USER,
                password=DB_PASS,
                database=DB_NAME
            )
        except Exception as e:
            last_err = e
    print(f"[!] Error connecting to MySQL: {last_err}")
    return None

def get_redis_client():
    candidate_hosts = [REDIS_HOST, "127.0.0.1", "localhost"] if REDIS_HOST else ["127.0.0.1", "localhost"]
    seen = set()
    hosts = [h for h in candidate_hosts if h and not (h in seen or seen.add(h))]
    
    for host in hosts:
        try:
            r = redis.Redis(host=host, port=REDIS_PORT or 6379, password=REDIS_PASS, db=0, decode_responses=False)
            r.ping()
            return r
        except Exception:
            pass
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
                    for canvas_id_bytes in dirty_canvases_bytes:
                        canvas_id_str = canvas_id_bytes.decode('utf-8')
                        state_key = f"canvas:{canvas_id_str}:state"
                        canvas_bytes = r.get(state_key)
                        if canvas_bytes:
                            compressed_data = compress(canvas_bytes)
                            query = """
                                INSERT INTO canvas_snapshots (canvas_id, snapshot_data) 
                                VALUES (%s, %s)
                                ON DUPLICATE KEY UPDATE snapshot_data = VALUES(snapshot_data), last_updated = CURRENT_TIMESTAMP
                            """
                            cursor.execute(query, (canvas_id_str, compressed_data))
                            r.sadd("canvases:pending_snapshots", canvas_id_str)
                db_conn.commit()
            except Exception as e:
                print(f"[!] Error saving Snapshots to DB: {e}")
                db_conn.rollback()
            finally:
                cursor.close()
                db_conn.close()
        else:
            print("[!] MySQL inaccessible for canvas snapshots.")

        time.sleep(CANVAS_SYNC_INTERVAL)


def chat_persistence_thread():
    print("[*] Starting Chat Persistence Thread...")
    r = get_redis_client()
    if not r:
        print("[!] Chat thread could not connect to Redis on any host.")
        return

    while True:
        try:
            queue_len = r.llen('canvas_chat_queue')
            if queue_len > 0:
                limit = min(queue_len, CHAT_BATCH_SIZE)
                raw_messages = r.lrange('canvas_chat_queue', 0, limit - 1)
                if raw_messages:
                    db_conn = get_db_connection()
                    if db_conn:
                        cursor = db_conn.cursor()
                        try:
                            insert_data = []
                            for raw_msg in raw_messages:
                                try:
                                    msg_data = json.loads(raw_msg.decode('utf-8'))
                                    insert_data.append((
                                        str(uuid.uuid4()),
                                        msg_data['canvas_id'],
                                        msg_data['user_id'],
                                        msg_data['message'],
                                        msg_data['attachments'],
                                        msg_data.get('file_size', 0),
                                        msg_data['created_at']
                                    ))
                                except Exception as e:
                                    print(f"[!] Error parsing message from Redis, discarding: {e}")
                            
                            if insert_data:
                                query = """
                                    INSERT INTO canvas_chat_messages (uuid, canvas_id, user_id, message, attachments, file_size, created_at) 
                                    VALUES (%s, %s, %s, %s, %s, %s, %s)
                                """
                                cursor.executemany(query, insert_data)

                                canvas_msg_counts = {}
                                for item in insert_data:
                                    c_id = item[1]
                                    canvas_msg_counts[c_id] = canvas_msg_counts.get(c_id, 0) + 1
                                for c_id, count in canvas_msg_counts.items():
                                    cursor.execute("UPDATE canvases SET total_messages = total_messages + %s WHERE id = %s", (count, c_id))

                                db_conn.commit()
                                print(f"[+] Bulk inserted {len(insert_data)} chat messages into MySQL and updated total_messages counters.")
                            
                            r.ltrim('canvas_chat_queue', limit, -1)
                        
                        except Exception as e:
                            print(f"[!] Error bulk inserting chat to DB: {e}")
                            db_conn.rollback()
                        finally:
                            cursor.close()
                            db_conn.close()
                    else:
                        print("[!] MySQL inaccessible, keeping messages in Redis queue...")
                        
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
