use sqlx::{MySqlPool, Row};
use std::env;

pub async fn get_canvas_config_from_db(
    db: &MySqlPool,
    canvas_id: &str,
) -> Result<(i32, i32, bool, i32), Box<dyn std::error::Error>> {
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
        if let Ok(size_str) = row.try_get::<String, _>("size") {
            let parts: Vec<&str> = size_str.split('x').collect();
            if let Some(w) = parts.first() {
                if let Ok(w_int) = w.parse::<i32>() {
                    width = w_int;
                }
            }
        }
        
        Ok((batch, sec, is_locked == 1, width))
    } else {
        Ok((5, 10, false, 64))
    }
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
        "SELECT offset FROM `{}`.`canvas_protections` WHERE canvas_id = ?",
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
    if canvas_id.is_empty() || offsets.is_empty() { return; }
    let db_name = env::var("DB_CANVASES_NAME").unwrap_or_else(|_| "db_canvases".to_string());
    
    if protect {
        let mut query = format!("INSERT IGNORE INTO `{}`.`canvas_protections` (canvas_id, offset, protected_by) VALUES ", db_name);
        let mut placeholders = Vec::new();
        for _ in 0..offsets.len() {
            placeholders.push("(?, ?, ?)");
        }
        query.push_str(&placeholders.join(", "));
        
        let mut q = sqlx::query(&query);
        let uid = user_id.and_then(|u| u.parse::<i32>().ok());
        for &offset in offsets {
            q = q.bind(canvas_id).bind(offset).bind(uid);
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

pub async fn consume_user_perk(db: &MySqlPool, user_id: &str, perk_id: &str) -> bool {
    let db_identity = env::var("DB_IDENTITY_NAME").unwrap_or_else(|_| "db_identity".to_string());
    
    let query_sel = format!(
        "SELECT id FROM `{}`.`user_perks` WHERE user_id = ? AND perk_id = ? AND is_used = 0 ORDER BY created_at ASC LIMIT 1",
        db_identity
    );
    
    let uid = user_id.parse::<i32>().unwrap_or(0);
    match sqlx::query(&query_sel).bind(uid).bind(perk_id).fetch_optional(db).await {
        Ok(Some(row)) => {
            if let Ok(perk_row_id) = row.try_get::<i32, _>("id") {
                let query_upd = format!("UPDATE `{}`.`user_perks` SET is_used = 1, used_at = NOW() WHERE id = ? AND is_used = 0", db_identity);
                if let Ok(res) = sqlx::query(&query_upd).bind(perk_row_id).execute(db).await {
                    return res.rows_affected() > 0;
                }
            }
        }
        Err(e) => {
            tracing::error!("consume_user_perk error: {:?}", e);
        }
        _ => {}
    }
    false
}
