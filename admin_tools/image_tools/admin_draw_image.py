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
        raw_state = bytes([0, 0, 0, 0] * (width * height))

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


def draw_infinite(r, args, img):
    """Dibuja la imagen en un lienzo infinito usando chunks de 512x512 en canvas:{id}:chunk:{cx}:{cy}."""
    original_pixels = img.load()
    img_width, img_height = img.size
    
    import math
    
    # Calcular que chunks son afectados por el rectangulo de la imagen
    min_chunk_x = math.floor(args.x / CHUNK_SIZE)
    min_chunk_y = math.floor(args.y / CHUNK_SIZE)
    max_chunk_x = math.floor((args.x + img_width - 1) / CHUNK_SIZE)
    max_chunk_y = math.floor((args.y + img_height - 1) / CHUNK_SIZE)
    
    affected_chunks = []
    chunk_expected_size = CHUNK_SIZE * CHUNK_SIZE * 4
    
    print(f"[*] Chunks afectados: x=[{min_chunk_x}..{max_chunk_x}], y=[{min_chunk_y}..{max_chunk_y}]")
    
    # Cargar y modificar cada chunk afectado
    for chunk_cy in range(min_chunk_y, max_chunk_y + 1):
        for chunk_cx in range(min_chunk_x, max_chunk_x + 1):
            chunk_key = f"canvas:{args.canvas_id}:chunk:{chunk_cx}:{chunk_cy}"
            raw_chunk = r.get(chunk_key)
            
            if not raw_chunk or len(raw_chunk) != chunk_expected_size:
                chunk_state = bytearray(chunk_expected_size)
            else:
                chunk_state = bytearray(raw_chunk)
            
            # Rango de pixeles globales que caen en este chunk
            chunk_global_x_start = chunk_cx * CHUNK_SIZE
            chunk_global_y_start = chunk_cy * CHUNK_SIZE
            
            # Interseccion entre la imagen y este chunk
            ix_start = max(0, chunk_global_x_start - args.x)
            iy_start = max(0, chunk_global_y_start - args.y)
            ix_end = min(img_width, chunk_global_x_start + CHUNK_SIZE - args.x)
            iy_end = min(img_height, chunk_global_y_start + CHUNK_SIZE - args.y)
            
            chunk_changed = 0
            
            for iy in range(iy_start, iy_end):
                for ix in range(ix_start, ix_end):
                    orig_rgba = original_pixels[ix, iy]
                    if orig_rgba[3] < 128:
                        continue
                    
                    # Coordenadas globales del pixel
                    gx = args.x + ix
                    gy = args.y + iy
                    
                    # Coordenadas locales dentro del chunk
                    local_x = ((gx % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE
                    local_y = ((gy % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE
                    
                    offset = ((local_y * CHUNK_SIZE) + local_x) * 4
                    
                    if offset + 3 < len(chunk_state):
                        chunk_state[offset] = orig_rgba[0]
                        chunk_state[offset+1] = orig_rgba[1]
                        chunk_state[offset+2] = orig_rgba[2]
                        chunk_state[offset+3] = 255
                        chunk_changed += 1
            
            if chunk_changed > 0:
                r.set(chunk_key, bytes(chunk_state))
                affected_chunks.append({"x": chunk_cx, "y": chunk_cy})
                print(f"[*] Chunk ({chunk_cx},{chunk_cy}): {chunk_changed} pixeles escritos")
    
    # Output affected chunks as JSON for the worker to parse
    r.sadd("canvases:dirty_states", args.canvas_id)
    print(json.dumps({"affected_chunks": affected_chunks}))
    print(f"[+] Completado con exito! {len(affected_chunks)} chunks modificados.")


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
    DB_HOST = os.getenv("DB_HOST", "db")
    DB_USER = os.getenv("DB_USER", "system_web_executor")
    DB_PASS = os.getenv("DB_PASS", "secret")
    DB_NAME = os.getenv("DB_CANVASES_NAME", "db_canvases")

    print("[*] Conectando a MySQL para obtener informacion del lienzo...")
    try:
        db = mysql.connector.connect(host=DB_HOST, user=DB_USER, password=DB_PASS, database=DB_NAME)
        cursor = db.cursor(dictionary=True)
    except Exception as e:
        print(f"[!] Error de conexion MySQL: {e}")
        return

    cursor.execute("SELECT size FROM canvases WHERE id = %s", (args.canvas_id,))
    canvas_row = cursor.fetchone()
    if not canvas_row:
        print(f"[!] El lienzo con ID {args.canvas_id} no existe.")
        return

    size_str = canvas_row.get('size', '100x100')
    is_infinite = (size_str.strip().lower() == 'infinite')
    
    if is_infinite:
        print(f"[*] Lienzo ID {args.canvas_id}: INFINITO (chunks de {CHUNK_SIZE}x{CHUNK_SIZE})")
    else:
        try:
            width, height = map(int, size_str.split('x'))
        except Exception:
            width, height = 100, 100
        print(f"[*] Lienzo ID {args.canvas_id}: {width}x{height}.")

    try:
        img = Image.open(args.image_path).convert("RGBA")
    except Exception as e:
        print(f"[!] Error abriendo la imagen {args.image_path}: {e}")
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
    print(f"[*] Imagen cargada y procesada: {img_width}x{img_height}")

    # Redis Connection
    REDIS_HOST = os.getenv("REDIS_HOST", "redis")
    REDIS_PORT = int(os.getenv("REDIS_PORT", 6379))
    REDIS_PASS = os.getenv("REDIS_PASS", None)
    
    print("[*] Conectando a Redis...")
    r = redis.Redis(host=REDIS_HOST, port=REDIS_PORT, password=REDIS_PASS, db=0)

    if is_infinite:
        draw_infinite(r, args, img)
    else:
        draw_finite(r, args, img, width, height)

if __name__ == "__main__":
    main()
