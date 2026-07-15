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
WORDS_FILE = 'word.txt'
TARGET_DIR = '../' 

IGNORE_DIRS = {
    '.git', 'vendor', 'node_modules', 'docker', 'storage', 
    'public/assets/img', 'translations', 'project_scanner', 'i18scanner'
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

def random_string(length=10):
    letters = string.ascii_lowercase
    return ''.join(random.choice(letters) for _ in range(length))

def get_code_from_redis(email, code_type):
    redis_pass = "8f4e2d1c9b7a5f6e3d2c1b0a9f8e7d6c5b4a3f2e1d0c9b8a7f6e5d4c3b2a1f0e"
    cmd1 = [
        "docker", "exec", "-i", "rosaura_redis",
        "redis-cli", "-a", redis_pass, "GET", f"vercode:ident:{email}:{code_type}"
    ]
    try:
        id_res = subprocess.check_output(cmd1, stderr=subprocess.STDOUT).decode('utf-8').strip()
        id_res = id_res.split('\n')[-1].strip()
        
        if id_res == "(nil)" or not id_res:
            return None

        cmd2 = [
            "docker", "exec", "-i", "rosaura_redis",
            "redis-cli", "-a", redis_pass, "GET", f"vercode:id:{id_res}"
        ]
        json_res = subprocess.check_output(cmd2, stderr=subprocess.STDOUT).decode('utf-8').strip()
        json_res = json_res.split('\n')[-1].strip()

        if json_res and json_res != "(nil)":
            data = json.loads(json_res)
            return data.get('code')
        return None
    except Exception as e:
        print(f"{Colors.FAIL}Error ejecutando Redis: {e}{Colors.ENDC}")
        return None

def run_auth_tests(target_url="http://localhost"):
    print(f"\n{Colors.HEADER}{Colors.BOLD}Iniciando Pruebas Automatizadas de Autenticación{Colors.ENDC}")
    print(f"Objetivo: {target_url}\n")
    
    cj = CookieJar()
    opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cj))
    
    csrf_token = ""
    # 1. Obtener CSRF Token
    try:
        print(f"[*] Obteniendo CSRF Token de {target_url}/ ...")
        resp = opener.open(target_url + "/")
        html = resp.read().decode('utf-8')
        match = re.search(r'<meta name="csrf-token" content="([^"]+)">', html)
        if match:
            csrf_token = match.group(1)
            print(f"{Colors.GREEN}[+] CSRF Token obtenido.{Colors.ENDC}")
        else:
            print(f"{Colors.WARNING}[!] No se pudo encontrar el meta tag csrf-token.{Colors.ENDC}")
    except Exception as e:
        print(f"{Colors.FAIL}[-] Error al obtener la página de inicio: {e}{Colors.ENDC}")
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
    print("2 - Identificar estilos inline (style=\"...\") en archivos PHP")
    print("3 - Identificar código de depuración (console.log, var_dump, etc.)")
    print("4 - Ejecutar pruebas automatizadas de Autenticación (Login, Registro, 2FA, Reset Password)")
    choice = input(f"{Colors.WARNING}Ingresa 1, 2, 3 o 4: {Colors.ENDC}").strip()

    if choice not in ('1', '2', '3', '4'):
        print(f"{Colors.FAIL}Opción no válida. Saliendo.{Colors.ENDC}")
        return

    start_time = time.time()
    script_dir = os.path.dirname(os.path.abspath(__file__))
    target_path = os.path.abspath(os.path.join(script_dir, TARGET_DIR))

    if choice == '4':
        run_auth_tests()
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
        print(f"{Colors.HEADER}{Colors.BOLD}Iniciando escaneo avanzado de Internacionalización...{Colors.ENDC}")
        print(f"Buscando {Colors.BLUE}{len(words_to_search)}{Colors.ENDC} palabras clave.")
        report_title = "Reporte de Escaneo de Internacionalización"
    elif choice == '2':
        search_pattern = re.compile(r'\sstyle\s*=\s*["\'][^"\']*["\']', re.IGNORECASE)
        print(f"{Colors.HEADER}{Colors.BOLD}Iniciando búsqueda de estilos inline en archivos PHP...{Colors.ENDC}")
        report_title = "Reporte de Estilos Inline"
    else:
        debug_funcs = [r'console\.log\(', r'print_r\(', r'var_dump\(', r'die\(', r'exit\(']
        search_pattern = re.compile('(' + '|'.join(debug_funcs) + ')', re.IGNORECASE)
        print(f"{Colors.HEADER}{Colors.BOLD}Iniciando búsqueda de funciones de depuración olvidadas...{Colors.ENDC}")
        report_title = "Reporte de Código de Depuración"

    files_to_scan = get_files_to_scan(target_path)
    if choice == '2':
        files_to_scan = [f for f in files_to_scan if f.lower().endswith('.php') and 'emailtemplates.php' not in f.lower()]
    elif choice == '3':
        files_to_scan = [f for f in files_to_scan if f.lower().endswith(('.php', '.js', '.ts', '.vue'))]

    print(f"Archivos a escanear: {Colors.BLUE}{len(files_to_scan)}{Colors.ENDC} en {target_path}\n")

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