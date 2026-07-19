import os
import mysql.connector

try:
    print("Connecting to DB...")
    db = mysql.connector.connect(
        host='db',
        user=os.getenv('DB_USER', 'system_web_executor'),
        password=os.getenv('DB_PASS', 'secret'),
        database=os.getenv('DB_CANVASES_NAME', 'db_canvases')
    )
    cursor = db.cursor()
    print("Executing CREATE TABLE...")
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
    db.commit()
    print("Table canvas_infinite_chunks created successfully!")
except Exception as e:
    print(f"Error: {e}")
