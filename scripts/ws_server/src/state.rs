use dashmap::{DashMap, DashSet};
use std::sync::Arc;
use tokio::sync::{Mutex, mpsc, broadcast};
use deadpool_redis::Pool as RedisPool;
use sqlx::MySqlPool;
use tokio::task::JoinHandle;
use crate::models::PerksConfig;

#[derive(Clone, Debug)]
pub enum OutboundMessage {
    Text {
        payload: String,
        exclude_connection: Option<String>,
    },
    Binary {
        payload: Vec<u8>,
        exclude_connection: Option<String>,
    },
    Close,
}

#[derive(Clone, Debug)]
pub struct ClientMeta {
    pub canvas_id: String,
    pub user_type: String,
    pub user_id: Option<String>,
}

#[derive(Clone)]
pub struct AppState {
    pub rooms: Arc<DashMap<String, DashSet<String>>>, // canvas_id -> set of connection_ids
    pub room_broadcasts: Arc<DashMap<String, broadcast::Sender<OutboundMessage>>>, // canvas_id -> broadcast sender
    pub live_rooms: Arc<DashMap<String, DashSet<String>>>, // code -> set of connection_ids
    pub ws_meta: Arc<DashMap<String, ClientMeta>>, // connection_id -> ClientMeta
    pub tx_channels: Arc<DashMap<String, mpsc::Sender<OutboundMessage>>>, // connection_id -> Sender (direct msgs)
    pub user_locks: Arc<DashMap<String, Arc<Mutex<()>>>>, // user_id -> Mutex lock
    pub owner_conns: Arc<DashMap<String, String>>, // connection_id -> code
    pub grace_sessions: Arc<DashMap<String, JoinHandle<()>>>, // code -> JoinHandle
    pub redis_pool: RedisPool,
    pub db_pool: MySqlPool,
    pub perks_config: Arc<Mutex<Option<PerksConfig>>>,
    pub user_perk_cooldowns: Arc<DashMap<String, std::time::Instant>>,
    pub node_id: String,
}

impl AppState {
    pub fn new(redis_pool: RedisPool, db_pool: MySqlPool) -> Self {
        Self {
            rooms: Arc::new(DashMap::new()),
            room_broadcasts: Arc::new(DashMap::new()),
            live_rooms: Arc::new(DashMap::new()),
            ws_meta: Arc::new(DashMap::new()),
            tx_channels: Arc::new(DashMap::new()),
            user_locks: Arc::new(DashMap::new()),
            owner_conns: Arc::new(DashMap::new()),
            grace_sessions: Arc::new(DashMap::new()),
            redis_pool,
            db_pool,
            perks_config: Arc::new(Mutex::new(None)),
            user_perk_cooldowns: Arc::new(DashMap::new()),
            node_id: uuid::Uuid::new_v4().to_string(),
        }
    }
}
