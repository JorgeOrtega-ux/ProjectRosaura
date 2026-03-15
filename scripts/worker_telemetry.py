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
    purple = "\x1b[35;20m"
    reset = "\x1b[0m"
    format = "%(asctime)s - TELEMETRY - %(message)s"

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

def process_telemetry_batch():
    redis_client = get_redis_connection()
    db = get_db_connection()
    cursor = db.cursor(dictionary=True)
    
    queue_key = 'telemetry:watch_queue'
    batch_size = 500
    
    try:
        queue_len = redis_client.llen(queue_key)
        if queue_len == 0:
            return 
            
        logger.info("=====================================================")
        logger.info(f"Cola detectada con {queue_len} pings. Procesando un máximo de {batch_size}...")
        
        pipeline = redis_client.pipeline()
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
        
        format_strings = ','.join(['%s'] * len(uuids))
        cursor.execute(f"SELECT id, uuid FROM videos WHERE uuid IN ({format_strings})", tuple(uuids))
        video_map = {row['uuid']: row['id'] for row in cursor.fetchall()}
        logger.info(f"Se mapearon {len(video_map)} UUIDs a IDs de Base de Datos locales.")

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
                logger.info(f" -> [PREPARANDO MYSQL] Video ID {vid_id}: Tiempo acumulado={stats['total_watch_time']}s, Max Completado={comp_rate*100}%, ENG SCORE FINAL={eng_score}")
                
        if data_to_insert:
            cursor.executemany(update_query, data_to_insert)
            db.commit()
            logger.info(f"[ÉXITO] Ejecutado INSERT/UPDATE en 'video_performance_metrics' para {len(data_to_insert)} videos.")

    except mysql.connector.Error as err:
        logger.error(f"[ERROR MYSQL] Código: {err.errno} - {err.msg}")
        db.rollback()
    except Exception as e:
        logger.error(f"[ERROR PYTHON] {e}")
        db.rollback()
    finally:
        cursor.close()
        db.close()

def run_worker():
    logger.info("Arrancando worker_telemetry.py...")
    while True:
        process_telemetry_batch()
        time.sleep(5) 

if __name__ == "__main__":
    run_worker()