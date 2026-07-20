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

S3_ENDPOINT = os.getenv("MINIO_ENDPOINT") or os.getenv("AWS_ENDPOINT")
if S3_ENDPOINT and not S3_ENDPOINT.startswith("http"):
    S3_ENDPOINT = "http://" + S3_ENDPOINT + ":9000"
S3_ACCESS_KEY = os.getenv("MINIO_ROOT_USER") or os.getenv("AWS_ACCESS_KEY_ID")
S3_SECRET_KEY = os.getenv("MINIO_ROOT_PASSWORD") or os.getenv("AWS_SECRET_ACCESS_KEY")
S3_BUCKET = os.getenv("MINIO_BUCKET") or os.getenv("AWS_BUCKET")

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
CANVAS_SYNC_INTERVAL = int(os.getenv("WORKER_TIMELAPSE_SYNC_INTERVAL")) if os.getenv("WORKER_TIMELAPSE_SYNC_INTERVAL") else 5
CANVAS_BATCH_SIZE = int(os.getenv("WORKER_TIMELAPSE_BATCH_SIZE")) if os.getenv("WORKER_TIMELAPSE_BATCH_SIZE") else 5000

CONSUMER_GROUP = "timelapse_workers"
CONSUMER_NAME = "worker-1"

# Chat Persistence Config
CHAT_SYNC_INTERVAL = int(os.getenv("WORKER_CHAT_SYNC_INTERVAL")) if os.getenv("WORKER_CHAT_SYNC_INTERVAL") else 2
CHAT_BATCH_SIZE = int(os.getenv("WORKER_CHAT_BATCH_SIZE")) if os.getenv("WORKER_CHAT_BATCH_SIZE") else 50

def get_db_connection():
    try:
        return mysql.connector.connect(
            host=DB_HOST,
            user=DB_USER,
            password=DB_PASS,
            database=DB_NAME
        )
    except Exception as e:
        print(f"[!] Error connecting to MySQL: {e}")
        return None

