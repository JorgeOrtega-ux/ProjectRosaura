use crate::state::{AppState, OutboundMessage};
use deadpool_redis::redis::AsyncCommands;
use sqlx::Row;
use tracing::{error, info, warn};
use flate2::read::ZlibDecoder;
use std::io::Read;
use std::time::Duration;
use tokio::time::sleep;
use futures::StreamExt;

pub async fn ensure_canvas_state_loaded(state: &AppState, canvas_id: &str) {
    let mut redis_conn = match state.redis_pool.get().await {
        Ok(c) => c,
        Err(_) => return,
    };

    let state_key = format!("canvas:{}:state", canvas_id);
    let exists: bool = redis_conn.exists(&state_key).await.unwrap_or(false);
    if exists {
        return;
    }

    let query_size = "SELECT size FROM canvases WHERE id = ?";
    let mut width = 64;
    let mut height = 64;

    if let Ok(Some(row)) = sqlx::query(query_size).bind(canvas_id).fetch_optional(&state.db_pool).await {
        if let Ok(size_str) = row.try_get::<String, _>("size") {
            let parts: Vec<&str> = size_str.split('x').collect();
            if let Some(w) = parts.first() {
                if let Ok(w_int) = w.parse::<i32>() {
                    width = w_int;
                    height = w_int;
                }
            }
            if let Some(h) = parts.get(1) {
                if let Ok(h_int) = h.parse::<i32>() {
                    height = h_int;
                }
            }
        }
    }

    let expected_size = (width * height * 4) as usize;

    let query_snap = "SELECT s3_key, snapshot_data FROM canvas_snapshots WHERE canvas_id = ? LIMIT 1";
    let mut raw_state = vec![0u8; expected_size];

    if let Ok(Some(row)) = sqlx::query(query_snap).bind(canvas_id).fetch_optional(&state.db_pool).await {
        let mut loaded_from_s3 = false;
        
        if let Ok(Some(s3_key)) = row.try_get::<Option<String>, _>("s3_key") {
            if !s3_key.is_empty() {
                let mut s3_endpoint = std::env::var("AWS_ENDPOINT").unwrap_or_else(|_| "http://minio:9000".to_string());
                if !s3_endpoint.starts_with("http://") && !s3_endpoint.starts_with("https://") {
                    s3_endpoint = format!("http://{}", s3_endpoint);
                }
                let s3_bucket = std::env::var("AWS_BUCKET").unwrap_or_else(|_| "rosaura-storage".to_string());
                let url = format!("{}/{}/{}", s3_endpoint.trim_end_matches('/'), s3_bucket, s3_key.trim_start_matches('/'));
                
                if let Ok(resp) = reqwest::get(&url).await {
                    if resp.status().is_success() {
                        if let Ok(compressed) = resp.bytes().await {
                            let mut decoder = ZlibDecoder::new(&compressed[..]);
                            let mut decompressed = Vec::new();
                            if decoder.read_to_end(&mut decompressed).is_ok() {
                                if decompressed.len() == expected_size {
                                    raw_state = decompressed;
                                    loaded_from_s3 = true;
                                    info!("Loaded active snapshot from S3 successfully for canvas {} using key {}", canvas_id, s3_key);
                                }
                            }
                        }
                    }
                }
            }
        }

        if !loaded_from_s3 {
            if let Ok(Some(compressed)) = row.try_get::<Option<Vec<u8>>, _>("snapshot_data") {
                let mut decoder = ZlibDecoder::new(&compressed[..]);
                let mut decompressed = Vec::new();
                if decoder.read_to_end(&mut decompressed).is_ok() {
                    if decompressed.len() == expected_size {
                        raw_state = decompressed;
                        info!("Loaded active snapshot from MySQL blob fallback for canvas {}", canvas_id);
                    }
                }
            }
        }
    }

    let _: () = redis_conn.set(&state_key, raw_state.as_slice()).await.unwrap_or(());
    info!("Successfully loaded state into Redis for canvas {} ({}x{}, {} bytes)", canvas_id, width, height, raw_state.len());
}

pub async fn send_to_client(state: &AppState, connection_id: &str, msg: &str) {
    if let Some(tx) = state.tx_channels.get(connection_id) {
        let _ = tx.send(OutboundMessage::Text {
            payload: msg.to_string(),
            exclude_connection: None,
        }).await;
    }
}

pub async fn send_binary_to_client(state: &AppState, connection_id: &str, bin: Vec<u8>) {
    if let Some(tx) = state.tx_channels.get(connection_id) {
        let _ = tx.send(OutboundMessage::Binary {
            payload: bin,
            exclude_connection: None,
        }).await;
    }
}

