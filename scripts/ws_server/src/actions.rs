use tracing::warn;
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

pub async fn check_owner_ratelimit(state: &AppState, canvas_id: &str, user_id: &str, tool: &str) -> Option<u64> {
    if let Ok(mut c) = state.redis_pool.get().await {
        let key = format!("canvas:{}:user:{}:owner_ratelimit:{}", canvas_id, user_id, tool);
        let ttl_ms: i64 = deadpool_redis::redis::cmd("PTTL")
            .arg(&key)
            .query_async(&mut c).await.unwrap_or(-2);
        if ttl_ms > 0 {
            return Some(ttl_ms as u64);
        }
    }
    None
}

pub async fn set_owner_ratelimit(state: &AppState, canvas_id: &str, user_id: &str, tool: &str, duration_ms: u64) {
    if duration_ms == 0 { return; }
    if let Ok(mut c) = state.redis_pool.get().await {
        let key = format!("canvas:{}:user:{}:owner_ratelimit:{}", canvas_id, user_id, tool);
        let _: () = deadpool_redis::redis::cmd("SET")
            .arg(&key).arg("1").arg("PX").arg(duration_ms)
            .query_async(&mut c).await.unwrap_or(());
    }
}

pub async fn handle_action(msg: WsMessage, canvas_id: &str, connection_id: &str, state: &AppState) {
    let client_meta = state.ws_meta.get(connection_id).map(|m| m.clone());
    let user_id = client_meta.as_ref().and_then(|m| m.user_id.clone());
    let uid_str = user_id.clone().unwrap_or_else(|| "".to_string());
    
    match msg.msg_type.as_str() {
        "init" => {
            let client_version = msg.version.as_deref().unwrap_or("");
            let expected_version = "2.0.3";
            if client_version != expected_version {
                let err_res = serde_json::json!({
                    "type": "version_mismatch",
                    "client_version": client_version,
                    "server_version": expected_version,
                    "message": "La versión de tu aplicación no coincide con la del servidor. Por favor, recarga la página para actualizar."
                });
                helpers::send_to_client(state, connection_id, &err_res.to_string()).await;
                return;
            }

            helpers::ensure_canvas_state_loaded(state, canvas_id).await;
            
            let (config_batch, config_sec, _, _, _, _) = db::get_canvas_config(state, canvas_id).await;
            
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
            
            // Load protected areas from DB and sync with Redis
            let db_areas = db::get_canvas_protections_db(&state.db_pool, canvas_id).await;
            let areas_key = format!("canvas:{}:protected_areas", canvas_id);
            let areas_json = serde_json::to_string(&db_areas).unwrap_or_else(|_| "[]".to_string());
            let _: () = redis_conn.set(&areas_key, areas_json).await.unwrap_or(());
            
            let init_msg = serde_json::json!({
                "type": "init_protected_areas",
                "areas": db_areas
            });
            helpers::send_to_client(state, connection_id, &init_msg.to_string()).await;

                // Load user's mines
                let mines_key = format!("canvas:{}:mines", canvas_id);
                let all_mines: std::collections::HashMap<String, String> = redis_conn.hgetall(&mines_key).await.unwrap_or_default();
                let mut my_mines_offsets = Vec::new();
                for (off_str, owner) in all_mines {
                    if owner == uid_str {
                        if let Ok(off) = off_str.parse::<i32>() {
                            my_mines_offsets.push(off);
                        }
                    }
                }
                if !my_mines_offsets.is_empty() {
                    let mines_msg = serde_json::json!({
                        "type": "init_my_mines",
                        "offsets": my_mines_offsets
                    }).to_string();
                    helpers::send_to_client(state, connection_id, &mines_msg).await;
                }

                if !uid_str.is_empty() && db::check_is_canvas_owner(state, &uid_str, canvas_id).await {
                    let mut cooldowns = std::collections::HashMap::new();
                    for tool in &["freeze", "protect", "clear"] {
                        if let Some(ttl_ms) = check_owner_ratelimit(state, canvas_id, &uid_str, tool).await {
                            cooldowns.insert(tool.to_string(), ttl_ms);
                        }
                    }
                    if !cooldowns.is_empty() {
                        let cd_msg = serde_json::json!({
                            "type": "init_owner_cooldowns",
                            "cooldowns": cooldowns
                        }).to_string();
                        helpers::send_to_client(state, connection_id, &cd_msg).await;
                    }
                }
        }
        "join_live_share" => {
            if let Some(code) = msg.code.clone() {
                let is_new = state.live_rooms.entry(code.clone()).or_default().insert(connection_id.to_string());
                
                if let Ok(mut c) = state.redis_pool.get().await {
                    // Check if this user is the owner of the live session
                    let redis_key = format!("live_share:{}", code);
                    let existing_data_str: Option<String> = c.get(&redis_key).await.unwrap_or(None);
                    let mut is_owner_reconnect = false;
                    if let Some(s) = existing_data_str {
                        if let Ok(data) = serde_json::from_str::<serde_json::Value>(&s) {
                            if let Some(owner_id_val) = data.get("owner_id") {
                                let owner_id_str = match owner_id_val {
                                    serde_json::Value::Number(n) => n.to_string(),
                                    serde_json::Value::String(st) => st.clone(),
                                    _ => String::new(),
                                };
                                if !owner_id_str.is_empty() && owner_id_str == uid_str {
                                    // Determine if this is a reconnect (grace task was active)
                                    // or the very first join (no grace task → fresh session start).
                                    let had_grace = state.grace_sessions.contains_key(&code);
                                    if had_grace {
                                        // True reconnect after reload → abort grace, don't re-increment
                                        is_owner_reconnect = true;
                                        if let Some((_, existing_task)) = state.grace_sessions.remove(&code) {
                                            existing_task.abort();
                                        }
                                    }
                                    // Always register the owner connection
                                    state.owner_conns.insert(connection_id.to_string(), code.clone());
                                }
                            }
                        }
                    }

                    // Increment count for new connections — but NOT when owner is reconnecting
                    // (their slot already exists in the Redis counter from the initial join).
                    if is_new && !is_owner_reconnect {
                        let count_key = format!("live_share:{}:count", code);
                        let _: () = c.incr(&count_key, 1).await.unwrap_or(());
                        let _: () = c.expire(&count_key, 14400).await.unwrap_or(());
                    }

                    // Always broadcast the current count to everyone in the room
                    // so the owner's badge reflects the real participant count.
                    if is_new {
                        let count_key = format!("live_share:{}:count", code);
                        let global_count: i64 = c.get(&count_key).await.unwrap_or(1);

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
                if let Some(room) = state.live_rooms.get_mut(&code) {
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
        "presence_ping" => {
            let effective_uid = if !uid_str.is_empty() {
                uid_str.clone()
            } else if let Some(ref m_uid) = msg.user_id {
                if !m_uid.is_empty() { m_uid.clone() } else { connection_id.to_string() }
            } else {
                connection_id.to_string()
            };

            let mut redis_conn = match state.redis_pool.get().await {
                Ok(c) => c,
                Err(_) => return,
            };
            let presence_key = format!("canvas:{}:presence", canvas_id);
            let u_name = msg.username.clone().unwrap_or_else(|| {
                if !effective_uid.is_empty() {
                    format!("Usuario_{}", &effective_uid[..effective_uid.len().min(4)])
                } else {
                    "Artista".to_string()
                }
            });
            let u_color = msg.color.clone().unwrap_or_else(|| "#3b82f6".to_string());
            let u_role = if !uid_str.is_empty() && db::check_is_canvas_owner(state, &uid_str, canvas_id).await {
                "owner".to_string()
            } else {
                msg.role.clone().unwrap_or_else(|| "member".to_string())
            };
            let u_avatar = msg.avatar.clone();
            let u_sub_bg = msg.sub_bg.clone();

            let user_info = serde_json::json!({
                "id": &effective_uid,
                "username": &u_name,
                "avatar": &u_avatar,
                "sub_bg": &u_sub_bg,
                "role": &u_role,
                "color": &u_color,
                "status": "online"
            });

            let _: () = redis_conn.hset(&presence_key, &effective_uid, user_info.to_string()).await.unwrap_or(());
            let _: () = redis_conn.expire(&presence_key, 3600).await.unwrap_or(());

            // Broadcast user_joined to other clients in room
            let joined_msg = serde_json::json!({
                "type": "user_joined",
                "user_id": &effective_uid,
                "username": &u_name,
                "avatar": &u_avatar,
                "sub_bg": &u_sub_bg,
                "role": &u_role,
                "color": &u_color
            }).to_string();
            helpers::broadcast_to_room_excluding(state, canvas_id, &joined_msg, connection_id).await;

            // Send full presence list back to the sender
            let all_members_map: std::collections::HashMap<String, String> = redis_conn.hgetall(&presence_key).await.unwrap_or_default();
            let mut members_vec = Vec::new();
            for (_, val_str) in all_members_map {
                if let Ok(v) = serde_json::from_str::<serde_json::Value>(&val_str) {
                    members_vec.push(v);
                }
            }

            let presence_list_msg = serde_json::json!({
                "type": "presence_list",
                "members": members_vec
            }).to_string();
            helpers::send_to_client(state, connection_id, &presence_list_msg).await;
        }
        "cursor_move" => {
            let effective_uid = if !uid_str.is_empty() {
                uid_str.clone()
            } else if let Some(ref m_uid) = msg.user_id {
                if !m_uid.is_empty() { m_uid.clone() } else { connection_id.to_string() }
            } else {
                connection_id.to_string()
            };

            let move_msg = serde_json::json!({
                "type": "user_cursor",
                "user_id": &effective_uid,
                "username": msg.username.clone().unwrap_or_default(),
                "avatar": msg.avatar.clone(),
                "sub_bg": msg.sub_bg.clone(),
                "x": msg.x.unwrap_or(0),
                "y": msg.y.unwrap_or(0),
                "color": msg.color.clone().unwrap_or_else(|| "#3b82f6".to_string()),
                "is_drawing": msg.is_drawing.unwrap_or(false),
                "t": msg.t.unwrap_or(0)
            }).to_string();
            helpers::broadcast_to_room_excluding(state, canvas_id, &move_msg, connection_id).await;
        }
        "host_summon" => {
            let effective_uid = if !uid_str.is_empty() {
                uid_str.clone()
            } else if let Some(ref m_uid) = msg.user_id {
                if !m_uid.is_empty() { m_uid.clone() } else { connection_id.to_string() }
            } else {
                connection_id.to_string()
            };

            if (!effective_uid.is_empty() && db::check_is_canvas_owner(state, &effective_uid, canvas_id).await) || msg.role.as_deref() == Some("owner") {
                let summon_msg = serde_json::json!({
                    "type": "host_summon",
                    "x": msg.x.unwrap_or(0),
                    "y": msg.y.unwrap_or(0)
                }).to_string();
                helpers::broadcast_to_room_excluding(state, canvas_id, &summon_msg, connection_id).await;
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
            if let Some(ttl_ms) = check_owner_ratelimit(state, canvas_id, &uid_str, "freeze").await {
                let err_msg = serde_json::json!({
                    "type": "owner_ratelimit_error",
                    "cooldown_ms": ttl_ms,
                    "tool": "freeze"
                }).to_string();
                helpers::send_to_client(state, connection_id, &err_msg).await;
                return;
            }
            if !db::check_is_canvas_owner(state, &uid_str, canvas_id).await { return; }
            
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

            set_owner_ratelimit(state, canvas_id, &uid_str, "freeze", 5000).await;
        }
        "protect_area" => {
            if uid_str.is_empty() { return; }
            if let Some(ttl_ms) = check_owner_ratelimit(state, canvas_id, &uid_str, "protect").await {
                let err_msg = serde_json::json!({
                    "type": "owner_ratelimit_error",
                    "cooldown_ms": ttl_ms,
                    "tool": "protect"
                }).to_string();
                helpers::send_to_client(state, connection_id, &err_msg).await;
                return;
            }
            if !db::check_is_canvas_owner(state, &uid_str, canvas_id).await { return; }
            
            let x1 = msg.x1.unwrap_or(0);
            let y1 = msg.y1.unwrap_or(0);
            let x2 = msg.x2.unwrap_or(0);
            let y2 = msg.y2.unwrap_or(0);
            let protect = msg.protect.unwrap_or(true);
            
            // Securely load canvas dimensions from DB instead of trusting client input
            let (_, _, _, db_width, db_height, _) = db::get_canvas_config(state, canvas_id).await;
            
            let min_x = std::cmp::min(x1, x2).max(0).min(db_width - 1);
            let max_x = std::cmp::max(x1, x2).max(0).min(db_width - 1);
            let min_y = std::cmp::min(y1, y2).max(0).min(db_height - 1);
            let max_y = std::cmp::max(y1, y2).max(0).min(db_height - 1);
            
            let areas_key = format!("canvas:{}:protected_areas", canvas_id);
            
            if let Ok(mut c) = state.redis_pool.get().await {
                if protect {
                    let _ = db::save_canvas_protection_db(&state.db_pool, canvas_id, min_x, min_y, max_x, max_y, Some(&uid_str), None).await;
                } else {
                    let _ = db::delete_canvas_protection_db(&state.db_pool, canvas_id, min_x, min_y, max_x, max_y).await;
                }
                
                // Sync Redis JSON key with DB
                let db_areas = db::get_canvas_protections_db(&state.db_pool, canvas_id).await;
                let areas_json = serde_json::to_string(&db_areas).unwrap_or_else(|_| "[]".to_string());
                let _: () = c.set(&areas_key, areas_json).await.unwrap_or(());
            }
            
            let b_msg = serde_json::json!({
                "type": "area_protection_changed",
                "canvas_id": canvas_id,
                "x1": min_x, "y1": min_y, "x2": max_x, "y2": max_y,
                "protect": protect, "width": db_width, "is_owner": true
            }).to_string();
            helpers::broadcast_to_room(state, canvas_id, &b_msg).await;
            
            if let Ok(mut c) = state.redis_pool.get().await {
                let sync_payload = serde_json::json!({
                    "source_node": &state.node_id, "target_type": "canvas", "canvas_id": canvas_id, "payload": b_msg
                });
                let _: () = c.publish("canvas:sync_events", sync_payload.to_string()).await.unwrap_or(());
            }

            let pixel_count = ((max_x - min_x + 1) * (max_y - min_y + 1)) as u64;
            let cooldown_ms = (5000 + (pixel_count * 5) / 100).min(30000);
            set_owner_ratelimit(state, canvas_id, &uid_str, "protect", cooldown_ms).await;
        }
        "use_pixel_protection" => {
            // Deprecated perk action - no-op
        }
        "place_mines" => {
            if helpers::is_guest(&uid_str) { return; }

            let pixels = match &msg.pixels {
                Some(p) => p.clone(),
                None => return,
            };

            if pixels.is_empty() || pixels.len() > 10 {
                return; // Max 10 mines
            }

            // Securely load canvas dimensions from DB instead of trusting client input
            let (_, _, _, db_width, db_height, _) = db::get_canvas_config(state, canvas_id).await;

            let mut placed_offsets = Vec::new();
            if let Ok(mut c) = state.redis_pool.get().await {
                let mut pipe = deadpool_redis::redis::pipe();
                let mines_key = format!("canvas:{}:mines", canvas_id);
                for px in &pixels {
                    if px.x >= 0 && px.x < db_width && px.y >= 0 && px.y < db_height {
                        let offset = px.y * db_width + px.x;
                        placed_offsets.push(offset);
                        pipe.cmd("HSET").arg(&mines_key).arg(offset.to_string()).arg(&uid_str);
                    }
                }
                if !placed_offsets.is_empty() {
                    let _: () = pipe.query_async(&mut c).await.unwrap_or(());
                }
            }

            // Confirm success to the user
            let success_confirm = serde_json::json!({
                "type": "mines_placed_success",
                "offsets": placed_offsets
            }).to_string();
            helpers::send_to_client(state, connection_id, &success_confirm).await;
        }
        "clear_area" => {
            let x1 = msg.x1.unwrap_or(0);
            let y1 = msg.y1.unwrap_or(0);
            let x2 = msg.x2.unwrap_or(0);
            let y2 = msg.y2.unwrap_or(0);
            let width = msg.width.unwrap_or(64);

            if uid_str.is_empty() { return; }
            if let Some(ttl_ms) = check_owner_ratelimit(state, canvas_id, &uid_str, "clear").await {
                let err_msg = serde_json::json!({
                    "type": "owner_ratelimit_error",
                    "cooldown_ms": ttl_ms,
                    "tool": "clear"
                }).to_string();
                helpers::send_to_client(state, connection_id, &err_msg).await;
                return;
            }
            if !db::check_is_canvas_owner(state, &uid_str, canvas_id).await { return; }

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
            let _ = db::delete_intersecting_rect_protections_db(&state.db_pool, canvas_id, min_x, min_y, max_x, max_y).await;
            let db_areas = db::get_canvas_protections_db(&state.db_pool, canvas_id).await;
            let areas_json = serde_json::to_string(&db_areas).unwrap_or_else(|_| "[]".to_string());
            let _: () = redis_conn.set(&areas_key, areas_json).await.unwrap_or(());

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

            let pixel_count = count as u64;
            let cooldown_ms = (5000 + pixel_count / 100).min(60000);
            set_owner_ratelimit(state, canvas_id, &uid_str, "clear", cooldown_ms).await;
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
                if !db::check_is_canvas_owner(state, &uid_str, canvas_id).await {
                    let err = serde_json::json!({"type": "canvas_frozen_error", "message": "El lienzo está congelado por el administrador"}).to_string();
                    helpers::send_to_client(state, connection_id, &err).await;
                    return;
                }
            }

            let (config_batch, config_sec, is_premium_locked, board_w, board_h, _) = db::get_canvas_config(state, canvas_id).await;
            let height = board_h;
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
            let is_owner = db::check_is_canvas_owner(state, &uid_str, canvas_id).await;
            let is_owner_str = if is_owner { "1" } else { "0" };
            
            let script = deadpool_redis::redis::Script::new(crate::lua_scripts::PAINT_PIXEL_LUA);
            let _ : String = deadpool_redis::redis::cmd("SCRIPT").arg("LOAD").arg(crate::lua_scripts::PAINT_PIXEL_LUA).query_async(&mut *redis_conn).await.unwrap_or_default();
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
                    .arg(&args[4]).arg(&args[5]).arg(&args[6]).arg(&args[7]).arg(&args[8])
                    .arg(is_owner_str);
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
                        let is_owner = db::check_is_canvas_owner(state, &uid_str, canvas_id).await;
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

            // Check for triggered mines
            let mut triggered_mines = Vec::new();
            for (idx, px) in pixels_to_process.iter().enumerate() {
                if let Some(r) = results.get(idx) {
                    if !r.is_empty() && r[0] == "OK" {
                        let offset = px.y * width + px.x;
                        let mines_key = format!("canvas:{}:mines", canvas_id);
                        if let Ok(Some(owner_id)) = redis_conn.hget::<_, _, Option<String>>(&mines_key, offset.to_string()).await {
                            if owner_id != uid_str {
                                triggered_mines.push((px.x, px.y, offset, owner_id));
                            }
                        }
                    }
                }
            }

            if !triggered_mines.is_empty() {
                let mut pipe = deadpool_redis::redis::pipe();
                let mines_key = format!("canvas:{}:mines", canvas_id);
                for &(_, _, offset, _) in &triggered_mines {
                    pipe.cmd("HDEL").arg(&mines_key).arg(offset.to_string());
                }
                let _: () = pipe.query_async(&mut redis_conn).await.unwrap_or(());

                let base_radius = 4;

                for (tx, ty, offset, owner_id) in triggered_mines {
                    // Mine detonation broadcast to clean user's frontend myMines
                    let det_msg = serde_json::json!({
                        "type": "mine_detonated",
                        "offset": offset,
                        "owner_id": owner_id
                    }).to_string();
                    helpers::broadcast_to_room(state, canvas_id, &det_msg).await;
                    let sync_payload = serde_json::json!({"source_node": &state.node_id, "target_type": "canvas", "canvas_id": canvas_id, "payload": det_msg});
                    let _: () = redis_conn.publish("canvas:sync_events", sync_payload.to_string()).await.unwrap_or(());

                    // Execute immediate explosion!
                    let radius = base_radius;
                    let areas_key = format!("canvas:{}:protected_areas", canvas_id);
                    
                    let deleted_areas = db::delete_intersecting_circle_protections_db(&state.db_pool, canvas_id, tx, ty, radius).await.unwrap_or_default();
                    
                    let db_areas = db::get_canvas_protections_db(&state.db_pool, canvas_id).await;
                    let areas_json = serde_json::to_string(&db_areas).unwrap_or_else(|_| "[]".to_string());
                    let _: () = redis_conn.set(&areas_key, areas_json).await.unwrap_or(());
                    
                    let mut pipe_exp = deadpool_redis::redis::pipe();
                    let mut affected_offsets = Vec::new();
                    
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
                        let redis_state_key = format!("canvas:{}:state", canvas_id);
                        let byte_offset = (iy * width + x_start) * 4;
                        let transparent_bytes = vec![0u8; (length * 4) as usize];
                        
                        pipe_exp.cmd("SETRANGE").arg(&redis_state_key).arg(byte_offset).arg(transparent_bytes);
                        
                        for ix in x_start..=x_end {
                            affected_offsets.push(iy * width + ix);
                        }
                    }
                    
                    let _: () = pipe_exp.query_async(&mut redis_conn).await.unwrap_or(());

                    for area in deleted_areas {
                        let b_msg = serde_json::json!({
                            "type": "area_protection_changed",
                            "canvas_id": canvas_id,
                            "x1": area.x1, "y1": area.y1, "x2": area.x2, "y2": area.y2,
                            "protect": false, "width": width, "is_owner": true
                        }).to_string();
                        helpers::broadcast_to_room(state, canvas_id, &b_msg).await;
                    }
                    
                    // Broadcast de desprotección optimizado para actualizar el frontend
                    let unprotect_msg = if affected_offsets.len() > 100 {
                        serde_json::json!({
                            "type": "pixel_unprotected_circle",
                            "x": tx, "y": ty, "r": radius
                        }).to_string()
                    } else {
                        serde_json::json!({
                            "type": "pixel_unprotected_broadcast",
                            "offsets": affected_offsets
                        }).to_string()
                    };
                    helpers::broadcast_to_room(state, canvas_id, &unprotect_msg).await;
                    let sync_payload_unprot = serde_json::json!({"source_node": &state.node_id, "target_type": "canvas", "canvas_id": canvas_id, "payload": unprotect_msg});
                    let _: () = redis_conn.publish("canvas:sync_events", sync_payload_unprot.to_string()).await.unwrap_or(());
                    
                    let b_msg = serde_json::json!({
                        "type": "bomb_pixel",
                        "x": tx, "y": ty, "r": radius
                    }).to_string();
                    helpers::broadcast_to_room(state, canvas_id, &b_msg).await;
                    
                    let sync_payload_bomb = serde_json::json!({"source_node": &state.node_id, "target_type": "canvas", "canvas_id": canvas_id, "payload": b_msg});
                    let _: () = redis_conn.publish("canvas:sync_events", sync_payload_bomb.to_string()).await.unwrap_or(());
                    
                    let _: () = redis_conn.xadd(format!("canvas:{}:stream", canvas_id), "*", &[
                        ("type", "bomb_pixel"), ("x", &tx.to_string()), ("y", &ty.to_string()),
                        ("r", &radius.to_string())
                    ]).await.unwrap_or(());
                }
            }

            let broadcast_msg = if is_batch {
                serde_json::json!({"type": msg.msg_type, "pixels": pixels_to_process, "color": raw_color}).to_string()
            } else {
                serde_json::json!({"type": msg.msg_type, "x": msg.x, "y": msg.y, "color": raw_color}).to_string()
            };
            
            let sync_payload = serde_json::json!({"source_node": &state.node_id, "target_type": "canvas", "canvas_id": canvas_id, "payload": broadcast_msg});
            let _: () = redis_conn.publish("canvas:sync_events", sync_payload.to_string()).await.unwrap_or(());
            let _: () = redis_conn.sadd("canvases:dirty_states", canvas_id).await.unwrap_or(());

            // Build binary broadcast payload
            let bin_payload = if is_batch {
                let is_erase = msg.msg_type == "batch_erase_pixels";
                let op_code = if is_erase { 4u8 } else { 3u8 };
                let mut bin = Vec::with_capacity(7 + pixels_to_process.len() * 4);
                bin.push(op_code);
                bin.extend_from_slice(&(pixels_to_process.len() as u16).to_be_bytes());
                
                let (r, g, b, a) = if is_erase {
                    (0, 0, 0, 0)
                } else {
                    let c_bytes = &color_bytes;
                    (c_bytes[0], c_bytes[1], c_bytes[2], c_bytes[3])
                };
                bin.push(r); bin.push(g); bin.push(b); bin.push(a);
                
                for px in &pixels_to_process {
                    bin.extend_from_slice(&(px.x as u16).to_be_bytes());
                    bin.extend_from_slice(&(px.y as u16).to_be_bytes());
                }
                bin
            } else {
                let is_erase = msg.msg_type == "erase_pixel";
                let op_code = if is_erase { 2u8 } else { 1u8 };
                let mut bin = Vec::with_capacity(9);
                bin.push(op_code);
                
                let px_x = msg.x.unwrap_or(0) as u16;
                let px_y = msg.y.unwrap_or(0) as u16;
                bin.extend_from_slice(&px_x.to_be_bytes());
                bin.extend_from_slice(&px_y.to_be_bytes());
                
                let (r, g, b, a) = if is_erase {
                    (0, 0, 0, 0)
                } else {
                    let c_bytes = &color_bytes;
                    (c_bytes[0], c_bytes[1], c_bytes[2], c_bytes[3])
                };
                bin.push(r); bin.push(g); bin.push(b); bin.push(a);
                bin
            };
            helpers::broadcast_binary_to_room_excluding(state, canvas_id, bin_payload, connection_id).await;
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
        "bomb_pixel" => {}
        _ => {
            warn!("Unhandled action: {}", msg.msg_type);
        }
    }
}

pub async fn handle_binary_action(bin: Vec<u8>, canvas_id: &str, connection_id: &str, state: &AppState) {
    if bin.len() < 1 { return; }
    let op_code = bin[0];
    match op_code {
        1 | 2 => {
            // Single pixel (1 = paint, 2 = erase)
            if bin.len() < 9 { return; }
            let x = u16::from_be_bytes([bin[1], bin[2]]) as i32;
            let y = u16::from_be_bytes([bin[3], bin[4]]) as i32;
            let r = bin[5];
            let g = bin[6];
            let b = bin[7];
            let a = bin[8];
            
            let color = if op_code == 2 || a == 0 {
                "transparent".to_string()
            } else {
                format!("#{:02x}{:02x}{:02x}", r, g, b)
            };
            
            let msg = WsMessage {
                msg_type: if op_code == 2 { "erase_pixel".to_string() } else { "pixel".to_string() },
                canvas_id: None,
                user_id: None,
                username: None,
                avatar: None,
                sub_bg: None,
                is_typing: None,
                is_drawing: None,
                role: None,
                t: None,
                x: Some(x),
                y: Some(y),
                x1: None, y1: None, x2: None, y2: None, width: None, height: None,
                color: Some(color),
                pixels: None,
                protect: None,
                offsets: None,
                balance: None, max_batch: None, cooldown_sec: None, next_replenish_in: None,
                code: None, count: None, empty: None, img_url: None, w: None, h: None, opacity: None, angle: None,
                frozen: None, message: None, version: None, r: None, radius: None, duration: None, targets: None,
            };
            handle_action(msg, canvas_id, connection_id, state).await;
        }
        3 | 4 => {
            // Batch pixels (3 = paint, 4 = erase)
            if bin.len() < 7 { return; }
            let count = u16::from_be_bytes([bin[1], bin[2]]) as usize;
            let r = bin[3];
            let g = bin[4];
            let b = bin[5];
            let a = bin[6];
            
            if bin.len() < 7 + count * 4 { return; }
            
            let color = if op_code == 4 || a == 0 {
                "transparent".to_string()
            } else {
                format!("#{:02x}{:02x}{:02x}", r, g, b)
            };
            
            let mut pixels = Vec::with_capacity(count);
            let mut offset = 7;
            for _ in 0..count {
                let px = u16::from_be_bytes([bin[offset], bin[offset+1]]) as i32;
                let py = u16::from_be_bytes([bin[offset+2], bin[offset+3]]) as i32;
                pixels.push(crate::models::PixelData { x: px, y: py });
                offset += 4;
            }
            
            let msg = WsMessage {
                msg_type: if op_code == 4 { "batch_erase_pixels".to_string() } else { "batch_pixels".to_string() },
                canvas_id: None,
                user_id: None,
                username: None,
                avatar: None,
                sub_bg: None,
                is_typing: None,
                is_drawing: None,
                role: None,
                t: None,
                x: None, y: None, x1: None, y1: None, x2: None, y2: None, width: None, height: None,
                color: Some(color),
                pixels: Some(pixels),
                protect: None,
                offsets: None,
                balance: None, max_batch: None, cooldown_sec: None, next_replenish_in: None,
                code: None, count: None, empty: None, img_url: None, w: None, h: None, opacity: None, angle: None,
                frozen: None, message: None, version: None, r: None, radius: None, duration: None, targets: None,
            };
            handle_action(msg, canvas_id, connection_id, state).await;
        }
        _ => {}
    }
}
