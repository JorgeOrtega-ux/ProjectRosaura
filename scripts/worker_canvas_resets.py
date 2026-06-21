import os
import time
import json
import redis
import mysql.connector
import zlib
from datetime import datetime, timezone

# Redis Configuration (Loopback fix for Docker)
redis_host_env = os.getenv("REDIS_HOST", "redis")
REDIS_HOST = "redis" if redis_host_env in ["127.0.0.1", "localhost", "0.0.0.0"] else redis_host_env
REDIS_PORT = int(os.getenv("REDIS_PORT", 6379))
REDIS_PASS = os.getenv("REDIS_PASS", None)

# MySQL Configuration (Loopback fix for Docker)
db_host_env = os.getenv("DB_HOST", "db")
DB_HOST = "db" if db_host_env in ["127.0.0.1", "localhost", "0.0.0.0"] else db_host_env
DB_USER = os.getenv("DB_USER", "system_web_executor")
DB_PASS = os.getenv("DB_PASS", "secret")
DB_NAME = os.getenv("DB_CANVASES_NAME", "db_canvases")

SYNC_INTERVAL = int(os.getenv("WORKER_RESETS_SYNC_INTERVAL", 10))

def get_db_connection():
    try:
        return mysql.connector.connect(
            host=DB_HOST,
            user=DB_USER,
            password=DB_PASS,
            database=DB_NAME
        )
    except Exception as e:
        print(f"[ERROR] MySQL connection failed in Resets Worker: {e}")
        return None

def process_canvas_reset(r, db_conn, row):
    canvas_id, is_active, next_reset_at, take_snapshot, timer_action, canvas_size = row
    
    print(f"[INFO] Starting reset sequence for canvas ID {canvas_id}.")
    
    lock_key = f"canvas:{canvas_id}:reset_lock"
    r.setex(lock_key, 300, "1") 
    
    lock_event = {
        "type": "canvas_locked",
        "canvas_id": canvas_id
    }
    r.publish("admin:canvas_events", json.dumps(lock_event))
    time.sleep(1) 
    
    cursor = db_conn.cursor()
    
    try:
        state_key = f"canvas:{canvas_id}:state"
        current_state = r.get(state_key)
        
        if current_state:
            compressed_state = zlib.compress(current_state)
            sync_query = """
                INSERT INTO canvas_snapshots (canvas_id, snapshot_data, last_updated)
                VALUES (%s, %s, CURRENT_TIMESTAMP)
                ON DUPLICATE KEY UPDATE snapshot_data = %s, last_updated = CURRENT_TIMESTAMP
            """
            cursor.execute(sync_query, (canvas_id, compressed_state, compressed_state))
            db_conn.commit()

        if take_snapshot:
            print(f"[INFO] Requesting HQ Snapshot for canvas ID {canvas_id}.")
            r.sadd("canvases:pending_snapshots", canvas_id)
            
            snapshot_done_key = f"canvas:{canvas_id}:snapshot_done"
            waited = 0
            while not r.exists(snapshot_done_key) and waited < 60:
                time.sleep(1)
                waited += 1
                
            if r.exists(snapshot_done_key):
                print(f"[INFO] Snapshot confirmed. Proceeding to clear canvas ID {canvas_id}.")
                r.delete(snapshot_done_key)
            else:
                print(f"[WARNING] Timeout waiting for snapshot worker. Clearing canvas ID {canvas_id} anyway.")

        try:
            size_int = int(canvas_size.split('x')[0]) if 'x' in canvas_size else int(canvas_size)
        except:
            size_int = 64
            
        total_pixels = size_int * size_int
        empty_state = bytes([255] * total_pixels)
        compressed_empty = zlib.compress(empty_state)
        
        print(f"[INFO] Wiping MySQL and Redis states for canvas ID {canvas_id}.")
        
        wipe_query = """
            INSERT INTO canvas_snapshots (canvas_id, snapshot_data, last_updated)
            VALUES (%s, %s, CURRENT_TIMESTAMP)
            ON DUPLICATE KEY UPDATE snapshot_data = %s, last_updated = CURRENT_TIMESTAMP
        """
        cursor.execute(wipe_query, (canvas_id, compressed_empty, compressed_empty))
        
        off_query = "UPDATE canvas_reset_settings SET is_active = 0 WHERE canvas_id = %s"
        cursor.execute(off_query, (canvas_id,))
        db_conn.commit()
        
        r.set(state_key, empty_state) 
        r.delete(f"canvas:next_reset:{canvas_id}")
        
        print(f"[INFO] Reset operation completed. Unlocking canvas ID {canvas_id}.")
        r.delete(lock_key)
        
        clear_event = {
            "type": "canvas_cleared",
            "canvas_id": canvas_id,
            "next_reset_at": None 
        }
        r.publish("admin:canvas_events", json.dumps(clear_event))

    except Exception as e:
        print(f"[ERROR] Fatal error during reset orchestration for canvas ID {canvas_id}: {e}")
        db_conn.rollback()
        r.delete(lock_key) 
    finally:
        cursor.close()

def main():
    print("[INFO] Starting Scheduled Resets Worker (Cron & Wipe)...")
    
    try:
        r = redis.Redis(
            host=REDIS_HOST, 
            port=REDIS_PORT, 
            password=REDIS_PASS, 
            db=0
        )
        r.ping()
        print("[INFO] Successfully connected to Redis.")
    except Exception as e:
        print(f"[ERROR] Failed to connect to Redis: {e}")
        return

    while True:
        try:
            db_conn = get_db_connection()
            if db_conn:
                cursor = db_conn.cursor()
                
                query = """
                    SELECT r.canvas_id, r.is_active, r.next_reset_at, r.take_snapshot, r.timer_action, c.size 
                    FROM canvas_reset_settings r
                    JOIN canvases c ON r.canvas_id = c.id
                    WHERE r.is_active = 1 
                    AND r.next_reset_at <= UTC_TIMESTAMP()
                """
                cursor.execute(query)
                pending_resets = cursor.fetchall()
                
                for row in pending_resets:
                    process_canvas_reset(r, db_conn, row)
                    
                cursor.close()
                db_conn.close()
                
        except Exception as e:
            pass # Suppressing outer loop traceback to keep enterprise standard logging clean

        time.sleep(SYNC_INTERVAL)

if __name__ == "__main__":
    main()