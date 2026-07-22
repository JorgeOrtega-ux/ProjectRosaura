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

def get_code_from_redis(email, code_type):
    redis_pass = os.getenv("REDIS_PASS") or ""
    cmd1 = ["docker", "exec", "-i", "rosaura_redis", "redis-cli"]
    if redis_pass:
        cmd1.extend(["-a", redis_pass])
    cmd1.extend(["GET", f"vercode:ident:{email}:{code_type}"])
    
    try:
        id_res = subprocess.check_output(cmd1).decode('utf-8').strip()
        if 'Warning:' in id_res:
            id_res = id_res.split('\n')[-1].strip()
        
        if id_res == "(nil)" or not id_res:
            return None

        cmd2 = ["docker", "exec", "-i", "rosaura_redis", "redis-cli"]
        if redis_pass:
            cmd2.extend(["-a", redis_pass])
        cmd2.extend(["GET", f"vercode:id:{id_res}"])

        json_res = subprocess.check_output(cmd2).decode('utf-8').strip()
        if 'Warning:' in json_res:
            json_res = json_res.split('\n')[-1].strip()

        if json_res and json_res != "(nil)":
            data = json.loads(json_res)
            return data.get('code')
        return None
    except Exception as e:
        print(f"{Colors.FAIL}Error executing Redis: {e}{Colors.ENDC}")
        return None

