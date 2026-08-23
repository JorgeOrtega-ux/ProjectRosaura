-- Scheme definition for Apache Cassandra
-- Keyspace 'db_canvases_nosql'

CREATE KEYSPACE IF NOT EXISTS db_canvases_nosql
WITH replication = {'class': 'SimpleStrategy', 'replication_factor': 1};

USE db_canvases_nosql;

CREATE TABLE IF NOT EXISTS canvas_pixel_history (
    canvas_id int,
    x int,
    y int,
    placed_at timestamp,
    user_id int,
    color_hex text,
    PRIMARY KEY ((canvas_id, x, y), placed_at)
) WITH CLUSTERING ORDER BY (placed_at DESC);

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

CREATE TABLE IF NOT EXISTS canvas_chat_reactions (
    canvas_id int,
    message_id text,
    emoji text,
    user_id int,
    created_at timestamp,
    PRIMARY KEY ((canvas_id, message_id), emoji, user_id)
);

CREATE INDEX IF NOT EXISTS ON canvas_chat_reactions (user_id);