def canvas_persistence_thread():
    print("[*] Starting Canvas Persistence Thread (Files + DB)...")
    
    
    try:
        r = redis.Redis(host=REDIS_HOST, port=REDIS_PORT, password=REDIS_PASS, db=0, decode_responses=False)
        r.ping()
    except Exception as e:
        print(f"[!] Canvas thread could not connect to Redis: {e}")
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
                    
                    is_infinite = (canvas_size and canvas_size.lower().strip() == 'infinite')
                    s3 = get_s3_client()
                    
                    parsed_events = []
                    for msg_id_b, msg_data_b in msgs:
                        msg_id = msg_id_b.decode('utf-8')
                        event = {k.decode('utf-8'): v.decode('utf-8') for k, v in msg_data_b.items()}
                        event["_id"] = msg_id
                        parsed_events.append(event)

                    if is_infinite:
                        from collections import defaultdict
                        chunk_events = defaultdict(list)
                        for evt in parsed_events:
                            if 'x' in evt and 'y' in evt:
                                try:
                                    cx = int(evt['x']) // 512
                                    cy = int(evt['y']) // 512
                                    chunk_events[(cx, cy)].append(json.dumps(evt) + "\n")
                                except ValueError:
                                    pass
                        
                        for (cx, cy), events_json in chunk_events.items():
                            chunk_key = f"timelapses/{canvas_uuid}/live/{cx}_{cy}.jsonl"
                            existing_data = b""
                            try:
                                response = s3.get_object(Bucket=S3_BUCKET, Key=chunk_key)
                                existing_data = response['Body'].read()
                            except botocore.exceptions.ClientError as e:
                                if e.response['Error']['Code'] != "NoSuchKey":
                                    print(f"[!] S3 error reading timelapse chunk {cx}_{cy}: {e}")
                            
                            final_data = existing_data + "".join(events_json).encode('utf-8')
                            try:
                                s3.put_object(Bucket=S3_BUCKET, Key=chunk_key, Body=final_data, ContentType='application/jsonl')
                            except Exception as e:
                                print(f"[!] S3 error saving timelapse chunk {cx}_{cy}: {e}")
                    else:
                        live_key = f"timelapses/{canvas_uuid}/live/live_canvas_{canvas_uuid}.jsonl"
                        
                        existing_data = b""
                        try:
                            response = s3.get_object(Bucket=S3_BUCKET, Key=live_key)
                            existing_data = response['Body'].read()
                        except botocore.exceptions.ClientError as e:
                            if e.response['Error']['Code'] != "NoSuchKey":
                                print(f"[!] S3 error reading timelapse: {e}")
                                
                        new_events = [json.dumps(evt) + "\n" for evt in parsed_events]
                            
                        final_data = existing_data + "".join(new_events).encode('utf-8')
                        try:
                            s3.put_object(Bucket=S3_BUCKET, Key=live_key, Body=final_data, ContentType='application/jsonl')
                        except Exception as e:
                            print(f"[!] S3 error saving timelapse: {e}")
                    
                    msg_ids = [msg_id_b for msg_id_b, _ in msgs]
                    r.xack(stream_name, CONSUMER_GROUP, *msg_ids)
                    r.xdel(stream_name, *msg_ids)
                    r.sadd("canvases:dirty_states", canvas_id)
                    
                    # Track dirty chunks granularly for infinite canvas
                    dirty_chunks_key = f"canvas:{canvas_id}:dirty_chunks"
                    for evt in parsed_events:
                        if 'x' in evt and 'y' in evt:
                            try:
                                cx = int(evt['x']) // 512
                                cy = int(evt['y']) // 512
                                r.sadd(dirty_chunks_key, f"{cx}:{cy}")
                            except ValueError:
                                pass
                                
                    print(f"[+] Written {len(msgs)} events to LIVE file of canvas {canvas_id} ({canvas_uuid}).")
        except Exception as e:
            print(f"[!] Error processing Streams to disk: {e}")

        db_conn = get_db_connection()
        if db_conn:
            cursor = db_conn.cursor()
            try:
                # Ensure infinite chunks table exists
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS canvas_infinite_chunks (
                        canvas_id int(11) NOT NULL,
                        chunk_x int(11) NOT NULL,
                        chunk_y int(11) NOT NULL,
                        chunk_data LONGBLOB NOT NULL,
                        last_updated timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
                        PRIMARY KEY (canvas_id, chunk_x, chunk_y),
                        CONSTRAINT fk_infinite_chunk_canvas FOREIGN KEY (canvas_id) REFERENCES canvases (id) ON DELETE CASCADE
                    ) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci
                """)
                
                dirty_canvases_bytes = r.smembers("canvases:dirty_states")
                if dirty_canvases_bytes:
                    r.delete("canvases:dirty_states")
                    for canvas_id_bytes in dirty_canvases_bytes:
                        canvas_id_str = canvas_id_bytes.decode('utf-8')
                        state_key = f"canvas:{canvas_id_str}:state"
                        canvas_bytes = r.get(state_key)
                        if canvas_bytes:
                            # Finite canvas persistence
                            compressed_data = compress(canvas_bytes)
                            query = """
                                INSERT INTO canvas_snapshots (canvas_id, snapshot_data) 
                                VALUES (%s, %s)
                                ON DUPLICATE KEY UPDATE snapshot_data = VALUES(snapshot_data), last_updated = CURRENT_TIMESTAMP
                            """
                            cursor.execute(query, (canvas_id_str, compressed_data))
                            r.sadd("canvases:pending_snapshots", canvas_id_str)
                        else:
                            # Infinite canvas persistence
                            dirty_chunks_key = f"canvas:{canvas_id_str}:dirty_chunks"
                            dirty_chunks = r.smembers(dirty_chunks_key)
                            if dirty_chunks:
                                r.delete(dirty_chunks_key)
                                chunk_data_to_insert = []
                                for chunk_bytes in dirty_chunks:
                                    chunk_str = chunk_bytes.decode('utf-8')
                                    try:
                                        cx, cy = map(int, chunk_str.split(':'))
                                        chunk_key = f"canvas:{canvas_id_str}:chunk:{cx}:{cy}"
                                        chunk_data = r.get(chunk_key)
                                        if chunk_data:
                                            compressed_chunk = compress(chunk_data)
                                            chunk_data_to_insert.append((canvas_id_str, cx, cy, compressed_chunk))
                                    except Exception as e:
                                        print(f"[!] Error processing chunk {chunk_str}: {e}")
                                
                                if chunk_data_to_insert:
                                    query_chunk = """
                                        INSERT INTO canvas_infinite_chunks (canvas_id, chunk_x, chunk_y, chunk_data) 
                                        VALUES (%s, %s, %s, %s)
                                        ON DUPLICATE KEY UPDATE chunk_data = VALUES(chunk_data), last_updated = CURRENT_TIMESTAMP
                                    """
                                    cursor.executemany(query_chunk, chunk_data_to_insert)
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
    try:
        r = redis.Redis(host=REDIS_HOST, port=REDIS_PORT, password=REDIS_PASS, db=0, decode_responses=False)
        r.ping()
    except Exception as e:
        print(f"[!] Chat thread could not connect to Redis: {e}")
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
                                db_conn.commit()
                                print(f"[+] Bulk inserted {len(insert_data)} chat messages into MySQL.")
                            
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
