import os
import sys
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
DB_NAME = os.getenv("DB_IDENTITY_NAME") or "db_identity"

CASSANDRA_HOST = os.getenv("CASSANDRA_HOST") or "cassandra"
CASSANDRA_PORT = int(os.getenv("CASSANDRA_PORT") or 9042)
CASSANDRA_KEYSPACE = "db_identity_nosql"

def main():
    print("[*] Initiating Profile Changes Log Migration from MySQL to Cassandra...")

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
            CREATE TABLE IF NOT EXISTS profile_changes_log (
                user_id int,
                created_at timestamp,
                change_id text,
                change_type text,
                old_value text,
                new_value text,
                ip_address text,
                asn text,
                PRIMARY KEY (user_id, created_at, change_id)
            ) WITH CLUSTERING ORDER BY (created_at DESC, change_id ASC)
        """)
        print("[+] Cassandra keyspace, table, and indexes verified/created.")
    except Exception as e:
        print(f"[!] Cassandra schema initialization failed: {e}")
        cluster.shutdown()
        mysql_conn.close()
        sys.exit(1)

    # 4. Fetch all logs from MySQL
    try:
        print("[*] Fetching profile changes log from MySQL...")
        mysql_cursor.execute("SELECT id, user_id, change_type, old_value, new_value, ip_address, asn, created_at FROM profile_changes_log")
        mysql_logs = mysql_cursor.fetchall()
        print(f"[+] Retrieved {len(mysql_logs)} logs from MySQL.")
    except Exception as e:
        print(f"[!] Failed to fetch logs from MySQL: {e}")
        cluster.shutdown()
        mysql_conn.close()
        sys.exit(1)

    # 5. Insert logs into Cassandra in batches
    if mysql_logs:
        print("[*] Migrating logs to Cassandra...")
        insert_stmt = session.prepare("""
            INSERT INTO profile_changes_log (user_id, created_at, change_id, change_type, old_value, new_value, ip_address, asn)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """)
        
        batch_size = 100
        total_migrated = 0
        
        for i in range(0, len(mysql_logs), batch_size):
            chunk = mysql_logs[i:i + batch_size]
            batch = BatchStatement()
            for log in chunk:
                # Ensure created_at is datetime object
                created_at_val = log['created_at']
                if isinstance(created_at_val, str):
                    try:
                        created_at_val = datetime.strptime(created_at_val, '%Y-%m-%d %H:%M:%S')
                    except ValueError:
                        created_at_val = datetime.now()
                elif created_at_val is None:
                    created_at_val = datetime.now()

                # Generate a safe change_id string (UUID)
                change_id_val = str(uuid.uuid4())

                batch.add(insert_stmt, (
                    int(log['user_id']),
                    created_at_val,
                    change_id_val,
                    log['change_type'],
                    log['old_value'],
                    log['new_value'],
                    log['ip_address'],
                    log['asn']
                ))
            
            try:
                session.execute(batch)
                total_migrated += len(chunk)
                print(f"[+] Migrated {total_migrated}/{len(mysql_logs)} profile changes...")
            except Exception as e:
                print(f"[!] Error inserting batch to Cassandra: {e}")

        print(f"[+] Migration to Cassandra completed. Total: {total_migrated} logs.")
    else:
        print("[*] No logs to migrate from MySQL.")

    # Clean up
    mysql_cursor.close()
    mysql_conn.close()
    cluster.shutdown()
    print("[+] Migration script finished successfully.")

if __name__ == "__main__":
    main()
