import os
import sys
import uuid
from datetime import datetime
from cassandra.cluster import Cluster
from dotenv import load_dotenv

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
ENV_PATH = os.path.join(BASE_DIR, '.env')
load_dotenv(dotenv_path=ENV_PATH)

CASSANDRA_PORT = int(os.getenv("CASSANDRA_PORT") or 9042)
CASSANDRA_KEYSPACE = "db_telemetry_nosql"

def main():
    print("[*] Starting Cassandra Telemetry Verification Script...")
    
    hosts_to_try = [os.getenv("CASSANDRA_HOST") or "cassandra", "127.0.0.1"]
    session = None
    cluster = None
    connected = False
    
    for host in hosts_to_try:
        print(f"[*] Trying to connect to Cassandra on {host}:{CASSANDRA_PORT}...")
        try:
            cluster = Cluster([host], port=CASSANDRA_PORT, connect_timeout=5)
            session = cluster.connect()
            print(f"[+] Connected to Cassandra on {host}.")
            connected = True
            break
        except Exception as e:
            print(f"[-] Connection failed to {host}: {e}")
            
    if not connected:
        print("[!] Error: Could not connect to Cassandra.")
        sys.exit(1)
        
    try:
        # Create Keyspace if not exists
        session.execute(f"""
            CREATE KEYSPACE IF NOT EXISTS {CASSANDRA_KEYSPACE}
            WITH replication = {{'class': 'SimpleStrategy', 'replication_factor': 1}}
        """)
        session.set_keyspace(CASSANDRA_KEYSPACE)
        
        # Verify/create all tables and indexes
        tables_to_create = {
            'websocket_events': """
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
            """,
            'system_metrics': """
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
            """,
            'slow_queries': """
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
            """,
            'client_events': """
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
            """,
            'user_actions': """
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
            """
        }
        
        for name, query in tables_to_create.items():
            print(f"[*] Creating/verifying table '{name}'...")
            session.execute(query)
            if name != 'system_metrics':
                session.execute(f"CREATE INDEX IF NOT EXISTS ON {name} (user_uuid)")
                
        print("[+] All tables verified/created successfully.")
        
        # Insert test data
        now = datetime.now()
        date_only = now.strftime('%Y-%m-%d')
        user_uuid = uuid.uuid4()
        
        print("[*] Inserting mock telemetry data...")
        
        # Websocket
        ws_stmt = session.prepare("""
            INSERT INTO websocket_events (date_only, created_at, uuid, event_type, user_uuid, session_id, duration_s, message_size_bytes, error_message, ip_address)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """)
        session.execute(ws_stmt, (date_only, now, uuid.uuid4(), 'connect', user_uuid, 'sess_123', None, None, None, '192.168.1.50'))
        session.execute(ws_stmt, (date_only, now, uuid.uuid4(), 'message_sent', user_uuid, 'sess_123', 0.05, 256, None, '192.168.1.50'))
        
        # System metrics
        sys_stmt = session.prepare("""
            INSERT INTO system_metrics (date_only, created_at, uuid, host_name, cpu_usage_pct, memory_usage_bytes, disk_usage_pct, active_connections)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """)
        session.execute(sys_stmt, (date_only, now, uuid.uuid4(), 'server-prod-01', 34.5, 8589934592, 65.2, 120))
        
        # Slow queries
        slow_stmt = session.prepare("""
            INSERT INTO slow_queries (date_only, created_at, uuid, db_type, query_text, execution_time_ms, user_uuid)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """)
        session.execute(slow_stmt, (date_only, now, uuid.uuid4(), 'mysql', 'SELECT * FROM canvas_elements WHERE canvas_uuid = ?', 320.5, user_uuid))
        
        # Client events
        client_stmt = session.prepare("""
            INSERT INTO client_events (date_only, created_at, uuid, event_type, url, target_element, error_message, stack_trace, user_uuid, browser_agent)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """)
        session.execute(client_stmt, (date_only, now, uuid.uuid4(), 'js_error', 'http://localhost/canvas/123', None, 'TypeError: Cannot read properties of undefined', 'at Canvas.render (canvas.js:45)', user_uuid, 'Mozilla/5.0 Chrome/124.0.0'))
        
        # User actions
        action_stmt = session.prepare("""
            INSERT INTO user_actions (date_only, created_at, uuid, user_uuid, session_id, action_category, action_name, target_id, metadata, ip_address)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """)
        session.execute(action_stmt, (date_only, now, uuid.uuid4(), user_uuid, 'sess_123', 'canvas', 'zoom', uuid.uuid4(), '{"zoom_level": 2.5, "duration_ms": 400}', '192.168.1.50'))
        session.execute(action_stmt, (date_only, now, uuid.uuid4(), user_uuid, 'sess_123', 'canvas', 'create', uuid.uuid4(), '{"template_used": "blank"}', '192.168.1.50'))
        session.execute(action_stmt, (date_only, now, uuid.uuid4(), user_uuid, 'sess_123', 'admin', 'role_change', uuid.uuid4(), '{"old_role": "member", "new_role": "moderator"}', '192.168.1.50'))
        
        print("[+] Mock data inserted successfully.")
        print(f"[!] Test User UUID: {user_uuid}")
        
    except Exception as e:
        print(f"[!] Error executing CQL commands: {e}")
    finally:
        cluster.shutdown()
        print("[*] Cassandra connection closed.")

if __name__ == '__main__':
    main()
