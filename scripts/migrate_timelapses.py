import os
import shutil
import mysql.connector

DB_HOST = os.getenv("DB_HOST", "db")
DB_USER = os.getenv("DB_USER", "system_web_executor")
DB_PASS = os.getenv("DB_PASS", "secret")
DB_NAME = os.getenv("DB_CANVASES_NAME", "db_canvases")
TIMELAPSE_DIR = os.getenv("TIMELAPSE_DIR", "storage/private/canvases/timelapses")

def get_db_connection():
    try:
        return mysql.connector.connect(
            host=DB_HOST,
            user=DB_USER,
            password=DB_PASS,
            database=DB_NAME
        )
    except Exception as e:
        print(f"Error connecting to MySQL: {e}")
        return None

def main():
    if not os.path.exists(TIMELAPSE_DIR):
        print("Timelapse dir not found.")
        return

    conn = get_db_connection()
    if not conn:
        return
    
    cursor = conn.cursor(dictionary=True)
    
    # Get all canvases
    cursor.execute("SELECT id, uuid FROM canvases")
    canvases = cursor.fetchall()
    canvas_map = {str(c['id']): c['uuid'] for c in canvases}
    
    # 1. Migrate live_canvas files
    print("Migrating live_canvas files...")
    # Because they might already be in {uuid}/ directory, we need to find them
    for root, dirs, files in os.walk(TIMELAPSE_DIR):
        for file in files:
            if file.startswith("live_canvas_") and file.endswith(".jsonl"):
                # If it's already in live/, skip
                if "live" in root.split(os.sep):
                    continue
                
                parts = file.replace("live_canvas_", "").replace(".jsonl", "").split("_")
                if len(parts) == 1:
                    identifier = parts[0]
                    # It could be the canvas_id (if not migrated) or canvas_uuid (if already migrated)
                    canvas_uuid = identifier if identifier not in canvas_map else canvas_map[identifier]
                    
                    # If it's a UUID, let's verify it belongs to a canvas
                    valid_uuid = False
                    for _, u in canvas_map.items():
                        if u == canvas_uuid:
                            valid_uuid = True
                            break
                            
                    if valid_uuid:
                        target_dir = os.path.join(TIMELAPSE_DIR, canvas_uuid, "live")
                        os.makedirs(target_dir, exist_ok=True)
                        
                        src = os.path.join(root, file)
                        dest = os.path.join(target_dir, f"live_canvas_{canvas_uuid}.jsonl")
                        shutil.move(src, dest)
                        print(f"Moved {file} to {canvas_uuid}/live/live_canvas_{canvas_uuid}.jsonl")
    
    # 2. Migrate snapshot files
    print("\nMigrating snapshot files...")
    cursor.execute("SELECT id, snapshot_uuid, canvas_id, timelapse_file_path FROM canvas_snapshots_history WHERE timelapse_file_path IS NOT NULL AND timelapse_file_path LIKE 'private/canvases/timelapses/%'")
    snapshots = cursor.fetchall()
    
    for snap in snapshots:
        canvas_id = str(snap['canvas_id'])
        if canvas_id in canvas_map:
            canvas_uuid = canvas_map[canvas_id]
            
            old_db_path = snap['timelapse_file_path']
            filename = os.path.basename(old_db_path)
            
            # If the path already has /snapshots/, skip DB update (but check physical file)
            if f"/{canvas_uuid}/snapshots/" in old_db_path:
                continue
                
            src = os.path.join("storage", old_db_path)
            
            if os.path.exists(src):
                target_dir = os.path.join(TIMELAPSE_DIR, canvas_uuid, "snapshots")
                os.makedirs(target_dir, exist_ok=True)
                
                dest = os.path.join(target_dir, filename)
                new_db_path = f"private/canvases/timelapses/{canvas_uuid}/snapshots/{filename}"
                
                shutil.move(src, dest)
                
                cursor.execute("UPDATE canvas_snapshots_history SET timelapse_file_path = %s WHERE id = %s", (new_db_path, snap['id']))
                print(f"Moved snapshot {filename} and updated DB to {new_db_path}")

    conn.commit()
    cursor.close()
    conn.close()
    print("Migration complete!")

if __name__ == "__main__":
    main()
