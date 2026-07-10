import os
import time
import json
import redis
import mysql.connector
from zlib import compress

REDIS_HOST = os.getenv("REDIS_HOST", "redis")
REDIS_PORT = int(os.getenv("REDIS_PORT", 6379))
REDIS_PASS = os.getenv("REDIS_PASS", None)

DB_HOST = os.getenv("DB_HOST", "db")
DB_USER = os.getenv("DB_USER", "system_web_executor")
DB_PASS = os.getenv("DB_PASS", "secret")
DB_NAME = os.getenv("DB_CANVASES_NAME", "db_canvases")

SYNC_INTERVAL = int(os.getenv("WORKER_TIMELAPSE_SYNC_INTERVAL", 5)) # Frecuencia del loop
BATCH_SIZE = int(os.getenv("WORKER_TIMELAPSE_BATCH_SIZE", 5000))    # PÃ­xeles por archivo de golpe
TIMELAPSE_DIR = os.getenv("TIMELAPSE_DIR", "/app/storage/private/canvases/timelapses")

CONSUMER_GROUP = "timelapse_workers"
CONSUMER_NAME = "worker-1"

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

def main():
    print("[*] Starting Persistence Worker (Files + DB)...")
    
    os.makedirs(TIMELAPSE_DIR, exist_ok=True)
    
    try:
        r = redis.Redis(
            host=REDIS_HOST, 
            port=REDIS_PORT, 
            password=REDIS_PASS, 
            db=0, 
            decode_responses=False
        )
        r.ping()
        print("[+] Connected to Redis successfully.")
    except Exception as e:
        print(f"[!] Could not connect to Redis: {e}")
        return

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
                
                streams[stream_name] = '>' # '>' indica que queremos mensajes nuevos
            
            if streams:
                messages = r.xreadgroup(CONSUMER_GROUP, CONSUMER_NAME, streams, count=BATCH_SIZE, block=1000)
                
                for stream_name_b, msgs in messages:
                    if not msgs:
                        continue
                        
                    stream_name = stream_name_b.decode('utf-8')
                    canvas_id = stream_name.split(":")[1]
                    file_path = os.path.join(TIMELAPSE_DIR, f"live_canvas_{canvas_id}.jsonl")
                    
                    with open(file_path, "a", encoding="utf-8") as f:
                        for msg_id_b, msg_data_b in msgs:
                            msg_id = msg_id_b.decode('utf-8') # El ID generado por Redis (incluye timestamp)
                            
                            event = {k.decode('utf-8'): v.decode('utf-8') for k, v in msg_data_b.items()}
                            event["_id"] = msg_id # Inyectar el id/timestamp para el frontend
                            
                            f.write(json.dumps(event) + "\n")
                    
                    msg_ids = [msg_id_b for msg_id_b, _ in msgs]
                    r.xack(stream_name, CONSUMER_GROUP, *msg_ids)
                    
                    r.xdel(stream_name, *msg_ids)
                    
                    r.sadd("canvases:dirty_states", canvas_id)
                    
                    print(f"[+] Written and confirmed {len(msgs)} events to LIVE file of canvas {canvas_id}.")
        
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
            print("[!] MySQL inaccessible, but .jsonl files continue saving (Fault Tolerance Mode)...")

        time.sleep(SYNC_INTERVAL)

if __name__ == "__main__":
    main()
