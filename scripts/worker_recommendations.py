import os
import time
import json
import logging
import mysql.connector
import redis
from datetime import datetime, timedelta
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))
logging.basicConfig(level=logging.INFO, format='%(asctime)s - RECOMENDACIONES - %(levelname)s - %(message)s')

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

def calculate_user_affinities_and_feed():
    logging.info("Iniciando cálculo de perfiles de afinidad y generación de Feeds...")
    db = get_db_connection()
    cursor = db.cursor(dictionary=True)
    redis_client = get_redis_connection()

    try:
        # 1. Obtener usuarios que se han conectado recientemente (ej. últimos 7 días)
        # Para simplificar en esta versión, tomamos usuarios activos.
        cursor.execute("SELECT id FROM users WHERE user_status = 'active'")
        users = cursor.fetchall()

        for user_row in users:
            user_id = user_row['id']
            
            # --- FASE 1: PERFILADO (Calculamos qué le gusta al usuario basado en historial) ---
            # Obtenemos los tags de los videos que el usuario ha interactuado positivamente o visto
            query_history = """
                SELECT vt.tag_id, COUNT(*) as interacciones
                FROM user_watch_history uwh
                JOIN videos v ON uwh.video_id = v.id
                JOIN video_tags vt ON v.id = vt.video_id
                WHERE uwh.user_id = %s
                GROUP BY vt.tag_id
                ORDER BY interacciones DESC
                LIMIT 10
            """
            cursor.execute(query_history, (user_id,))
            top_tags = cursor.fetchall()
            
            # Actualizamos la tabla de afinidad
            if top_tags:
                affinity_data = []
                max_interact = max(t['interacciones'] for t in top_tags)
                for tag in top_tags:
                    # Normalizamos el score entre 0 y 1
                    score = tag['interacciones'] / float(max_interact) if max_interact > 0 else 0
                    affinity_data.append((user_id, tag['tag_id'], score))

                insert_affinity = """
                    INSERT INTO user_tag_affinity (user_id, tag_id, affinity_score)
                    VALUES (%s, %s, %s)
                    ON DUPLICATE KEY UPDATE affinity_score = VALUES(affinity_score), last_updated = CURRENT_TIMESTAMP
                """
                cursor.executemany(insert_affinity, affinity_data)
                db.commit()

            # --- FASE 2: GENERACIÓN DE CANDIDATOS (Recomendaciones) ---
            # Buscamos videos publicados con los tags preferidos del usuario, 
            # que no haya visto recientemente, ordenados por Engagement Global y Frescura.
            tag_ids = [t['tag_id'] for t in top_tags]
            
            if not tag_ids:
                continue # Usuario sin historial, usará el Cold Start general de Redis

            format_strings = ','.join(['%s'] * len(tag_ids))
            
            # Buscamos Horizontal y Vertical por separado
            orientations = ['horizontal', 'vertical']
            for orientation in orientations:
                query_candidates = f"""
                    SELECT DISTINCT v.id, v.created_at, IFNULL(vpm.engagement_score, 0) as score
                    FROM videos v
                    JOIN video_tags vt ON v.id = vt.video_id
                    LEFT JOIN video_performance_metrics vpm ON v.id = vpm.video_id
                    LEFT JOIN user_watch_history uwh ON v.id = uwh.video_id AND uwh.user_id = %s
                    WHERE v.status = 'published' AND v.visibility = 'public' 
                    AND v.orientation = %s
                    AND vt.tag_id IN ({format_strings})
                    AND (uwh.last_watched_at IS NULL OR uwh.last_watched_at < DATE_SUB(NOW(), INTERVAL 7 DAY))
                    LIMIT 200
                """
                
                # Parámetros: user_id (para LEFT JOIN uwh), orientation, y luego la lista de tag_ids
                params = [user_id, orientation] + tag_ids
                cursor.execute(query_candidates, tuple(params))
                candidates = cursor.fetchall()

                # --- FASE 3: SCORING Y RE-RANKING (Puntuación final) ---
                final_feed = []
                now = datetime.now()
                for cand in candidates:
                    base_score = float(cand['score'])
                    # Time Decay: Impulso a videos más nuevos. 
                    days_old = (now - cand['created_at']).days
                    time_multiplier = max(0.2, 1.0 - (days_old * 0.01)) # Decae un 1% por día hasta un piso del 20%
                    
                    final_score = base_score * time_multiplier
                    final_feed.append({'id': cand['id'], 'score': final_score})

                # Ordenar por el score final calculado
                final_feed = sorted(final_feed, key=lambda x: x['score'], reverse=True)
                
                # Extraer solo los IDs del Top 50
                top_50_ids = [item['id'] for item in final_feed[:50]]
                
                # --- FASE 4: GUARDADO EN REDIS ---
                if top_50_ids:
                    redis_key = f"feed:user:{user_id}:{orientation}"
                    redis_client.setex(redis_key, 3600, json.dumps(top_50_ids)) # Caduca en 1 hora

        logging.info("Generación de feeds personalizados completada.")

    except Exception as e:
        logging.error(f"Error en worker de recomendaciones: {e}")
    finally:
        cursor.close()
        db.close()

def run_worker():
    logging.info("Worker de Recomendaciones iniciado. Ejecutando ciclo cada 30 minutos...")
    while True:
        calculate_user_affinities_and_feed()
        time.sleep(1800) # 30 minutos

if __name__ == "__main__":
    run_worker()