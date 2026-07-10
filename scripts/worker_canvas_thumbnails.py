import os
import time
import json
import redis
import mysql.connector
import uuid
import shutil
from zlib import decompress
from PIL import Image
from datetime import datetime

REDIS_HOST = os.getenv("REDIS_HOST", "redis")
REDIS_PORT = int(os.getenv("REDIS_PORT", 6379))
REDIS_PASS = os.getenv("REDIS_PASS", None)

DB_HOST = os.getenv("DB_HOST", "db")
DB_USER = os.getenv("DB_USER", "system_web_executor")
DB_PASS = os.getenv("DB_PASS", "secret")
DB_NAME = os.getenv("DB_CANVASES_NAME", "db_canvases")
DB_IDENTITY_NAME = os.getenv("DB_IDENTITY_NAME", "db_identity")

SYNC_INTERVAL = int(os.getenv("WORKER_SNAPSHOTS_SYNC_INTERVAL", 10))
THUMBNAILS_DIR = os.getenv("THUMBNAILS_DIR", "/app/storage/public/thumbnails")
ARCHIVE_DIR = os.getenv("SNAPSHOTS_ARCHIVE_DIR", "/app/storage/public/snapshots_archive")
TIMELAPSE_DIR = os.getenv("TIMELAPSE_DIR", "/app/storage/private/canvases/timelapses")
SCALE_FACTOR = int(os.getenv("SNAPSHOT_SCALE_FACTOR", 10)) 

THUMBNAIL_MAX_SIZE = int(os.getenv("THUMBNAIL_MAX_SIZE", 512)) # Max pÃ­xeles para tarjetas web
ARCHIVE_MAX_SIZE = int(os.getenv("ARCHIVE_MAX_SIZE", 4096))    # Max pÃ­xeles para histÃ³ricos

PALETTES_FILE_PATH = os.getenv("PALETTES_FILE_PATH", "/app/public/assets/data/palettes.json")
APP_PALETTES = {}

def load_palettes():
    global APP_PALETTES
    try:
        if os.path.exists(PALETTES_FILE_PATH):
            with open(PALETTES_FILE_PATH, 'r', encoding='utf-8') as f:
                data = json.load(f)
                for pal_id, pal_data in data.items():
                    raw_colors = pal_data.get('colors', [])
                    APP_PALETTES[pal_id] = [c.get('hex', '#000000') if isinstance(c, dict) else c for c in raw_colors]
            print(f"[+] Palettes successfully loaded from {PALETTES_FILE_PATH}")
        else:
            raise FileNotFoundError("El archivo JSON no existe en la ruta.")
    except Exception as e:
        print(f"[!] Error loading palettes from {PALETTES_FILE_PATH}: {e}")
        APP_PALETTES['default'] = [
            '#000000', '#1A1A1A', '#333333', '#4D4D4D', '#666666', '#808080', '#999999', '#B3B3B3', '#CCCCCC', '#E6E6E6', '#F2F2F2', '#FFFFFF',
            '#FF0000', '#FF8000', '#FFFF00', '#80FF00', '#00FF00', '#00FF80', '#00FFFF', '#0080FF', '#0000FF', '#8000FF', '#FF00FF', '#FF0080',
            '#800000', '#804000', '#808000', '#408000', '#008000', '#008040', '#008080', '#004080', '#000080', '#400080', '#800080', '#800040'
        ]

def hex_to_rgba(hex_color):
    hex_color = hex_color.lstrip('#')
    return tuple(int(hex_color[i:i+2], 16) for i in (0, 2, 4)) + (255,)

def get_color(palette_id, index):
    if index == 255:
        return (255, 255, 255, 255) 
        
    palette = APP_PALETTES.get(palette_id, APP_PALETTES.get('default', []))
    
    if index < len(palette):
        return hex_to_rgba(palette[index])
        
    return (255, 0, 255, 255)

def get_db_connection():
    try:
        return mysql.connector.connect(
            host=DB_HOST,
            user=DB_USER,
            password=DB_PASS,
            database=DB_NAME
        )
    except Exception as e:
        print(f"[!] Error connecting to MySQL in Snapshots Worker: {e}")
        return None

