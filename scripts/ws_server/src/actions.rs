use tracing::warn;
use crate::models::WsMessage;
use crate::state::AppState;
use crate::helpers;
use crate::db;
use std::time::{SystemTime, UNIX_EPOCH, Duration};
use deadpool_redis::redis::AsyncCommands;
use tokio::time::sleep;

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

pub async fn check_owner_ratelimit(state: &AppState, canvas_id: &str, user_id: &str) -> bool {
    if let Ok(mut c) = state.redis_pool.get().await {
        let key = format!("canvas:{}:user:{}:owner_ratelimit", canvas_id, user_id);
        let res: deadpool_redis::redis::RedisResult<Option<String>> = deadpool_redis::redis::cmd("SET")
            .arg(&key).arg("1").arg("EX").arg(1).arg("NX")
            .query_async(&mut c).await;
        match res {
            Ok(Some(_)) => return true,
            Ok(None) => return false,
            Err(_) => return true,
        }
    }
    true
}

pub async fn handle_action(msg: WsMessage, canvas_id: &str, connection_id: &str, state: &AppState) {
    let client_meta = state.ws_meta.get(connection_id).map(|m| m.clone());
    let user_id = client_meta.as_ref().and_then(|m| m.user_id.clone());
    let uid_str = user_id.clone().unwrap_or_else(|| "".to_string());
    
    match msg.msg_type.as_str() {
        "init" => {
            helpers::ensure_canvas_state_loaded(state, canvas_id).await;
            
            let (config_batch, config_sec, _, _, _) = db::get_canvas_config_from_db(&state.db_pool, canvas_id).await.unwrap_or((5, 10, false, 64, 64));
            
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
                "node_id": &state.node_id,
                "balance": balance as i32,
                "max_batch": config_batch,
                "cooldown_sec": config_sec,
                "next_replenish_in": next_in
            });
            helpers::send_to_client(state, connection_id, &res.to_string()).await;
            
            // Check freeze status
            let mut redis_conn = match state.redis_pool.get().await {
                Ok(c) => c, Err(_) => return,
            };
            let freeze_key = format!("canvas:{}:freeze_lock", canvas_id);
            let is_frozen_exists: bool = redis_conn.exists(&freeze_key).await.unwrap_or(false);
            let mut is_frozen = false;
            
            if !is_frozen_exists {
                if db::get_canvas_frozen_db(&state.db_pool, canvas_id).await {
                    let _: () = redis_conn.set(&freeze_key, "1").await.unwrap_or(());
                    is_frozen = true;
                }
            } else {
                is_frozen = true;
            }
            
            let fr_msg = serde_json::json!({
                "type": "canvas_freeze_changed",
                "canvas_id": canvas_id,
                "frozen": is_frozen
            });
            helpers::send_to_client(state, connection_id, &fr_msg.to_string()).await;
            
            // Load protected pixels
            let zset_key = format!("canvas:{}:protected_zset", canvas_id);
            let current_time = SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_secs() as i64;
            let _: () = redis_conn.zrembyscore(&zset_key, 0, current_time).await.unwrap_or(());
            
            let protected_offsets: Vec<String> = redis_conn.zrange(&zset_key, 0, -1).await.unwrap_or_default();
            let mut protected_offsets_int: Vec<i32> = vec![];
            
            if protected_offsets.is_empty() {
                let db_offsets = db::get_canvas_protections_db(&state.db_pool, canvas_id).await;
                if !db_offsets.is_empty() {
                    let far_future_expiry = current_time + 3153600000;
                    let mut pipe = deadpool_redis::redis::pipe();
                    for &off in &db_offsets {
                        let pk = format!("canvas:{}:protected_pixels:{}", canvas_id, off);
                        pipe.cmd("SET").arg(&pk).arg("admin");
                        pipe.cmd("ZADD").arg(&zset_key).arg(far_future_expiry).arg(off.to_string());
                    }
                    let _: () = pipe.query_async(&mut redis_conn).await.unwrap_or(());
                    protected_offsets_int = db_offsets;
                }
            } else {
                protected_offsets_int = protected_offsets.iter().filter_map(|s| s.parse::<i32>().ok()).collect();
            }
            
            if !protected_offsets_int.is_empty() {
                let prot_msg = serde_json::json!({
                    "type": "init_protected_pixels",
                    "offsets": protected_offsets_int
                });
                helpers::send_to_client(state, connection_id, &prot_msg.to_string()).await;
            }
        }
        "join_live_share" => {
            if let Some(code) = msg.code.clone() {
                let is_new = state.live_rooms.entry(code.clone()).or_default().insert(connection_id.to_string());
                
                if is_new {
                    if let Ok(mut c) = state.redis_pool.get().await {
                        let redis_key = format!("live_share:{}:count", code);
                        let _: () = c.incr(&redis_key, 1).await.unwrap_or(());
                        let _: () = c.expire(&redis_key, 14400).await.unwrap_or(());
                        
                        let global_count: i64 = c.get(&redis_key).await.unwrap_or(1);
                        
                        let count_msg = serde_json::json!({
                            "type": "live_share_count",
                            "code": code,
                            "count": global_count
                        }).to_string();
                        
                        helpers::broadcast_to_live_room(state, &code, &count_msg, None).await;
                        let sync_payload = serde_json::json!({
                            "source_node": &state.node_id,
                            "target_type": "live",
                            "code": code,
                            "payload": count_msg
                        });
                        let _: () = c.publish("canvas:sync_events", sync_payload.to_string()).await.unwrap_or(());
                    }
                }
            }
        }
        "leave_live_share" => {
            if let Some(code) = msg.code.clone() {
                let mut removed = false;
                if let Some(mut room) = state.live_rooms.get_mut(&code) {
                    removed = room.remove(&connection_id.to_string()).is_some();
                }
                
                if removed {
                    if let Ok(mut c) = state.redis_pool.get().await {
                        let redis_key = format!("live_share:{}:count", code);
                        let global_count: i64 = c.decr(&redis_key, 1).await.unwrap_or(0);
                        let global_count = global_count.max(0);
                        
                        let count_msg = serde_json::json!({
                            "type": "live_share_count",
                            "code": code,
                            "count": global_count
                        }).to_string();
                        
                        helpers::broadcast_to_live_room(state, &code, &count_msg, None).await;
                        let sync_payload = serde_json::json!({
                            "source_node": &state.node_id,
                            "target_type": "live",
                            "code": code,
                            "payload": count_msg
                        });
                        let _: () = c.publish("canvas:sync_events", sync_payload.to_string()).await.unwrap_or(());
                    }
                }
            }
        }
        "update_live_share" => {
            if let Some(code) = msg.code.clone() {
                if let Some(existing_task) = state.grace_sessions.get(&code) {
                    existing_task.abort();
                    drop(existing_task);
                    state.grace_sessions.remove(&code);
                }
                
                if !state.owner_conns.contains_key(connection_id) {
                    state.owner_conns.insert(connection_id.to_string(), code.clone());
                }
                
                if let Ok(mut c) = state.redis_pool.get().await {
                    let redis_key = format!("live_share:{}", code);
                    let existing_data_str: Option<String> = c.get(&redis_key).await.unwrap_or(None);
                    
                    let mut data = if let Some(s) = existing_data_str {
                        serde_json::from_str::<serde_json::Value>(&s).unwrap_or(serde_json::json!({}))
                    } else {
                        serde_json::json!({})
                    };
                    
                    if let Some(true) = msg.empty {
                        data["empty"] = serde_json::json!(true);
                    } else {
                        data["empty"] = serde_json::json!(false);
                        if let Some(img) = &msg.img_url { data["img_url"] = serde_json::json!(img); }
                        if let Some(x) = msg.x { data["x"] = serde_json::json!(x); }
                        if let Some(y) = msg.y { data["y"] = serde_json::json!(y); }
                        if let Some(w) = msg.w { data["w"] = serde_json::json!(w); }
                        if let Some(h) = msg.h { data["h"] = serde_json::json!(h); }
                        if let Some(op) = msg.opacity { data["opacity"] = serde_json::json!(op); }
                        if let Some(an) = msg.angle { data["angle"] = serde_json::json!(an); }
                    }
                    
                    let _: () = c.set(&redis_key, data.to_string()).await.unwrap_or(());
                }
                
                let b_msg = serde_json::json!({
                    "type": "live_image_updated",
                    "code": code,
                    "empty": msg.empty,
                    "img_url": msg.img_url,
                    "x": msg.x, "y": msg.y, "w": msg.w, "h": msg.h,
                    "opacity": msg.opacity, "angle": msg.angle
                }).to_string();
                
                helpers::broadcast_to_live_room(state, &code, &b_msg, Some(connection_id)).await;
                
                if let Ok(mut c) = state.redis_pool.get().await {
                    let sync_payload = serde_json::json!({
                        "source_node": &state.node_id,
                        "target_type": "live",
                        "code": code,
                        "payload": b_msg
                    });
                    let _: () = c.publish("canvas:sync_events", sync_payload.to_string()).await.unwrap_or(());
                }
            }
        }
        "end_live_share" => {
            if let Some(code) = msg.code.clone() {
                if let Some(existing_task) = state.grace_sessions.get(&code) {
                    existing_task.abort();
                    drop(existing_task);
                    state.grace_sessions.remove(&code);
                }
                
                let end_msg = serde_json::json!({
                    "type": "live_session_ended",
                    "code": code
                }).to_string();
                
                helpers::broadcast_to_live_room(state, &code, &end_msg, Some(connection_id)).await;
                
                if let Some(room) = state.live_rooms.get_mut(&code) {
                    room.remove(connection_id);
                }
                state.live_rooms.remove(&code);
                state.owner_conns.remove(connection_id);
                
                if let Ok(mut c) = state.redis_pool.get().await {
                    let _: () = c.del(format!("live_share:{}", code)).await.unwrap_or(());
                    let _: () = c.del(format!("live_share:{}:count", code)).await.unwrap_or(());
                    if !uid_str.is_empty() {
                        let _: () = c.del(format!("live_share:user_{}", uid_str)).await.unwrap_or(());
                    }
                    let sync_payload = serde_json::json!({
                        "source_node": &state.node_id,
                        "target_type": "live",
                        "code": code,
                        "payload": end_msg
                    });
                    let _: () = c.publish("canvas:sync_events", sync_payload.to_string()).await.unwrap_or(());
                }
            }
        }
        "toggle_freeze" => {
            if uid_str.is_empty() { return; }
            if !check_owner_ratelimit(state, canvas_id, &uid_str).await { return; }
            if !db::check_is_canvas_owner(&state.db_pool, &uid_str, canvas_id).await { return; }
            
            let frozen = msg.frozen.unwrap_or(false);
            let freeze_key = format!("canvas:{}:freeze_lock", canvas_id);
            
            if let Ok(mut c) = state.redis_pool.get().await {
                if frozen {
                    let _: () = c.set(&freeze_key, "1").await.unwrap_or(());
                } else {
                    let _: () = c.del(&freeze_key).await.unwrap_or(());
                }
            }
            
            db::set_canvas_frozen_db(&state.db_pool, canvas_id, frozen).await;
            
            let b_msg = serde_json::json!({
                "type": "canvas_freeze_changed",
                "canvas_id": canvas_id,
                "frozen": frozen
            }).to_string();
            helpers::broadcast_to_room(state, canvas_id, &b_msg).await;
            
            if let Ok(mut c) = state.redis_pool.get().await {
                let sync_payload = serde_json::json!({
                    "source_node": &state.node_id, "target_type": "canvas", "canvas_id": canvas_id, "payload": b_msg
                });
                let _: () = c.publish("canvas:sync_events", sync_payload.to_string()).await.unwrap_or(());
            }
        }
        "protect_area" => {
            if uid_str.is_empty() { return; }
            if !check_owner_ratelimit(state, canvas_id, &uid_str).await { return; }
            if !db::check_is_canvas_owner(&state.db_pool, &uid_str, canvas_id).await { return; }
            
            let x1 = msg.x1.unwrap_or(0);
            let y1 = msg.y1.unwrap_or(0);
            let x2 = msg.x2.unwrap_or(0);
            let y2 = msg.y2.unwrap_or(0);
            let protect = msg.protect.unwrap_or(true);
            
            // Securely load canvas dimensions from DB instead of trusting client input
            let (_, _, _, db_width, db_height) = db::get_canvas_config_from_db(&state.db_pool, canvas_id).await.unwrap_or((5, 10, false, 64, 64));
            
            let min_x = std::cmp::min(x1, x2).max(0);
            let max_x = std::cmp::max(x1, x2).min(db_width - 1);
            let min_y = std::cmp::min(y1, y2).max(0);
            let max_y = std::cmp::max(y1, y2).min(db_height - 1);
            
            let mut affected_offsets = Vec::new();
            for iy in min_y..=max_y {
                for ix in min_x..=max_x {
                    affected_offsets.push(iy * db_width + ix);
                }
            }
            
            let areas_key = format!("canvas:{}:protected_areas", canvas_id);
            
            if let Ok(mut c) = state.redis_pool.get().await {
                let areas_json: String = deadpool_redis::redis::AsyncCommands::get(&mut c, &areas_key).await.unwrap_or_else(|_| "[]".to_string());
                let mut areas: Vec<serde_json::Value> = serde_json::from_str(&areas_json).unwrap_or_default();
                
                if protect {
                    areas.push(serde_json::json!({"x1": min_x, "y1": min_y, "x2": max_x, "y2": max_y}));
                } else {
                    // Remove any area that intersects to simulate unprotect
                    areas.retain(|a| {
                        let ax1 = a["x1"].as_i64().unwrap_or(0) as i32;
                        let ay1 = a["y1"].as_i64().unwrap_or(0) as i32;
                        let ax2 = a["x2"].as_i64().unwrap_or(0) as i32;
                        let ay2 = a["y2"].as_i64().unwrap_or(0) as i32;
                        let intersect = !(ax2 < min_x || ax1 > max_x || ay2 < min_y || ay1 > max_y);
                        !intersect
                    });
                }
                
                let new_json = serde_json::to_string(&areas).unwrap_or_else(|_| "[]".to_string());
                let _: () = deadpool_redis::redis::AsyncCommands::set(&mut c, &areas_key, new_json).await.unwrap_or(());
                
                // Keep Redis protected_zset and protected_pixels:{offset} in sync!
                let current_time = SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_secs() as i64;
                let far_future_expiry = current_time + 3153600000;
                let zset_key = format!("canvas:{}:protected_zset", canvas_id);
                
                let mut pipe = deadpool_redis::redis::pipe();
                for &offset in &affected_offsets {
                    let pk = format!("canvas:{}:protected_pixels:{}", canvas_id, offset);
                    if protect {
                        pipe.cmd("SET").arg(&pk).arg("admin");
                        pipe.cmd("ZADD").arg(&zset_key).arg(far_future_expiry).arg(offset.to_string());
                    } else {
                        pipe.cmd("DEL").arg(&pk);
                        pipe.cmd("ZREM").arg(&zset_key).arg(offset.to_string());
                    }
                }
                let _: () = pipe.query_async(&mut c).await.unwrap_or(());
            }
            
            if !affected_offsets.is_empty() {
                db::save_canvas_protections_db(&state.db_pool, canvas_id, &affected_offsets, protect, Some(&uid_str)).await;
            }
            
            let b_msg = serde_json::json!({
                "type": "area_protection_changed",
                "canvas_id": canvas_id,
                "x1": min_x, "y1": min_y, "x2": max_x, "y2": max_y,
                "protect": protect, "width": db_width
            }).to_string();
            helpers::broadcast_to_room(state, canvas_id, &b_msg).await;
            
            if let Ok(mut c) = state.redis_pool.get().await {
                let sync_payload = serde_json::json!({
                    "source_node": &state.node_id, "target_type": "canvas", "canvas_id": canvas_id, "payload": b_msg
                });
                let _: () = c.publish("canvas:sync_events", sync_payload.to_string()).await.unwrap_or(());
            }
        }
        "clear_area" => {
            let x1 = msg.x1.unwrap_or(0);
            let y1 = msg.y1.unwrap_or(0);
            let x2 = msg.x2.unwrap_or(0);
            let y2 = msg.y2.unwrap_or(0);
            let width = msg.width.unwrap_or(64);

            if uid_str.is_empty() { return; }
            if !check_owner_ratelimit(state, canvas_id, &uid_str).await { return; }
            if !db::check_is_canvas_owner(&state.db_pool, &uid_str, canvas_id).await { return; }

            let min_x = std::cmp::min(x1, x2).max(0);
            let max_x = std::cmp::max(x1, x2).min(width - 1);
            let min_y = std::cmp::min(y1, y2).max(0);
            let max_y = std::cmp::max(y1, y2).min(width - 1);
            let count = (max_x - min_x + 1) * (max_y - min_y + 1);
            
            let lock_msg = serde_json::json!({
                "type": "canvas_locked_clear", "canvas_id": canvas_id
            }).to_string();
            helpers::broadcast_to_room(state, canvas_id, &lock_msg).await;
            
            helpers::ensure_canvas_state_loaded(state, canvas_id).await;

            let mut redis_conn = match state.redis_pool.get().await {
                Ok(c) => c,
                Err(_) => return,
            };

            let areas_key = format!("canvas:{}:protected_areas", canvas_id);
            let areas_json: String = deadpool_redis::redis::AsyncCommands::get(&mut redis_conn, &areas_key).await.unwrap_or_else(|_| "[]".to_string());
            let mut areas: Vec<serde_json::Value> = serde_json::from_str(&areas_json).unwrap_or_default();
            
            let original_len = areas.len();
            areas.retain(|a| {
                let ax1 = a["x1"].as_i64().unwrap_or(0) as i32;
                let ay1 = a["y1"].as_i64().unwrap_or(0) as i32;
                let ax2 = a["x2"].as_i64().unwrap_or(0) as i32;
                let ay2 = a["y2"].as_i64().unwrap_or(0) as i32;
                let intersect = !(ax2 < min_x || ax1 > max_x || ay2 < min_y || ay1 > max_y);
                !intersect
            });
            
            if areas.len() != original_len {
                let new_json = serde_json::to_string(&areas).unwrap_or_else(|_| "[]".to_string());
                let _: () = deadpool_redis::redis::AsyncCommands::set(&mut redis_conn, &areas_key, new_json).await.unwrap_or(());
            }

            let redis_state_key = format!("canvas:{}:state", canvas_id);
            let mut pipe = deadpool_redis::redis::pipe();
            
            if min_x == 0 && max_x == width - 1 {
                let start_byte_offset = (min_y * width) * 4;
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
            }).to_string();
            helpers::broadcast_to_room(state, canvas_id, &b_msg).await;
            
            let sync_payload = serde_json::json!({
                "source_node": &state.node_id, "target_type": "canvas", "canvas_id": canvas_id, "payload": b_msg
            });
            let _: () = redis_conn.publish("canvas:sync_events", sync_payload.to_string()).await.unwrap_or(());
            
            let _: () = redis_conn.xadd(format!("canvas:{}:stream", canvas_id), "*", &[
                ("type", "canvas_clear_area"),
                ("x1", &min_x.to_string()), ("y1", &min_y.to_string()),
                ("x2", &max_x.to_string()), ("y2", &max_y.to_string())
            ]).await.unwrap_or(());
        }
        "pixel" | "erase_pixel" | "batch_pixels" | "batch_erase_pixels" => {
            if uid_str.is_empty() { return; }
            
            let mut redis_conn = match state.redis_pool.get().await {
                Ok(c) => c, Err(_) => return,
            };
            
            // Check locks
            let lock_key = format!("canvas:{}:reset_lock", canvas_id);
            let resize_lock_key = format!("canvas:{}:resize_lock", canvas_id);
            let inject_lock_key = format!("canvas:{}:inject_lock", canvas_id);
            let freeze_lock_key = format!("canvas:{}:freeze_lock", canvas_id);
            
            let is_locked: bool = redis_conn.exists(&lock_key).await.unwrap_or(false);
            let is_resize_locked: bool = redis_conn.exists(&resize_lock_key).await.unwrap_or(false);
            let is_inject_locked: bool = redis_conn.exists(&inject_lock_key).await.unwrap_or(false);
            let is_frozen: bool = redis_conn.exists(&freeze_lock_key).await.unwrap_or(false);
            
            if is_locked || is_resize_locked || is_inject_locked {
                let err = serde_json::json!({"type": "canvas_locked_error"}).to_string();
                helpers::send_to_client(state, connection_id, &err).await;
                return;
            }
            
            if is_frozen {
                if !db::check_is_canvas_owner(&state.db_pool, &uid_str, canvas_id).await {
                    let err = serde_json::json!({"type": "canvas_frozen_error", "message": "El lienzo está congelado por el administrador"}).to_string();
                    helpers::send_to_client(state, connection_id, &err).await;
                    return;
                }
            }

            let (config_batch, config_sec, is_premium_locked, board_w, _) = db::get_canvas_config_from_db(&state.db_pool, canvas_id).await.unwrap_or((5, 10, false, 64, 64));
            if is_premium_locked {
                let err = serde_json::json!({"type": "canvas_locked_error"}).to_string();
                helpers::send_to_client(state, connection_id, &err).await;
                return;
            }

            let is_batch = msg.msg_type.starts_with("batch");
            
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
            } else if raw_color != "transparent" {
                return;
            }
            
            let width = if board_w > 0 { board_w } else { msg.width.unwrap_or(64) };
            
            let mut pixels_to_process = Vec::new();
            if is_batch {
                if let Some(p) = &msg.pixels { pixels_to_process = p.clone(); }
            } else {
                pixels_to_process.push(crate::models::PixelData { x: msg.x.unwrap_or(0), y: msg.y.unwrap_or(0) });
            }
            
            if pixels_to_process.is_empty() { return; }

            helpers::ensure_canvas_state_loaded(state, canvas_id).await;
            
            let now_t = SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_secs_f64();
            let script = deadpool_redis::redis::Script::new(crate::lua_scripts::PAINT_PIXEL_LUA);
            let _ = deadpool_redis::redis::AsyncCommands::script_load(&mut redis_conn, crate::lua_scripts::PAINT_PIXEL_LUA).await.unwrap_or_default();
            let hash = script.get_hash();

            let mut pipe = deadpool_redis::redis::pipe();
            
            for px in &pixels_to_process {
                let byte_offset = ((px.y * width) + px.x) * 4;
                let keys = vec![
                    format!("canvas:{}:state", canvas_id),
                    format!("canvas:{}:protected_areas", canvas_id),
                    format!("canvas:{}:user:{}:cooldown", canvas_id, uid_str),
                    format!("canvas:{}:stream", canvas_id),
                ];
                let args = vec![
                    byte_offset.to_string(),
                    "".to_string(), // unused placeholder for color_bytes
                    config_batch.to_string(),
                    config_sec.to_string(),
                    now_t.to_string(),
                    uid_str.clone(),
                    px.x.to_string(),
                    px.y.to_string(),
                    color_hex.clone(),
                ];

                pipe.cmd("EVALSHA").arg(hash).arg(4)
                    .arg(&keys[0]).arg(&keys[1]).arg(&keys[2]).arg(&keys[3])
                    .arg(&args[0]).arg(&color_bytes).arg(&args[2]).arg(&args[3])
                    .arg(&args[4]).arg(&args[5]).arg(&args[6]).arg(&args[7]).arg(&args[8]);
            }
            
            let results: Vec<Vec<String>> = pipe.query_async(&mut redis_conn).await.unwrap_or_default();
            
            // For a single pixel or batch we check the last result to report cooldown/protection errors to the user.
            // Actually, we could inspect all results, but generally if they batch-paint and one hits cooldown, others will too.
            if let Some(r) = results.last() {
                if !r.is_empty() {
                    if r[0] == "OK" && !is_batch {
                        let confirm = serde_json::json!({
                            "type": "pixel_confirm",
                            "balance": r.get(1).and_then(|s| s.parse::<f64>().ok()).unwrap_or(0.0) as i32,
                            "max_batch": config_batch,
                            "cooldown_sec": config_sec
                        }).to_string();
                        helpers::send_to_client(state, connection_id, &confirm).await;
                    } else if r[0] == "COOLDOWN_ERROR" && !is_batch {
                        let err = serde_json::json!({
                            "type": "cooldown_error",
                            "balance": 0,
                            "max_batch": config_batch,
                            "cooldown_sec": config_sec
                        }).to_string();
                        helpers::send_to_client(state, connection_id, &err).await;
                    } else if r[0] == "PROTECTED_ERROR" {
                        let is_owner = db::check_is_canvas_owner(&state.db_pool, &uid_str, canvas_id).await;
                        if !is_owner {
                            if !is_batch {
                                let last_px = pixels_to_process.last().unwrap();
                                let err = serde_json::json!({
                                    "type": "pixel_protected_error",
                                    "message": "err_pixel_protected",
                                    "x": last_px.x, "y": last_px.y
                                }).to_string();
                                helpers::send_to_client(state, connection_id, &err).await;
                            }
                        }
                    }
                }
            }

            let broadcast_msg = if is_batch {
                serde_json::json!({"type": msg.msg_type, "pixels": pixels_to_process, "color": raw_color}).to_string()
            } else {
                serde_json::json!({"type": msg.msg_type, "x": msg.x, "y": msg.y, "color": raw_color}).to_string()
            };
            
            helpers::broadcast_to_room_excluding(state, canvas_id, &broadcast_msg, connection_id).await;
            let _: () = redis_conn.sadd("canvases:dirty_states", canvas_id).await.unwrap_or(());
            let sync_payload = serde_json::json!({"source_node": &state.node_id, "target_type": "canvas", "canvas_id": canvas_id, "payload": broadcast_msg});
            let _: () = redis_conn.publish("canvas:sync_events", sync_payload.to_string()).await.unwrap_or(());
        }
        "chat_typing" => {
            if uid_str.is_empty() { return; }
            if let Ok(mut c) = state.redis_pool.get().await {
                let restr: bool = c.exists(format!("canvas:{}:chat_restricted:{}", canvas_id, uid_str)).await.unwrap_or(false);
                if restr { return; }
            }
            if let Ok(raw_msg) = serde_json::to_string(&msg) {
                helpers::broadcast_to_room_excluding(state, canvas_id, &raw_msg, connection_id).await;
                if let Ok(mut c) = state.redis_pool.get().await {
                    let sync_payload = serde_json::json!({"source_node": &state.node_id, "target_type": "canvas", "canvas_id": canvas_id, "payload": raw_msg});
                    let _: () = c.publish("canvas:sync_events", sync_payload.to_string()).await.unwrap_or(());
                }
            }
        }
        "bomb_pixel" => {
            let cx = msg.x.unwrap_or(0);
            let cy = msg.y.unwrap_or(0);
            
            // Securely load canvas dimensions from DB instead of trusting client input
            let (_, _, _, db_width, db_height) = db::get_canvas_config_from_db(&state.db_pool, canvas_id).await.unwrap_or((5, 10, false, 64, 64));
            let width = db_width;
            let height = db_height;
            let perk_id = msg.perk_id.clone().unwrap_or_default();
            
            if perk_id.is_empty() { return; }
            
            let has_perk = if uid_str != "guest" && !uid_str.is_empty() {
                db::consume_user_perk(&state.db_pool, &uid_str, &perk_id).await
            } else {
                true // Guests or unknown have perk by default (e.g. infinite test bots) or maybe reject. Python had `has_perk = True` for guests.
            };
            
            if !has_perk {
                let err = serde_json::json!({"type": "pixel_protected_error", "message": "err_perk_not_owned"}).to_string();
                helpers::send_to_client(state, connection_id, &err).await;
                return;
            }
            
            let perks_cfg = helpers::get_perks_config(state).await;
            let mut radius = 5;
            let mut warning_duration = 3;
            let mut spawn_mode = "direct".to_string();
            let mut spawn_count = 1;
            let mut spread_radius = 200;
            let mut jitter_delay = 0.0;
            
            if let Some(cfg) = perks_cfg {
                if let Some(perk_data) = cfg.perks.get(&perk_id) {
                    if let Some(ws) = perk_data.warning_seconds { warning_duration = ws; }
                    if let Some(sp) = &perk_data.spawning {
                        if let Some(ref m) = sp.mode { spawn_mode = m.clone(); }
                        if let Some(c) = sp.count { spawn_count = c; }
                        if let Some(sr) = sp.spread_radius { spread_radius = sr; }
                        if let Some(jd) = sp.jitter_delay { jitter_delay = jd; }
                    }
                    if let Some(radii) = &perk_data.radii {
                        if let Some(r) = radii.get(&width.to_string()) {
                            radius = *r;
                        } else {
                            if width == 0 {
                                radius = match perk_id.as_str() {
                                    "pixel_misil_1" => 5,
                                    "bomba_pixel_1" => 15,
                                    "bomba_racimo_1" => 20,
                                    "lluvia_meteoritos_1" => 10,
                                    _ => 50
                                };
                            } else {
                                let base_nuke = std::cmp::max(10, (width as f32 * 0.23) as i32);
                                let base_racimo = std::cmp::max(6, (width as f32 * 0.12) as i32);
                                let base_bomb = std::cmp::max(4, (width as f32 * 0.08) as i32);
                                let base_misil = std::cmp::max(2, (width as f32 * 0.03) as i32);
                                radius = match perk_id.as_str() {
                                    "pixel_misil_1" | "lluvia_meteoritos_1" => base_misil,
                                    "bomba_pixel_1" => base_bomb,
                                    "bomba_racimo_1" => base_racimo,
                                    _ => base_nuke
                                };
                            }
                        }
                    }
                }
            }
            
            let confirm_msg = serde_json::json!({"type": "pixel_confirm"}).to_string();
            helpers::send_to_client(state, connection_id, &confirm_msg).await;
            
            let mut spawned_targets = Vec::new();
            if spawn_mode == "random_around" {
                // Simplified random around
                let max_dist = if width == 0 { spread_radius } else { width / 2 };
                for _ in 0..spawn_count {
                    let rx = cx + (rand::random::<f32>() * max_dist as f32 * 2.0) as i32 - max_dist;
                    let ry = cy + (rand::random::<f32>() * max_dist as f32 * 2.0) as i32 - max_dist;
                    let rx = rx.clamp(0, if width > 0 { width - 1 } else { std::i32::MAX });
                    let ry = ry.clamp(0, if width > 0 { width - 1 } else { std::i32::MAX });
                    let delay = warning_duration as f32 + (rand::random::<f32>() * jitter_delay);
                    spawned_targets.push((rx, ry, delay));
                }
            } else {
                if let Some(t) = &msg.targets {
                    for tt in t {
                        let delay = warning_duration as f32 + (rand::random::<f32>() * jitter_delay);
                        spawned_targets.push((tt.x, tt.y, delay));
                    }
                } else {
                    spawned_targets.push((cx, cy, warning_duration as f32));
                }
            }
            
            let state_clone = state.clone();
            let canvas_id_clone = canvas_id.to_string();
            
            for (tx, ty, delay) in spawned_targets {
                let dur = if jitter_delay > 0.0 { delay as i32 } else { warning_duration };
                if dur > 0 {
                    let warning_msg = serde_json::json!({
                        "type": "nuclear_warning",
                        "x": tx, "y": ty, "duration": dur, "perk": perk_id, "radius": radius
                    }).to_string();
                    helpers::broadcast_to_room(&state_clone, &canvas_id_clone, &warning_msg).await;
                    if let Ok(mut c) = state_clone.redis_pool.get().await {
                        let sync_payload = serde_json::json!({"source_node": &state.node_id, "target_type": "canvas", "canvas_id": canvas_id_clone, "payload": warning_msg});
                        let _: () = c.publish("canvas:sync_events", sync_payload.to_string()).await.unwrap_or(());
                    }
                }
                
                let s_clone2 = state_clone.clone();
                let c_id_clone2 = canvas_id_clone.clone();
                let perk_id_clone = perk_id.clone();
                
                tokio::spawn(async move {
                    if delay > 0.0 {
                        sleep(Duration::from_secs_f32(delay)).await;
                    }
                    
                    if let Ok(mut c) = s_clone2.redis_pool.get().await {
                        let areas_key = format!("canvas:{}:protected_areas", c_id_clone2);
                        let areas_json: String = deadpool_redis::redis::AsyncCommands::get(&mut c, &areas_key).await.unwrap_or_else(|_| "[]".to_string());
                        let mut areas: Vec<serde_json::Value> = serde_json::from_str(&areas_json).unwrap_or_default();
                        
                        let original_len = areas.len();
                        areas.retain(|a| {
                            let ax1 = a["x1"].as_i64().unwrap_or(0) as i32;
                            let ay1 = a["y1"].as_i64().unwrap_or(0) as i32;
                            let ax2 = a["x2"].as_i64().unwrap_or(0) as i32;
                            let ay2 = a["y2"].as_i64().unwrap_or(0) as i32;
                            let intersect = !(ax2 < (tx - radius) || ax1 > (tx + radius) || ay2 < (ty - radius) || ay1 > (ty + radius));
                            !intersect
                        });
                        
                        if areas.len() != original_len {
                            let new_json = serde_json::to_string(&areas).unwrap_or_else(|_| "[]".to_string());
                            let _: () = deadpool_redis::redis::AsyncCommands::set(&mut c, &areas_key, new_json).await.unwrap_or(());
                        }
                        
                        let mut pipe = deadpool_redis::redis::pipe();
                        pipe.cmd("SADD").arg("canvases:dirty_states").arg(&c_id_clone2);
                        
                        for iy in (ty - radius)..=(ty + radius) {
                            let dy = iy - ty;
                            if dy.abs() > radius { continue; }
                            let dx = ((radius.pow(2) - dy.pow(2)) as f32).sqrt() as i32;
                            let mut x_start = tx - dx;
                            let mut x_end = tx + dx;
                            
                            if height > 0 && (iy < 0 || iy >= height) { continue; }
                            x_start = x_start.max(0);
                            if width > 0 { x_end = x_end.min(width - 1); }
                            if x_start > x_end { continue; }
                            
                            let length = x_end - x_start + 1;
                            let redis_state_key = format!("canvas:{}:state", c_id_clone2);
                            let byte_offset = (iy * width + x_start) * 4;
                            let transparent_bytes = vec![0u8; (length * 4) as usize];
                            
                            pipe.cmd("SETRANGE").arg(&redis_state_key).arg(byte_offset).arg(transparent_bytes);
                        }
                        
                        let _: () = pipe.query_async(&mut c).await.unwrap_or(());
                        
                        let b_msg = serde_json::json!({
                            "type": "bomb_pixel",
                            "x": tx, "y": ty, "r": radius, "perk": perk_id_clone
                        }).to_string();
                        helpers::broadcast_to_room(&s_clone2, &c_id_clone2, &b_msg).await;
                        
                        let sync_payload = serde_json::json!({"source_node": &s_clone2.node_id, "target_type": "canvas", "canvas_id": c_id_clone2, "payload": b_msg});
                        let _: () = c.publish("canvas:sync_events", sync_payload.to_string()).await.unwrap_or(());
                        
                        let _: () = c.xadd(format!("canvas:{}:stream", c_id_clone2), "*", &[
                            ("type", "bomb_pixel"), ("x", &tx.to_string()), ("y", &ty.to_string()),
                            ("r", &radius.to_string()), ("perk", &perk_id_clone)
                        ]).await.unwrap_or(());
                    }
                });
            }
        }
        _ => {
            warn!("Unhandled action: {}", msg.msg_type);
        }
    }
}
