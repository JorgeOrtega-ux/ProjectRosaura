use tracing::{info, warn, error};
use crate::models::WsMessage;
use crate::state::AppState;
use crate::helpers;
use crate::db;
use std::time::{SystemTime, UNIX_EPOCH};
use deadpool_redis::redis::AsyncCommands;

pub async fn get_user_cooldown(state: &AppState, canvas_id: &str, user_id: &str, config_batch: i32, config_sec: i32) -> (f64, f64) {
    let mut redis_conn = match state.redis_pool.get().await {
        Ok(c) => c,
        Err(_) => return (config_batch as f64, 0.0),
    };
    let user_key = format!("canvas:{}:user:{}:cooldown", canvas_id, user_id);
    let now = SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_secs_f64();

    let u_state: std::collections::HashMap<String, String> = redis_conn.hgetall(&user_key).await.unwrap_or_default();
    
    let mut balance = config_batch as f64;
    let mut last_t = now;

    if !u_state.is_empty() {
        balance = u_state.get("b").and_then(|v| v.parse::<f64>().ok()).unwrap_or(config_batch as f64);
        last_t = u_state.get("t").and_then(|v| v.parse::<f64>().ok()).unwrap_or(now);
        let old_mb = u_state.get("mb").and_then(|v| v.parse::<f64>().ok()).unwrap_or(balance);
        if old_mb > 0.0 && old_mb < config_batch as f64 && balance >= old_mb {
            balance = config_batch as f64;
        }
    }

    if config_sec > 0 {
        let elapsed = now - last_t;
        let replenish = (elapsed / config_sec as f64).floor();
        if replenish > 0.0 {
            balance = (balance + replenish).min(config_batch as f64);
            last_t += replenish * (config_sec as f64);
        }
    }

    if balance >= config_batch as f64 {
        balance = config_batch as f64;
        last_t = now;
    }

    let _: () = redis_conn.hset_multiple(&user_key, &[
        ("b", balance.to_string()),
        ("t", last_t.to_string()),
        ("mb", config_batch.to_string()),
    ]).await.unwrap_or(());

    (balance, last_t)
}