def run_auth_tests(target_url="http://localhost"):
    print(f"\n{Colors.HEADER}{Colors.BOLD}Starting Automated Authentication Tests{Colors.ENDC}")
    print(f"Target: {target_url}\n")
    
    cj = CookieJar()
    opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cj))
    
    csrf_token = ""
    try:
        print(f"[*] Fetching CSRF Token from {target_url}/ ...")
        resp = opener.open(target_url + "/")
        html = resp.read().decode('utf-8')
        match = re.search(r'<meta name="csrf-token" content="([^"]+)">', html)
        if match:
            csrf_token = match.group(1)
            print(f"{Colors.GREEN}[+] CSRF Token obtained.{Colors.ENDC}")
        else:
            print(f"{Colors.WARNING}[!] Could not find csrf-token meta tag.{Colors.ENDC}")
    except Exception as e:
        print(f"{Colors.FAIL}[-] Error fetching home page: {e}{Colors.ENDC}")
        return

    def api_request(route, payload):
        url = target_url + "/api.php"
        payload['route'] = route
        data = json.dumps(payload).encode('utf-8')
        req = urllib.request.Request(url, data=data)
        req.add_header('Content-Type', 'application/json')
        req.add_header('X-CSRF-TOKEN', csrf_token)
        try:
            r = opener.open(req)
            return json.loads(r.read().decode('utf-8'))
        except urllib.error.HTTPError as e:
            try:
                return json.loads(e.read().decode('utf-8'))
            except:
                return {"success": False, "error": str(e)}
        except Exception as e:
            return {"success": False, "error": str(e)}

    email = f"test_{random_string(6)}@gmail.com"
    username = f"testuser_{random_string(4)}"
    password = "TestPassword123!"

    print(f"\n[*] Ejecutando Registro (Paso 1) con {email} ...")
    res1 = api_request("auth.register.step1", {"email": email, "password": password, "turnstile_token": "dummy"})
    if not res1.get('success'):
        print(f"{Colors.FAIL}[-] Falló Paso 1: {res1}{Colors.ENDC}")
        return
    reg_token = res1.get('reg_token')
    print(f"{Colors.GREEN}[+] Paso 1 exitoso. reg_token={reg_token}{Colors.ENDC}")

    print(f"[*] Ejecutando Registro (Paso 2) con {username} ...")
    res2 = api_request("auth.register.step2", {"username": username, "reg_token": reg_token})
    if not res2.get('success'):
        print(f"{Colors.FAIL}[-] Falló Paso 2: {res2}{Colors.ENDC}")
        return
    print(f"{Colors.GREEN}[+] Paso 2 exitoso.{Colors.ENDC}")

    print(f"[*] Extrayendo código de Redis para {email} ...")
    code = get_code_from_redis(email, 'account_activation')
    if not code:
        print(f"{Colors.FAIL}[-] No se pudo extraer el código.{Colors.ENDC}")
        return
    print(f"{Colors.GREEN}[+] Código de activación extraído: {code}{Colors.ENDC}")

    print(f"[*] Verificando cuenta ...")
    res3 = api_request("auth.register.verify", {"code": code, "reg_token": reg_token})
    if not res3.get('success'):
        print(f"{Colors.FAIL}[-] Falló verificación: {res3}{Colors.ENDC}")
        return
    print(f"{Colors.GREEN}[+] Cuenta verificada y creada exitosamente.{Colors.ENDC}")

    # Logout para testear login limpio
    api_request("auth.logout", {})
    cj.clear()

    # Obtener nuevo CSRF
    try:
        resp = opener.open(target_url + "/")
        match = re.search(r'<meta name="csrf-token" content="([^"]+)">', resp.read().decode('utf-8'))
        if match: csrf_token = match.group(1)
    except:
        pass

    print(f"\n[*] Testeando Login con {email} ...")
    res_login = api_request("auth.login", {"email": email, "password": password, "turnstile_token": "dummy"})
    if not res_login.get('success'):
        print(f"{Colors.FAIL}[-] Login falló: {res_login}{Colors.ENDC}")
        return
    print(f"{Colors.GREEN}[+] Login exitoso.{Colors.ENDC}")

    print(f"\n[*] Re-inicializando cliente para prueba de Forgot Password limpia...")
    api_request("auth.logout", {})
    
    cj2 = CookieJar()
    opener2 = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cj2))
    csrf_token2 = ""
    try:
        resp = opener2.open(target_url + "/")
        html = resp.read().decode('utf-8')
        match = re.search(r'<meta name="csrf-token" content="([^"]+)">', html)
        if match: csrf_token2 = match.group(1)
    except:
        pass

    def api_request2(route, payload):
        url = target_url + "/api.php"
        payload['route'] = route
        data = json.dumps(payload).encode('utf-8')
        req = urllib.request.Request(url, data=data)
        req.add_header('Content-Type', 'application/json')
        req.add_header('X-CSRF-TOKEN', csrf_token2)
        try:
            r = opener2.open(req)
            return json.loads(r.read().decode('utf-8'))
        except urllib.error.HTTPError as e:
            try:
                return json.loads(e.read().decode('utf-8'))
            except:
                return {"success": False, "error": str(e)}
        except Exception as e:
            return {"success": False, "error": str(e)}

    print(f"[*] Testeando Forgot Password ...")
    res_forgot = api_request2("auth.forgot_password", {"email": email, "turnstile_token": "dummy"})
    if not res_forgot.get('success'):
        print(f"{Colors.FAIL}[-] Forgot Password falló: {res_forgot}{Colors.ENDC}")
        return
    print(f"{Colors.GREEN}[+] Request de reseteo enviado.{Colors.ENDC}")

    print(f"[*] Extrayendo código de reseteo de Redis ...")
    reset_code = get_code_from_redis(email, 'password_reset')
    if not reset_code:
        print(f"{Colors.FAIL}[-] No se pudo extraer el código de reseteo.{Colors.ENDC}")
        return
    print(f"{Colors.GREEN}[+] Código de reseteo extraído: {reset_code}{Colors.ENDC}")

    new_password = "NewTestPassword321!"
    print(f"[*] Reseteando la contraseña ...")
    res_reset = api_request2("auth.reset_password", {"token": reset_code, "password": new_password, "turnstile_token": "dummy"})
    if not res_reset.get('success'):
        print(f"{Colors.FAIL}[-] Reseteo de contraseña falló: {res_reset}{Colors.ENDC}")
        return
    print(f"{Colors.GREEN}[+] Contraseña reseteada exitosamente.{Colors.ENDC}")

    print(f"\n{Colors.HEADER}======================================={Colors.ENDC}")
    print(f"{Colors.GREEN}{Colors.BOLD}[OK] Todas las pruebas de Autenticación pasaron exitosamente.{Colors.ENDC}")
    print(f"{Colors.HEADER}======================================={Colors.ENDC}\n")

    img_width, img_height = img.size
    print(f"[+] Imagen original: {img_width}x{img_height}")

    if start_x + img_width > canvas_width or start_y + img_height > canvas_height:
        print(f"{Colors.WARNING}[!] La imagen ({img_width}x{img_height}) excede los límites del canvas ({canvas_width}x{canvas_height}) en las coordenadas ({start_x}, {start_y}).{Colors.ENDC}")
        resp = input("¿Deseas redimensionarla para que encaje automáticamente manteniendo la proporción? (s/n): ").strip().lower()
        if resp == 's':
            max_w = canvas_width - start_x
            max_h = canvas_height - start_y
            ratio = min(max_w / img_width, max_h / img_height)
            new_w = max(1, int(img_width * ratio))
            new_h = max(1, int(img_height * ratio))
            print(f"[*] Redimensionando imagen a {new_w}x{new_h}...")
            # En versiones antiguas de Pillow es Image.ANTIALIAS, en nuevas es Image.Resampling.LANCZOS
            resample_filter = getattr(Image, 'Resampling', Image).LANCZOS
            img = img.resize((new_w, new_h), resample_filter)
            img_width, img_height = img.size
        else:
            print(f"{Colors.FAIL}[-] Operación cancelada.{Colors.ENDC}")
            return

    def hex_to_rgb(hex_str):
        hex_str = hex_str.lstrip('#')
        if len(hex_str) == 3:
            hex_str = ''.join(c + c for c in hex_str)
        return tuple(int(hex_str[i:i+2], 16) for i in (0, 2, 4))

    # Pre-calcular colores RGB de la paleta
    palette_rgb = [(i, hex_to_rgb(c['hex'])) for i, c in enumerate(palette_colors)]
    color_cache = {}

    def get_closest_color_index(rgb):
        if rgb in color_cache:
            return color_cache[rgb]
        min_dist = float('inf')
        closest_idx = 0
        for i, c_rgb in palette_rgb:
            dist = (rgb[0] - c_rgb[0])**2 + (rgb[1] - c_rgb[1])**2 + (rgb[2] - c_rgb[2])**2
            if dist < min_dist:
                min_dist = dist
                closest_idx = i
        color_cache[rgb] = closest_idx
        return closest_idx

    pixels_to_draw = []
    print("[*] Mapeando colores a la paleta... esto puede tomar unos segundos.")
    for y in range(img_height):
        for x in range(img_width):
            r, g, b, a = img.getpixel((x, y))
            if a < 128:
                continue
            c_idx = get_closest_color_index((r, g, b))
            pixels_to_draw.append((start_x + x, start_y + y, c_idx))
    
    total_pixels = len(pixels_to_draw)
    print(f"[+] Se procesaron {total_pixels} píxeles a dibujar.")

    print("[*] Solicitando ticket WebSocket...")
    res_ticket = api_request("canvases.get_ws_ticket", {"id": numeric_id})
    if not res_ticket.get('success'):
        print(f"{Colors.FAIL}[-] Error solicitando ticket: {res_ticket}{Colors.ENDC}")
        return

    ticket = None
    if 'data' in res_ticket and 'ticket' in res_ticket['data']:
        ticket = res_ticket['data']['ticket']
    
    if not ticket:
        print(f"{Colors.FAIL}[-] Error: No se recibió un ticket en la respuesta. {res_ticket}{Colors.ENDC}")
        return

    ws_url = target_url.replace("http", "ws").replace("https", "wss")
    from urllib.parse import urlparse
    parsed = urlparse(ws_url)
    ws_url = f"{parsed.scheme}://{parsed.hostname}:8765/canvas/{numeric_id}?ticket={urllib.parse.quote(ticket)}"
    
    print(f"[*] Conectando a WebSocket: {ws_url}...")
    ws = websocket.WebSocket()
    try:
        ws.connect(ws_url, origin=target_url)
    except Exception as e:
        print(f"{Colors.FAIL}[-] Error de conexión WS: {e}{Colors.ENDC}")
        return
    print(f"{Colors.GREEN}[+] Conectado a WebSocket.{Colors.ENDC}")

    placed_count = 0
    total_pixels = len(pixels_to_draw)
    balance = cooldown_batch
    
    for px, py, pcolor in pixels_to_draw:
        while balance <= 0:
            print(f"\r[*] Cooldown alcanzado. Esperando {cooldown_sec} segundos...    ", end="")
            time.sleep(cooldown_sec)
            balance += cooldown_batch 

        msg = {
            "type": "pixel",
            "x": px,
            "y": py,
            "color": pcolor,
            "width": canvas_width,
            "userId": user_id
        }
        try:
            ws.send(json.dumps(msg))
            placed_count += 1
            balance -= 1
            print(f"\r[+] Dibujado ({px}, {py}) con color_idx {pcolor}. Progreso: {placed_count}/{total_pixels}  ", end="")
            # Throttling preventivo para no activar el anti-spam del servidor (>200 msg/s)
            time.sleep(0.01)
        except Exception as e:
            print(f"\n{Colors.FAIL}[-] Error enviando pixel: {e}{Colors.ENDC}")
            break
        
        try:
            ws.settimeout(0.2)
            resp = ws.recv()
            if resp:
                data = json.loads(resp)
                if data.get('type') == 'error':
                    print(f"\n{Colors.WARNING}[!] Servidor devolvió error: {data.get('message')}. Pausando un momento...{Colors.ENDC}")
                    time.sleep(cooldown_sec)
        except websocket.WebSocketTimeoutException:
            pass
        except Exception as e:
            pass

    ws.close()
    print(f"\n{Colors.GREEN}{Colors.BOLD}✅ Bot Painter finalizó exitosamente. Se dibujaron {placed_count} píxeles.{Colors.ENDC}")

