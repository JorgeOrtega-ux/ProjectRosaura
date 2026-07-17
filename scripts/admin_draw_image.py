import sys
import os
import json
import argparse
from PIL import Image
import redis
import mysql.connector

def hex_to_rgb(hex_str):
    hex_str = hex_str.lstrip('#')
    return tuple(int(hex_str[i:i+2], 16) for i in (0, 2, 4))

def closest_color_index(rgb, parsed_palette):
    # Si la imagen tiene transparencia, la ignoramos
    if len(rgb) == 4 and rgb[3] < 128:
        return -1
    r, g, b = rgb[:3]
    min_dist = float('inf')
    best_idx = 0
    for idx, (pr, pg, pb) in enumerate(parsed_palette):
        dist = (r - pr)**2 + (g - pg)**2 + (b - pb)**2
        if dist < min_dist:
            min_dist = dist
            best_idx = idx
    return best_idx

def main():
    parser = argparse.ArgumentParser(description="Dibuja una imagen en el lienzo saltando todos los limites de cooldown.")
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
    DB_IDENTITY_NAME = os.getenv("DB_IDENTITY_NAME", "db_identity")

    print("[*] Conectando a MySQL para obtener informacion del lienzo...")
    try:
        db = mysql.connector.connect(host=DB_HOST, user=DB_USER, password=DB_PASS, database=DB_NAME)
        cursor = db.cursor(dictionary=True)
    except Exception as e:
        print(f"[!] Error de conexion MySQL: {e}")
        return

    cursor.execute("SELECT size, palette_id FROM canvases WHERE id = %s", (args.canvas_id,))
    canvas_row = cursor.fetchone()
    if not canvas_row:
        print(f"[!] El lienzo con ID {args.canvas_id} no existe.")
        return

    size_str = canvas_row.get('size', '100x100')
    try:
        width, height = map(int, size_str.split('x'))
    except Exception:
        width, height = 100, 100
        
    print(f"[*] Lienzo ID {args.canvas_id}: {width}x{height}. Analizando imagen para crear paleta...")

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
        # The center of the unrotated image was at x + w/2, y + h/2
        cx = args.x + (args.w / 2.0 if args.w > 0 else img.width / 2.0)
        cy = args.y + (args.h / 2.0 if args.h > 0 else img.height / 2.0)
        args.x = int(cx - new_w / 2.0)
        args.y = int(cy - new_h / 2.0)

    img_width, img_height = img.size
    print(f"[*] Imagen cargada y procesada: {img_width}x{img_height}")

    original_img = img.copy()
    img_rgb = img.convert("RGB")
    colors = img_rgb.getcolors(maxcolors=255)
    if colors is None:
        print("[*] La imagen tiene mas de 255 colores. Cuantizando a 255 colores sin dithering (índice 255 es transparente)...")
        # Usamos quantize con dither=0 y maximo 255 colores (el 255 esta reservado para transparente)
        img_quantized = img.quantize(colors=255, dither=0).convert("RGBA")
        img_rgb = img_quantized.convert("RGB")
        colors = img_rgb.getcolors(maxcolors=255)
    else:
        img_quantized = img
        
    unique_rgbs = [c[1] for c in colors]
    palette_colors = []
    for idx, (r, g, b) in enumerate(unique_rgbs):
        hex_val = "#{:02x}{:02x}{:02x}".format(r, g, b).upper()
        palette_colors.append({
            "hex": hex_val,
            "name_key": f"color_auto_{idx}"
        })
        
    print(f"[*] Se generaron {len(palette_colors)} colores unicos.")
    
    import uuid
    new_palette_key = f"custom_admin_{uuid.uuid4().hex[:8]}"
    
    json_path = os.path.join(os.path.dirname(__file__), '../public/assets/data/palettes.json')
    try:
        with open(json_path, 'r', encoding='utf-8') as f:
            palettes_data = json.load(f)
    except Exception:
        palettes_data = {}
        
    palettes_data[new_palette_key] = {
        "name": f"Inyector (Lienzo {args.canvas_id})",
        "colors": palette_colors
    }
    
    with open(json_path, 'w', encoding='utf-8') as f:
        json.dump(palettes_data, f, indent=4)
        
    cursor.execute("UPDATE canvases SET palette_id = %s WHERE id = %s", (new_palette_key, args.canvas_id))
    db.commit()
    print(f"[*] Nueva paleta '{new_palette_key}' guardada en palettes.json y asignada al lienzo.")

    # Redis Connection
    REDIS_HOST = os.getenv("REDIS_HOST", "redis")
    REDIS_PORT = int(os.getenv("REDIS_PORT", 6379))
    REDIS_PASS = os.getenv("REDIS_PASS", None)
    
    print("[*] Conectando a Redis...")
    r = redis.Redis(host=REDIS_HOST, port=REDIS_PORT, password=REDIS_PASS, db=0)



    state_key = f"canvas:{args.canvas_id}:state"
    raw_state = r.get(state_key)
    if not raw_state:
        print(f"[!] No se encontro el estado binario del lienzo {args.canvas_id} en Redis.")
        return

    # Convertimos la string de bytes a un bytearray mutable
    state = bytearray(raw_state)
    original_pixels = original_img.load()
    quantized_pixels = img_quantized.load()
    changed = 0

    print("[*] Mapeando colores de la imagen a la paleta del lienzo (muy rapido con optimizacion)...")
    
    parsed_palette = [hex_to_rgb(p['hex']) for p in palette_colors]
    color_cache = {}
    
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
            if len(orig_rgba) == 4 and orig_rgba[3] < 128:
                continue

            q_rgba = quantized_pixels[ix, iy]
            if q_rgba not in color_cache:
                color_cache[q_rgba] = closest_color_index(q_rgba, parsed_palette)
                
            color_idx = color_cache[q_rgba]
            
            if color_idx != -1:
                offset = (cy * width) + cx
                if offset < len(state) and state[offset] != color_idx:
                    state[offset] = color_idx
                    changed += 1

    if changed == 0:
        print("[*] La imagen no requirio modificar pixeles (ya tenian ese indice).")

    print(f"[*] Forzando guardado del estado en Redis ({changed} pixeles nuevos)...")
    r.set(state_key, bytes(state))
    
    # Marcamos el lienzo como 'sucio' para que el worker_persistence lo guarde en MySQL (snapshots)
    r.sadd("canvases:dirty_states", args.canvas_id)
    
    print("[+] Completado con exito! Refresca la pagina en el navegador para ver los cambios.")

if __name__ == "__main__":
    main()
