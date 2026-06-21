import os
import time
import json
import redis
import mysql.connector
import uuid
from zlib import decompress
from PIL import Image
from datetime import datetime

# Configuración Redis
REDIS_HOST = os.getenv("REDIS_HOST", "redis")
REDIS_PORT = int(os.getenv("REDIS_PORT", 6379))
REDIS_PASS = os.getenv("REDIS_PASS", None)

# Configuración MySQL
DB_HOST = os.getenv("DB_HOST", "db")
DB_USER = os.getenv("DB_USER", "system_web_executor")
DB_PASS = os.getenv("DB_PASS", "secret")
DB_NAME = os.getenv("DB_CANVASES_NAME", "db_canvases")

# Configuración Worker
SYNC_INTERVAL = int(os.getenv("WORKER_SNAPSHOTS_SYNC_INTERVAL", 10))
SNAPSHOTS_DIR = os.getenv("SNAPSHOTS_DIR", "/app/public/assets/img/snapshots")
ARCHIVE_DIR = os.getenv("SNAPSHOTS_ARCHIVE_DIR", "/app/public/assets/img/archive")
SCALE_FACTOR = int(os.getenv("SNAPSHOT_SCALE_FACTOR", 10)) 

# Ruta a la fuente única de la verdad
PALETTES_FILE_PATH = os.getenv("PALETTES_FILE_PATH", "/app/public/assets/data/palettes.json")
APP_PALETTES = {}

def load_palettes():
    """Carga las paletas dinámicamente desde el JSON centralizado"""
    global APP_PALETTES
    try:
        if os.path.exists(PALETTES_FILE_PATH):
            with open(PALETTES_FILE_PATH, 'r', encoding='utf-8') as f:
                data = json.load(f)
                for pal_id, pal_data in data.items():
                    APP_PALETTES[pal_id] = pal_data.get('colors', [])
            print(f"[+] Paletas cargadas exitosamente desde {PALETTES_FILE_PATH}")
        else:
            raise FileNotFoundError("El archivo JSON no existe en la ruta.")
    except Exception as e:
        print(f"[!] Error cargando paletas desde {PALETTES_FILE_PATH}: {e}")
        # Fallback de emergencia por si el volumen falla
        APP_PALETTES['default'] = [
            '#000000', '#1A1A1A', '#333333', '#4D4D4D', '#666666', '#808080', '#999999', '#B3B3B3', '#CCCCCC', '#E6E6E6', '#F2F2F2', '#FFFFFF',
            '#FF0000', '#FF8000', '#FFFF00', '#80FF00', '#00FF00', '#00FF80', '#00FFFF', '#0080FF', '#0000FF', '#8000FF', '#FF00FF', '#FF0080',
            '#800000', '#804000', '#808000', '#408000', '#008000', '#008040', '#008080', '#004080', '#000080', '#400080', '#800080', '#800040'
        ]

def hex_to_rgba(hex_color):
    """Convierte un color Hexadecimal (#FF0000) a tupla RGBA para la librería PIL"""
    hex_color = hex_color.lstrip('#')
    return tuple(int(hex_color[i:i+2], 16) for i in (0, 2, 4)) + (255,)

def get_color(palette_id, index):
    """Obtiene el color en formato RGBA basado en la paleta del lienzo y el índice del píxel"""
    if index == 255:
        return (255, 255, 255, 255) # Blanco sólido 
        
    palette = APP_PALETTES.get(palette_id, APP_PALETTES.get('default', []))
    
    if index < len(palette):
        return hex_to_rgba(palette[index])
        
    return (255, 0, 255, 255)

def get_db_connection():
    try:
        return mysql.connector.connect(
            host=DB_HOST,
            user=DB_USER,
            password=DB_PASS,
            database=DB_NAME
        )
    except Exception as e:
        print(f"[!] Error conectando a MySQL en Snapshots Worker: {e}")
        return None

def parse_size(size_str):
    try:
        if 'x' in size_str.lower():
            parts = size_str.lower().split('x')
            return int(parts[0]), int(parts[1])
        return int(size_str), int(size_str)
    except:
        return 64, 64

