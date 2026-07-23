import sys
import os
import json
import argparse
from PIL import Image
import redis
import mysql.connector

CHUNK_SIZE = 512

def draw_finite(r, args, img, width, height):
    """Dibuja la imagen en un lienzo finito usando el buffer monolitico canvas:{id}:state."""
    state_key = f"canvas:{args.canvas_id}:state"
    raw_state = r.get(state_key)
    
    expected_size = width * height * 4
    if not raw_state or len(raw_state) != expected_size:
        print(f"[*] El estado en Redis no existe o su tamaño ({len(raw_state) if raw_state else 0} bytes) no coincide con {expected_size} bytes (4-byte RGBA). Inicializando de cero...")
        raw_state = b'\x00\x00\x00\x00' * (width * height)

    state = bytearray(raw_state)
    original_pixels = img.load()
    img_width, img_height = img.size
    changed = 0

    print("[*] Inyectando colores RGBA absolutos al buffer...")
    
    for iy in range(img_height):
        for ix in range(img_width):
            cx = args.x + ix
            cy = args.y + iy
            
            if cx < 0 or cx >= width or cy < 0 or cy >= height:
                continue

            orig_rgba = original_pixels[ix, iy]
            if orig_rgba[3] < 128:
                continue

            offset = ((cy * width) + cx) * 4
            
            if offset + 3 < len(state):
                state[offset] = orig_rgba[0]
                state[offset+1] = orig_rgba[1]
                state[offset+2] = orig_rgba[2]
                state[offset+3] = 255
                changed += 1

    print(f"[*] Forzando guardado del estado en Redis ({changed} pixeles nuevos)...")
    r.set(state_key, bytes(state))
    
    r.sadd("canvases:dirty_states", args.canvas_id)
    
    # No affected chunks for finite canvases
    print(json.dumps({"affected_chunks": []}))
    print(f"[+] Completado con exito! ({changed} pixeles)")


def main():
    parser = argparse.ArgumentParser(description="Dibuja una imagen en el lienzo escribiendo True Color (RGBA) directo a Redis.")
    parser.add_argument("image_path", help="Ruta de la imagen a dibujar")
    parser.add_argument("canvas_id", type=int, help="ID del lienzo (ej. 1)")
    parser.add_argument("--x", type=int, default=0, help="Posicion X inicial (por defecto: 0)")
    parser.add_argument("--y", type=int, default=0, help="Posicion Y inicial (por defecto: 0)")
    parser.add_argument("--w", type=int, default=0, help="Ancho (opcional)")
    parser.add_argument("--h", type=int, default=0, help="Alto (opcional)")
    parser.add_argument("--angle", type=float, default=0, help="Angulo (opcional)")
    args = parser.parse_args()

    # DB Connection
    DB_HOST = os.getenv("DB_HOST")
    DB_USER = os.getenv("DB_USER")
    DB_PASS = os.getenv("DB_PASS")
    DB_NAME = os.getenv("DB_CANVASES_NAME")

    candidate_db_hosts = [DB_HOST, "127.0.0.1", "localhost"] if DB_HOST else ["127.0.0.1", "localhost"]
    seen = set()
    db_hosts = [h for h in candidate_db_hosts if h and not (h in seen or seen.add(h))]

    print("[*] Connecting to MySQL to fetch canvas information...")
    db = None
    cursor = None
    last_db_err = None
    for host in db_hosts:
        try:
            db = mysql.connector.connect(host=host, port=int(os.getenv("DB_PORT", 3306)), user=DB_USER, password=DB_PASS, database=DB_NAME)
            cursor = db.cursor(dictionary=True)
            break
        except Exception as e:
            last_db_err = e

    if not db or not cursor:
        print(f"[!] MySQL connection error: {last_db_err}")
        return

    cursor.execute("SELECT size FROM canvases WHERE id = %s", (args.canvas_id,))
    canvas_row = cursor.fetchone()
    if not canvas_row:
        print(f"[!] Canvas with ID {args.canvas_id} does not exist.")
        return

    size_str = canvas_row.get('size', '100x100')
    try:
        width, height = map(int, size_str.split('x'))
    except Exception:
        width, height = 100, 100
    print(f"[*] Canvas ID {args.canvas_id}: {width}x{height}.")

    try:
        img = Image.open(args.image_path).convert("RGBA")
    except Exception as e:
        print(f"[!] Error opening image {args.image_path}: {e}")
        return

    # Resize if specified
    if args.w > 0 and args.h > 0:
        img = img.resize((args.w, args.h), Image.Resampling.LANCZOS)
        
    # Rotate if specified (using expand=True to preserve all pixels)
    if args.angle != 0:
        img = img.rotate(-args.angle, expand=True, resample=Image.Resampling.BICUBIC)
        # Adjust x and y so the image remains centered where the user placed it
        new_w, new_h = img.size
        cx = args.x + (args.w / 2.0 if args.w > 0 else img.width / 2.0)
        cy = args.y + (args.h / 2.0 if args.h > 0 else img.height / 2.0)
        args.x = int(cx - new_w / 2.0)
        args.y = int(cy - new_h / 2.0)

    img_width, img_height = img.size
    print(f"[*] Image loaded and processed: {img_width}x{img_height}")

    # Redis Connection
    REDIS_HOST = os.getenv("REDIS_HOST")
    REDIS_PORT = int(os.getenv("REDIS_PORT")) if os.getenv("REDIS_PORT") else 6379
    REDIS_PASS = os.getenv("REDIS_PASS")
    
    print("[*] Connecting to Redis...")
    candidate_redis_hosts = [REDIS_HOST, "127.0.0.1", "localhost"] if REDIS_HOST else ["127.0.0.1", "localhost"]
    seen_r = set()
    redis_hosts = [h for h in candidate_redis_hosts if h and not (h in seen_r or seen_r.add(h))]

    r = None
    for r_host in redis_hosts:
        try:
            r_temp = redis.Redis(host=r_host, port=REDIS_PORT, password=REDIS_PASS, db=0)
            r_temp.ping()
            r = r_temp
            break
        except Exception:
            pass

    if not r:
        print("[!] Could not connect to Redis on any host.")
        return

    draw_finite(r, args, img, width, height)

if __name__ == "__main__":
    main()
