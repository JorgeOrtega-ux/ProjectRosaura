use crate::state::AppState;
use deadpool_redis::redis::AsyncCommands;
use sqlx::Row;
use tracing::{error, info};
use flate2::read::ZlibDecoder;
use std::io::Read;

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
            if let Some(w) = parts.get(0) {
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
    if let Some(room) = state.rooms.get(canvas_id) {
        for conn_id in room.iter() {
            if let Some(tx) = state.tx_channels.get(conn_id.key()) {
                let _ = tx.send(msg.to_string()).await;
            }
        }
    }
}

pub async fn broadcast_to_room_excluding(state: &AppState, canvas_id: &str, msg: &str, exclude_conn: &str) {
    if let Some(room) = state.rooms.get(canvas_id) {
        for conn_id in room.iter() {
            if conn_id.key() != exclude_conn {
                if let Some(tx) = state.tx_channels.get(conn_id.key()) {
                    let _ = tx.send(msg.to_string()).await;
                }
            }
        }
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
