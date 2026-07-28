use dashmap::{DashMap, DashSet};
use std::sync::Arc;
use tokio::sync::{Mutex, mpsc};
use deadpool_redis::Pool as RedisPool;
use sqlx::MySqlPool;

#[derive(Clone, Debug)]
pub struct ClientMeta {
    pub canvas_id: String,
    pub user_type: String,
    pub user_id: Option<String>,
}

#[derive(Clone)]
pub struct AppState {
    pub rooms: Arc<DashMap<String, DashSet<String>>>, // canvas_id -> set of connection_ids
    pub live_rooms: Arc<DashMap<String, DashSet<String>>>, // code -> set of connection_ids
    pub ws_meta: Arc<DashMap<String, ClientMeta>>, // connection_id -> ClientMeta
    pub tx_channels: Arc<DashMap<String, mpsc::Sender<String>>>, // connection_id -> Sender
    pub user_locks: Arc<DashMap<String, Arc<Mutex<()>>>>, // user_id -> Mutex lock
    pub redis_pool: RedisPool,
    pub db_pool: MySqlPool,
}

impl AppState {
    pub fn new(redis_pool: RedisPool, db_pool: MySqlPool) -> Self {
        Self {
            rooms: Arc::new(DashMap::new()),
            live_rooms: Arc::new(DashMap::new()),
            ws_meta: Arc::new(DashMap::new()),
            tx_channels: Arc::new(DashMap::new()),
            user_locks: Arc::new(DashMap::new()),
            redis_pool,
            db_pool,
        }
    }
}