def parse_size(size_str):
    try:
        if 'x' in size_str.lower():
            parts = size_str.lower().split('x')
            return int(parts[0]), int(parts[1])
        return int(size_str), int(size_str)
    except:
        return 64, 64

def get_max_snapshots_per_tier(tier):
    if tier == 0:
        return 1
    elif tier == 1:
        return 5
    else:
        return -1 # Advanced (Ilimitado)

def process_canvas_image(r, db_conn, canvas_id, compressed_data, size_str, palette_id, owner_tier, canvas_uuid):
    try:
        raw_bytes = decompress(compressed_data)
        
        width, height = parse_size(size_str)
        expected_size = width * height
        
        if len(raw_bytes) < expected_size:
            raw_bytes += bytes([255] * (expected_size - len(raw_bytes)))
            
        img = Image.new('RGBA', (width, height), color=(255, 255, 255, 255))
        pixels = img.load()
        
        for i in range(expected_size):
            byte_val = raw_bytes[i]
            x = i % width
            y = i // width
            pixels[x, y] = get_color(palette_id, byte_val)
            
        scale_w = THUMBNAIL_MAX_SIZE / width
        scale_h = THUMBNAIL_MAX_SIZE / height
        thumb_scale = min(scale_w, scale_h, SCALE_FACTOR)
        
        thumb_width = max(1, int(width * thumb_scale))
        thumb_height = max(1, int(height * thumb_scale))

        img_thumb = img.resize((thumb_width, thumb_height), Image.NEAREST)
        
        filepath = os.path.join(THUMBNAILS_DIR, f"canvas_{canvas_id}.png")
        img_thumb.save(filepath, "PNG", optimize=True)
        
        if r.exists(f"canvas:{canvas_id}:reset_lock"):
            
            max_snapshots = get_max_snapshots_per_tier(owner_tier)
            can_save_history = True
            
            if max_snapshots != -1:
                try:
                    cursor = db_conn.cursor()
                    cursor.execute("SELECT COUNT(*) FROM canvas_snapshots_history WHERE canvas_id = %s", (canvas_id,))
                    current_count = cursor.fetchone()[0]
                    cursor.close()
                    
                    if current_count >= max_snapshots:
                        can_save_history = False
                except Exception as e:
                    print(f"[!] Error verifying snapshot quota for canvas {canvas_id}: {e}")
                    can_save_history = False 
            
            if not can_save_history:
                print(f"[-] Canvas {canvas_id} exceeded its historical snapshots limit ({max_snapshots}). Purging the oldest...")
                timelapse_src = os.path.join(TIMELAPSE_DIR, f"live_canvas_{canvas_id}.jsonl")
                if os.path.exists(timelapse_src):
                    os.remove(timelapse_src)
            else:
                scale_arch_w = ARCHIVE_MAX_SIZE / width
                scale_arch_h = ARCHIVE_MAX_SIZE / height
                arch_scale = min(scale_arch_w, scale_arch_h, SCALE_FACTOR)
                
                arch_width = max(1, int(width * arch_scale))
                arch_height = max(1, int(height * arch_scale))
                
                img_archive = img.resize((arch_width, arch_height), Image.NEAREST)

                timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                archive_filename = f"canvas_{canvas_id}_{timestamp}.png"
                
                canvas_archive_dir = os.path.join(ARCHIVE_DIR, str(canvas_uuid))
                os.makedirs(canvas_archive_dir, exist_ok=True)
                
                archive_filepath = os.path.join(canvas_archive_dir, archive_filename)
                
                img_archive.save(archive_filepath, "PNG", optimize=True)
                print(f"[+] Historical file saved successfully ({arch_width}x{arch_height}): {archive_filepath}")

                snapshot_uuid = str(uuid.uuid4())
                public_filepath = f"public/storage/snapshots_archive/{canvas_uuid}/{archive_filename}"
                
                timelapse_src = os.path.join(TIMELAPSE_DIR, f"live_canvas_{canvas_id}.jsonl")
                timelapse_dest_filename = f"snapshot_{snapshot_uuid}.jsonl"
                timelapse_dest = os.path.join(TIMELAPSE_DIR, timelapse_dest_filename)
                
                timelapse_db_path = None
                
                if os.path.exists(timelapse_src):
                    try:
                        shutil.move(timelapse_src, timelapse_dest)
                        timelapse_db_path = f"private/canvases/timelapses/{timelapse_dest_filename}"
                        print(f"[+] Timelapse successfully converted to historical: {timelapse_dest_filename}")
                    except Exception as e:
                        print(f"[!] Error moving timelapse JSONL file for canvas {canvas_id}: {e}")
                else:
                    print(f"[-] 'live_canvas' file not found for canvas {canvas_id}. Base snapshot will be saved without timelapse.")

                try:
                    cursor = db_conn.cursor()
                    insert_query = """
                        INSERT INTO canvas_snapshots_history (canvas_id, snapshot_uuid, file_path, timelapse_file_path)
                        VALUES (%s, %s, %s, %s)
                    """
                    cursor.execute(insert_query, (canvas_id, snapshot_uuid, public_filepath, timelapse_db_path))
                    db_conn.commit()
                    cursor.close()
                    print(f"[+] Historical record saved in DB with UUID: {snapshot_uuid}")
                except Exception as e:
                    print(f"[!] Error saving history to DB: {e}")

            r.set(f"canvas:{canvas_id}:snapshot_done", "1", ex=60)
            
        return True
    except Exception as e:
        print(f"[!] Error processing PNG image for canvas {canvas_id}: {e}")
        return False

