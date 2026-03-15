# scripts/worker_analytics.py
import os
import time
import json
import logging
import redis
import mysql.connector
from mysql.connector import Error
from datetime import datetime
from dotenv import load_dotenv

# Obtener ruta absoluta al .env
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
load_dotenv(os.path.join(BASE_DIR, '.env'))

# Configuración
SYNC_INTERVAL_SECONDS = 5

# --- Configurar logs con colores básicos para la terminal ---
class CustomFormatter(logging.Formatter):
    green = "\x1b[32;20m"
    yellow = "\x1b[33;20m"
    red = "\x1b[31;20m"
    purple = "\x1b[35;20m"
    reset = "\x1b[0m"
    format = "%(asctime)s - ANALYTICS - %(message)s"

    FORMATS = {
        logging.DEBUG: purple + format + reset,
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

# --- Conexiones Centralizadas ---
def get_redis_connection():
    try:
        r = redis.Redis(
            host=os.getenv('REDIS_HOST', '127.0.0.1'),
            port=int(os.getenv('REDIS_PORT', 6379)),
            password=os.getenv('REDIS_PASS', None),
            decode_responses=True
        )
        r.ping()
        return r
    except redis.ConnectionError as e:
        logger.error(f"[!] Error conectando a Redis: {e}")
        return None

def get_db_connection():
    try:
        conn = mysql.connector.connect(
            host=os.getenv('DB_HOST', '127.0.0.1'),
            user=os.getenv('DB_USER', 'root'),
            password=os.getenv('DB_PASS', ''),
            database=os.getenv('DB_NAME', 'projectrosaura')
        )
        return conn
    except Error as e:
        logger.error(f"[!] Error conectando a MySQL: {e}")
        return None

# =====================================================================
# BLOQUE 1: MÉTRICAS (Vistas, Reacciones y Retención)
# =====================================================================

def process_pending_views():
    r = get_redis_connection()
    if not r: return

    keys_to_process = []
    for key in r.scan_iter(match='video:views:*'):
        keys_to_process.append(key)

    if not keys_to_process:
        return 

    views_data = {}
    pipe = r.pipeline()
    for key in keys_to_process:
        pipe.execute_command('GETDEL', key)

    results = pipe.execute()

    for idx, key in enumerate(keys_to_process):
        video_id = int(key.split(':')[-1])
        val = results[idx]
        if val is not None:
            views_data[video_id] = int(val)

    if not views_data: return

    db = get_db_connection()
    if not db:
        logger.warning("[!] No se pudo procesar las visitas por error de BD.")
        return

    try:
        cursor = db.cursor()
        for vid, new_views in views_data.items():
            if new_views > 0:
                query = "UPDATE videos SET views = views + %s WHERE id = %s"
                cursor.execute(query, (new_views, vid))
        
        db.commit()
        logger.info(f"[+] Sincronizadas visitas de {len(views_data)} videos a la Base de Datos.")
        
    except Error as e:
        logger.error(f"[!] Error actualizando MySQL (views): {e}")
        db.rollback()
    finally:
        if db.is_connected():
            cursor.close()
            db.close()

def process_pending_comment_reactions():
    r = get_redis_connection()
    if not r: return

    pending_comments = r.smembers('pending_comment_reactions')
    if not pending_comments:
        return

    db = get_db_connection()
    if not db:
        logger.warning("[!] No se pudo procesar reacciones por error de BD.")
        return

    try:
        cursor = db.cursor()
        
        for comment_id in pending_comments:
            counters_key = f"comment:{comment_id}:counters"
            counters = r.hgetall(counters_key)
            if counters:
                likes = int(counters.get('like', 0))
                dislikes = int(counters.get('dislike', 0))
                
                update_query = "UPDATE video_comments SET likes = %s, dislikes = %s WHERE id = %s"
                cursor.execute(update_query, (likes, dislikes, comment_id))
            
            sync_users_key = f"comment:{comment_id}:sync_users"
            users_to_sync = r.smembers(sync_users_key)
            reaction_key = f"comment:{comment_id}:user_reaction"
            
            for user_id in users_to_sync:
                user_reaction = r.hget(reaction_key, user_id)
                
                if user_reaction:
                    upsert_query = """
                        INSERT INTO comment_reactions (comment_id, user_id, reaction_type)
                        VALUES (%s, %s, %s)
                        ON DUPLICATE KEY UPDATE reaction_type = VALUES(reaction_type)
                    """
                    cursor.execute(upsert_query, (comment_id, user_id, user_reaction))
                else:
                    del_query = "DELETE FROM comment_reactions WHERE comment_id = %s AND user_id = %s"
                    cursor.execute(del_query, (comment_id, user_id))
            
            r.delete(sync_users_key)
            
        r.delete('pending_comment_reactions')
        db.commit()
        logger.info(f"[+] Sincronizadas reacciones de {len(pending_comments)} comentarios a la BD.")

    except Error as e:
        logger.error(f"[!] Error actualizando MySQL (comment reactions): {e}")
        db.rollback()
    finally:
        if db.is_connected():
            cursor.close()
            db.close()

def process_pending_retention():
    r = get_redis_connection()
    if not r: return

    keys_to_process = []
    for key in r.scan_iter(match='video_heatmap:*'):
        keys_to_process.append(key)

    if not keys_to_process:
        return

    pipe = r.pipeline()
    for key in keys_to_process:
        pipe.hgetall(key)
        pipe.delete(key)
    
    results = pipe.execute()
    
    db = get_db_connection()
    if not db:
        logger.warning("[!] No se pudo procesar retention por error de BD.")
        return
    
    cursor = db.cursor()

    try:
        for idx, key in enumerate(keys_to_process):
            video_id = int(key.split(':')[-1])
            redis_data = results[idx * 2] 
            
            if not redis_data:
                continue
            
            cursor.execute("SELECT retention_data FROM video_retention_metrics WHERE video_id = %s", (video_id,))
            row = cursor.fetchone()
            
            if row and row[0]:
                if isinstance(row[0], str):
                    current_data = json.loads(row[0])
                else:
                    current_data = json.loads(row[0].decode('utf-8')) if isinstance(row[0], bytearray) else row[0]
            else:
                current_data = {str(i): 0 for i in range(100)}
            
            for chunk_idx, increment_str in redis_data.items():
                chunk_str = str(chunk_idx)
                increment = int(increment_str)
                if chunk_str in current_data:
                    current_data[chunk_str] += increment
                else:
                    current_data[chunk_str] = increment
            
            new_json = json.dumps(current_data)
            upsert_query = """
                INSERT INTO video_retention_metrics (video_id, retention_data) 
                VALUES (%s, %s) 
                ON DUPLICATE KEY UPDATE retention_data = VALUES(retention_data)
            """
            cursor.execute(upsert_query, (video_id, new_json))
            
        db.commit()
        logger.info(f"[+] Sincronizados heatmaps de {len(keys_to_process)} videos a la BD.")

    except Error as e:
        logger.error(f"[!] Error actualizando MySQL (retention metrics): {e}")
        db.rollback()
    finally:
        if db.is_connected():
            cursor.close()
            db.close()

# =====================================================================
# BLOQUE 2: TELEMETRÍA (Engagement, Watch Time, Completion Rate)
# =====================================================================

def process_telemetry_batch():
    r = get_redis_connection()
    if not r: return
    
    queue_key = 'telemetry:watch_queue'
    batch_size = 500
    
    try:
        queue_len = r.llen(queue_key)
        if queue_len == 0:
            return 
            
        logger.info("-----------------------------------------------------")
        logger.info(f"Cola detectada con {queue_len} pings. Procesando un máximo de {batch_size}...")
        
        pipeline = r.pipeline()
        pipeline.lrange(queue_key, 0, batch_size - 1)
        pipeline.ltrim(queue_key, batch_size, -1)
        results = pipeline.execute()
        
        raw_events = results[0]
        if not raw_events:
            return

        logger.info(f"Extracción exitosa. {len(raw_events)} eventos crudos obtenidos de Redis.")
        video_stats = {}
        
        for raw in raw_events:
            try:
                event = json.loads(raw)
                uuid = event.get('video_uuid')
                percentage = float(event.get('percentage', 0))
                
                if not uuid: continue
                
                if uuid not in video_stats:
                    video_stats[uuid] = {'pings': 0, 'max_percentage': 0, 'total_watch_time': 0}
                    
                video_stats[uuid]['pings'] += 1
                video_stats[uuid]['total_watch_time'] += 10 # 10 segundos por ping
                if percentage > video_stats[uuid]['max_percentage']:
                    video_stats[uuid]['max_percentage'] = percentage
                    
            except Exception as e:
                logger.warning(f"Error parseando JSON: {e}")

        uuids = list(video_stats.keys())
        if not uuids: return
        
        db = get_db_connection()
        if not db:
            logger.warning("[!] No se pudo conectar a BD para guardar telemetría.")
            return

        cursor = db.cursor(dictionary=True)
        
        format_strings = ','.join(['%s'] * len(uuids))
        cursor.execute(f"SELECT id, uuid FROM videos WHERE uuid IN ({format_strings})", tuple(uuids))
        video_map = {row['uuid']: row['id'] for row in cursor.fetchall()}
        logger.info(f"Se mapearon {len(video_map)} UUIDs a IDs de BD locales.")

        update_query = """
            INSERT INTO video_performance_metrics (video_id, avg_watch_time, completion_rate, engagement_score)
            VALUES (%s, %s, %s, %s)
            ON DUPLICATE KEY UPDATE 
                avg_watch_time = (avg_watch_time + VALUES(avg_watch_time)) / 2,
                completion_rate = GREATEST(completion_rate, VALUES(completion_rate)),
                engagement_score = VALUES(engagement_score),
                last_updated = CURRENT_TIMESTAMP
        """
        
        data_to_insert = []
        for uuid, stats in video_stats.items():
            if uuid in video_map:
                vid_id = video_map[uuid]
                comp_rate = min(stats['max_percentage'] / 100.0, 1.0) 
                
                # Formula Engagement
                eng_score = (comp_rate * 100.0) + (stats['total_watch_time'] / 60.0)
                
                data_to_insert.append((vid_id, stats['total_watch_time'], comp_rate, eng_score))
                logger.info(f" -> [PREPARANDO MYSQL] Video ID {vid_id}: Tiempo={stats['total_watch_time']}s, Completado={comp_rate*100}%, ENG SCORE={eng_score}")
                
        if data_to_insert:
            # Recreamos el cursor sin formato diccionario para el executemany
            cursor.close()
            cursor = db.cursor()
            cursor.executemany(update_query, data_to_insert)
            db.commit()
            logger.info(f"[ÉXITO] Ejecutado INSERT/UPDATE en 'video_performance_metrics' para {len(data_to_insert)} videos.")

    except Error as err:
        logger.error(f"[ERROR MYSQL - Telemetría] Código: {err.errno} - {err.msg}")
        if 'db' in locals() and db and db.is_connected():
            db.rollback()
    except Exception as e:
        logger.error(f"[ERROR PYTHON - Telemetría] {e}")
        if 'db' in locals() and db and db.is_connected():
            db.rollback()
    finally:
        if 'cursor' in locals() and cursor:
            try: cursor.close()
            except: pass
        if 'db' in locals() and db and db.is_connected():
            db.close()

# =====================================================================
# BUCLE PRINCIPAL Y AISLAMIENTO DE FALLOS
# =====================================================================

def run_worker():
    logger.info(f"[*] Worker de Analíticas (Métricas + Telemetría) Iniciado.")
    logger.info(f"[*] Sincronizando cada {SYNC_INTERVAL_SECONDS} segundos.")
    
    while True:
        # 1. Bloque de Métricas Básicas (Vistas, Retención, Reacciones)
        try:
            process_pending_views()
            process_pending_comment_reactions()
            process_pending_retention()
        except Exception as e:
            logger.error(f"[!] Error crítico en el bloque de Métricas: {e}")
        
        # 2. Bloque de Telemetría (Ping, Engagement)
        try:
            process_telemetry_batch()
        except Exception as e:
            logger.error(f"[!] Error crítico en el bloque de Telemetría: {e}")
        
        time.sleep(SYNC_INTERVAL_SECONDS)

if __name__ == "__main__":
    run_worker()