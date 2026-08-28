use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WsMessage {
    #[serde(rename = "type")]
    pub msg_type: String,
    
    // Generics used by multiple types
    pub canvas_id: Option<String>,
    pub user_id: Option<String>,
    pub username: Option<String>,
    pub avatar: Option<String>,
    pub sub_bg: Option<String>,
    pub is_typing: Option<bool>,
    pub is_drawing: Option<bool>,
    pub role: Option<String>,
    pub t: Option<u64>,
    
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
    pub version: Option<String>,
    
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

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PubSubSyncEvent {
    pub source_node: Option<String>,
    pub target_type: Option<String>,
    pub canvas_id: Option<String>,
    pub code: Option<String>,
    pub payload: Option<String>,
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
