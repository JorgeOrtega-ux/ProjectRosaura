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

logging.basicConfig(level=logging.INFO, format='%(asctime)s - [Video Worker] %(message)s')

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
    
    logging.info(f"🚀 INICIANDO PROCESAMIENTO | Video ID: {video_id} | UUID: {uuid}")
    logging.info(f"👤 ATENCIÓN: El ID de usuario extraído del Job de PHP es: '{user_id}'")
    
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
    
    channel_name = f"studio_updates_{user_id}"
    logging.info(f"📡 Publicando INICIO al canal Redis: {channel_name}")
    
    redis_client.publish(channel_name, json.dumps({
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
    
    cmd = [
        'ffmpeg', '-y', '-i', input_file,
        '-profile:v', 'main', '-vf', 'scale=-2:1080',
        '-c:v', 'libx264', '-crf', '20', '-preset', 'fast',
        '-c:a', 'aac', '-ar', '48000', '-b:a', '128k',
        '-f', 'hls', '-hls_time', '10', '-hls_playlist_type', 'vod',
        '-hls_segment_filename', os.path.join(output_dir, '1080p_%03d.ts'),
        master_playlist
    ]

    process = subprocess.Popen(cmd, stderr=subprocess.PIPE, universal_newlines=True, bufsize=1)
    
    time_pattern = re.compile(r"time=(\d+):(\d+):(\d+\.\d+)")
    last_reported_progress = 0
    last_cancel_check = time.time()
    was_cancelled = False
    buffer = ""

    logging.info("🎬 FFmpeg corriendo, esperando datos de progreso...")

    while True:
        char = process.stderr.read(1)
        
        current_time = time.time()
        if current_time - last_cancel_check > 2.0:
            last_cancel_check = current_time
            if redis_client.exists(cancel_key):
                logging.warning(f"Se detectó señal de CANCELACIÓN para {uuid}. Terminando FFmpeg...")
                process.terminate()
                was_cancelled = True
                break

        if not char and process.poll() is not None:
            break
            
        if char in ['\r', '\n']:
            line = buffer
            buffer = ""
            if not line:
                continue
                
            match = time_pattern.search(line)
            if match and duration > 0:
                hours, minutes, seconds = map(float, match.groups())
                current_time_vid = hours * 3600 + minutes * 60 + seconds
                progress = int((current_time_vid / duration) * 100)
                
                if progress >= last_reported_progress + 5 and progress <= 100:
                    last_reported_progress = progress
                    update_db_status(video_id, 'processing', progress)
                    logging.info(f"📊 Progreso: {progress}% -> Publicando en: {channel_name}")
                    redis_client.publish(channel_name, json.dumps({
                        "type": "progress",
                        "video_id": video_id,
                        "uuid": uuid,
                        "status": "processing",
                        "progress": progress
                    }))
        else:
            buffer += char

    process.wait()

    if was_cancelled:
        logging.info(f"Limpieza de archivos huérfanos post-cancelación para {uuid}.")
        redis_client.delete(cancel_key)
        if os.path.exists(output_dir):
            shutil.rmtree(output_dir, ignore_errors=True)
        try:
            if os.path.exists(input_file):
                os.remove(input_file)
        except OSError:
            pass
        return

    if process.returncode == 0:
        hls_public_path = f"/storage/videos/{uuid}/master.m3u8"
        
        conn = get_db_connection()
        if conn:
            cursor = conn.cursor()
            cursor.execute("UPDATE videos SET status = 'processed', processing_progress = 100, hls_path = %s WHERE id = %s", (hls_public_path, video_id))
            conn.commit()
            cursor.close()
            conn.close()

        logging.info("✅ Procesamiento completado al 100%")
        redis_client.publish(channel_name, json.dumps({
            "type": "completed",
            "video_id": video_id,
            "uuid": uuid,
            "status": "processed",
            "progress": 100
        }))
        
        try:
            os.remove(input_file)
        except OSError:
            pass
    else:
        logging.error(f"❌ Fallo al procesar {uuid}")
        update_db_status(video_id, 'failed')
        redis_client.publish(channel_name, json.dumps({
            "type": "failed",
            "video_id": video_id,
            "uuid": uuid,
            "status": "failed"
        }))

def main():
    redis_client = redis.Redis(host=REDIS_HOST, port=REDIS_PORT, password=REDIS_PASSWORD, decode_responses=True)
    logging.info("Esperando trabajos en la cola 'video_processing_queue'...")
    
    while True:
        try:
            result = redis_client.blpop('video_processing_queue', timeout=0)
            if result:
                job_data = json.loads(result[1])
                process_video(redis_client, job_data)
        except Exception as e:
            logging.error(f"Error en el worker: {e}")
            time.sleep(5)

if __name__ == "__main__":
    main()