def main():
    print("[*] Starting Snapshots Worker (Tiering Logic Injected)...")
    
    os.makedirs(THUMBNAILS_DIR, exist_ok=True)
    os.makedirs(ARCHIVE_DIR, exist_ok=True)
    os.makedirs(TIMELAPSE_DIR, exist_ok=True)
    
    load_palettes()
    
    try:
        r = redis.Redis(
            host=REDIS_HOST, 
            port=REDIS_PORT, 
            password=REDIS_PASS, 
            db=0, 
            decode_responses=True 
        )
        r.ping()
        print("[+] Connected to Redis successfully.")
    except Exception as e:
        print(f"[!] Could not connect to Redis: {e}")
        return

    while True:
        try:
            pending_canvases = r.smembers("canvases:pending_snapshots")
            
            if pending_canvases:
                db_conn = get_db_connection()
                if db_conn:
                    cursor = db_conn.cursor()
                    
                    for canvas_id in pending_canvases:
                        query = f"""
                            SELECT s.snapshot_data, c.size, c.palette_id, IFNULL(u.subscription_tier, 2) as tier, c.uuid
                            FROM canvas_snapshots s
                            JOIN canvases c ON s.canvas_id = c.id
                            LEFT JOIN {DB_IDENTITY_NAME}.users u ON c.owner_id = u.id
                            WHERE s.canvas_id = %s
                        """
                        cursor.execute(query, (canvas_id,))
                        result = cursor.fetchone()
                        
                        if result and result[0]:
                            snapshot_data = result[0]
                            size_str = result[1] if result[1] else '64'
                            palette_id = result[2] if result[2] else 'default'
                            owner_tier = result[3]
                            canvas_uuid = result[4]
                            
                            success = process_canvas_image(r, db_conn, canvas_id, snapshot_data, size_str, palette_id, owner_tier, canvas_uuid)
                            if success:
                                r.srem("canvases:pending_snapshots", canvas_id)
                                print(f"[+] Thumbnail/Snapshot processed: canvas_{canvas_id}.png")
                        else:
                            r.srem("canvases:pending_snapshots", canvas_id)
                            
                    cursor.close()
                    db_conn.close()
        except Exception as e:
            print(f"[!] Error in main cycle of Snapshot Worker: {e}")

        time.sleep(SYNC_INTERVAL)

if __name__ == "__main__":
    main()
