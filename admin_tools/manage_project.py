import os
import re
import time
import json
import random
import string
import subprocess
import urllib.request
import urllib.parse
from http.cookiejar import CookieJar
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor, as_completed

# --- CONFIGURACIÓN ---
WORDS_FILE = 'data/word.txt'
TARGET_DIR = '../' 

IGNORE_DIRS = {
    '.git', 'vendor', 'node_modules', 'docker', 'storage', 
    'public/assets/img', 'translations', 'admin_tools', 'i18scanner'
}

IGNORE_EXTENSIONS = {
    '.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.ico', '.bmp', '.tiff',
    '.pdf', '.zip', '.rar', '.tar', '.gz', '.7z',
    '.mp3', '.mp4', '.avi', '.mov', '.wav', '.flac',
    '.ttf', '.otf', '.woff', '.woff2', '.eot',
    '.exe', '.dll', '.so', '.dylib', '.bin', '.db', '.sqlite', '.mo', '.po'
}

class Colors:
    HEADER = '\033[95m'
    BLUE = '\033[94m'
    GREEN = '\033[92m'
    WARNING = '\033[93m'
    FAIL = '\033[91m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'

def load_env():
    env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), '.env')
    if os.path.exists(env_path):
        with open(env_path, 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    k, v = line.split('=', 1)
                    k = k.strip()
                    v = v.strip().strip("'").strip('"')
                    if k not in os.environ:
                        os.environ[k] = v

load_env()

def random_string(length=10):
    letters = string.ascii_lowercase
    return ''.join(random.choice(letters) for _ in range(length))

def generate_svg_icons(target_path):
    import urllib.request
    import re
    import os
    import math

    print(f"\n{Colors.HEADER}{Colors.BOLD}Generando Sprite de Iconos SVG...{Colors.ENDC}")
    url = "https://raw.githubusercontent.com/google/material-design-icons/master/variablefont/MaterialSymbolsRounded%5BFILL%2CGRAD%2Copsz%2Cwght%5D.codepoints"
    
    print("Descargando lista oficial de iconos...")
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    try:
        response = urllib.request.urlopen(req)
        data = response.read().decode('utf-8')
        valid_icons = set([line.split()[0] for line in data.split('\n') if line.strip()])
        print(f"Se encontraron {len(valid_icons)} símbolos válidos de Material.")
        
        word_pattern = re.compile(r'\b([a-z0-9_]+)\b', re.IGNORECASE)
        found_icons = set()
        
        files_to_scan = get_files_to_scan(target_path)
        files_to_scan = [f for f in files_to_scan if f.lower().endswith(('.php', '.html', '.js', '.vue'))]
        
        for filepath in files_to_scan:
            try:
                with open(filepath, 'r', encoding='utf-8') as f:
                    c = f.read()
                    words = set(word_pattern.findall(c))
                    found_icons.update(words.intersection(valid_icons))
            except Exception:
                pass
                
        print(f"Se encontraron {len(found_icons)} iconos usados en el proyecto.")
        if not found_icons:
            print("No hay iconos que generar.")
            return

        print("Descargando SVGs de los iconos...")
        icons_list = sorted(list(found_icons))
        svgs = []
        for icon in icons_list:
            svg_url = f"https://fonts.gstatic.com/s/i/short-term/release/materialsymbolsrounded/{icon}/default/24px.svg"
            try:
                r = urllib.request.urlopen(svg_url)
                svg_data = r.read().decode('utf-8')
                match = re.search(r'(<path[^>]+>)', svg_data)
                if match:
                    svgs.append(match.group(1))
                else:
                    svgs.append("")
            except Exception as e:
                print(f"Error descargando {icon}: {e}")
                svgs.append("")

        print("Generando Sprite SVG y CSS...")
        COLS = 10
        ROWS = math.ceil(len(icons_list) / COLS)
        if ROWS == 0:
            ROWS = 1

        svg_content = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {COLS * 960} {ROWS * 960}">']
        css_content = [
            ".material-symbols-rounded, .msr {",
            "  display: inline-block;",
            "  font-size: 24px;",
            "  line-height: 1;",
            "  width: 1em;",
            "  height: 1em;",
            "  background-color: currentColor;",
            "  -webkit-mask-image: url('../icons/sprite.svg');",
            "  mask-image: url('../icons/sprite.svg');",
            f"  -webkit-mask-size: {COLS * 100}% {ROWS * 100}%;",
            f"  mask-size: {COLS * 100}% {ROWS * 100}%;",
            "  -webkit-mask-repeat: no-repeat;",
            "  mask-repeat: no-repeat;",
            "  vertical-align: -0.125em;",
            "  overflow: hidden;",
            "  white-space: nowrap;",
            "  text-indent: 100%;",
            "}"
        ]

        for idx, (icon, path) in enumerate(zip(icons_list, svgs)):
            if not path:
                continue
            col = idx % COLS
            row = idx // COLS
            
            transform = f"translate({col * 960}, {row * 960 + 960})"
            svg_content.append(f'  <g transform="{transform}">{path}</g>')
            
            x_pos = 0 if COLS == 1 else (col / (COLS - 1)) * 100
            y_pos = 0 if ROWS == 1 else (row / (ROWS - 1)) * 100
            
            css_content.append(f".msr-{icon} {{")
            css_content.append(f"  -webkit-mask-position: {x_pos:.4f}% {y_pos:.4f}%;")
            css_content.append(f"  mask-position: {x_pos:.4f}% {y_pos:.4f}%;")
            css_content.append("}")

        svg_content.append('</svg>')

        public_dir = os.path.join(target_path, 'public')
        icons_dir = os.path.join(public_dir, 'assets', 'icons')
        css_dir = os.path.join(public_dir, 'assets', 'css')
        os.makedirs(icons_dir, exist_ok=True)
        os.makedirs(css_dir, exist_ok=True)

        sprite_path = os.path.join(icons_dir, 'sprite.svg')
        css_path = os.path.join(css_dir, 'icons.css')

        with open(sprite_path, 'w', encoding='utf-8') as f:
            f.write("\n".join(svg_content))

        with open(css_path, 'w', encoding='utf-8') as f:
            f.write("\n".join(css_content))

        print(f"{Colors.GREEN}✅ Sprite guardado en {sprite_path}{Colors.ENDC}")
        print(f"{Colors.GREEN}✅ CSS guardado en {css_path}{Colors.ENDC}")

    except Exception as e:
        print(f"{Colors.FAIL}Error: {e}{Colors.ENDC}")

def load_words(filepath):
    """Carga las palabras del archivo txt"""
    with open(filepath, 'r', encoding='utf-8') as f:
        return set([line.strip().lower() for line in f if line.strip()])

def search_in_file(filepath, words_pattern):
    """Busca las palabras en un archivo usando una expresión regular compilada"""
    results = []
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            for line_num, line in enumerate(f, 1):
                matches = words_pattern.findall(line.lower())
                for match in matches:
                    results.append((line_num, match, line.strip()))
    except (UnicodeDecodeError, OSError):
        pass
    return results

def handle_draw_image():
    from PIL import Image
    import redis
    import mysql.connector

    print(f"\n{Colors.HEADER}{Colors.BOLD}Dibujar Imagen en Lienzo (True Color RGBA a Redis){Colors.ENDC}")
    
    image_path = input("Ruta de la imagen a dibujar: ").strip()
    if not os.path.exists(image_path):
        project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
        alt_path = os.path.join(project_root, image_path)
        if os.path.exists(alt_path):
            image_path = alt_path
        else:
            print(f"{Colors.FAIL}La ruta de la imagen no existe.{Colors.ENDC}")
            return
        
    try:
        canvas_id = int(input("ID del lienzo: ").strip())
    except ValueError:
        print(f"{Colors.FAIL}ID de lienzo no válido.{Colors.ENDC}")
        return
        
    try:
        x_str = input("Posición X inicial (por defecto 0): ").strip()
        start_x = int(x_str) if x_str else 0
        y_str = input("Posición Y inicial (por defecto 0): ").strip()
        start_y = int(y_str) if y_str else 0
    except ValueError:
        print(f"{Colors.FAIL}Coordenadas no válidas.{Colors.ENDC}")
        return

    try:
        w_str = input("Ancho final (opcional, ENTER para omitir): ").strip()
        resize_w = int(w_str) if w_str else 0
        h_str = input("Alto final (opcional, ENTER para omitir): ").strip()
        resize_h = int(h_str) if h_str else 0
    except ValueError:
        print(f"{Colors.FAIL}Dimensiones no válidas.{Colors.ENDC}")
        return

    try:
        angle_str = input("Ángulo de rotación (opcional, ENTER para omitir): ").strip()
        angle = float(angle_str) if angle_str else 0
    except ValueError:
        print(f"{Colors.FAIL}Ángulo no válido.{Colors.ENDC}")
        return

    # DB Connection
    DB_HOST = os.getenv("DB_HOST")
    DB_PORT = int(os.getenv("DB_PORT") or 3306)
    DB_USER = os.getenv("DB_USER")
    DB_PASS = os.getenv("DB_PASS")
    DB_NAME = os.getenv("DB_CANVASES_NAME")

    print("[*] Conectando a MySQL para obtener información del lienzo...")
    try:
        db = mysql.connector.connect(host=DB_HOST, port=DB_PORT, user=DB_USER, password=DB_PASS, database=DB_NAME)
        cursor = db.cursor(dictionary=True)
    except Exception as e:
        print(f"{Colors.FAIL}[!] Error de conexión a MySQL: {e}{Colors.ENDC}")
        return

    cursor.execute("SELECT size FROM canvases WHERE id = %s", (canvas_id,))
    canvas_row = cursor.fetchone()
    if not canvas_row:
        print(f"{Colors.FAIL}[!] El lienzo con ID {canvas_id} no existe.{Colors.ENDC}")
        db.close()
        return

    size_str = canvas_row.get('size', '100x100')
    db.close()

    try:
        width, height = map(int, size_str.split('x'))
    except Exception:
        width, height = 100, 100
    print(f"[*] Tamaño del lienzo ID {canvas_id}: {width}x{height}.")

    try:
        img = Image.open(image_path).convert("RGBA")
    except Exception as e:
        print(f"{Colors.FAIL}[!] Error al abrir la imagen: {e}{Colors.ENDC}")
        return

    if resize_w > 0 and resize_h > 0:
        img = img.resize((resize_w, resize_h), Image.Resampling.LANCZOS)
        
    if angle != 0:
        img = img.rotate(-angle, expand=True, resample=Image.Resampling.BICUBIC)
        new_w, new_h = img.size
        cx = start_x + (resize_w / 2.0 if resize_w > 0 else img.width / 2.0)
        cy = start_y + (resize_h / 2.0 if resize_h > 0 else img.height / 2.0)
        start_x = int(cx - new_w / 2.0)
        start_y = int(cy - new_h / 2.0)

    img_width, img_height = img.size
    print(f"[*] Imagen procesada: {img_width}x{img_height}")

    # Redis Connection
    REDIS_HOST = os.getenv("REDIS_HOST")
    REDIS_PORT = int(os.getenv("REDIS_PORT") or 6379)
    REDIS_PASS = os.getenv("REDIS_PASS")
    
    print("[*] Conectando a Redis...")
    try:
        r = redis.Redis(host=REDIS_HOST, port=REDIS_PORT, password=REDIS_PASS, db=0)
        r.ping()
    except Exception as e:
        print(f"{Colors.FAIL}[!] No se pudo conectar a Redis: {e}{Colors.ENDC}")
        return

    state_key = f"canvas:{canvas_id}:state"
    raw_state = r.get(state_key)
    
    expected_size = width * height * 4
    if not raw_state or len(raw_state) != expected_size:
        print(f"[*] El estado en Redis no existe o su tamaño ({len(raw_state) if raw_state else 0} bytes) no coincide con {expected_size} bytes (4-byte RGBA). Inicializando de cero...")
        raw_state = b'\x00\x00\x00\x00' * (width * height)

    state = bytearray(raw_state)
    original_pixels = img.load()
    changed = 0

    print("[*] Inyectando colores RGBA absolutos al buffer...")
    for iy in range(img_height):
        for ix in range(img_width):
            cx = start_x + ix
            cy = start_y + iy
            
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

    print(f"[*] Guardando estado en Redis ({changed} píxeles nuevos)...")
    r.set(state_key, bytes(state))
    r.sadd("canvases:dirty_states", canvas_id)
    print(f"{Colors.GREEN}✅ Completado con éxito! ({changed} píxeles modificados){Colors.ENDC}")

def get_files_to_scan(target_path):
    """Genera una lista de todos los archivos válidos para escanear"""
    files_to_scan = []
    for root, dirs, files in os.walk(target_path):
        dirs[:] = [d for d in dirs if d not in IGNORE_DIRS]
        for file in files:
            ext = os.path.splitext(file)[1].lower()
            if ext not in IGNORE_EXTENSIONS:
                filepath = os.path.join(root, file)
                if os.path.isfile(filepath):
                    files_to_scan.append(filepath)
    return files_to_scan

def main():
    print(f"{Colors.HEADER}{Colors.BOLD}Herramienta de Análisis del Proyecto{Colors.ENDC}")
    print("Selecciona el tipo de análisis:")
    print("1 - Identificar textos hardcodeados (Internacionalización)")
    print("2 - Identificar estilos inline (style=\"...\") en archivos PHP y JS")
    print("3 - Identificar código de depuración (console.log, var_dump, etc.)")
    print("4 - Generar Sprite de Iconos SVG")
    print("5 - Verificar y Generar Avatares Predeterminados")
    print("6 - Escanear claves de traducción (_t y __) y comprobar JSONs")
    print("7 - Dibujar una imagen en un lienzo (Inyectar a Redis)")
    choice = input(f"{Colors.WARNING}Ingresa 1, 2, 3, 4, 5, 6 o 7: {Colors.ENDC}").strip()

    if choice not in ('1', '2', '3', '4', '5', '6', '7'):
        print(f"{Colors.FAIL}Opción no válida. Saliendo.{Colors.ENDC}")
        return

    start_time = time.time()
    script_dir = os.path.dirname(os.path.abspath(__file__))
    target_path = os.path.abspath(os.path.join(script_dir, TARGET_DIR))

    if choice == '4':
        generate_svg_icons(target_path)
        return
        
    if choice == '5':
        import check_and_generate_avatars
        check_and_generate_avatars.run_avatar_generator()
        return

    if choice == '6':
        from i18n import i18n_scanner
        i18n_scanner.run_scanner(target_path, script_dir)
        return

    if choice == '7':
        handle_draw_image()
        return

    if choice == '1':
        words_path = os.path.join(script_dir, WORDS_FILE)
        if not os.path.exists(words_path):
            print(f"{Colors.FAIL}Error: No se encontró el archivo {WORDS_FILE}{Colors.ENDC}")
            return
        words_to_search = load_words(words_path)
        escaped_words = [re.escape(w) for w in words_to_search]
        pattern_string = r'(?<![\w\-])(' + '|'.join(escaped_words) + r')(?![\w\-])'
        search_pattern = re.compile(pattern_string, re.IGNORECASE)
        print(f"{Colors.HEADER}{Colors.BOLD}Starting advanced i18n scan...{Colors.ENDC}")
        print(f"Searching for {Colors.BLUE}{len(words_to_search)}{Colors.ENDC} keywords.")
        report_title = "Internationalization Scan Report"
    elif choice == '2':
        search_pattern = re.compile(r'\sstyle\s*=\s*["\'][^"\']*["\']', re.IGNORECASE)
        print(f"{Colors.HEADER}{Colors.BOLD}Starting inline style search in PHP and JS files...{Colors.ENDC}")
        report_title = "Inline Styles Report"
    else:
        debug_funcs = [r'console\.log\(', r'print_r\(', r'var_dump\(', r'die\(', r'exit\(']
        search_pattern = re.compile('(' + '|'.join(debug_funcs) + ')', re.IGNORECASE)
        print(f"{Colors.HEADER}{Colors.BOLD}Starting debug functions search...{Colors.ENDC}")
        report_title = "Debug Code Report"

    files_to_scan = get_files_to_scan(target_path)
    if choice == '2':
        files_to_scan = [f for f in files_to_scan if f.lower().endswith(('.php', '.js')) and 'emailtemplates.php' not in f.lower()]
    elif choice == '3':
        files_to_scan = [f for f in files_to_scan if f.lower().endswith(('.php', '.js', '.ts', '.vue'))]

    print(f"Files to scan: {Colors.BLUE}{len(files_to_scan)}{Colors.ENDC} in {target_path}\n")

    found_issues = 0
    results_by_file = {}

    with ThreadPoolExecutor(max_workers=8) as executor:
        future_to_file = {executor.submit(search_in_file, filepath, search_pattern): filepath for filepath in files_to_scan}
        
        for future in as_completed(future_to_file):
            filepath = future_to_file[future]
            matches = future.result()
            
            if matches:
                rel_path = os.path.relpath(filepath, target_path)
                results_by_file[rel_path] = matches
                found_issues += len(matches)
                
                print(f"{Colors.WARNING}📁 Encontrado en: {rel_path}{Colors.ENDC} ({len(matches)} coincidencias)")

    reports_dir = os.path.join(script_dir, 'reports')
    os.makedirs(reports_dir, exist_ok=True)
    
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    report_file = os.path.join(reports_dir, f'scan_report_{timestamp}.md')

    with open(report_file, 'w', encoding='utf-8') as f:
        f.write(f"# {report_title}\n\n")
        f.write(f"**Fecha:** {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
        f.write(f"**Archivos escaneados:** {len(files_to_scan)}\n")
        if choice == '1':
            f.write(f"**Palabras buscadas:** {len(words_to_search)}\n")
        f.write(f"**Tiempo de ejecución:** {round(time.time() - start_time, 2)} segundos\n\n")
        
        for rel_path, matches in sorted(results_by_file.items()):
            f.write(f"## 📁 Archivo: `{rel_path}`\n\n")
            f.write("| Línea | Palabra | Código |\n")
            f.write("|---|---|---|\n")
            
            processed_lines = set()
            for line_num, word, line_content in matches:
                if line_num not in processed_lines:
                    preview = line_content[:120] + "..." if len(line_content) > 120 else line_content
                    preview = preview.replace('|', '\\|').replace('`', '\\`').replace('<', '&lt;').replace('>', '&gt;')
                    f.write(f"| {line_num} | **{word}** | `{preview}` |\n")
                    processed_lines.add(line_num)
            f.write("\n")
            
        if choice == '1':
            f.write(f"\n✅ **Búsqueda completada.** Se encontraron **{found_issues}** posibles textos hardcodeados.\n")
        elif choice == '2':
            f.write(f"\n✅ **Búsqueda completada.** Se encontraron **{found_issues}** atributos style inline.\n")
        else:
            f.write(f"\n✅ **Búsqueda completada.** Se encontraron **{found_issues}** funciones de depuración.\n")

    time_taken = round(time.time() - start_time, 2)
    print(f"\n{Colors.GREEN}{Colors.BOLD}✅ Búsqueda completada en {time_taken}s.{Colors.ENDC}")
    print(f"Se encontraron {Colors.FAIL}{found_issues}{Colors.ENDC} coincidencias en {Colors.WARNING}{len(results_by_file)}{Colors.ENDC} archivos.")
    print(f"📄 Reporte detallado generado en: {Colors.BLUE}{report_file}{Colors.ENDC}")

if __name__ == '__main__':
    main()