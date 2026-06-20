import os
import time
import redis
import mysql.connector
from zlib import decompress
from PIL import Image

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
SCALE_FACTOR = int(os.getenv("SNAPSHOT_SCALE_FACTOR", 10)) # Multiplicador para alta definición

# Paletas sincronizadas con public/assets/js/core/constants/Palettes.js
APP_PALETTES = {
    'default': [
        '#000000', '#1A1A1A', '#333333', '#4D4D4D', '#666666', '#808080', '#999999', '#B3B3B3', '#CCCCCC', '#E6E6E6', '#F2F2F2', '#FFFFFF',
        '#FF0000', '#FF8000', '#FFFF00', '#80FF00', '#00FF00', '#00FF80', '#00FFFF', '#0080FF', '#0000FF', '#8000FF', '#FF00FF', '#FF0080',
        '#800000', '#804000', '#808000', '#408000', '#008000', '#008040', '#008080', '#004080', '#000080', '#400080', '#800080', '#800040'
    ],
    'neon': [
        '#000000', '#111111', '#222222', '#FFFFFF',
        '#FF0055', '#FF0099', '#CC00FF', '#7700FF',
        '#0000FF', '#0088FF', '#00FFFF', '#00FF99',
        '#00FF00', '#88FF00', '#FFFF00', '#FF8800'
    ],
    'pastel': [
        '#4A4A4A', '#878787', '#C4C4C4', '#FFFFFF',
        '#FFB3BA', '#FFDFBA', '#FFFFBA', '#BAFFC9',
        '#BAE1FF', '#D6BAFF', '#FFB3E6', '#E2F0CB',
        '#B5EAD7', '#C7CEEA', '#F1CBFF', '#FFDAC1'
    ]
}

def hex_to_rgba(hex_color):
    """Convierte un color Hexadecimal (#FF0000) a tupla RGBA para la librería PIL"""
    hex_color = hex_color.lstrip('#')
    return tuple(int(hex_color[i:i+2], 16) for i in (0, 2, 4)) + (255,)

def get_color(palette_id, index):
    """Obtiene el color en formato RGBA basado en la paleta del lienzo y el índice del píxel"""
    # ====== EL ARREGLO MÁGICO ======
    # Si el índice es 255, significa "Píxel sin pintar/vacío". Lo forzamos a Blanco.
    if index == 255:
        return (255, 255, 255, 255) # Blanco sólido (Cámbialo a (255, 255, 255, 0) si prefieres PNG transparente)
        
    palette = APP_PALETTES.get(palette_id, APP_PALETTES['default'])
    
    if index < len(palette):
        return hex_to_rgba(palette[index])
        
    # Fallback visual para errores reales (Magenta brillante)
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

def process_canvas_image(canvas_id, compressed_data, size_str, palette_id):
    try:
        raw_bytes = decompress(compressed_data)
        
        width, height = parse_size(size_str)
        expected_size = width * height
        
        # ====== OTRO CAMBIO IMPORTANTE ======
        # Rellenar con 255 (Vacío/Blanco) en lugar de 0 (Negro)
        if len(raw_bytes) < expected_size:
            raw_bytes += bytes([255] * (expected_size - len(raw_bytes)))
            
        # El fondo por defecto para la imagen base será Blanco
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

        img_scaled.save(filepath, "PNG", optimize=True)
        return True
    except Exception as e:
        print(f"[!] Error procesando imagen PNG para lienzo {canvas_id}: {e}")
        return False

def main():
    print("[*] Iniciando Worker de Snapshots (Imágenes PNG Alta Calidad)...")
    os.makedirs(SNAPSHOTS_DIR, exist_ok=True)
    
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
                            
                            success = process_canvas_image(canvas_id, snapshot_data, size_str, palette_id)
                            if success:
                                r.srem("canvases:pending_snapshots", canvas_id)
                                print(f"[+] Snapshot HQ generado exitosamente: canvas_{canvas_id}.png")
                        else:
                            r.srem("canvases:pending_snapshots", canvas_id)
                            
                    cursor.close()
                    db_conn.close()
        except Exception as e:
            print(f"[!] Error en el ciclo principal del Snapshot Worker: {e}")

        time.sleep(SYNC_INTERVAL)

if __name__ == "__main__":
    main()