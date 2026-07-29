use crate::state::AppState;
use crate::models::{PerksConfig, PubSubSyncEvent}; 
use deadpool_redis::redis::AsyncCommands;
use sqlx::Row;
use tracing::{error, info};
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

    let query_snap = "SELECT snapshot_data FROM canvas_snapshots WHERE canvas_id = ? LIMIT 1";
    let mut raw_state = vec![0u8; expected_size];

    if let Ok(Some(row)) = sqlx::query(query_snap).bind(canvas_id).fetch_optional(&state.db_pool).await {
        if let Ok(compressed) = row.try_get::<Vec<u8>, _>("snapshot_data") {
            let mut decoder = ZlibDecoder::new(&compressed[..]);
            let mut decompressed = Vec::new();
            if decoder.read_to_end(&mut decompressed).is_ok() {
                if decompressed.len() == expected_size {
                    raw_state = decompressed;
                }
            }
        }
    }

    let _: () = redis_conn.set(&state_key, raw_state.as_slice()).await.unwrap_or(());
    info!("Successfully loaded state into Redis for canvas {} ({}x{}, {} bytes)", canvas_id, width, height, raw_state.len());
}

pub async fn send_to_client(state: &AppState, connection_id: &str, msg: &str) {
    if let Some(tx) = state.tx_channels.get(connection_id) {
        let _ = tx.send(msg.to_string()).await;
    }
}

pub async fn broadcast_to_room(state: &AppState, canvas_id: &str, msg: &str) {
    if let Some(tx) = state.room_broadcasts.get(canvas_id) {
        let _ = tx.send(msg.to_string());
    }
}

pub async fn broadcast_to_room_excluding(state: &AppState, canvas_id: &str, msg: &str, exclude_conn: &str) {
    // With tokio broadcast we can't easily exclude a specific connection at the sender level.
    // However, the standard behavior for most canvas actions is to broadcast to everyone, 
    // and the client ignores its own updates or processes them.
    // But since the frontend might expect not to receive its own pixel (to avoid double drawing or rollback),
    // we should include the exclude_conn in the broadcast message (as a meta field) 
    // or we can wrap the message so the receiver task knows whether to drop it.
    // For now, we'll prepend the exclude_conn to the message to let the receiver filter it.
    // We prefix it with `!EXC:conn_id|` to be caught by the receiver task.
    if let Some(tx) = state.room_broadcasts.get(canvas_id) {
        let wrapped_msg = format!("!EXC:{}|{}", exclude_conn, msg);
        let _ = tx.send(wrapped_msg);
    }
}

pub async fn broadcast_to_live_room(state: &AppState, code: &str, msg: &str, exclude_conn_id: Option<&str>) {
    if let Some(room) = state.live_rooms.get(code) {
        for conn_id in room.iter() {
            if Some(conn_id.key().as_str()) != exclude_conn_id {
                if let Some(tx) = state.tx_channels.get(conn_id.key()) {
                    let _ = tx.send(msg.to_string()).await;
                }
            }
        }
    }
}

pub async fn get_perks_config(state: &AppState) -> Option<PerksConfig> {
    let mut lock = state.perks_config.lock().await;
    if lock.is_none() {
        let content = include_str!("../../../public/assets/data/perks.json");
        if let Ok(config) = serde_json::from_str::<PerksConfig>(content) {
            *lock = Some(config);
        } else {
            error!("Failed to parse embedded perks.json");
        }
    }
    lock.clone()
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
        Err(_) => return,
    };
    
    let mut pubsub = match client.get_async_pubsub().await {
        Ok(c) => c,
        Err(e) => { error!("Pubsub error: {}", e); return; }
    };

    if let Err(e) = pubsub.subscribe("admin:canvas_events").await {
        error!("Failed to subscribe to admin:canvas_events: {}", e);
        return;
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
        Err(_) => return,
    };
    
    let mut pubsub = match client.get_async_pubsub().await {
        Ok(c) => c,
        Err(e) => { error!("Pubsub error: {}", e); return; }
    };

    if let Err(e) = pubsub.subscribe("canvas:sync_events").await {
        error!("Failed to subscribe to canvas:sync_events: {}", e);
        return;
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