def run_admin_image_injector():
    print(f"\n{Colors.HEADER}{Colors.BOLD}Inyector Instantáneo de Imágenes (Admin Bypass){Colors.ENDC}")
    image_path = input("Ruta de la imagen (ej: public/1.png): ").strip()
    canvas_id = input("ID numérico del Canvas (ej: 1): ").strip()
    x = input("Coordenada X (Enter para 0): ").strip() or "0"
    y = input("Coordenada Y (Enter para 0): ").strip() or "0"
    
    import os
    script_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.abspath(os.path.join(script_dir, '..'))
    abs_input = os.path.abspath(os.path.join(script_dir, image_path))
    
    try:
        rel_path = os.path.relpath(abs_input, project_root)
    except ValueError:
        rel_path = image_path
        
    rel_path = rel_path.replace('\\', '/')
    if rel_path.startswith('../') or rel_path.startswith('..\\'):
        docker_image_path = "/app/" + os.path.basename(abs_input)
    else:
        docker_image_path = "/app/" + rel_path
        
    cmd = [
        "docker", "exec", "-it", "rosaura_worker_canvas_jobs", 
        "python", "/app/admin_tools/image_tools/admin_draw_image.py",
        docker_image_path, canvas_id, "--x", x, "--y", y
    ]
    
    print(f"[*] Ejecutando Inyector...")
    try:
        import subprocess
        subprocess.run(cmd)
    except Exception as e:
        print(f"{Colors.FAIL}[-] Error ejecutando docker: {e}{Colors.ENDC}")

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
    print("4 - Ejecutar pruebas automatizadas de Autenticación (Login, Registro, 2FA, Reset Password)")
    print("5 - Inyectar Imagen Instantáneamente (Saltar Límites, uso exclusivo de Admin)")
    print("6 - Prueba de Estrés (Load Testing de WebSocket y Lienzos)")
    print("7 - Verificar y Generar Avatares Predeterminados")
    print("8 - Escanear claves de traducción (_t y __) y comprobar JSONs")
    choice = input(f"{Colors.WARNING}Ingresa 1, 2, 3, 4, 5, 6, 7 o 8: {Colors.ENDC}").strip()

    if choice not in ('1', '2', '3', '4', '5', '6', '7', '8'):
        print(f"{Colors.FAIL}Opción no válida. Saliendo.{Colors.ENDC}")
        return

    start_time = time.time()
    script_dir = os.path.dirname(os.path.abspath(__file__))
    target_path = os.path.abspath(os.path.join(script_dir, TARGET_DIR))

    if choice == '4':
        run_auth_tests()
        return
        
    if choice == '5':
        run_admin_image_injector()
        return

    if choice == '6':
        import stress_test
        stress_test.run_menu()
        return

    if choice == '7':
        import check_and_generate_avatars
        check_and_generate_avatars.run_avatar_generator()
        return

    if choice == '8':
        import i18n_scanner
        i18n_scanner.run_scanner(target_path, script_dir)
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