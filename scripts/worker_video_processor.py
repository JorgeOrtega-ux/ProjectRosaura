# scripts/worker_video_processor.py

import os
import json
import time
import subprocess
import re
import logging
import shutil
from dotenv import load_dotenv
import redis
import mysql.connector
from mysql.connector import Error

logging.basicConfig(level=logging.INFO, format='%(asctime)s - [Video Processor] %(levelname)s - %(message)s')

load_dotenv()

# Configuración Redis
REDIS_HOST = os.getenv('REDIS_HOST', 'localhost')
REDIS_PORT = int(os.getenv('REDIS_PORT', 6379))
REDIS_PASSWORD = os.getenv('REDIS_PASSWORD', None)

# Configuración Base de Datos
DB_HOST = os.getenv('DB_HOST', 'localhost')
DB_USER = os.getenv('DB_USER', 'root')
DB_PASS = os.getenv('DB_PASS', '')
DB_NAME = os.getenv('DB_NAME', 'projectrosaura')

# Rutas de almacenamiento
HLS_OUTPUT_DIR = os.path.join(os.path.dirname(__file__), '..', 'public', 'storage', 'videos')

def get_db_connection():
    try:
        return mysql.connector.connect(
            host=DB_HOST,
            user=DB_USER,
            password=DB_PASS,
            database=DB_NAME
        )
    except Error as e:
        logging.error(f"Error conectando a MySQL: {e}")
        return None

def update_db_status(video_id, status, progress=0):
    conn = get_db_connection()
    if conn:
        try:
            cursor = conn.cursor()
            cursor.execute("""
                UPDATE videos 
                SET status = %s, processing_progress = %s 
                WHERE id = %s
            """, (status, progress, video_id))
            conn.commit()
            cursor.close()
        except Error as e:
            logging.error(f"Error actualizando DB: {e}")
        finally:
            conn.close()

def get_video_duration(file_path):
    try:
        cmd = ['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1', file_path]
        result = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
        return float(result.stdout)
    except Exception as e:
        logging.error(f"Error obteniendo duración: {e}")
        return 0.0

