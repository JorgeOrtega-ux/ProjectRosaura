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
DB_HOST = os.getenv("DB_TELEMETRY_HOST") or "db"
DB_PORT = int(os.getenv("DB_TELEMETRY_PORT") or 3306)
DB_USER = os.getenv("DB_TELEMETRY_USER")
DB_PASS = os.getenv("DB_TELEMETRY_PASSWORD")
DB_NAME = os.getenv("DB_TELEMETRY_NAME") or "db_telemetry"

CASSANDRA_HOST = os.getenv("CASSANDRA_HOST") or "cassandra"
CASSANDRA_PORT = int(os.getenv("CASSANDRA_PORT") or 9042)
CASSANDRA_KEYSPACE = "db_telemetry_nosql"

def main():
    print("[*] Initiating Telemetry Data Migration from MySQL to Cassandra...")

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
        print("[+] Connected to MySQL telemetry database.")
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

    # 3. Setup Cassandra Keyspace, Tables and Indexes
    try:
        session.execute(f"""
            CREATE KEYSPACE IF NOT EXISTS {CASSANDRA_KEYSPACE}
            WITH replication = {{'class': 'SimpleStrategy', 'replication_factor': 1}}
        """)
        session.set_keyspace(CASSANDRA_KEYSPACE)

        session.execute("""
            CREATE TABLE IF NOT EXISTS api_latency (
                date_only text,
                created_at timestamp,
                uuid uuid,
                endpoint text,
                method text,
                status_code int,
                latency_ms float,
                user_uuid uuid,
                ip_address text,
                asn text,
                PRIMARY KEY (date_only, created_at, uuid)
            ) WITH CLUSTERING ORDER BY (created_at DESC, uuid ASC);
        """)
        session.execute("CREATE INDEX IF NOT EXISTS ON api_latency (user_uuid)")

        session.execute("""
            CREATE TABLE IF NOT EXISTS pageviews (
                date_only text,
                created_at timestamp,
                uuid uuid,
                path text,
                load_time_ms float,
                user_uuid uuid,
                session_id text,
                device_type text,
                theme_preference text,
                locale text,
                PRIMARY KEY (date_only, created_at, uuid)
            ) WITH CLUSTERING ORDER BY (created_at DESC, uuid ASC);
        """)
        session.execute("CREATE INDEX IF NOT EXISTS ON pageviews (user_uuid)")

        session.execute("""
            CREATE TABLE IF NOT EXISTS auth_events (
                date_only text,
                created_at timestamp,
                uuid uuid,
                event_type text,
                user_uuid uuid,
                ip_address text,
                asn text,
                PRIMARY KEY (date_only, created_at, uuid)
            ) WITH CLUSTERING ORDER BY (created_at DESC, uuid ASC);
        """)
        session.execute("CREATE INDEX IF NOT EXISTS ON auth_events (user_uuid)")

        session.execute("""
            CREATE TABLE IF NOT EXISTS websocket_events (
                date_only text,
                created_at timestamp,
                uuid uuid,
                event_type text,
                user_uuid uuid,
                session_id text,
                duration_s float,
                message_size_bytes int,
                error_message text,
                ip_address text,
                PRIMARY KEY (date_only, created_at, uuid)
            ) WITH CLUSTERING ORDER BY (created_at DESC, uuid ASC);
        """)
        session.execute("CREATE INDEX IF NOT EXISTS ON websocket_events (user_uuid)")

        session.execute("""
            CREATE TABLE IF NOT EXISTS system_metrics (
                date_only text,
                created_at timestamp,
                uuid uuid,
                host_name text,
                cpu_usage_pct float,
                memory_usage_bytes bigint,
                disk_usage_pct float,
                active_connections int,
                PRIMARY KEY (date_only, created_at, uuid)
            ) WITH CLUSTERING ORDER BY (created_at DESC, uuid ASC);
        """)

        session.execute("""
            CREATE TABLE IF NOT EXISTS slow_queries (
                date_only text,
                created_at timestamp,
                uuid uuid,
                db_type text,
                query_text text,
                execution_time_ms float,
                user_uuid uuid,
                PRIMARY KEY (date_only, created_at, uuid)
            ) WITH CLUSTERING ORDER BY (created_at DESC, uuid ASC);
        """)
        session.execute("CREATE INDEX IF NOT EXISTS ON slow_queries (user_uuid)")

        session.execute("""
            CREATE TABLE IF NOT EXISTS client_events (
                date_only text,
                created_at timestamp,
                uuid uuid,
                event_type text,
                url text,
                target_element text,
                error_message text,
                stack_trace text,
                user_uuid uuid,
                browser_agent text,
                PRIMARY KEY (date_only, created_at, uuid)
            ) WITH CLUSTERING ORDER BY (created_at DESC, uuid ASC);
        """)
        session.execute("CREATE INDEX IF NOT EXISTS ON client_events (user_uuid)")

        session.execute("""
            CREATE TABLE IF NOT EXISTS user_actions (
                date_only text,
                created_at timestamp,
                uuid uuid,
                user_uuid uuid,
                session_id text,
                action_category text,
                action_name text,
                target_id uuid,
                metadata text,
                ip_address text,
                PRIMARY KEY (date_only, created_at, uuid)
            ) WITH CLUSTERING ORDER BY (created_at DESC, uuid ASC);
        """)
        session.execute("CREATE INDEX IF NOT EXISTS ON user_actions (user_uuid)")

        print("[+] Cassandra keyspace, tables, and indexes verified/created.")
    except Exception as e:
        print(f"[!] Cassandra schema initialization failed: {e}")
        cluster.shutdown()
        mysql_conn.close()
        sys.exit(1)

    # 4. Migrate api_latency
    migrate_table(mysql_cursor, session, "api_latency", """
        INSERT INTO api_latency (date_only, created_at, uuid, endpoint, method, status_code, latency_ms, user_uuid, ip_address, asn)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, lambda msg, dt: (
        dt.strftime('%Y-%m-%d'),
        dt,
        uuid.uuid4(),
        msg['endpoint'],
        msg['method'],
        int(msg['status_code']),
        float(msg['latency_ms']),
        uuid.UUID(msg['user_uuid']) if msg.get('user_uuid') else None,
        msg.get('ip_address'),
        msg.get('asn')
    ))

    # 5. Migrate pageviews
    migrate_table(mysql_cursor, session, "pageviews", """
        INSERT INTO pageviews (date_only, created_at, uuid, path, load_time_ms, user_uuid, session_id, device_type, theme_preference, locale)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, lambda msg, dt: (
        dt.strftime('%Y-%m-%d'),
        dt,
        uuid.uuid4(),
        msg['path'],
        float(msg['load_time_ms']),
        uuid.UUID(msg['user_uuid']) if msg.get('user_uuid') else None,
        msg.get('session_id'),
        msg.get('device_type'),
        msg.get('theme_preference'),
        msg.get('locale')
    ))

    # 6. Migrate auth_events
    migrate_table(mysql_cursor, session, "auth_events", """
        INSERT INTO auth_events (date_only, created_at, uuid, event_type, user_uuid, ip_address, asn)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    """, lambda msg, dt: (
        dt.strftime('%Y-%m-%d'),
        dt,
        uuid.uuid4(),
        msg['event_type'],
        uuid.UUID(msg['user_uuid']) if msg.get('user_uuid') else None,
        msg.get('ip_address'),
        msg.get('asn')
    ))

    # Clean up
    mysql_cursor.close()
    mysql_conn.close()
    cluster.shutdown()
    print("[+] Migration script finished successfully.")

