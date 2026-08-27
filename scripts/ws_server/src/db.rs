use sqlx::{MySqlPool, Row};
use std::env;

pub async fn get_canvas_config_from_db(
    db: &MySqlPool,
    canvas_id: &str,
) -> Result<(i32, i32, bool, i32, i32, i32), Box<dyn std::error::Error>> {
    let db_name = env::var("DB_CANVASES_NAME").unwrap_or_else(|_| "db_canvases".to_string());
    let query = format!(
        "SELECT owner_id, cooldown_pixels_batch, cooldown_seconds, is_subscription_locked, size FROM `{}`.`canvases` WHERE id = ? LIMIT 1",
        db_name
    );

    let row_opt = sqlx::query(&query).bind(canvas_id).fetch_optional(db).await?;

    if let Some(row) = row_opt {
        let owner_id: i32 = row.try_get("owner_id").unwrap_or(0);
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
        
        Ok((batch, sec, is_locked == 1, width, height, owner_id))
    } else {
        Ok((5, 10, false, 64, 64, 0))
    }
}

pub async fn get_canvas_config(
    state: &crate::state::AppState,
    canvas_id: &str,
) -> (i32, i32, bool, i32, i32, i32) {
    if let Some(entry) = state.canvas_configs.get(canvas_id) {
        let (config, timestamp) = entry.value();
        if timestamp.elapsed() < std::time::Duration::from_secs(5) {
            return *config;
        }
    }

    let config = get_canvas_config_from_db(&state.db_pool, canvas_id)
        .await
        .unwrap_or((5, 10, false, 64, 64, 0));

    state.canvas_configs.insert(canvas_id.to_string(), (config, std::time::Instant::now()));
    config
}

