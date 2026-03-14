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
    logging.info("Iniciando el cálculo de rankings diarios...")
    db = None
    cursor = None
    try:
        db = get_db_connection()
        cursor = db.cursor(dictionary=True)
        redis_client = get_redis_connection()

        # 1. Obtener datos para calcular el Power Score.
        # En este algoritmo base sumamos Visitas, Likes y Suscriptores para determinar el poder.
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
       # 2. Calcular Power Score
        for channel in channels:
            # Convertimos explícitamente los valores a flotantes (y manejamos si vienen vacíos/None)
            views = float(channel['total_views'] or 0)
            likes = float(channel['total_likes'] or 0)
            subs = float(channel['total_subs'] or 0)
            
            # Fórmula: (Visitas * 0.4) + (Likes * 1.5) + (Subs * 3.0)
            score = (views * 0.4) + (likes * 1.5) + (subs * 3.0)
            channel['power_score'] = round(score, 4)

        # 3. Ordenar canales por Power Score (Descendente)
        ranked_channels = sorted(channels, key=lambda x: x['power_score'], reverse=True)

        # 4. Asignar nuevo rango, determinar tendencia (🟩 up, 🟥 down, ⬜ neutral) y actualizar BD
        today_date = datetime.now().strftime('%Y-%m-%d')
        top_100_redis = []

        for new_position, channel in enumerate(ranked_channels, start=1):
            user_id = channel['user_id']
            old_rank = channel['old_rank']
            
            # Determinar Tendencia
            trend = 'neutral'
            if old_rank is None or old_rank == new_position:
                trend = 'neutral'
            elif new_position < old_rank:
                trend = 'up' # Subió en el top (número menor es mejor)
            elif new_position > old_rank:
                trend = 'down' # Bajó en el top

            # Actualizar tabla de usuarios
            update_user_query = "UPDATE users SET previous_rank = %s, current_rank = %s, trend = %s WHERE id = %s"
            cursor.execute(update_user_query, (old_rank, new_position, trend, user_id))

            # Guardar en historial
            insert_history_query = """
                INSERT INTO channel_rankings_history (user_id, rank_position, power_score, recorded_at) 
                VALUES (%s, %s, %s, %s)
                ON DUPLICATE KEY UPDATE rank_position = %s, power_score = %s
            """
            cursor.execute(insert_history_query, (user_id, new_position, channel['power_score'], today_date, new_position, channel['power_score']))

            # Si está en el Top 100, guardarlo para Redis
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

        # 5. Sobrescribir el Top global en Redis
        redis_client.set('channel_rankings_top', json.dumps(top_100_redis))
        logging.info("Rankings calculados y guardados en MySQL y Redis exitosamente.")

    except Exception as e:
        if db:
            db.rollback()
        logging.error(f"Error procesando rankings: {e}")
    finally:
        if cursor:
            cursor.close()
        if db:
            db.close()

def run_worker():
    logging.info("Worker de Ranking iniciado en modo Always-On. Esperando las 00:00...")
    last_run_date = None

    while True:
        now = datetime.now()
        current_date = now.strftime('%Y-%m-%d')
        
        # Ejecutar si son las 00:00 (medianoche) y no se ha ejecutado hoy
        if now.hour == 0 and now.minute == 0 and last_run_date != current_date:
            calculate_daily_rankings()
            last_run_date = current_date
            
        # Dormir 30 segundos para no saturar el CPU
        time.sleep(30)

if __name__ == "__main__":
    run_worker()