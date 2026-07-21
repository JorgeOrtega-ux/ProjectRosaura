import os
import mysql.connector

DB_HOST = os.getenv("DB_HOST", "localhost")
DB_USER = os.getenv("DB_USER", "root")
DB_PASS = os.getenv("DB_PASS", "")
DB_CANVASES = os.getenv("DB_CANVASES_NAME", "db_canvases")

def run_migration():
    try:
        conn = mysql.connector.connect(
            host=DB_HOST,
            user=DB_USER,
            password=DB_PASS,
            database=DB_CANVASES
        )
        cursor = conn.cursor()
        print(f"[*] Connected to MySQL ({DB_CANVASES})")

        # Check existing columns
        cursor.execute("SHOW COLUMNS FROM canvases")
        cols = [row[0] for row in cursor.fetchall()]

        if "total_pixels" not in cols:
            print("[+] Adding column total_pixels to canvases table...")
            cursor.execute("ALTER TABLE canvases ADD COLUMN total_pixels BIGINT(20) NOT NULL DEFAULT 0 AFTER members_count")
        
        if "total_messages" not in cols:
            print("[+] Adding column total_messages to canvases table...")
            cursor.execute("ALTER TABLE canvases ADD COLUMN total_messages BIGINT(20) NOT NULL DEFAULT 0 AFTER total_pixels")

        # Backfill total_messages count from canvas_chat_messages
        print("[+] Backfilling total_messages count in canvases table...")
        cursor.execute("""
            UPDATE canvases c 
            SET total_messages = (
                SELECT COUNT(*) FROM canvas_chat_messages WHERE canvas_id = c.id
            )
        """)
        conn.commit()
        print("[*] Migration completed successfully!")

        cursor.close()
        conn.close()
    except Exception as e:
        print(f"[!] Migration notice: {e}")

if __name__ == "__main__":
    run_migration()
