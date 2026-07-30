-- Scheme definition for Apache Cassandra
-- Equivalent of database: Keyspace 'db_canvases_nosql'

CREATE KEYSPACE IF NOT EXISTS db_canvases_nosql
WITH replication = {'class': 'SimpleStrategy', 'replication_factor': 1};

USE db_canvases_nosql;

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
    reply_to text,
    reply_to_username text,
    reply_to_message text,
    PRIMARY KEY (canvas_id, created_at, uuid)
) WITH CLUSTERING ORDER BY (created_at DESC, uuid ASC);

CREATE INDEX IF NOT EXISTS ON canvas_chat_messages (uuid);
CREATE INDEX IF NOT EXISTS ON canvas_chat_messages (user_id);
