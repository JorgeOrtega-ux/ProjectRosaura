import os
import time
import redis
import mysql.connector
from zlib import decompress
import math
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

# Paleta base temporal (0-255). 
# Debes expandir este diccionario para que haga match 1:1 con tu Palettes.js en el frontend.
PALETTE = {
    0: (255, 255, 255), # Blanco
    1: (0, 0, 0),       # Negro
    2: (255, 0, 0),     # Rojo
    3: (0, 255, 0),     # Verde
    4: (0, 0, 255),     # Azul
    # ... agrega el resto de tu paleta aquí
}

def get_color(index):
    return PALETTE.get(index, (index, index, index)) # Fallback a escala de grises si el índice no está mapeado

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

def process_canvas_image(canvas_id, compressed_data):
    try:
        raw_bytes = decompress(compressed_data)
        
        # Calcular dimensiones asumiendo que el lienzo es cuadrado (ej. 64x64 = 4096 bytes)
        dim = int(math.sqrt(len(raw_bytes)))
        
        img = Image.new('RGB', (dim, dim))
        pixels = img.load()
        
        for i, byte_val in enumerate(raw_bytes):
            x = i % dim
            y = i // dim
            pixels[x, y] = get_color(byte_val)
            
        filepath = os.path.join(SNAPSHOTS_DIR, f"canvas_{canvas_id}.png")
        # Guardar imagen optimizada
        img.save(filepath, "PNG", optimize=True)
        return True
    except Exception as e:
        print(f"[!] Error procesando imagen PNG para lienzo {canvas_id}: {e}")
        return False

def main():
    print("[*] Iniciando Worker de Snapshots (Imágenes PNG)...")
    os.makedirs(SNAPSHOTS_DIR, exist_ok=True)
    
    try:
        r = redis.Redis(
            host=REDIS_HOST, 
            port=REDIS_PORT, 
            password=REDIS_PASS, 
            db=0, 
            decode_responses=True # Las keys y sets retornarán strings en vez de bytes
        )
        r.ping()
        print("[+] Conectado a Redis exitosamente.")
    except Exception as e:
        print(f"[!] No se pudo conectar a Redis: {e}")
        return

    while True:
        try:
            # Obtener todos los IDs de lienzos que tienen actividad pendiente de generar imagen
            pending_canvases = r.smembers("canvases:pending_snapshots")
            
            if pending_canvases:
                db_conn = get_db_connection()
                if db_conn:
                    cursor = db_conn.cursor()
                    
                    for canvas_id in pending_canvases:
                        # Extraer la matriz de bytes más reciente de la base de datos
                        query = "SELECT snapshot_data FROM canvas_snapshots WHERE canvas_id = %s"
                        cursor.execute(query, (canvas_id,))
                        result = cursor.fetchone()
                        
                        if result and result[0]:
                            success = process_canvas_image(canvas_id, result[0])
                            if success:
                                # Si se generó la imagen correctamente, quitamos la "bandera de suciedad"
                                r.srem("canvases:pending_snapshots", canvas_id)
                                print(f"[+] Snapshot generado exitosamente: canvas_{canvas_id}.png")
                        else:
                            # Si no hay datos en DB aún, lo sacamos de la cola para no hacer bucle infinito
                            r.srem("canvases:pending_snapshots", canvas_id)
                            
                    cursor.close()
                    db_conn.close()
        except Exception as e:
            print(f"[!] Error en el ciclo principal del Snapshot Worker: {e}")

        # Descansar antes de procesar la siguiente tanda
        time.sleep(SYNC_INTERVAL)

if __name__ == "__main__":
    main()