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

logging.basicConfig(level=logging.INFO, format='%(asctime)s - TELEMETRY_WORKER - %(levelname)s - %(message)s')

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
    batch_size = 500 # Procesar de 500 en 500 para no ahogar MySQL
    
    try:
        # Obtener la longitud de la cola
        queue_len = redis_client.llen(queue_key)
        if queue_len == 0:
            return # No hay nada que procesar
            
        logging.info(f"Procesando lote de {min(queue_len, batch_size)} eventos de telemetría...")
        
        # Extraer elementos de la cola (LPOP múltiple)
        pipeline = redis_client.pipeline()
        pipeline.lrange(queue_key, 0, batch_size - 1)
        pipeline.ltrim(queue_key, batch_size, -1)
        results = pipeline.execute()
        
        raw_events = results[0]
        if not raw_events:
            return

        # Agrupar datos por video para hacer un solo UPDATE por video
        video_stats = {}
        
        for raw in raw_events:
            try:
                event = json.loads(raw)
                uuid = event.get('video_uuid')
                watch_time = float(event.get('watch_time', 0))
                percentage = float(event.get('percentage', 0))
                
                if not uuid: continue
                
                if uuid not in video_stats:
                    video_stats[uuid] = {'pings': 0, 'max_percentage': 0, 'total_watch_time': 0}
                    
                video_stats[uuid]['pings'] += 1
                # Acumulamos tiempo y guardamos el porcentaje máximo visto en esta sesión
                video_stats[uuid]['total_watch_time'] += 10 # Cada ping representa ~10 segundos de vista
                if percentage > video_stats[uuid]['max_percentage']:
                    video_stats[uuid]['max_percentage'] = percentage
                    
            except Exception as e:
                logging.warning(f"Error parseando evento JSON: {e}")

        # Traducir UUIDs a IDs de Base de datos
        uuids = list(video_stats.keys())
        if not uuids: return
        
        format_strings = ','.join(['%s'] * len(uuids))
        cursor.execute(f"SELECT id, uuid FROM videos WHERE uuid IN ({format_strings})", tuple(uuids))
        video_map = {row['uuid']: row['id'] for row in cursor.fetchall()}

        # Actualizar la tabla de métricas de rendimiento (video_performance_metrics)
        update_query = """
            INSERT INTO video_performance_metrics (video_id, avg_watch_time, completion_rate)
            VALUES (%s, %s, %s)
            ON DUPLICATE KEY UPDATE 
                avg_watch_time = (avg_watch_time + VALUES(avg_watch_time)) / 2,
                completion_rate = GREATEST(completion_rate, VALUES(completion_rate)),
                last_updated = CURRENT_TIMESTAMP
        """
        
        data_to_insert = []
        for uuid, stats in video_stats.items():
            if uuid in video_map:
                vid_id = video_map[uuid]
                # completion_rate se guarda como decimal (ej. 0.85 para 85%)
                comp_rate = min(stats['max_percentage'] / 100.0, 1.0) 
                data_to_insert.append((vid_id, stats['total_watch_time'], comp_rate))
                
        if data_to_insert:
            cursor.executemany(update_query, data_to_insert)
            db.commit()
            logging.info(f"Métricas actualizadas para {len(data_to_insert)} videos en MySQL.")

    except Exception as e:
        logging.error(f"Error procesando telemetría: {e}")
    finally:
        cursor.close()
        db.close()

def run_worker():
    logging.info("Worker de Telemetría iniciado. Escuchando cola en Redis...")
    while True:
        process_telemetry_batch()
        time.sleep(5) # Ciclo corto para mantener la base de datos fresca sin saturarla

if __name__ == "__main__":
    run_worker()