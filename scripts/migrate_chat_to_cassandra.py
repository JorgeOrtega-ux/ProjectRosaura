import os
import sys
import json
import uuid
import mysql.connector
from cassandra.cluster import Cluster
from cassandra.query import BatchStatement
from datetime import datetime
from dotenv import load_dotenv

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ENV_PATH = os.path.join(BASE_DIR, '.env')
load_dotenv(dotenv_path=ENV_PATH)

# DB configs
DB_HOST = os.getenv("DB_HOST") or "db"
DB_PORT = int(os.getenv("DB_PORT") or 3306)
DB_USER = os.getenv("DB_USER")
DB_PASS = os.getenv("DB_PASS")
DB_NAME = os.getenv("DB_CANVASES_NAME")

CASSANDRA_HOST = os.getenv("CASSANDRA_HOST") or "cassandra"
CASSANDRA_PORT = int(os.getenv("CASSANDRA_PORT") or 9042)
CASSANDRA_KEYSPACE = os.getenv("CASSANDRA_KEYSPACE") or "db_canvases_nosql"

def main():
    print("[*] Initiating Chat Data Migration from MySQL to Cassandra...")

    # 1. Connect to MySQL
    try:
        mysql_conn = mysql.connector.connect(
            host=DB_HOST,
            port=DB_PORT,
            user=DB_USER,
            password=DB_PASS,
            database=DB_NAME
        )
        mysql_cursor = mysql_conn.cursor(dictionary=True)
        print("[+] Connected to MySQL database.")
    except Exception as e:
        print(f"[!] MySQL connection failed: {e}")
        sys.exit(1)

    # 2. Connect to Cassandra
    try:
        cluster = Cluster([CASSANDRA_HOST], port=CASSANDRA_PORT, connect_timeout=15)
        session = cluster.connect()
        print("[+] Connected to Cassandra.")
    except Exception as e:
        print(f"[!] Cassandra connection failed: {e}")
        mysql_conn.close()
        sys.exit(1)

    # 3. Setup Cassandra Keyspace and Table
    try:
        session.execute(f"""
            CREATE KEYSPACE IF NOT EXISTS {CASSANDRA_KEYSPACE}
            WITH replication = {{'class': 'SimpleStrategy', 'replication_factor': 1}}
        """)
        session.set_keyspace(CASSANDRA_KEYSPACE)
        session.execute("""
            CREATE TABLE IF NOT EXISTS canvas_chat_messages (
                canvas_id int,
                created_at timestamp,
                uuid text,
                user_id int,
                message text,
                attachments text,
                file_size bigint,
                visibility text,
                deleted_by text,
                delete_reason text,
                PRIMARY KEY (canvas_id, created_at, uuid)
            ) WITH CLUSTERING ORDER BY (created_at DESC, uuid ASC)
        """)
        session.execute("CREATE INDEX IF NOT EXISTS ON canvas_chat_messages (uuid)")
        session.execute("CREATE INDEX IF NOT EXISTS ON canvas_chat_messages (user_id)")
        print("[+] Cassandra keyspace, table, and indexes verified/created.")
    except Exception as e:
        print(f"[!] Cassandra schema initialization failed: {e}")
        cluster.shutdown()
        mysql_conn.close()
        sys.exit(1)

    # 4. Fetch all messages from MySQL
    try:
        print("[*] Fetching messages from MySQL...")
        mysql_cursor.execute("SELECT id, uuid, canvas_id, user_id, message, attachments, file_size, visibility, deleted_by, delete_reason, created_at FROM canvas_chat_messages")
        mysql_messages = mysql_cursor.fetchall()
        print(f"[+] Retrieved {len(mysql_messages)} messages from MySQL.")
    except Exception as e:
        print(f"[!] Failed to fetch messages from MySQL: {e}")
        cluster.shutdown()
        mysql_conn.close()
        sys.exit(1)

    # 5. Insert messages into Cassandra in batches
    if mysql_messages:
        print("[*] Migrating messages to Cassandra...")
        insert_stmt = session.prepare("""
            INSERT INTO canvas_chat_messages (canvas_id, created_at, uuid, user_id, message, attachments, file_size, visibility, deleted_by, delete_reason)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """)
        
        batch_size = 100
        total_migrated = 0
        
        # Build mapping for report migration
        id_to_uuid_map = {}
        
        for i in range(0, len(mysql_messages), batch_size):
            chunk = mysql_messages[i:i + batch_size]
            batch = BatchStatement()
            for msg in chunk:
                # Store mapping
                id_to_uuid_map[msg['id']] = msg['uuid']
                
                # Check attachments formats
                attachments_val = msg['attachments']
                if attachments_val is not None:
                    if not isinstance(attachments_val, str):
                        attachments_val = json.dumps(attachments_val)

                # Ensure created_at is datetime object
                created_at_val = msg['created_at']
                if isinstance(created_at_val, str):
                    try:
                        created_at_val = datetime.strptime(created_at_val, '%Y-%m-%d %H:%M:%S')
                    except ValueError:
                        created_at_val = datetime.now()
                elif created_at_val is None:
                    created_at_val = datetime.now()

                batch.add(insert_stmt, (
                    int(msg['canvas_id']),
                    created_at_val,
                    msg['uuid'],
                    int(msg['user_id']),
                    msg['message'],
                    attachments_val,
                    int(msg['file_size'] or 0),
                    msg['visibility'] or 'visible',
                    msg['deleted_by'],
                    msg['delete_reason']
                ))
            
            try:
                session.execute(batch)
                total_migrated += len(chunk)
                print(f"[+] Migrated {total_migrated}/{len(mysql_messages)} messages...")
            except Exception as e:
                print(f"[!] Error inserting batch to Cassandra: {e}")

        print(f"[+] Migration to Cassandra completed. Total: {total_migrated} messages.")

        # 6. Migrate Reports Table in MySQL
        try:
            print("[*] Checking canvas_chat_reports table in MySQL...")
            mysql_cursor.execute("ALTER TABLE canvas_chat_reports MODIFY COLUMN message_id VARCHAR(36) NOT NULL")
            mysql_conn.commit()
            print("[+] Modified canvas_chat_reports.message_id type to VARCHAR(36).")
            
            mysql_cursor.execute("SELECT id, message_id FROM canvas_chat_reports")
            reports = mysql_cursor.fetchall()
            
            updated_reports = 0
            for rep in reports:
                old_msg_id = rep['message_id']
                if str(old_msg_id).isdigit():
                    old_msg_id_int = int(old_msg_id)
                    if old_msg_id_int in id_to_uuid_map:
                        new_uuid = id_to_uuid_map[old_msg_id_int]
                        mysql_cursor.execute(
                            "UPDATE canvas_chat_reports SET message_id = %s WHERE id = %s",
                            (new_uuid, rep['id'])
                        )
                        updated_reports += 1
            mysql_conn.commit()
            print(f"[+] Updated {updated_reports} historic reports in MySQL to point to message UUIDs.")
        except Exception as e:
            print(f"[!] Error updating canvas_chat_reports in MySQL: {e}")
            mysql_conn.rollback()

    else:
        print("[*] No messages to migrate from MySQL.")

    # Clean up
    mysql_cursor.close()
    mysql_conn.close()
    cluster.shutdown()
    print("[+] Migration script finished successfully.")

if __name__ == "__main__":
    main()
