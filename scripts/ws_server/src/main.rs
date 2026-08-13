use axum::{routing::get, Router};
use std::env;
use tracing::info;
use deadpool_redis::{Config as RedisConfig, Runtime};
use sqlx::mysql::MySqlPoolOptions;

mod actions;
mod db;
mod handlers;
mod lua_scripts;
mod models;
mod helpers;
mod state;

use state::AppState;

#[tokio::main]
async fn main() {
    let _ = dotenvy::from_filename("../.env");
    let _ = dotenvy::from_filename("../.env.ws");

    tracing_subscriber::fmt::init();

    let host = env::var("WS_HOST").unwrap_or_else(|_| "0.0.0.0".to_string());
    let port = env::var("WS_PORT").unwrap_or_else(|_| "8765".to_string());
    let addr = format!("{}:{}", host, port);

    let redis_url = format!(
        "redis://:{}@{}:{}",
        env::var("REDIS_PASS").unwrap_or_default(),
        env::var("REDIS_HOST").unwrap_or_else(|_| "127.0.0.1".to_string()),
        env::var("REDIS_PORT").unwrap_or_else(|_| "6379".to_string())
    );
    let redis_cfg = RedisConfig::from_url(redis_url);
    let redis_pool = redis_cfg.create_pool(Some(Runtime::Tokio1)).expect("Failed to create Redis pool");

    let db_url = format!(
        "mysql://{}:{}@{}:{}/{}",
        env::var("DB_USER").unwrap_or_default(),
        env::var("DB_PASS").unwrap_or_default(),
        env::var("DB_HOST").unwrap_or_else(|_| "127.0.0.1".to_string()),
        env::var("DB_PORT").unwrap_or_else(|_| "3306".to_string()),
        env::var("DB_CANVASES_NAME").unwrap_or_default()
    );
    let db_pool = MySqlPoolOptions::new()
        .max_connections(32)
        .connect(&db_url)
        .await
        .expect("Failed to create MySQL pool");

    let app_state = AppState::new(redis_pool, db_pool);

    // Start background listeners
    tokio::spawn(helpers::admin_events_listener(app_state.clone()));
    tokio::spawn(helpers::sync_events_listener(app_state.clone()));
    tokio::spawn(helpers::sync_online_counts(app_state.clone()));
    tokio::spawn(helpers::support_events_listener(app_state.clone()));

    let app = Router::new()
        .route("/canvas/:canvas_id", get(handlers::ws_handler))
        .route("/support/:session_uuid", get(handlers::support_ws_handler))
        .with_state(app_state);

    info!("Starting Rust WebSocket server on ws://{}", addr);

    let listener = tokio::net::TcpListener::bind(&addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}
