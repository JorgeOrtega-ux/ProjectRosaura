use axum::{
    extract::{ws::{Message, WebSocket, WebSocketUpgrade}, Path, Query, State},
    response::Response,
};
use std::collections::HashMap;
use tracing::{info, warn};
use serde_json::Value;
use deadpool_redis::redis::AsyncCommands;
use uuid::Uuid;
use futures::{sink::SinkExt, stream::StreamExt};
use tokio::sync::mpsc;
use std::time::{SystemTime, UNIX_EPOCH, Duration};

use crate::state::{AppState, ClientMeta};
use crate::models::WsMessage;
use crate::actions;
use crate::helpers;

pub async fn ws_handler(
    ws: WebSocketUpgrade,
    Path(canvas_id): Path<String>,
    Query(params): Query<HashMap<String, String>>,
    State(state): State<AppState>,
) -> Response {
    let ticket = params.get("ticket");

    if ticket.is_none() {
        warn!("Connection rejected: No HTTP ticket provided.");
        return ws.on_upgrade(|mut socket| async move {
            let _ = socket.send(Message::Close(None)).await;
        });
    }
    
    let ticket_str = ticket.unwrap().clone();

    ws.on_upgrade(move |socket| handle_socket(socket, canvas_id, ticket_str, state))
}

