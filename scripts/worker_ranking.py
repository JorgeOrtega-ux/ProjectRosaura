import os
import time
import json
import logging
import mysql.connector
import redis
from datetime import datetime
from dotenv import load_dotenv

# Cargar variables de entorno
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

# Configuración de Logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - RANKING_WORKER - %(levelname)s - %(message)s')

def get_db_connection():
    return mysql.connector.connect(
        host=os.getenv('DB_HOST', '127.0.0.1'),
        user=os.getenv('DB_USER', 'root'),
        password=os.getenv('DB_PASS', ''),
        database=os.getenv('DB_NAME', 'projectrosaura')
    )

def get_redis_connection():
    return redis.Redis(
        host=os.getenv('REDIS_HOST', '127.0.0.1'),
        port=int(os.getenv('REDIS_PORT', 6379)),
        password=os.getenv('REDIS_PASS', None),
        decode_responses=True
    )

def calculate_daily_rankings():
    logging.info("Iniciando el cálculo de rankings diarios de canales...")
    db = None
    cursor = None
    try:
        db = get_db_connection()
        cursor = db.cursor(dictionary=True)
        redis_client = get_redis_connection()

        # 1. Obtener datos para calcular el Power Score de Canales.
        query = """
            SELECT 
                u.id as user_id, 
                u.username,
                u.channel_identifier,
                u.profile_picture,
                u.current_rank as old_rank,
                IFNULL(SUM(v.views), 0) as total_views,
                IFNULL(SUM(v.likes), 0) as total_likes,
                (SELECT COUNT(*) FROM subscriptions WHERE channel_id = u.id) as total_subs
            FROM users u
            LEFT JOIN videos v ON u.id = v.user_id AND v.status = 'published'
            WHERE u.user_status = 'active'
            GROUP BY u.id
        """
        cursor.execute(query)
        channels = cursor.fetchall()

        # 2. Calcular Power Score
        for channel in channels:
            views = float(channel['total_views'] or 0)
            likes = float(channel['total_likes'] or 0)
            subs = float(channel['total_subs'] or 0)
            
            score = (views * 0.4) + (likes * 1.5) + (subs * 3.0)
            channel['power_score'] = round(score, 4)

        # 3. Ordenar canales por Power Score
        ranked_channels = sorted(channels, key=lambda x: x['power_score'], reverse=True)

        today_date = datetime.now().strftime('%Y-%m-%d')
        top_100_redis = []

        for new_position, channel in enumerate(ranked_channels, start=1):
            user_id = channel['user_id']
            old_rank = channel['old_rank']
            
            trend = 'neutral'
            if old_rank is None or old_rank == new_position:
                trend = 'neutral'
            elif new_position < old_rank:
                trend = 'up' 
            elif new_position > old_rank:
                trend = 'down'

            update_user_query = "UPDATE users SET previous_rank = %s, current_rank = %s, trend = %s WHERE id = %s"
            cursor.execute(update_user_query, (old_rank, new_position, trend, user_id))

            insert_history_query = """
                INSERT INTO channel_rankings_history (user_id, rank_position, power_score, recorded_at) 
                VALUES (%s, %s, %s, %s)
                ON DUPLICATE KEY UPDATE rank_position = %s, power_score = %s
            """
            cursor.execute(insert_history_query, (user_id, new_position, channel['power_score'], today_date, new_position, channel['power_score']))

            if new_position <= 100:
                top_100_redis.append({
                    'rank': new_position,
                    'previous_rank': old_rank,
                    'trend': trend,
                    'user_id': user_id,
                    'username': channel['username'],
                    'identifier': channel['channel_identifier'],
                    'avatar': channel['profile_picture'],
                    'score': channel['power_score']
                })

        db.commit()
        redis_client.set('channel_rankings_top', json.dumps(top_100_redis))
        logging.info("Rankings de canales calculados y guardados exitosamente.")

    except Exception as e:
        if db: db.rollback()
        logging.error(f"Error procesando rankings: {e}")
    finally:
        if cursor: cursor.close()
        if db: db.close()

# --- NUEVA FUNCIÓN: ALGORITMO DE TENDENCIAS (TRENDING) ---
def calculate_global_video_trending():
    logging.info("Calculando Puntuación de Tendencias (Engagement) para todos los videos...")
    db = get_db_connection()
    cursor = db.cursor(dictionary=True)
    
    try:
        # Obtenemos todos los videos públicos con sus métricas base
        query = """
            SELECT 
                v.id, v.views, v.likes, v.dislikes, v.created_at,
                IFNULL(vpm.completion_rate, 0) as completion_rate,
                IFNULL(vpm.ctr, 0.05) as ctr 
            FROM videos v
            LEFT JOIN video_performance_metrics vpm ON v.id = vpm.video_id
            WHERE v.status = 'published' AND v.visibility = 'public'
        """
        cursor.execute(query)
        videos = cursor.fetchall()
        
        now = datetime.now()
        data_to_update = []
        
        for vid in videos:
            views = float(vid['views'])
            likes = float(vid['likes'])
            dislikes = float(vid['dislikes'])
            completion = float(vid['completion_rate']) # Ejemplo: 0.60
            ctr = float(vid['ctr']) # Ejemplo: 0.08
            
            # Fórmula de Engagement Global:
            # Ponderación Fuerte a la Retención (Completion Rate) y CTR.
            # Los likes suman, los dislikes restan levemente.
            base_score = (views * ctr * 10) + (likes * 2.0) - (dislikes * 0.5)
            
            # Multiplicador de Retención (Si ven el 80% del video, el puntaje casi se duplica)
            retention_multiplier = 1.0 + (completion * 1.5)
            
            # Penalización por edad (Time Decay severo para tendencias)
            days_old = (now - vid['created_at']).days
            time_decay = max(0.01, 1.0 / (1.0 + (days_old * 0.2))) # Cae rápido para mantener el feed fresco
            
            final_engagement_score = round((base_score * retention_multiplier) * time_decay, 4)
            
            data_to_update.append((vid['id'], final_engagement_score))
        
        # Guardar el score actualizado en la base de datos
        update_query = """
            INSERT INTO video_performance_metrics (video_id, engagement_score)
            VALUES (%s, %s)
            ON DUPLICATE KEY UPDATE engagement_score = VALUES(engagement_score), last_updated = CURRENT_TIMESTAMP
        """
        if data_to_update:
            cursor.executemany(update_query, data_to_update)
            db.commit()
            
        logging.info(f"Engagement Score calculado para {len(data_to_update)} videos.")
        
    except Exception as e:
        if db: db.rollback()
        logging.error(f"Error procesando video trending: {e}")
    finally:
        cursor.close()
        db.close()

def run_worker():
    logging.info("Worker de Ranking iniciado en modo Always-On. Esperando cronograma...")
    last_run_date = None
    last_trend_run = 0

    while True:
        now = datetime.now()
        current_date = now.strftime('%Y-%m-%d')
        current_timestamp = time.time()
        
        # Ejecutar Rankings de Canales a las 00:00 (medianoche) [ORIGINAL]
        if now.hour == 0 and now.minute == 0 and last_run_date != current_date:
            calculate_daily_rankings()
            last_run_date = current_date
            
        # Ejecutar Cálculo de Tendencias de Videos cada 1 hora (3600 segundos) [NUEVO]
        if current_timestamp - last_trend_run > 3600:
            calculate_global_video_trending()
            last_trend_run = current_timestamp
            
        # Dormir 30 segundos para no saturar el CPU
        time.sleep(30)

if __name__ == "__main__":
    run_worker()