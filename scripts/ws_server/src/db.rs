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
