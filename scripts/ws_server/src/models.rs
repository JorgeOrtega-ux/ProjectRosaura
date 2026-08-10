use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WsMessage {
    #[serde(rename = "type")]
    pub msg_type: String,
    
    // Generics used by multiple types
    pub canvas_id: Option<String>,
    pub user_id: Option<String>,
    pub username: Option<String>,
    pub is_typing: Option<bool>,
    
    // Pixel / Area
    pub x: Option<i32>,
    pub y: Option<i32>,
    pub x1: Option<i32>,
    pub y1: Option<i32>,
    pub x2: Option<i32>,
    pub y2: Option<i32>,
    pub width: Option<i32>,
    pub height: Option<i32>,
    pub color: Option<String>,
    pub pixels: Option<Vec<PixelData>>,
    
    // Protections
    pub protect: Option<bool>,
    pub offsets: Option<Vec<i32>>,
    
    // Cooldown
    pub balance: Option<i32>,
    pub max_batch: Option<i32>,
    pub cooldown_sec: Option<i32>,
    pub next_replenish_in: Option<f32>,
    
    // Live Share
    pub code: Option<String>,
    pub count: Option<usize>,
    pub empty: Option<bool>,
    pub img_url: Option<String>,
    pub w: Option<f32>,
    pub h: Option<f32>,
    pub opacity: Option<f32>,
    pub angle: Option<f32>,
    
    // Freeze
    pub frozen: Option<bool>,
    
    // Errors
    pub message: Option<String>,
    
    // Bombs
    #[serde(alias = "perk", rename = "perk")]
    pub perk_id: Option<String>,
    pub r: Option<i32>,
    pub radius: Option<i32>,
    pub duration: Option<i32>,
    pub targets: Option<Vec<BombTarget>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PixelData {
    pub x: i32,
    pub y: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BombTarget {
    pub x: i32,
    pub y: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CanvasConfig {
    pub batch: i32,
    pub sec: i32,
    pub is_locked: bool,
    pub width: i32,
}

use std::collections::HashMap;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PubSubSyncEvent {
    pub source_node: Option<String>,
    pub target_type: Option<String>,
    pub canvas_id: Option<String>,
    pub code: Option<String>,
    pub payload: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(transparent)]
pub struct PerksConfig {
    pub perks: HashMap<String, PerkData>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PerkData {
    pub id: Option<String>,
    pub r#type: Option<String>,
    pub category: Option<String>,
    pub warning_seconds: Option<i32>,
    pub radii: Option<HashMap<String, i32>>,
    pub spawning: Option<SpawningData>,
    pub explosion: Option<ExplosionData>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SpawningData {
    pub mode: Option<String>,
    pub count: Option<i32>,
    pub spread_radius: Option<i32>,
    pub jitter_delay: Option<f32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExplosionData {
    pub style: Option<String>,
    pub duration: Option<i32>,
    pub shake_duration: Option<i32>,
    pub flash_duration: Option<i32>,
    pub screen_shake: Option<bool>,
    pub screen_flash: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProtectedArea {
    pub id: i32,
    pub x1: i32,
    pub y1: i32,
    pub x2: i32,
    pub y2: i32,
    pub protected_by: Option<i32>,
    /// Unix timestamp (segundos) de expiración, o None si es permanente (owner)
    pub expires_at: Option<i64>,
}