def process_video(redis_client, job):
    video_id = job.get('video_id')
    user_id = job.get('user_id')
    uuid = job.get('uuid')
    input_file = job.get('file_path')
    
    # Comprobar si fue cancelado antes de siquiera arrancar el procesamiento
    cancel_key = f"cancel_video_{video_id}"
    if redis_client.exists(cancel_key):
        logging.info(f"El video {uuid} ({video_id}) fue cancelado en cola. Saltando procesamiento.")
        redis_client.delete(cancel_key)
        return

    if not os.path.exists(input_file):
        logging.error(f"Archivo no encontrado: {input_file}")
        update_db_status(video_id, 'failed')
        return

    update_db_status(video_id, 'processing', 0)
    
    # Notificar inicio
    redis_client.publish(f"studio_updates_{user_id}", json.dumps({
        "type": "progress",
        "video_id": video_id,
        "uuid": uuid,
        "status": "processing",
        "progress": 0
    }))

    output_dir = os.path.join(HLS_OUTPUT_DIR, uuid)
    os.makedirs(output_dir, exist_ok=True)
    master_playlist = os.path.join(output_dir, 'master.m3u8')
    
    duration = get_video_duration(input_file)
    
    # Comando FFmpeg básico para HLS (1080p, puedes añadir más resoluciones mapeadas)
    cmd = [
        'ffmpeg', '-y', '-i', input_file,
        '-profile:v', 'main', '-vf', 'scale=-2:1080',
        '-c:v', 'libx264', '-crf', '20', '-preset', 'fast',
        '-c:a', 'aac', '-ar', '48000', '-b:a', '128k',
        '-f', 'hls', '-hls_time', '10', '-hls_playlist_type', 'vod',
        '-hls_segment_filename', os.path.join(output_dir, '1080p_%03d.ts'),
        master_playlist
    ]

    process = subprocess.Popen(cmd, stderr=subprocess.PIPE, universal_newlines=True)
    
    time_pattern = re.compile(r"time=(\d+):(\d+):(\d+\.\d+)")
    last_reported_progress = 0
    last_cancel_check = time.time()
    was_cancelled = False

    for line in process.stderr:
        # Verificar en Redis si PHP mandó la señal de cancelación (chequeo cada 2 segundos)
        current_time = time.time()
        if current_time - last_cancel_check > 2.0:
            last_cancel_check = current_time
            if redis_client.exists(cancel_key):
                logging.warning(f"Se detectó señal de CANCELACIÓN para {uuid}. Terminando FFmpeg...")
                process.terminate()
                was_cancelled = True
                break

        match = time_pattern.search(line)
        if match and duration > 0:
            hours, minutes, seconds = map(float, match.groups())
            current_time_vid = hours * 3600 + minutes * 60 + seconds
            progress = int((current_time_vid / duration) * 100)
            
            # Solo actualizar si el progreso cambia al menos un 5% para no saturar WebSockets/DB
            if progress >= last_reported_progress + 5 and progress <= 100:
                last_reported_progress = progress
                update_db_status(video_id, 'processing', progress)
                redis_client.publish(f"studio_updates_{user_id}", json.dumps({
                    "type": "progress",
                    "video_id": video_id,
                    "uuid": uuid,
                    "status": "processing",
                    "progress": progress
                }))

    process.wait()

    # Si se canceló durante el procesamiento, limpiamos todo de forma segura
    if was_cancelled:
        logging.info(f"Limpieza de archivos huérfanos post-cancelación para {uuid}.")
        redis_client.delete(cancel_key)
        # Forzar borrado de directorio HLS que pudo haber creado FFmpeg justo antes de morir
        if os.path.exists(output_dir):
            shutil.rmtree(output_dir, ignore_errors=True)
        # Limpieza de archivo original por seguridad
        try:
            if os.path.exists(input_file):
                os.remove(input_file)
        except OSError:
            pass
        return  # Terminamos la función de éxito y evitamos marcar estado 'failed'

    if process.returncode == 0:
        hls_public_path = f"/storage/videos/{uuid}/master.m3u8"
        
        # Actualizar a finalizado en BD
        conn = get_db_connection()
        if conn:
            cursor = conn.cursor()
            cursor.execute("UPDATE videos SET status = 'processed', processing_progress = 100, hls_path = %s WHERE id = %s", (hls_public_path, video_id))
            conn.commit()
            cursor.close()
            conn.close()

        redis_client.publish(f"studio_updates_{user_id}", json.dumps({
            "type": "completed",
            "video_id": video_id,
            "uuid": uuid,
            "status": "processed",
            "progress": 100
        }))
        logging.info(f"Video {uuid} procesado correctamente.")
        
        # Eliminar archivo temporal
        try:
            os.remove(input_file)
        except OSError:
            pass
    else:
        update_db_status(video_id, 'failed')
        redis_client.publish(f"studio_updates_{user_id}", json.dumps({
            "type": "failed",
            "video_id": video_id,
            "uuid": uuid,
            "status": "failed"
        }))
        logging.error(f"Fallo al procesar {uuid}")

def main():
    redis_client = redis.Redis(host=REDIS_HOST, port=REDIS_PORT, password=REDIS_PASSWORD, decode_responses=True)
    logging.info("Worker de Video iniciado. Esperando trabajos en la cola 'video_processing_queue'...")
    
    while True:
        try:
            # Lectura bloqueante: Espera hasta que haya algo en la cola
            result = redis_client.blpop('video_processing_queue', timeout=0)
            if result:
                job_data = json.loads(result[1])
                logging.info(f"Procesando trabajo: {job_data['uuid']}")
                process_video(redis_client, job_data)
        except Exception as e:
            logging.error(f"Error en el bucle del worker: {e}")
            time.sleep(5)

if __name__ == "__main__":
    main()