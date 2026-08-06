use sqlx::{MySqlPool, Row};
use std::env;

pub async fn get_canvas_config_from_db(
    db: &MySqlPool,
    canvas_id: &str,
) -> Result<(i32, i32, bool, i32, i32), Box<dyn std::error::Error>> {
    let db_name = env::var("DB_CANVASES_NAME").unwrap_or_else(|_| "db_canvases".to_string());
    let query = format!(
        "SELECT cooldown_pixels_batch, cooldown_seconds, is_subscription_locked, size FROM `{}`.`canvases` WHERE id = ? LIMIT 1",
        db_name
    );

    let row_opt = sqlx::query(&query).bind(canvas_id).fetch_optional(db).await?;

    if let Some(row) = row_opt {
        let batch: i32 = row.try_get("cooldown_pixels_batch").unwrap_or(5);
        let sec: i32 = row.try_get("cooldown_seconds").unwrap_or(10);
        let is_locked: i32 = row.try_get("is_subscription_locked").unwrap_or(0);
        
        let mut width = 64;
        let mut height = 64;
        if let Ok(size_str) = row.try_get::<String, _>("size") {
            let parts: Vec<&str> = size_str.split('x').collect();
            if let Some(w) = parts.first() {
                if let Ok(w_int) = w.parse::<i32>() {
                    width = w_int;
                    height = w_int;
                }
            }
            if let Some(h) = parts.get(1) {
                if let Ok(h_int) = h.parse::<i32>() {
                    height = h_int;
                }
            }
        }
        
        Ok((batch, sec, is_locked == 1, width, height))
    } else {
        Ok((5, 10, false, 64, 64))
    }
}

pub async fn get_canvas_config(
    state: &crate::state::AppState,
    canvas_id: &str,
) -> (i32, i32, bool, i32, i32) {
    if let Some(entry) = state.canvas_configs.get(canvas_id) {
        let (config, timestamp) = entry.value();
        if timestamp.elapsed() < std::time::Duration::from_secs(5) {
            return *config;
        }
    }

    let config = get_canvas_config_from_db(&state.db_pool, canvas_id)
        .await
        .unwrap_or((5, 10, false, 64, 64));

    state.canvas_configs.insert(canvas_id.to_string(), (config, std::time::Instant::now()));
    config
}

pub async fn check_is_canvas_owner(
    db: &MySqlPool,
    user_id: &str,
    canvas_id: &str,
) -> bool {
    if user_id.is_empty() || canvas_id.is_empty() {
        return false;
    }
    let db_name = env::var("DB_CANVASES_NAME").unwrap_or_else(|_| "db_canvases".to_string());
    let query = format!(
        "SELECT owner_id FROM `{}`.`canvases` WHERE id = ? LIMIT 1",
        db_name
    );

    match sqlx::query(&query).bind(canvas_id).fetch_optional(db).await {
        Ok(Some(row)) => {
            let owner_id: Result<i32, _> = row.try_get("owner_id");
            if let Ok(oid) = owner_id {
                if let Ok(uid) = user_id.parse::<i32>() {
                    return oid == uid;
                }
            }
            false
        }
        _ => false,
    }
}

pub async fn get_canvas_frozen_db(db: &MySqlPool, canvas_id: &str) -> bool {
    let db_name = env::var("DB_CANVASES_NAME").unwrap_or_else(|_| "db_canvases".to_string());
    let query = format!(
        "SELECT is_frozen FROM `{}`.`canvases` WHERE id = ? LIMIT 1",
        db_name
    );
    match sqlx::query(&query).bind(canvas_id).fetch_optional(db).await {
        Ok(Some(row)) => {
            let frozen: Result<i32, _> = row.try_get("is_frozen");
            frozen.unwrap_or(0) == 1
        }
        _ => false,
    }
}

pub async fn set_canvas_frozen_db(db: &MySqlPool, canvas_id: &str, is_frozen: bool) {
    let db_name = env::var("DB_CANVASES_NAME").unwrap_or_else(|_| "db_canvases".to_string());
    let query = format!(
        "UPDATE `{}`.`canvases` SET is_frozen = ? WHERE id = ?",
        db_name
    );
    let val = if is_frozen { 1 } else { 0 };
    let _ = sqlx::query(&query).bind(val).bind(canvas_id).execute(db).await;
}

