import mysql.connector
import os
from dotenv import load_dotenv

load_dotenv()

host = os.getenv('DB_HOST', '127.0.0.1')
port = int(os.getenv('DB_PORT', 3306))
user = os.getenv('DB_USER', 'root')
password = os.getenv('DB_PASS', '')
database = os.getenv('DB_CANVASES_NAME', 'db_canvases')

print(f"Connecting to DB {database} on {host}:{port}...")
try:
    db = mysql.connector.connect(
        host=host,
        port=port,
        user=user,
        password=password,
        database=database
    )
    cur = db.cursor()
    
    cur.execute("SHOW COLUMNS FROM canvases LIKE 'is_frozen'")
    res = cur.fetchone()
    if not res:
        print("Adding column is_frozen to canvases table...")
        cur.execute("ALTER TABLE canvases ADD COLUMN is_frozen TINYINT(1) NOT NULL DEFAULT 0")
    else:
        print("Column is_frozen already exists in canvases table.")

    print("Creating canvas_protections table if not exists...")
    cur.execute("""
        CREATE TABLE IF NOT EXISTS canvas_protections (
            id INT AUTO_INCREMENT PRIMARY KEY,
            canvas_id INT NOT NULL,
            offset INT NOT NULL,
            protected_by INT DEFAULT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY idx_cp_canvas_offset (canvas_id, offset),
            CONSTRAINT fk_cp_canvas FOREIGN KEY (canvas_id) REFERENCES canvases (id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    """)
    db.commit()
    print("DB migration completed successfully!")
    cur.close()
    db.close()
except Exception as e:
    print(f"Migration error: {e}")
