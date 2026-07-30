-- Scheme definition for Apache Cassandra
-- Keyspace 'db_telemetry_nosql'

CREATE KEYSPACE IF NOT EXISTS db_telemetry_nosql
WITH replication = {'class': 'SimpleStrategy', 'replication_factor': 1};

USE db_telemetry_nosql;

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

CREATE INDEX IF NOT EXISTS ON api_latency (user_uuid);

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

CREATE INDEX IF NOT EXISTS ON pageviews (user_uuid);

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

CREATE INDEX IF NOT EXISTS ON auth_events (user_uuid);

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

CREATE INDEX IF NOT EXISTS ON websocket_events (user_uuid);

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

CREATE INDEX IF NOT EXISTS ON slow_queries (user_uuid);

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

CREATE INDEX IF NOT EXISTS ON client_events (user_uuid);

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

CREATE INDEX IF NOT EXISTS ON user_actions (user_uuid);