def migrate_table(mysql_cursor, cassandra_session, table_name, insert_cql, row_mapper):
    try:
        print(f"[*] Fetching rows from MySQL table: {table_name}...")
        mysql_cursor.execute(f"SELECT * FROM {table_name}")
        rows = mysql_cursor.fetchall()
        print(f"[+] Retrieved {len(rows)} rows from MySQL.")
    except Exception as e:
        print(f"[!] Failed to fetch {table_name} from MySQL: {e}")
        return

    if rows:
        print(f"[*] Migrating {table_name} to Cassandra...")
        insert_stmt = cassandra_session.prepare(insert_cql)
        
        batch_size = 100
        total_migrated = 0
        
        for i in range(0, len(rows), batch_size):
            chunk = rows[i:i + batch_size]
            batch = BatchStatement()
            for row in chunk:
                # Ensure created_at is datetime object
                created_at_val = row['created_at']
                if isinstance(created_at_val, str):
                    try:
                        created_at_val = datetime.strptime(created_at_val, '%Y-%m-%d %H:%M:%S')
                    except ValueError:
                        created_at_val = datetime.now()
                elif created_at_val is None:
                    created_at_val = datetime.now()

                try:
                    mapped_args = row_mapper(row, created_at_val)
                    batch.add(insert_stmt, mapped_args)
                except Exception as map_err:
                    print(f"[!] Mapping error on row ID {row.get('id')}: {map_err}")
            
            try:
                cassandra_session.execute(batch)
                total_migrated += len(chunk)
            except Exception as e:
                print(f"[!] Error inserting batch to Cassandra: {e}")
            
            if total_migrated % 500 == 0 or total_migrated == len(rows):
                print(f"[+] Migrated {total_migrated}/{len(rows)} rows...")

        print(f"[+] Migration for {table_name} completed. Total: {total_migrated} rows.")
    else:
        print(f"[*] No rows to migrate for {table_name}.")

if __name__ == "__main__":
    main()