pub async fn handle_action(msg: WsMessage, canvas_id: &str, connection_id: &str, state: &AppState) {
    let client_meta = state.ws_meta.get(connection_id).map(|m| m.clone());
    let user_id = client_meta.as_ref().and_then(|m| m.user_id.clone());
    
    // We only process if user_id is SOME, otherwise it's a guest without paint rights (usually handled in specific events)
    let uid_str = user_id.clone().unwrap_or_else(|| "".to_string());
    
    match msg.msg_type.as_str() {
        "init" => {
            helpers::ensure_canvas_state_loaded(state, canvas_id).await;
            
            let (config_batch, config_sec, _, _) = db::get_canvas_config_from_db(&state.db_pool, canvas_id).await.unwrap_or((5, 10, false, 64));
            
            let mut balance = config_batch as f64;
            let mut next_in = 0.0;
            
            if !uid_str.is_empty() {
                let (b, last_t) = get_user_cooldown(state, canvas_id, &uid_str, config_batch, config_sec).await;
                balance = b;
                if config_sec > 0 && balance < config_batch as f64 {
                    let now = SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_secs_f64();
                    next_in = (config_sec as f64 - (now - last_t)).max(0.0);
                }
            }
            
            let res = serde_json::json!({
                "type": "init_cooldown",
                "node_id": "rust_node",
                "balance": balance as i32,
                "max_batch": config_batch,
                "cooldown_sec": config_sec,
                "next_replenish_in": next_in
            });
            helpers::send_to_client(state, connection_id, &res.to_string()).await;
            info!("Processed INIT for canvas {}, user {}, balance {}", canvas_id, uid_str, balance);
        }
        "pixel" | "erase_pixel" => {
            let x = msg.x.unwrap_or(0);
            let y = msg.y.unwrap_or(0);
            let mut width = msg.width.unwrap_or(64);
            
            let raw_color = msg.color.clone().unwrap_or_else(|| "transparent".to_string());
            let mut color_bytes = vec![0u8, 0, 0, 0];
            let mut color_hex = "transparent".to_string();
            
            if raw_color.starts_with('#') && raw_color.len() == 7 {
                if let (Ok(r), Ok(g), Ok(b)) = (
                    u8::from_str_radix(&raw_color[1..3], 16),
                    u8::from_str_radix(&raw_color[3..5], 16),
                    u8::from_str_radix(&raw_color[5..7], 16)
                ) {
                    color_bytes = vec![r, g, b, 255];
                    color_hex = raw_color.to_lowercase();
                }
            }
            
            if uid_str.is_empty() {
                warn!("Painting attempt by unidentified user.");
                return;
            }

            let (config_batch, config_sec, is_premium_locked, board_w) = db::get_canvas_config_from_db(&state.db_pool, canvas_id).await.unwrap_or((5, 10, false, 64));
            if board_w > 0 { width = board_w; }
            
            if is_premium_locked {
                return;
            }

            let byte_offset = ((y * width) + x) * 4;
            let offset_str = if width == 0 { format!("{},{}", x, y) } else { ((y * width) + x).to_string() };
            
            let now_t = SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_secs_f64();
            
            let mut redis_conn = match state.redis_pool.get().await {
                Ok(c) => c,
                Err(_) => return,
            };

            let keys = vec![
                format!("canvas:{}:state", canvas_id),
                format!("canvas:{}:protected_pixels:{}", canvas_id, offset_str),
                format!("canvas:{}:user:{}:cooldown", canvas_id, uid_str),
                format!("canvas:{}:stream", canvas_id),
            ];

            let args = vec![
                byte_offset.to_string(),
                String::from_utf8_lossy(&color_bytes).to_string(), // In real rust, use binary safe args
                config_batch.to_string(),
                config_sec.to_string(),
                now_t.to_string(),
                uid_str.clone(),
                x.to_string(),
                y.to_string(),
                color_hex.clone(),
            ];

            let script = deadpool_redis::redis::Script::new(crate::lua_scripts::PAINT_PIXEL_LUA);
            let result: Result<Vec<String>, _> = script.key(keys[0].clone()).key(keys[1].clone()).key(keys[2].clone()).key(keys[3].clone())
                .arg(args[0].clone()).arg(color_bytes).arg(args[2].clone()).arg(args[3].clone()).arg(args[4].clone()).arg(args[5].clone()).arg(args[6].clone()).arg(args[7].clone()).arg(args[8].clone())
                .invoke_async(&mut redis_conn).await;
            
            match result {
                Ok(res) if !res.is_empty() => {
                    if res[0] == "OK" {
                        info!("User {} painted pixel at {},{} with {}", uid_str, x, y, color_hex);
                        let confirm = serde_json::json!({
                            "type": "pixel_confirm",
                            "x": x,
                            "y": y,
                            "color": color_hex
                        });
                        helpers::send_to_client(state, connection_id, &confirm.to_string()).await;
                        let broadcast_msg = serde_json::json!({
                            "type": msg.msg_type,
                            "x": x,
                            "y": y,
                            "color": raw_color
                        }).to_string();
                        helpers::broadcast_to_room_excluding(state, canvas_id, &broadcast_msg, connection_id).await;
                        
                        let _: () = redis_conn.sadd("canvases:dirty_states", canvas_id).await.unwrap_or(());
                        let sync_payload = serde_json::json!({
                            "source_node": "rust_node",
                            "target_type": "canvas",
                            "canvas_id": canvas_id,
                            "payload": broadcast_msg
                        });
                        let _: () = redis_conn.publish("canvas:sync_events", sync_payload.to_string()).await.unwrap_or(());
                    } else if res[0] == "COOLDOWN_ERROR" {
                        warn!("User {} hit cooldown", uid_str);
                        let err = serde_json::json!({"type": "cooldown_error"});
                        helpers::send_to_client(state, connection_id, &err.to_string()).await;
                    }
                }
                _ => error!("Lua script execution failed for pixel"),
            }
        }
        "batch_pixels" | "batch_erase_pixels" => {
            if uid_str.is_empty() { return; }
            let pixels = match &msg.pixels {
                Some(p) => p,
                None => return,
            };
            
            let raw_color = msg.color.clone().unwrap_or_else(|| "transparent".to_string());
            let mut color_bytes = vec![0u8, 0, 0, 0];
            let mut color_hex = "transparent".to_string();
            
            if raw_color.starts_with('#') && raw_color.len() == 7 {
                if let (Ok(r), Ok(g), Ok(b)) = (
                    u8::from_str_radix(&raw_color[1..3], 16),
                    u8::from_str_radix(&raw_color[3..5], 16),
                    u8::from_str_radix(&raw_color[5..7], 16),
                ) {
                    color_bytes = vec![r, g, b, 255];
                    color_hex = raw_color.to_lowercase();
                }
            } else if raw_color != "transparent" {
                return;
            }

            let (config_batch, config_sec, is_premium_locked, board_w) = db::get_canvas_config_from_db(&state.db_pool, canvas_id).await.unwrap_or((5, 10, false, 64));
            let width = if board_w > 0 { board_w } else { msg.width.unwrap_or(64) };
            if is_premium_locked { return; }

            let mut redis_conn = match state.redis_pool.get().await {
                Ok(c) => c, Err(_) => return,
            };

            let now_t = SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_secs_f64();
            let script = deadpool_redis::redis::Script::new(crate::lua_scripts::PAINT_PIXEL_LUA);

            for px in pixels {
                let x = px.x;
                let y = px.y;
                let byte_offset = ((y * width) + x) * 4;
                let offset_str = if width == 0 { format!("{},{}", x, y) } else { ((y * width) + x).to_string() };
                
                let keys = vec![
                    format!("canvas:{}:state", canvas_id),
                    format!("canvas:{}:protected_pixels:{}", canvas_id, offset_str),
                    format!("canvas:{}:user:{}:cooldown", canvas_id, uid_str),
                    format!("canvas:{}:stream", canvas_id),
                ];
                let args = vec![
                    byte_offset.to_string(),
                    String::from_utf8_lossy(&color_bytes).to_string(),
                    config_batch.to_string(),
                    config_sec.to_string(),
                    now_t.to_string(),
                    uid_str.clone(),
                    x.to_string(),
                    y.to_string(),
                    color_hex.clone(),
                ];

                let _: Result<Vec<String>, _> = script.key(keys[0].clone()).key(keys[1].clone()).key(keys[2].clone()).key(keys[3].clone())
                    .arg(args[0].clone()).arg(color_bytes.clone()).arg(args[2].clone()).arg(args[3].clone()).arg(args[4].clone()).arg(args[5].clone()).arg(args[6].clone()).arg(args[7].clone()).arg(args[8].clone())
                    .invoke_async(&mut redis_conn).await;
            }

            let broadcast_msg = serde_json::json!({
                "type": msg.msg_type,
                "pixels": pixels,
                "color": raw_color
            }).to_string();
            helpers::broadcast_to_room_excluding(state, canvas_id, &broadcast_msg, connection_id).await;

            let _: () = redis_conn.sadd("canvases:dirty_states", canvas_id).await.unwrap_or(());
            let sync_payload = serde_json::json!({
                "source_node": "rust_node",
                "target_type": "canvas",
                "canvas_id": canvas_id,
                "payload": broadcast_msg
            });
            let _: () = redis_conn.publish("canvas:sync_events", sync_payload.to_string()).await.unwrap_or(());
        }
        "bomb_pixel" => {
            let x = msg.x.unwrap_or(0);
            let y = msg.y.unwrap_or(0);
            let perk_id = msg.perk_id.unwrap_or_else(|| "bomb_small".to_string());
            let radius = match perk_id.as_str() { "bomb_small" => 1, "bomb_medium" => 2, "bomb_large" => 3, _ => 1 };
            
            info!("User {} detonated {} at {},{} with radius {}", uid_str, perk_id, x, y, radius);
            // Reducción del inventario y loop the pixeles
            let confirm = serde_json::json!({"type": "bomb_pixel_confirm", "x": x, "y": y, "radius": radius});
            helpers::send_to_client(state, connection_id, &confirm.to_string()).await;
            helpers::broadcast_to_room(state, canvas_id, &confirm.to_string()).await;
        }
        "clear_area" => {
            let x1 = msg.x1.unwrap_or(0);
            let y1 = msg.y1.unwrap_or(0);
            let x2 = msg.x2.unwrap_or(0);
            let y2 = msg.y2.unwrap_or(0);
            let width = msg.width.unwrap_or(64);

            if uid_str.is_empty() { return; }
            if !db::check_is_canvas_owner(&state.db_pool, &uid_str, canvas_id).await { return; }

            let min_x = std::cmp::min(x1, x2).max(0);
            let max_x = std::cmp::max(x1, x2).min(width - 1);
            let min_y = std::cmp::min(y1, y2).max(0);
            let max_y = std::cmp::max(y1, y2).min(width - 1);
            
            helpers::ensure_canvas_state_loaded(state, canvas_id).await;

            let mut redis_conn = match state.redis_pool.get().await {
                Ok(c) => c,
                Err(_) => return,
            };

            // Fast Bulk Redis Update using pipeline
            let redis_state_key = format!("canvas:{}:state", canvas_id);
            let mut pipe = deadpool_redis::redis::pipe();
            
            if min_x == 0 && max_x == width - 1 {
                let start_byte_offset = (min_y * width) * 4;
                let count = (max_x - min_x + 1) * (max_y - min_y + 1);
                let total_bytes = (count * 4) as usize;
                let transparent_bytes = vec![0u8; total_bytes];
                pipe.cmd("SETRANGE").arg(&redis_state_key).arg(start_byte_offset).arg(transparent_bytes);
            } else {
                let row_len = max_x - min_x + 1;
                let row_transparent_bytes = vec![0u8; (row_len * 4) as usize];
                for cur_y in min_y..=max_y {
                    let start_byte_offset = (cur_y * width + min_x) * 4;
                    pipe.cmd("SETRANGE").arg(&redis_state_key).arg(start_byte_offset).arg(&row_transparent_bytes);
                }
            }
            
            pipe.cmd("SADD").arg("canvases:dirty_states").arg(canvas_id);
            let _: () = pipe.query_async(&mut redis_conn).await.unwrap_or(());

            let b_msg = serde_json::json!({
                "type": "canvas_clear_completed",
                "canvas_id": canvas_id,
                "x1": min_x, "y1": min_y, "x2": max_x, "y2": max_y
            });
            helpers::broadcast_to_room(state, canvas_id, &b_msg.to_string()).await;
            info!("User {} executed CLEAR_AREA for canvas {}: ({},{}) to ({},{})", uid_str, canvas_id, min_x, min_y, max_x, max_y);
        }
        "join_live_share" => {
            if let Some(code) = msg.code.clone() {
                state.live_rooms.entry(code.clone()).or_default().insert(connection_id.to_string());
                info!("User {} joined live share {}", uid_str, code);
            }
        }
        "update_live_share" => {
            if let Some(code) = msg.code.clone() {
                if let Ok(raw_msg) = serde_json::to_string(&msg) {
                    helpers::broadcast_to_live_room(state, &code, &raw_msg, Some(connection_id)).await;
                }
            }
        }
        "end_live_share" => {
            if let Some(code) = msg.code.clone() {
                if let Some(mut room) = state.live_rooms.get_mut(&code) {
                    room.remove(connection_id);
                }
                if let Ok(raw_msg) = serde_json::to_string(&msg) {
                    helpers::broadcast_to_live_room(state, &code, &raw_msg, Some(connection_id)).await;
                }
            }
        }
        "chat_typing" => {
            if let Ok(raw_msg) = serde_json::to_string(&msg) {
                helpers::broadcast_to_room(state, canvas_id, &raw_msg).await;
            }
        }
        _ => {
            warn!("Unhandled action: {}", msg.msg_type);
        }
    }
}
