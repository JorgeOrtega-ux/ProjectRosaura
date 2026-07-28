use axum::{
    extract::{ws::{Message, WebSocket, WebSocketUpgrade}, Path, Query, State},
    response::Response,
};
use std::collections::HashMap;
use tracing::{info, warn, error};
use serde_json::Value;
use deadpool_redis::redis::AsyncCommands;
use uuid::Uuid;
use futures::{sink::SinkExt, stream::StreamExt};
use tokio::sync::mpsc;

use crate::state::{AppState, ClientMeta};
use crate::models::WsMessage;
use crate::actions;

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

    info!("Client ({}) connected to room '{}'.", user_type, canvas_id);

    // Tarea para enviar mensajes salientes al WebSocket
    let mut send_task = tokio::spawn(async move {
        while let Some(msg) = rx.recv().await {
            if sender.send(Message::Text(msg)).await.is_err() {
                break;
            }
        }
    });

    // Tarea para procesar mensajes entrantes
    let state_clone = state.clone();
    let canvas_id_clone = canvas_id.clone();
    let connection_id_clone = connection_id.clone();
    let mut recv_task = tokio::spawn(async move {
        while let Some(Ok(Message::Text(text))) = receiver.next().await {
            if let Ok(ws_msg) = serde_json::from_str::<WsMessage>(&text) {
                actions::handle_action(ws_msg, &canvas_id_clone, &connection_id_clone, &state_clone).await;
            } else {
                warn!("Failed to parse WS JSON: {}", text);
            }
        }
    });

    // Si una de las dos tareas termina, abortamos la otra
    tokio::select! {
        _ = (&mut send_task) => recv_task.abort(),
        _ = (&mut recv_task) => send_task.abort(),
    }

    // Cleanup
    if let Some(mut room) = state.rooms.get_mut(&canvas_id) {
        room.remove(&connection_id);
    }
    state.ws_meta.remove(&connection_id);
    state.tx_channels.remove(&connection_id);
    info!("Client {} disconnected from {}", connection_id, canvas_id);
}