pub async fn broadcast_to_room(state: &AppState, canvas_id: &str, msg: &str) {
    if let Some(tx) = state.room_broadcasts.get(canvas_id) {
        let _ = tx.send(OutboundMessage::Text {
            payload: msg.to_string(),
            exclude_connection: None,
        });
    }
}

pub async fn broadcast_binary_to_room(state: &AppState, canvas_id: &str, bin: Vec<u8>) {
    if let Some(tx) = state.room_broadcasts.get(canvas_id) {
        let _ = tx.send(OutboundMessage::Binary {
            payload: bin,
            exclude_connection: None,
        });
    }
}

pub async fn broadcast_to_room_excluding(state: &AppState, canvas_id: &str, msg: &str, exclude_conn: &str) {
    if let Some(tx) = state.room_broadcasts.get(canvas_id) {
        let _ = tx.send(OutboundMessage::Text {
            payload: msg.to_string(),
            exclude_connection: Some(exclude_conn.to_string()),
        });
    }
}

pub async fn broadcast_binary_to_room_excluding(state: &AppState, canvas_id: &str, bin: Vec<u8>, exclude_conn: &str) {
    if let Some(tx) = state.room_broadcasts.get(canvas_id) {
        let _ = tx.send(OutboundMessage::Binary {
            payload: bin,
            exclude_connection: Some(exclude_conn.to_string()),
        });
    }
}

pub async fn broadcast_to_live_room(state: &AppState, code: &str, msg: &str, exclude_conn_id: Option<&str>) {
    if let Some(room) = state.live_rooms.get(code) {
        for conn_id in room.iter() {
            if Some(conn_id.key().as_str()) != exclude_conn_id {
                if let Some(tx) = state.tx_channels.get(conn_id.key()) {
                    let _ = tx.send(OutboundMessage::Text {
                        payload: msg.to_string(),
                        exclude_connection: None,
                    }).await;
                }
            }
        }
    }
}


pub async fn admin_events_listener(state: AppState) {
    let redis_url = format!(
        "redis://:{}@{}:{}",
        std::env::var("REDIS_PASS").unwrap_or_default(),
        std::env::var("REDIS_HOST").unwrap_or_else(|_| "127.0.0.1".to_string()),
        std::env::var("REDIS_PORT").unwrap_or_else(|_| "6379".to_string())
    );
    let client = match deadpool_redis::redis::Client::open(redis_url) {
        Ok(c) => c,
        Err(e) => {
            error!("Failed to open Redis client for admin_events_listener: {}", e);
            return;
        }
    };
    
    loop {
        let mut pubsub = match client.get_async_pubsub().await {
            Ok(c) => c,
            Err(e) => {
                error!("Pubsub error in admin_events_listener (retrying in 2s): {}", e);
                sleep(Duration::from_secs(2)).await;
                continue;
            }
        };

        if let Err(e) = pubsub.subscribe("admin:canvas_events").await {
            error!("Failed to subscribe to admin:canvas_events (retrying in 2s): {}", e);
            sleep(Duration::from_secs(2)).await;
            continue;
        }
        info!("WS Server listening for administrative events on 'admin:canvas_events'");

        let mut stream = pubsub.on_message();
        while let Some(msg) = stream.next().await {
            if let Ok(payload) = msg.get_payload::<String>() {
                if let Ok(event) = serde_json::from_str::<serde_json::Value>(&payload) {
                    if let Some(canvas_id_val) = event.get("canvas_id") {
                        let canvas_id = if canvas_id_val.is_number() {
                            canvas_id_val.as_i64().unwrap().to_string()
                        } else if canvas_id_val.is_string() {
                            canvas_id_val.as_str().unwrap().to_string()
                        } else {
                            continue;
                        };
                        broadcast_to_room(&state, &canvas_id, &payload).await;
                    }
                }
            }
        }
        warn!("Admin events stream closed, reconnecting in 2s...");
        sleep(Duration::from_secs(2)).await;
    }
}

