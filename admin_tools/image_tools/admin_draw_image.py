import sys
import os
import json
import argparse
from PIL import Image
import redis
import mysql.connector

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

    state_key = f"canvas:{args.canvas_id}:state"
    raw_state = r.get(state_key)
    
    # If state doesn't exist or is not exactly 4 bytes per pixel, we initialize it
    expected_size = width * height * 4
    if not raw_state or len(raw_state) != expected_size:
        print(f"[*] El estado en Redis no existe o su tamaño ({len(raw_state) if raw_state else 0} bytes) no coincide con {expected_size} bytes (4-byte RGBA). Inicializando de cero...")
        raw_state = bytes([0, 0, 0, 0] * (width * height))

    # Convertimos la string de bytes a un bytearray mutable
    state = bytearray(raw_state)
    original_pixels = img.load()
    changed = 0

    print("[*] Inyectando colores RGBA absolutos al buffer...")
    
    # Procesamos la imagen
    for iy in range(img_height):
        for ix in range(img_width):
            cx = args.x + ix
            cy = args.y + iy
            
            # Verificamos si estamos fuera de los limites del lienzo
            if cx < 0 or cx >= width or cy < 0 or cy >= height:
                continue

            orig_rgba = original_pixels[ix, iy]
            # Si en la imagen original era transparente, ignorar
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
    
    # Marcamos el lienzo como 'sucio' para que el worker_persistence lo guarde en MySQL (snapshots)
    r.sadd("canvases:dirty_states", args.canvas_id)
    
    print("[+] Completado con exito! Refresca la pagina en el navegador para ver los cambios.")

if __name__ == "__main__":
    main()
