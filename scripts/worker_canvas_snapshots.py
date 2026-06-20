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
SCALE_FACTOR = int(os.getenv("SNAPSHOT_SCALE_FACTOR", 10)) # Multiplicador para alta definición (Ej. 64x64 -> 640x640)

# Paleta base temporal en modo RGBA (R, G, B, Alpha).
# Asegúrate de que los colores hagan match con los índices que manda tu frontend.
PALETTE = {
    0: (255, 255, 255, 255), # Blanco (Fondo por defecto)
    1: (0, 0, 0, 255),       # Negro
    2: (255, 0, 0, 255),     # Rojo
    3: (0, 255, 0, 255),     # Verde
    4: (0, 0, 255, 255),     # Azul
    5: (255, 255, 0, 255),   # Amarillo
    6: (255, 165, 0, 255),   # Naranja
    7: (128, 0, 128, 255),   # Púrpura
    # ... agrega el resto de tu paleta aquí
}

def get_color(index):
    # Fallback a magenta brillante para identificar visualmente índices no mapeados
    return PALETTE.get(index, (255, 0, 255, 255)) 

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
    """
    Convierte el string de tamaño en DB ('64' o '64x64') en tupla de enteros
    """
    try:
        if 'x' in size_str.lower():
            parts = size_str.lower().split('x')
            return int(parts[0]), int(parts[1])
        return int(size_str), int(size_str)
    except:
        return 64, 64 # Fallback estricto

def process_canvas_image(canvas_id, compressed_data, size_str):
    try:
        raw_bytes = decompress(compressed_data)
        
        # 1. Obtener dimensiones exactas de la base de datos
        width, height = parse_size(size_str)
        expected_size = width * height
        
        # 2. Rellenar los bytes faltantes si Redis no guardó la longitud completa
        if len(raw_bytes) < expected_size:
            raw_bytes += bytes([0] * (expected_size - len(raw_bytes)))
            
        # 3. Crear imagen en formato RGBA (permite transparencia si la defines en la paleta)
        img = Image.new('RGBA', (width, height), color=PALETTE.get(0, (255, 255, 255, 255)))
        pixels = img.load()
        
        # 4. Iterar y plasmar cada píxel
        for i in range(expected_size):
            byte_val = raw_bytes[i]
            x = i % width
            y = i // width
            pixels[x, y] = get_color(byte_val)
            
        filepath = os.path.join(SNAPSHOTS_DIR, f"canvas_{canvas_id}.png")
        
        # 5. REESCALADO DE ALTA CALIDAD (Soluciona el problema visual borroso)
        # Se multiplica el tamaño original conservando los píxeles duros mediante Image.NEAREST
        final_width = width * SCALE_FACTOR
        final_height = height * SCALE_FACTOR
        img_scaled = img.resize((final_width, final_height), Image.NEAREST)

        # Guardar la imagen final optimizada
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
                            SELECT s.snapshot_data, c.size 
                            FROM canvas_snapshots s
                            JOIN canvases c ON s.canvas_id = c.id
                            WHERE s.canvas_id = %s
                        """
                        cursor.execute(query, (canvas_id,))
                        result = cursor.fetchone()
                        
                        if result and result[0]:
                            snapshot_data = result[0]
                            size_str = result[1] if result[1] else '64'
                            
                            success = process_canvas_image(canvas_id, snapshot_data, size_str)
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