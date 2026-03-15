import os
import time
import json
import logging
import mysql.connector
import redis
from datetime import datetime
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

# Configurar logs con colores básicos para la terminal
class CustomFormatter(logging.Formatter):
    green = "\x1b[32;20m"
    yellow = "\x1b[33;20m"
    red = "\x1b[31;20m"
    cyan = "\x1b[36;20m"
    reset = "\x1b[0m"
    format = "%(asctime)s - RECOMENDACIONES - %(message)s"

    FORMATS = {
        logging.DEBUG: cyan + format + reset,
        logging.INFO: green + format + reset,
        logging.WARNING: yellow + format + reset,
        logging.ERROR: red + format + reset,
        logging.CRITICAL: red + "\x1b[1m" + format + reset
    }

    def format(self, record):
        log_fmt = self.FORMATS.get(record.levelno)
        formatter = logging.Formatter(log_fmt)
        return formatter.format(record)

logger = logging.getLogger()
logger.setLevel(logging.INFO)
ch = logging.StreamHandler()
ch.setFormatter(CustomFormatter())
if logger.hasHandlers():
    logger.handlers.clear()
logger.addHandler(ch)

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
    logger.info("=====================================================")
    logger.info("[START] Iniciando ciclo de worker_recommendations...")
    db = get_db_connection()
    cursor = db.cursor(dictionary=True)
    redis_client = get_redis_connection()

    try:
        cursor.execute("SELECT id FROM users WHERE user_status = 'active'")
        users = cursor.fetchall()
        logger.info(f"Usuarios activos encontrados: {len(users)}")

        for user_row in users:
            user_id = user_row['id']
            logger.info(f"--- Procesando Perfil para Usuario ID: {user_id} ---")
            
            # --- FASE 1: PERFILADO ---
            query_history = """
                SELECT vt.tag_id, t.type, t.name, COUNT(*) as interacciones
                FROM user_watch_history uwh
                JOIN videos v ON uwh.video_id = v.id
                JOIN video_tags vt ON v.id = vt.video_id
                JOIN tags t ON vt.tag_id = t.id
                WHERE uwh.user_id = %s
                GROUP BY vt.tag_id, t.type, t.name
                ORDER BY interacciones DESC
                LIMIT 50
            """
            cursor.execute(query_history, (user_id,))
            top_tags = cursor.fetchall()
            
            if not top_tags:
                logger.warning(f"Usuario {user_id} NO tiene historial de tags/categorias. (Historial vacío)")
                continue

            logger.info(f"Usuario {user_id}: Encontrados {len(top_tags)} tags/categorías en su historial reciente.")
            
            cat_data = [t for t in top_tags if t['type'] == 'category']
            tag_data = [t for t in top_tags if t['type'] != 'category']

            logger.info(f" -> De esos, {len(cat_data)} son CATEGORÍAS y {len(tag_data)} son TAGS/MODELOS.")

            # Actualizar user_category_affinity
            if cat_data:
                max_cat = max(t['interacciones'] for t in cat_data)
                affinity_cat = []
                for cat in cat_data:
                    score = cat['interacciones'] / float(max_cat) if max_cat > 0 else 0
                    affinity_cat.append((user_id, cat['tag_id'], score))
                    logger.info(f"    [CAT AFINIDAD] User {user_id} -> Categoría '{cat['name']}' (ID:{cat['tag_id']}) Score: {score}")

                insert_cat = """
                    INSERT INTO user_category_affinity (user_id, category_id, affinity_score)
                    VALUES (%s, %s, %s)
                    ON DUPLICATE KEY UPDATE affinity_score = VALUES(affinity_score), last_updated = CURRENT_TIMESTAMP
                """
                cursor.executemany(insert_cat, affinity_cat)
                logger.info(f"    [SQL] Ejecutado INSERT/UPDATE en 'user_category_affinity' para {len(affinity_cat)} filas.")

            # Actualizar user_tag_affinity
            if tag_data:
                max_tag = max(t['interacciones'] for t in tag_data)
                affinity_tag = []
                for tag in tag_data:
                    score = tag['interacciones'] / float(max_tag) if max_tag > 0 else 0
                    affinity_tag.append((user_id, tag['tag_id'], score))

                insert_tag = """
                    INSERT INTO user_tag_affinity (user_id, tag_id, affinity_score)
                    VALUES (%s, %s, %s)
                    ON DUPLICATE KEY UPDATE affinity_score = VALUES(affinity_score), last_updated = CURRENT_TIMESTAMP
                """
                cursor.executemany(insert_tag, affinity_tag)

            db.commit()
            logger.info(f"Usuario {user_id}: Cambios guardados en base de datos correctamente.")

    except mysql.connector.Error as err:
        logger.error(f"[ERROR MYSQL] Código: {err.errno} - {err.msg}")
        db.rollback()
    except Exception as e:
        logger.error(f"[ERROR PYTHON] {e}")
        db.rollback()
    finally:
        cursor.close()
        db.close()
        logger.info("[END] Ciclo de recomendaciones finalizado.\n")

def run_worker():
    logger.info("Arrancando worker_recommendations.py...")
    while True:
        calculate_user_affinities_and_feed()
        time.sleep(30) # Reducido a 30 segundos solo para hacer pruebas rápidas

if __name__ == "__main__":
    run_worker()