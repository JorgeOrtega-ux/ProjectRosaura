-- Scheme definition for Apache Cassandra
-- Keyspace 'db_identity_nosql'

CREATE KEYSPACE IF NOT EXISTS db_identity_nosql
WITH replication = {'class': 'SimpleStrategy', 'replication_factor': 1};

USE db_identity_nosql;

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
) WITH CLUSTERING ORDER BY (created_at DESC, change_id ASC);
