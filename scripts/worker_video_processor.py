# scripts/worker_video_processor.py

import os
import json
import time
import subprocess
import re
import logging
import shutil
import math
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

def get_video_info(file_path):
    """Obtiene dimensiones, duración y verifica si existe audio en el video original."""
    try:
        cmd = ['ffprobe', '-v', 'error', '-show_entries', 'stream=codec_type,width,height,duration', '-of', 'json', file_path]
        result = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        info = json.loads(result.stdout)
        
        width = 0
        height = 0
        duration = 0.0
        has_audio = False
        
        for stream in info.get('streams', []):
            if stream.get('codec_type') == 'video':
                width = max(width, int(stream.get('width', 0)))
                height = max(height, int(stream.get('height', 0)))
                if 'duration' in stream:
                    try:
                        duration = max(duration, float(stream['duration']))
                    except ValueError:
                        pass
            elif stream.get('codec_type') == 'audio':
                has_audio = True
        
        if duration == 0.0:
            cmd_fmt = ['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'json', file_path]
            res_fmt = subprocess.run(cmd_fmt, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
            info_fmt = json.loads(res_fmt.stdout)
            try:
                duration = float(info_fmt.get('format', {}).get('duration', 0.0))
            except (ValueError, TypeError):
                pass
                
        return width, height, duration, has_audio
    except Exception as e:
        logging.error(f"Error obteniendo info de video: {e}")
        return 0, 0, 0.0, False

def generate_sprite_sheet(input_file, uuid, duration, orig_width, orig_height):
    """Genera un sprite sheet y su archivo WebVTT con las coordenadas para la preview de scrubbing."""
    try:
        output_dir = os.path.join(HLS_OUTPUT_DIR, uuid)
        os.makedirs(output_dir, exist_ok=True)
        
        sprite_filename = "sprite.jpg"
        vtt_filename = "thumbnails.vtt"
        sprite_path = os.path.join(output_dir, sprite_filename)
        vtt_path_full = os.path.join(output_dir, vtt_filename)
        
        interval = 2 # CAMBIO: 1 thumbnail cada 2 segundos para sincronización exacta y extrema fluidez
        w = 160
        
        if orig_width == 0: orig_width = 1280
        if orig_height == 0: orig_height = 720
        h = int((orig_height / orig_width) * w)
        
        total_thumbs = int(duration / interval) + 1
        columns = 10
        rows = math.ceil(total_thumbs / columns)
        if rows == 0: rows = 1
        
        cmd = [
            'ffmpeg', '-y', '-i', input_file,
            '-filter_complex', f"fps=1/{interval},scale={w}:{h},tile={columns}x{rows}",
            '-frames:v', '1',
            '-q:v', '2',
            sprite_path
        ]
        subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        
        if os.path.exists(sprite_path):
            with open(vtt_path_full, 'w') as vtt:
                vtt.write("WEBVTT\n\n")
                for i in range(total_thumbs):
                    start_time = i * interval
                    end_time = min((i + 1) * interval, duration)
                    
                    def format_time(seconds):
                        hrs = int(seconds // 3600)
                        mins = int((seconds % 3600) // 60)
                        secs = seconds % 60
                        return f"{hrs:02d}:{mins:02d}:{secs:06.3f}"
                    
                    col = i % columns
                    row = i // columns
                    x = col * w
                    y = row * h
                    
                    vtt.write(f"{format_time(start_time)} --> {format_time(end_time)}\n")
                    vtt.write(f"sprite.jpg#xywh={x},{y},{w},{h}\n\n")
                    
            logging.info(f"🎞️ Sprite sheet y VTT generados para {uuid}")
            return f"/storage/videos/{uuid}/{sprite_filename}", f"/storage/videos/{uuid}/{vtt_filename}"
    except Exception as e:
        logging.error(f"Error generando sprite sheet: {e}")
        
    return None, None

def generate_thumbnails(input_file, uuid, duration, is_vertical=False):
    """Genera 6 miniaturas distribuidas a lo largo del video y retorna sus rutas relativas."""
    generated_paths = []
    try:
        output_dir = os.path.join(HLS_OUTPUT_DIR, '..', 'thumbnails', 'generated', uuid)
        os.makedirs(output_dir, exist_ok=True)
        
        interval = duration / 7
        if interval <= 0:
            interval = 1
            
        resolution = '720x1280' if is_vertical else '1280x720'
            
        for i in range(1, 7):
            target_time = i * interval
            out_path = os.path.join(output_dir, f"thumb_{i}.jpg")
            cmd = [
                'ffmpeg', '-y', '-ss', str(target_time), 
                '-i', input_file, 
                '-vframes', '1', 
                '-q:v', '2', 
                '-s', resolution, 
                out_path
            ]
            subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            
            if os.path.exists(out_path):
                generated_paths.append(f"/storage/thumbnails/generated/{uuid}/thumb_{i}.jpg")
                
        logging.info(f"📸 6 Miniaturas generadas de forma inteligente ({resolution}) para {uuid}")
    except Exception as e:
        logging.error(f"Error generando miniaturas: {e}")
        
    return generated_paths

def process_video(redis_client, job):
    video_id = job.get('video_id')
    user_id = job.get('user_id')
    uuid = job.get('uuid')
    input_file = job.get('file_path')
    
    logging.info(f"🚀 INICIANDO PROCESAMIENTO | Video ID: {video_id} | UUID: {uuid}")
    
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
    redis_client.publish(channel_name, json.dumps({
        "type": "progress", "video_id": video_id, "uuid": uuid, "status": "processing", "progress": 0
    }))

    width, height, duration, has_audio = get_video_info(input_file)
    if duration <= 0:
        logging.error(f"No se pudo leer el archivo de video {uuid}")
        update_db_status(video_id, 'failed')
        return

    is_vertical = height > width
    orientation = 'vertical' if is_vertical else 'horizontal'

    output_dir = os.path.join(HLS_OUTPUT_DIR, uuid)
    os.makedirs(output_dir, exist_ok=True)
    
    ALL_QUALITIES = [
        {"name": "2160p", "height": 2160, "vrate": "15000k", "arate": "192k"},
        {"name": "1440p", "height": 1440, "vrate": "8000k", "arate": "192k"},
        {"name": "1080p", "height": 1080, "vrate": "5000k", "arate": "128k"},
        {"name": "720p", "height": 720, "vrate": "2800k", "arate": "128k"},
        {"name": "480p", "height": 480, "vrate": "1400k", "arate": "128k"},
        {"name": "360p", "height": 360, "vrate": "800k", "arate": "96k"},
        {"name": "240p", "height": 240, "vrate": "400k", "arate": "64k"},
        {"name": "144p", "height": 144, "vrate": "200k", "arate": "64k"},
    ]
    
    target_qualities = [q for q in ALL_QUALITIES if q['height'] <= height + 50]
    
    if not target_qualities:
        target_qualities = [ALL_QUALITIES[-1]]
        
    logging.info(f"🎞️ Resolución original detectada: {width}x{height} | Orientación: {orientation} | Duración: {duration}s")
    logging.info(f"⚙️ Construyendo multi-HLS para: {[q['name'] for q in target_qualities]}")

    cmd = ['ffmpeg', '-y', '-i', input_file]
    
    filter_complex = []
    map_args = []
    var_stream_map = []

    for i, q in enumerate(target_qualities):
        os.makedirs(os.path.join(output_dir, q['name']), exist_ok=True)
        
        filter_complex.append(f"[0:v]scale=-2:{q['height']}[vout{i}]")
        
        map_args.extend([
            '-map', f"[vout{i}]",
            f"-c:v:{i}", "libx264",
            f"-b:v:{i}", q['vrate'],
            f"-maxrate:{i}", q['vrate'],
            f"-bufsize:{i}", q['vrate'],
            "-crf", "20",
            "-preset", "fast"
        ])
        
        if has_audio:
            map_args.extend([
                '-map', "0:a:0",
                f"-c:a:{i}", "aac",
                f"-b:a:{i}", q['arate'],
                "-ar", "48000"
            ])
            var_stream_map.append(f"v:{i},a:{i},name:{q['name']}")
        else:
            var_stream_map.append(f"v:{i},name:{q['name']}")

    cmd.extend(['-filter_complex', ";".join(filter_complex)])
    cmd.extend(map_args)
    cmd.extend([
        '-f', 'hls',
        '-hls_time', '10',
        '-hls_playlist_type', 'vod',
        '-hls_flags', 'independent_segments',
        '-master_pl_name', 'master.m3u8',
        '-hls_segment_filename', os.path.join(output_dir, '%v', 'segment_%03d.ts'),
        '-var_stream_map', " ".join(var_stream_map),
        os.path.join(output_dir, '%v', 'playlist.m3u8')
    ])

    process = subprocess.Popen(cmd, stderr=subprocess.PIPE, universal_newlines=True, bufsize=1)
    
    time_pattern = re.compile(r"time=(\d+):(\d+):(\d+\.\d+)")
    last_reported_progress = 0
    last_cancel_check = time.time()
    was_cancelled = False
    buffer = ""

    logging.info("🎬 FFmpeg renderizando HLS Multi-Resolución...")

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
                    redis_client.publish(channel_name, json.dumps({
                        "type": "progress", "video_id": video_id, "uuid": uuid, "status": "processing", "progress": progress
                    }))
        else:
            buffer += char

    process.wait()

    if was_cancelled:
        redis_client.delete(cancel_key)
        if os.path.exists(output_dir): shutil.rmtree(output_dir, ignore_errors=True)
        try: os.remove(input_file)
        except OSError: pass
        return

    if process.returncode == 0:
        hls_public_path = f"/storage/videos/{uuid}/master.m3u8"
        
        # Generar miniaturas estándar
        generated_paths = generate_thumbnails(input_file, uuid, duration, is_vertical)
        thumbs_json = json.dumps(generated_paths) if generated_paths else None
        
        # Generar Sprite Sheet y VTT
        sprite_sheet_path, vtt_path = generate_sprite_sheet(input_file, uuid, duration, width, height)
        
        conn = get_db_connection()
        if conn:
            cursor = conn.cursor()
            cursor.execute("""
                UPDATE videos 
                SET status = 'processed', processing_progress = 100, hls_path = %s, generated_thumbnails = %s, duration = %s, orientation = %s,
                sprite_sheet_path = %s, vtt_path = %s
                WHERE id = %s
            """, (hls_public_path, thumbs_json, int(duration), orientation, sprite_sheet_path, vtt_path, video_id))
            conn.commit()
            cursor.close()
            conn.close()

        logging.info("✅ Procesamiento HLS completado al 100%")
        redis_client.publish(channel_name, json.dumps({
            "type": "completed", "video_id": video_id, "uuid": uuid, "status": "processed", "progress": 100
        }))
        
        try: os.remove(input_file)
        except OSError: pass
    else:
        logging.error(f"❌ Fallo al procesar {uuid}")
        update_db_status(video_id, 'failed')
        redis_client.publish(channel_name, json.dumps({
            "type": "failed", "video_id": video_id, "uuid": uuid, "status": "failed"
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