pub async fn check_is_canvas_owner(
    state: &crate::state::AppState,
    user_id: &str,
    canvas_id: &str,
) -> bool {
    if user_id.is_empty() || canvas_id.is_empty() {
        return false;
    }
    if let Ok(uid) = user_id.parse::<i32>() {
        let (_, _, _, _, _, owner_id) = get_canvas_config(state, canvas_id).await;
        return owner_id == uid;
    }
    false
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

pub async fn get_canvas_protections_db(db: &MySqlPool, canvas_id: &str) -> Vec<crate::models::ProtectedArea> {
    let db_name = env::var("DB_CANVASES_NAME").unwrap_or_else(|_| "db_canvases".to_string());
    let query = format!(
        "SELECT id, x1, y1, x2, y2, protected_by, UNIX_TIMESTAMP(expires_at) AS expires_at_unix FROM `{}`.`canvas_protections` WHERE canvas_id = ? AND (expires_at IS NULL OR expires_at > NOW())",
        db_name
    );
    match sqlx::query(&query).bind(canvas_id).fetch_all(db).await {
        Ok(rows) => {
            rows.into_iter().filter_map(|r| {
                let id: i32 = r.try_get("id").ok()?;
                let x1: i32 = r.try_get("x1").ok()?;
                let y1: i32 = r.try_get("y1").ok()?;
                let x2: i32 = r.try_get("x2").ok()?;
                let y2: i32 = r.try_get("y2").ok()?;
                let protected_by: Option<i32> = r.try_get("protected_by").ok();
                let expires_at: Option<i64> = r.try_get("expires_at_unix").ok().flatten();
                Some(crate::models::ProtectedArea { id, x1, y1, x2, y2, protected_by, expires_at })
            }).collect()
        }
        _ => vec![],
    }
}

pub async fn save_canvas_protection_db(
    db: &MySqlPool,
    canvas_id: &str,
    x1: i32,
    y1: i32,
    x2: i32,
    y2: i32,
    protected_by: Option<&str>,
    expires_in_secs: Option<i64>,
) -> Result<i32, sqlx::Error> {
    let db_name = env::var("DB_CANVASES_NAME").unwrap_or_else(|_| "db_canvases".to_string());
    let query = if expires_in_secs.is_some() {
        format!(
            "INSERT INTO `{}`.`canvas_protections` (canvas_id, x1, y1, x2, y2, protected_by, expires_at) VALUES (?, ?, ?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL ? SECOND))",
            db_name
        )
    } else {
        format!(
            "INSERT INTO `{}`.`canvas_protections` (canvas_id, x1, y1, x2, y2, protected_by, expires_at) VALUES (?, ?, ?, ?, ?, ?, NULL)",
            db_name
        )
    };
    
    let uid = protected_by.and_then(|u| u.parse::<i32>().ok());
    let mut q = sqlx::query(&query)
        .bind(canvas_id)
        .bind(x1)
        .bind(y1)
        .bind(x2)
        .bind(y2)
        .bind(uid);
        
    if let Some(secs) = expires_in_secs {
        q = q.bind(secs);
    }
    
    let res = q.execute(db).await?;
    Ok(res.last_insert_id() as i32)
}

pub async fn delete_canvas_protection_db(
    db: &MySqlPool,
    canvas_id: &str,
    x1: i32,
    y1: i32,
    x2: i32,
    y2: i32,
) -> Result<(), sqlx::Error> {
    let db_name = env::var("DB_CANVASES_NAME").unwrap_or_else(|_| "db_canvases".to_string());
    let query = format!(
        "DELETE FROM `{}`.`canvas_protections` WHERE canvas_id = ? AND x1 = ? AND y1 = ? AND x2 = ? AND y2 = ?",
        db_name
    );
    sqlx::query(&query)
        .bind(canvas_id)
        .bind(x1)
        .bind(y1)
        .bind(x2)
        .bind(y2)
        .execute(db)
        .await?;
    Ok(())
}

pub async fn delete_intersecting_rect_protections_db(
    db: &MySqlPool,
    canvas_id: &str,
    min_x: i32,
    min_y: i32,
    max_x: i32,
    max_y: i32,
) -> Result<Vec<crate::models::ProtectedArea>, sqlx::Error> {
    let db_name = env::var("DB_CANVASES_NAME").unwrap_or_else(|_| "db_canvases".to_string());
    let query_fetch = format!(
        "SELECT id, x1, y1, x2, y2, protected_by, UNIX_TIMESTAMP(expires_at) AS expires_at_unix FROM `{}`.`canvas_protections` WHERE canvas_id = ? AND (expires_at IS NULL OR expires_at > NOW())",
        db_name
    );
    let rows = sqlx::query(&query_fetch).bind(canvas_id).fetch_all(db).await?;
    let mut deleted = Vec::new();
    let mut deleted_ids = Vec::new();
    
    for r in rows {
        let id: i32 = r.try_get("id").unwrap_or(0);
        let x1: i32 = r.try_get("x1").unwrap_or(0);
        let y1: i32 = r.try_get("y1").unwrap_or(0);
        let x2: i32 = r.try_get("x2").unwrap_or(0);
        let y2: i32 = r.try_get("y2").unwrap_or(0);
        let protected_by: Option<i32> = r.try_get("protected_by").ok();
        let expires_at: Option<i64> = r.try_get("expires_at_unix").ok().flatten();
        
        let intersect = !(x2 < min_x || x1 > max_x || y2 < min_y || y1 > max_y);
        if intersect {
            deleted_ids.push(id);
            deleted.push(crate::models::ProtectedArea { id, x1, y1, x2, y2, protected_by, expires_at });
        }
    }
    
    if !deleted_ids.is_empty() {
        let placeholders = deleted_ids.iter().map(|_| "?").collect::<Vec<_>>().join(", ");
        let query_del = format!("DELETE FROM `{}`.`canvas_protections` WHERE id IN ({})", db_name, placeholders);
        let mut q = sqlx::query(&query_del);
        for id in deleted_ids {
            q = q.bind(id);
        }
        q.execute(db).await?;
    }
    
    Ok(deleted)
}

pub async fn delete_intersecting_circle_protections_db(
    db: &MySqlPool,
    canvas_id: &str,
    tx: i32,
    ty: i32,
    radius: i32,
) -> Result<Vec<crate::models::ProtectedArea>, sqlx::Error> {
    let db_name = env::var("DB_CANVASES_NAME").unwrap_or_else(|_| "db_canvases".to_string());
    let query_fetch = format!(
        "SELECT id, x1, y1, x2, y2, protected_by, UNIX_TIMESTAMP(expires_at) AS expires_at_unix FROM `{}`.`canvas_protections` WHERE canvas_id = ? AND (expires_at IS NULL OR expires_at > NOW())",
        db_name
    );
    let rows = sqlx::query(&query_fetch).bind(canvas_id).fetch_all(db).await?;
    let mut deleted = Vec::new();
    let mut deleted_ids = Vec::new();
    
    for r in rows {
        let id: i32 = r.try_get("id").unwrap_or(0);
        let x1: i32 = r.try_get("x1").unwrap_or(0);
        let y1: i32 = r.try_get("y1").unwrap_or(0);
        let x2: i32 = r.try_get("x2").unwrap_or(0);
        let y2: i32 = r.try_get("y2").unwrap_or(0);
        let protected_by: Option<i32> = r.try_get("protected_by").ok();
        let expires_at: Option<i64> = r.try_get("expires_at_unix").ok().flatten();
        
        let closest_x = tx.clamp(x1, x2);
        let closest_y = ty.clamp(y1, y2);
        
        let distance_x = tx - closest_x;
        let distance_y = ty - closest_y;
        
        let distance_squared = (distance_x * distance_x) + (distance_y * distance_y);
        let intersect = distance_squared <= (radius * radius);
        
        if intersect {
            deleted_ids.push(id);
            deleted.push(crate::models::ProtectedArea { id, x1, y1, x2, y2, protected_by, expires_at });
        }
    }
    
    if !deleted_ids.is_empty() {
        let placeholders = deleted_ids.iter().map(|_| "?").collect::<Vec<_>>().join(", ");
        let query_del = format!("DELETE FROM `{}`.`canvas_protections` WHERE id IN ({})", db_name, placeholders);
        let mut q = sqlx::query(&query_del);
        for id in deleted_ids {
            q = q.bind(id);
        }
        q.execute(db).await?;
    }
    
    Ok(deleted)
}