pub async fn sync_events_listener(state: AppState) {
    let redis_url = format!(
        "redis://:{}@{}:{}",
        std::env::var("REDIS_PASS").unwrap_or_default(),
        std::env::var("REDIS_HOST").unwrap_or_else(|_| "127.0.0.1".to_string()),
        std::env::var("REDIS_PORT").unwrap_or_else(|_| "6379".to_string())
    );
    let client = match deadpool_redis::redis::Client::open(redis_url) {
        Ok(c) => c,
        Err(e) => {
            error!("Failed to open Redis client for sync_events_listener: {}", e);
            return;
        }
    };
    
    loop {
        let mut pubsub = match client.get_async_pubsub().await {
            Ok(c) => c,
            Err(e) => {
                error!("Pubsub error in sync_events_listener (retrying in 2s): {}", e);
                sleep(Duration::from_secs(2)).await;
                continue;
            }
        };

        if let Err(e) = pubsub.subscribe("canvas:sync_events").await {
            error!("Failed to subscribe to canvas:sync_events (retrying in 2s): {}", e);
            sleep(Duration::from_secs(2)).await;
            continue;
        }
        info!("WS Server listening for global sync events on 'canvas:sync_events'");

        let mut stream = pubsub.on_message();
        while let Some(msg) = stream.next().await {
            if let Ok(payload) = msg.get_payload::<String>() {
                if let Ok(event) = serde_json::from_str::<serde_json::Value>(&payload) {
                    if event.get("source_node").and_then(|v| v.as_str()) == Some(state.node_id.as_str()) {
                        continue;
                    }
                    
                    if let (Some(t_type), Some(p)) = (event.get("target_type").and_then(|v| v.as_str()), event.get("payload").and_then(|v| v.as_str())) {
                        if t_type == "canvas" {
                            if let Some(c_id_val) = event.get("canvas_id") {
                                let c_id = if c_id_val.is_number() { c_id_val.as_i64().unwrap().to_string() } else { c_id_val.as_str().unwrap().to_string() };
                                broadcast_to_room(&state, &c_id, p).await;
                            }
                        } else if t_type == "live" {
                            if let Some(code) = event.get("code").and_then(|v| v.as_str()) {
                                broadcast_to_live_room(&state, code, p, None).await;
                            }
                        }
                    }
                }
            }
        }
        warn!("Sync events stream closed, reconnecting in 2s...");
        sleep(Duration::from_secs(2)).await;
    }
}

pub async fn sync_online_counts(state: AppState) {
    info!("WS Server starting live player counter synchronization to Redis.");
    loop {
        sleep(Duration::from_secs(5)).await;
        
        let mut conn = match state.redis_pool.get().await {
            Ok(c) => c,
            Err(_) => continue,
        };
        
        let mut counts = std::collections::HashMap::new();
        for room in state.rooms.iter() {
            let c = room.value().len();
            if c > 0 {
                counts.insert(room.key().clone(), c.to_string());
            }
        }
        
        let mut pipe = deadpool_redis::redis::pipe();
        pipe.cmd("DEL").arg("canvas:online_counts");
        
        if !counts.is_empty() {
            let mut hset = pipe.cmd("HSET").arg("canvas:online_counts");
            for (k, v) in counts {
                hset = hset.arg(k).arg(v);
            }
        }
        
        let _: () = pipe.query_async(&mut conn).await.unwrap_or(());
    }
}

pub async fn notifications_events_listener(state: AppState) {
    let redis_url = format!(
        "redis://:{}@{}:{}",
        std::env::var("REDIS_PASS").unwrap_or_default(),
        std::env::var("REDIS_HOST").unwrap_or_else(|_| "127.0.0.1".to_string()),
        std::env::var("REDIS_PORT").unwrap_or_else(|_| "6379".to_string())
    );
    let client = match deadpool_redis::redis::Client::open(redis_url) {
        Ok(c) => c,
        Err(e) => {
            error!("Failed to open Redis client for notifications_events_listener: {}", e);
            return;
        }
    };
    
    loop {
        let mut pubsub = match client.get_async_pubsub().await {
            Ok(c) => c,
            Err(e) => {
                error!("Pubsub error in notifications_events_listener (retrying in 2s): {}", e);
                sleep(Duration::from_secs(2)).await;
                continue;
            }
        };

        if let Err(e) = pubsub.subscribe("system_notifications").await {
            error!("Failed to subscribe to system_notifications (retrying in 2s): {}", e);
            sleep(Duration::from_secs(2)).await;
            continue;
        }
        info!("WS Server listening for notification events on 'system_notifications'");

        let mut stream = pubsub.on_message();
        while let Some(msg) = stream.next().await {
            if let Ok(payload) = msg.get_payload::<String>() {
                if let Ok(event) = serde_json::from_str::<serde_json::Value>(&payload) {
                    let target_user_id = if let Some(u_val) = event.get("user_id") {
                        if u_val.is_number() {
                            u_val.as_i64().unwrap().to_string()
                        } else if u_val.is_string() {
                            u_val.as_str().unwrap().to_string()
                        } else {
                            continue;
                        }
                    } else {
                        continue;
                    };

                    // Forward to all connections belonging to this user
                    for meta_entry in state.ws_meta.iter() {
                        if let Some(conn_user_id) = &meta_entry.value().user_id {
                            if conn_user_id == &target_user_id {
                                send_to_client(&state, meta_entry.key(), &payload).await;
                            }
                        }
                    }
                }
            }
        }
        warn!("Notification events stream closed, reconnecting in 2s...");
        sleep(Duration::from_secs(2)).await;
    }
}

pub fn is_guest(uid_str: &str) -> bool {
    uid_str.is_empty() || uid_str == "guest"
}