async fn handle_socket(mut socket: WebSocket, canvas_id: String, ticket: String, state: AppState) {
    let mut redis_conn = match state.redis_pool.get().await {
        Ok(conn) => conn,
        Err(_) => {
            let _ = socket.send(Message::Close(None)).await;
            return;
        }
    };

    let ticket_key = format!("ws:ticket:{}", ticket);
    let ticket_data_raw: Option<String> = redis_conn.get(&ticket_key).await.unwrap_or(None);

    if ticket_data_raw.is_none() {
        warn!("Connection rejected: Ticket '{}' invalid or expired.", ticket);
        let _ = socket.send(Message::Close(None)).await;
        return;
    }

    let _: () = redis_conn.del(&ticket_key).await.unwrap_or(());

    let ticket_data: Value = match serde_json::from_str(&ticket_data_raw.unwrap()) {
        Ok(data) => data,
        Err(_) => {
            let _ = socket.send(Message::Close(None)).await;
            return;
        }
    };

    let user_type = ticket_data.get("type").and_then(|v| v.as_str()).unwrap_or("guest").to_string();
    let user_id = ticket_data.get("user_id").and_then(|v| {
        if v.is_string() {
            Some(v.as_str().unwrap().to_string())
        } else if v.is_number() {
            Some(v.as_i64().unwrap().to_string())
        } else {
            None
        }
    });

    let max_connections = std::env::var("WS_MAX_CONNECTIONS").unwrap_or_else(|_| "1000".to_string()).parse::<usize>().unwrap_or(1000);
    let qos_threshold = std::env::var("WS_QOS_THRESHOLD").unwrap_or_else(|_| "900".to_string()).parse::<usize>().unwrap_or(900);

    let current_connections = state.ws_meta.len();

    if current_connections >= qos_threshold {
        if user_type == "guest" {
            if current_connections >= max_connections {
                warn!("[QoS] Server full. Blocking Guest connection.");
                let _ = socket.send(Message::Close(Some(axum::extract::ws::CloseFrame {
                    code: 4001,
                    reason: std::borrow::Cow::Borrowed("Server full. Registered users prioritized.")
                }))).await;
                return;
            }
        } else {
            if current_connections >= max_connections {
                let guest_to_evict = state.ws_meta.iter().find(|m| m.value().user_type == "guest").map(|m| m.key().clone());
                if let Some(evict_id) = guest_to_evict {
                    warn!("[QoS] Evicting guest connection to prioritize registered user.");
                    if let Some(tx) = state.tx_channels.get(&evict_id) {
                        let _ = tx.send("###CLOSE###".to_string()).await;
                    }
                } else {
                    warn!("[QoS] Server full with only registered users. Connection blocked.");
                    let _ = socket.send(Message::Close(Some(axum::extract::ws::CloseFrame {
                        code: 1013,
                        reason: std::borrow::Cow::Borrowed("Server at maximum capacity.")
                    }))).await;
                    return;
                }
            }
        }
    }

    let connection_id = Uuid::new_v4().to_string();

    let meta = ClientMeta {
        canvas_id: canvas_id.clone(),
        user_type: user_type.clone(),
        user_id: user_id.clone(),
    };

    state.ws_meta.insert(connection_id.clone(), meta);
    state.rooms.entry(canvas_id.clone()).or_default().insert(connection_id.clone());

    let (mut sender, mut receiver) = socket.split();
    let (tx, mut rx) = mpsc::channel::<String>(100);
    state.tx_channels.insert(connection_id.clone(), tx);

    let mut bcast_rx = {
        let entry = state.room_broadcasts.entry(canvas_id.clone()).or_insert_with(|| {
            let (tx, _) = tokio::sync::broadcast::channel(1000);
            tx
        });
        entry.subscribe()
    };

    info!("Client ({}) connected to room '{}'. Global total: {}", user_type, canvas_id, state.ws_meta.len());

    let connection_id_for_send = connection_id.clone();
    let mut send_task = tokio::spawn(async move {
        loop {
            tokio::select! {
                msg_opt = rx.recv() => {
                    match msg_opt {
                        Some(msg) => {
                            if msg == "###CLOSE###" {
                                let _ = sender.send(Message::Close(Some(axum::extract::ws::CloseFrame {
                                    code: 4001,
                                    reason: std::borrow::Cow::Borrowed("Evicted for QoS")
                                }))).await;
                                break;
                            }
                            if sender.send(Message::Text(msg)).await.is_err() {
                                break;
                            }
                        }
                        None => break,
                    }
                }
                bcast_res = bcast_rx.recv() => {
                    match bcast_res {
                        Ok(msg) => {
                            let mut final_msg = msg;
                            if final_msg.starts_with("!EXC:") {
                                if let Some(pipe_idx) = final_msg.find('|') {
                                    let exc_id = &final_msg[5..pipe_idx];
                                    if exc_id == connection_id_for_send {
                                        continue;
                                    }
                                    final_msg = final_msg[pipe_idx + 1..].to_string();
                                }
                            }
                            if sender.send(Message::Text(final_msg)).await.is_err() {
                                break;
                            }
                        }
                        Err(tokio::sync::broadcast::error::RecvError::Lagged(_)) => {
                            // If this client lags too much behind the broadcast, it skipped messages.
                            // We just continue to the next available message.
                            continue;
                        }
                        Err(tokio::sync::broadcast::error::RecvError::Closed) => {
                            break;
                        }
                    }
                }
            }
        }
    });

    let state_clone = state.clone();
    let canvas_id_clone = canvas_id.clone();
    let connection_id_clone = connection_id.clone();
    
    let mut recv_task = tokio::spawn(async move {
        let mut last_message_time = SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_secs_f64();
        let mut message_count = 0;

        while let Some(Ok(Message::Text(text))) = receiver.next().await {
            // Anti-Spam check
            let now = SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_secs_f64();
            if now - last_message_time > 1.0 {
                last_message_time = now;
                message_count = 0;
            }
            message_count += 1;
            
            if message_count > 200 {
                warn!("Spam detected (Connection: {}). Disconnecting WS.", connection_id_clone);
                break; // Break will end recv_task, triggering cleanup
            }

            // Ban check
            let mut is_banned = false;
            if let Some(uid) = state_clone.ws_meta.get(&connection_id_clone).and_then(|m| m.user_id.clone()) {
                if let Ok(mut c) = state_clone.redis_pool.get().await {
                    let ban_key = format!("canvas:{}:canvas_banned:{}", canvas_id_clone, uid);
                    is_banned = c.exists(&ban_key).await.unwrap_or(false);
                }
            }
            if is_banned {
                warn!("Banned user tried to send message. Disconnecting.");
                break;
            }

            if let Ok(ws_msg) = serde_json::from_str::<WsMessage>(&text) {
                actions::handle_action(ws_msg, &canvas_id_clone, &connection_id_clone, &state_clone).await;
            } else {
                warn!("Failed to parse WS JSON: {}", text);
            }
        }
    });

    tokio::select! {
        _ = (&mut send_task) => recv_task.abort(),
        _ = (&mut recv_task) => send_task.abort(),
    }

    // --- CLEANUP LOGIC ---
    if let Some(room) = state.rooms.get_mut(&canvas_id) {
        room.remove(&connection_id);
    }
    let mut uid_str = String::new();
    if let Some((_, meta)) = state.ws_meta.remove(&connection_id) {
        if let Some(uid) = meta.user_id {
            uid_str = uid;
        }
    }
    state.tx_channels.remove(&connection_id);
    info!("Client {} disconnected. Remaining global total: {}", connection_id, state.ws_meta.len());

    // Live share disconnect cleanup
    let codes: Vec<String> = state.live_rooms.iter().map(|kv| kv.key().clone()).collect();
    for code in codes {
        let is_in_room = {
            if let Some(clients) = state.live_rooms.get_mut(&code) {
                clients.remove(&connection_id).is_some()
            } else {
                false
            }
        };

        if is_in_room {
            let is_owner = {
                if let Some(owner) = state.owner_conns.get(&connection_id) {
                    *owner.value() == code
                } else {
                    false
                }
            };

            if is_owner {
                info!("Owner disconnected from session {}. Ending session immediately.", code);
                let state_for_grace = state.clone();
                let grace_code = code.clone();
                
                if let Some(existing) = state.grace_sessions.get(&code) {
                    existing.abort();
                }
                
                let end_msg = serde_json::json!({
                    "type": "live_session_ended",
                    "code": grace_code
                }).to_string();
                
                helpers::broadcast_to_live_room(&state_for_grace, &grace_code, &end_msg, None).await;
                state_for_grace.live_rooms.remove(&grace_code);
                
                if let Ok(mut c) = state_for_grace.redis_pool.get().await {
                    let _: () = c.del(format!("live_share:{}", grace_code)).await.unwrap_or(());
                    let _: () = c.del(format!("live_share:{}:count", grace_code)).await.unwrap_or(());
                    if !uid_str.is_empty() {
                        let _: () = c.del(format!("live_share:user_{}", uid_str)).await.unwrap_or(());
                    }
                }
                
                state_for_grace.grace_sessions.remove(&grace_code);
            } else {
                // Not owner, decrement count
                if let Ok(mut c) = state.redis_pool.get().await {
                    let redis_key = format!("live_share:{}:count", code);
                    let _: () = c.decr(&redis_key, 1).await.unwrap_or(());
                    
                    let global_count: i64 = c.get(&redis_key).await.unwrap_or(1);
                    let global_count = global_count.max(1);
                    
                    let count_msg = serde_json::json!({
                        "type": "live_share_count",
                        "code": code,
                        "count": global_count
                    }).to_string();
                    
                    helpers::broadcast_to_live_room(&state, &code, &count_msg, None).await;
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
    
    state.owner_conns.remove(&connection_id);
}