def process_canvas_image(r, db_conn, canvas_id, compressed_data, size_str, palette_id):
    try:
        raw_bytes = decompress(compressed_data)
        
        width, height = parse_size(size_str)
        expected_size = width * height
        
        if len(raw_bytes) < expected_size:
            raw_bytes += bytes([255] * (expected_size - len(raw_bytes)))
            
        img = Image.new('RGBA', (width, height), color=(255, 255, 255, 255))
        pixels = img.load()
        
        for i in range(expected_size):
            byte_val = raw_bytes[i]
            x = i % width
            y = i // width
            pixels[x, y] = get_color(palette_id, byte_val)
            
        filepath = os.path.join(SNAPSHOTS_DIR, f"canvas_{canvas_id}.png")
        
        final_width = width * SCALE_FACTOR
        final_height = height * SCALE_FACTOR
        img_scaled = img.resize((final_width, final_height), Image.NEAREST)

        # Sobrescribimos el archivo base (el que se usa en home.php)
        img_scaled.save(filepath, "PNG", optimize=True)
        
        # ==========================================
        # INTERCONEXIÓN CON REINICIOS PROGRAMADOS
        # ==========================================
        # Si el candado de reinicio existe, significa que este snapshot
        # es la "foto final" antes de que se borre el lienzo.
        if r.exists(f"canvas:{canvas_id}:reset_lock"):
            # Generar timestamp y guardar en la carpeta de archivo histórico
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            archive_filename = f"canvas_{canvas_id}_{timestamp}.png"
            archive_filepath = os.path.join(ARCHIVE_DIR, archive_filename)
            img_scaled.save(archive_filepath, "PNG", optimize=True)
            print(f"[+] Archivo histórico guardado exitosamente: {archive_filepath}")

            # Insertar en base de datos el registro del reinicio
            snapshot_uuid = str(uuid.uuid4())
            public_filepath = f"/assets/img/archive/{archive_filename}"
            
            try:
                cursor = db_conn.cursor()
                insert_query = """
                    INSERT INTO canvas_snapshots_history (canvas_id, snapshot_uuid, file_path)
                    VALUES (%s, %s, %s)
                """
                cursor.execute(insert_query, (canvas_id, snapshot_uuid, public_filepath))
                db_conn.commit()
                cursor.close()
                print(f"[+] Registro histórico guardado en DB con UUID: {snapshot_uuid}")
            except Exception as e:
                print(f"[!] Error guardando historial en DB: {e}")

            # Avisamos al worker de reinicios que ya puede vaciar el lienzo
            r.setex(f"canvas:{canvas_id}:snapshot_done", 60, "1")
            
        return True
    except Exception as e:
        print(f"[!] Error procesando imagen PNG para lienzo {canvas_id}: {e}")
        return False

def main():
    print("[*] Iniciando Worker de Snapshots (Imágenes PNG Alta Calidad)...")
    
    # Crear directorios si no existen
    os.makedirs(SNAPSHOTS_DIR, exist_ok=True)
    os.makedirs(ARCHIVE_DIR, exist_ok=True)
    
    load_palettes() # <--- Carga inicial del JSON
    
    try:
        r = redis.Redis(
            host=REDIS_HOST, 
            port=REDIS_PORT, 
            password=REDIS_PASS, 
            db=0, 
            decode_responses=True 
        )
        r.ping()
        print("[+] Conectado a Redis exitosamente.")
    except Exception as e:
        print(f"[!] No se pudo conectar a Redis: {e}")
        return

    while True:
        try:
            pending_canvases = r.smembers("canvases:pending_snapshots")
            
            if pending_canvases:
                db_conn = get_db_connection()
                if db_conn:
                    cursor = db_conn.cursor()
                    
                    for canvas_id in pending_canvases:
                        query = """
                            SELECT s.snapshot_data, c.size, c.palette_id 
                            FROM canvas_snapshots s
                            JOIN canvases c ON s.canvas_id = c.id
                            WHERE s.canvas_id = %s
                        """
                        cursor.execute(query, (canvas_id,))
                        result = cursor.fetchone()
                        
                        if result and result[0]:
                            snapshot_data = result[0]
                            size_str = result[1] if result[1] else '64'
                            palette_id = result[2] if result[2] else 'default'
                            
                            # Pasamos Redis (r) y db_conn para evaluar candados y hacer INSERTS
                            success = process_canvas_image(r, db_conn, canvas_id, snapshot_data, size_str, palette_id)
                            if success:
                                r.srem("canvases:pending_snapshots", canvas_id)
                                print(f"[+] Snapshot HQ procesado: canvas_{canvas_id}.png")
                        else:
                            r.srem("canvases:pending_snapshots", canvas_id)
                            
                    cursor.close()
                    db_conn.close()
        except Exception as e:
            print(f"[!] Error en el ciclo principal del Snapshot Worker: {e}")

        time.sleep(SYNC_INTERVAL)

if __name__ == "__main__":
    main()