pub async fn get_canvas_protections_db(db: &MySqlPool, canvas_id: &str) -> Vec<i32> {
    let db_name = env::var("DB_CANVASES_NAME").unwrap_or_else(|_| "db_canvases".to_string());
    let query = format!(
        "SELECT offset FROM `{}`.`canvas_protections` WHERE canvas_id = ? AND (expires_at IS NULL OR expires_at > NOW())",
        db_name
    );
    match sqlx::query(&query).bind(canvas_id).fetch_all(db).await {
        Ok(rows) => {
            rows.into_iter().filter_map(|r| r.try_get("offset").ok()).collect()
        }
        _ => vec![],
    }
}

pub async fn save_canvas_protections_db(db: &MySqlPool, canvas_id: &str, offsets: &[i32], protect: bool, user_id: Option<&str>) {
    save_canvas_protections_db_with_expiry(db, canvas_id, offsets, protect, user_id, None).await;
}

pub async fn save_canvas_protections_db_with_expiry(
    db: &MySqlPool,
    canvas_id: &str,
    offsets: &[i32],
    protect: bool,
    user_id: Option<&str>,
    expires_in_secs: Option<i64>
) {
    if canvas_id.is_empty() || offsets.is_empty() { return; }
    let db_name = env::var("DB_CANVASES_NAME").unwrap_or_else(|_| "db_canvases".to_string());
    
    if protect {
        let mut query = format!("INSERT INTO `{}`.`canvas_protections` (canvas_id, offset, protected_by, expires_at) VALUES ", db_name);
        let mut placeholders = Vec::new();
        for _ in 0..offsets.len() {
            if expires_in_secs.is_some() {
                placeholders.push("(?, ?, ?, DATE_ADD(NOW(), INTERVAL ? SECOND))");
            } else {
                placeholders.push("(?, ?, ?, NULL)");
            }
        }
        query.push_str(&placeholders.join(", "));
        query.push_str(" ON DUPLICATE KEY UPDATE protected_by = VALUES(protected_by), expires_at = VALUES(expires_at)");
        
        let mut q = sqlx::query(&query);
        let uid = user_id.and_then(|u| u.parse::<i32>().ok());
        for &offset in offsets {
            q = q.bind(canvas_id).bind(offset).bind(uid);
            if let Some(secs) = expires_in_secs {
                q = q.bind(secs);
            }
        }
        let _ = q.execute(db).await;
    } else {
        let placeholders = offsets.iter().map(|_| "?").collect::<Vec<_>>().join(", ");
        let query = format!("DELETE FROM `{}`.`canvas_protections` WHERE canvas_id = ? AND offset IN ({})", db_name, placeholders);
        
        let mut q = sqlx::query(&query).bind(canvas_id);
        for &offset in offsets {
            q = q.bind(offset);
        }
        let _ = q.execute(db).await;
    }
}

pub async fn consume_user_perk(_db: &MySqlPool, user_id: &str, perk_id: &str) -> bool {
    let api_url = match env::var("PHP_API_INTERNAL_URL") {
        Ok(val) => val,
        Err(_) => {
            tracing::error!("PHP_API_INTERNAL_URL env var not set");
            return false;
        }
    };
    let api_secret = env::var("INTERNAL_API_SECRET").unwrap_or_default();

    let client = reqwest::Client::new();
    let payload = serde_json::json!({
        "route": "internal.user.consume_perk",
        "user_id": user_id,
        "perk_id": perk_id
    });

    match client.post(&api_url)
        .header("X-Internal-API-Key", &api_secret)
        .header("Content-Type", "application/json")
        .json(&payload)
        .send()
        .await 
    {
        Ok(res) => {
            if res.status().is_success() {
                if let Ok(json_res) = res.json::<serde_json::Value>().await {
                    if let Some(success) = json_res.get("success").and_then(|v| v.as_bool()) {
                        return success;
                    }
                }
            } else {
                tracing::error!("Internal API consume_perk returned status code: {}", res.status());
            }
        }
        Err(e) => {
            tracing::error!("Failed to contact PHP API for consume_perk: {:?}", e);
        }
    }
    false
}
