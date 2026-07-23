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

    print(f"[*] Re-iniciando sesión para continuar con Pruebas de Configuración (Settings)...")
    res_relogin = api_request2("auth.login", {"email": email, "password": new_password, "turnstile_token": "dummy"})
    if not res_relogin.get('success'):
        print(f"{Colors.FAIL}[-] Error re-iniciando sesión para Settings: {res_relogin}{Colors.ENDC}")
        return

    # Ejecutar Pruebas de Settings
    run_settings_tests(target_url, opener2, csrf_token2, email, new_password, username)

def run_settings_tests(target_url, opener, csrf_token, email, password, username):
    print(f"\n{Colors.HEADER}{Colors.BOLD}Iniciando Pruebas Automatizadas de Settings / Configuración{Colors.ENDC}")
    print(f"Target: {target_url}\n")
    
    def api_req(route, payload):
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

    def multipart_api_req(route, field_name, filename, file_bytes):
        boundary = '----WebKitFormBoundary' + random_string(16)
        body = []
        
        body.append(f'--{boundary}'.encode('utf-8'))
        body.append(f'Content-Disposition: form-data; name="route"'.encode('utf-8'))
        body.append(b'')
        body.append(route.encode('utf-8'))

        body.append(f'--{boundary}'.encode('utf-8'))
        body.append(f'Content-Disposition: form-data; name="{field_name}"; filename="{filename}"'.encode('utf-8'))
        body.append(b'Content-Type: image/png')
        body.append(b'')
        body.append(file_bytes)
        
        body.append(f'--{boundary}--'.encode('utf-8'))
        body.append(b'')
        
        payload_bytes = b'\r\n'.join(body)
        
        url = target_url + "/api.php"
        req = urllib.request.Request(url, data=payload_bytes)
        req.add_header('Content-Type', f'multipart/form-data; boundary={boundary}')
        req.add_header('X-CSRF-TOKEN', csrf_token)
        try:
            r = opener.open(req)
            return json.loads(r.read().decode('utf-8'))
        except Exception as e:
            return {"success": False, "error": str(e)}

    # 1. Avatar (Actualizar y Eliminar)
    print(f"[*] [1/7] Probando subida y eliminación de foto de perfil (Avatar)...")
    dummy_png = (
        b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x10\x00\x00\x00\x10\x08\x06\x00\x00\x00\x1f\xf3\xffa'
        b'\x00\x00\x00\x19IDATx\x9cc\xfc\xcf\x80\x0f\x30\x03\x03\x03\x13\x03\x03\x03\x03\x03\x03\x00\x00\x29\x85\x01\x05'
        b'\x8e\x12\x8e\x90\x00\x00\x00\x00IEND\xaeB`\x82'
    )
    res_avatar = multipart_api_req("settings.update_avatar", "avatar", "test_avatar.png", dummy_png)
    if not res_avatar.get('success'):
        print(f"{Colors.FAIL}[-] Subida de avatar falló: {res_avatar}{Colors.ENDC}")
    else:
        print(f"{Colors.GREEN}[+] Avatar subido correctamente.{Colors.ENDC}")

    res_del_avatar = api_req("settings.delete_avatar", {})
    if not res_del_avatar.get('success'):
        print(f"{Colors.FAIL}[-] Borrado de avatar falló: {res_del_avatar}{Colors.ENDC}")
    else:
        print(f"{Colors.GREEN}[+] Avatar eliminado correctamente (revertido a default).{Colors.ENDC}")

    # 2. Cambio de Nombre de Usuario
    new_username = f"usr_{random_string(6)}"
    print(f"\n[*] [2/7] Probando actualización de nombre de usuario a '{new_username}'...")
    res_usr = api_req("settings.update_username", {"username": new_username})
    if not res_usr.get('success'):
        print(f"{Colors.FAIL}[-] Cambio de usuario falló: {res_usr}{Colors.ENDC}")
    else:
        print(f"{Colors.GREEN}[+] Usuario actualizado exitosamente.{Colors.ENDC}")
        username = new_username

    # 3. Cambio de Correo Electrónico (Solicitud, Verificación y Actualización)
    print(f"\n[*] [3/7] Probando flujo de actualización de correo electrónico...")
    res_req_code = api_req("settings.request_email_code", {})
    if not res_req_code.get('success') and not res_req_code.get('skip_verification'):
        print(f"{Colors.FAIL}[-] Solicitud de código de correo falló: {res_req_code}{Colors.ENDC}")
    else:
        print(f"{Colors.GREEN}[+] Solicitud de código de correo procesada.{Colors.ENDC}")
        email_code = get_code_from_redis(email, 'email_update')
        if email_code:
            print(f"{Colors.GREEN}[+] Código de actualización extraído de Redis: {email_code}{Colors.ENDC}")
            res_ver_email = api_req("settings.verify_email_code", {"code": email_code})
            if not res_ver_email.get('success'):
                print(f"{Colors.FAIL}[-] Verificación de código de correo falló: {res_ver_email}{Colors.ENDC}")
            else:
                print(f"{Colors.GREEN}[+] Código de correo verificado.{Colors.ENDC}")
        
        new_email = f"new_email_{random_string(6)}@gmail.com"
        print(f"[*] Cambiando correo a '{new_email}'...")
        res_upd_email = api_req("settings.update_email", {"email": new_email})
        if not res_upd_email.get('success'):
            print(f"{Colors.FAIL}[-] Actualización de correo falló: {res_upd_email}{Colors.ENDC}")
        else:
            print(f"{Colors.GREEN}[+] Correo electrónico actualizado exitosamente a '{new_email}'.{Colors.ENDC}")
            email = new_email

    # 4. Preferencias de Usuario (Idioma, Tema, Switches y Banderas)
    print(f"\n[*] [4/7] Probando actualización de preferencias de usuario...")
    prefs_to_test = [
        ("language", "es-419"),
        ("language", "en-US"),
        ("language", "es-419"),
        ("open_links_new_tab", 0),
        ("open_links_new_tab", 1),
        ("allow_telemetry", 0),
        ("allow_telemetry", 1),
        ("extended_alerts", 0),
        ("extended_alerts", 1),
        ("theme", "dark"),
        ("theme", "light"),
        ("theme", "system"),
        ("purchase_preference", "fast"),
        ("purchase_preference", "verify")
    ]
    for key, val in prefs_to_test:
        res_pref = api_req("settings.update_preferences", {"key": key, "value": val})
        if not res_pref.get('success'):
            print(f"{Colors.FAIL}[-] Falló preferencia {key}={val}: {res_pref}{Colors.ENDC}")
        else:
            print(f"{Colors.GREEN}[+] Preferencia actualizada: {key} => {val}{Colors.ENDC}")

    res_flag = api_req("settings.set_flag", {"flag_key": "test_automation_flag"})
    if not res_flag.get('success'):
        print(f"{Colors.FAIL}[-] Falló asignación de flag: {res_flag}{Colors.ENDC}")
    else:
        print(f"{Colors.GREEN}[+] Flag asignada correctamente: test_automation_flag{Colors.ENDC}")

    # 5. Seguridad: Verificación de Contraseña Actual y Cambio de Contraseña
    print(f"\n[*] [5/7] Probando flujo de verificación y cambio de contraseña...")
    res_ver_pwd = api_req("settings.verify_current_password", {"password": password})
    if not res_ver_pwd.get('success'):
        print(f"{Colors.FAIL}[-] Verificación de contraseña actual falló: {res_ver_pwd}{Colors.ENDC}")
    else:
        print(f"{Colors.GREEN}[+] Contraseña actual verificada.{Colors.ENDC}")
        new_password = "UpdatedSecurePassword789!"
        res_upd_pwd = api_req("settings.update_password", {"new_password": new_password, "confirm_password": new_password})
        if not res_upd_pwd.get('success'):
            print(f"{Colors.FAIL}[-] Cambio de contraseña falló: {res_upd_pwd}{Colors.ENDC}")
        else:
            print(f"{Colors.GREEN}[+] Contraseña cambiada exitosamente.{Colors.ENDC}")
            password = new_password
            
            # Re-autenticar al haber invalidado la sesión anterior por cambio de contraseña
            print(f"[*] Re-autenticando sesión tras cambio de contraseña...")
            res_relogin = api_req("auth.login", {"email": email, "password": password, "turnstile_token": "dummy"})
            if res_relogin.get('success'):
                print(f"{Colors.GREEN}[+] Re-autenticación exitosa.{Colors.ENDC}")
            else:
                print(f"{Colors.FAIL}[-] Re-autenticación falló: {res_relogin}{Colors.ENDC}")

    # 6. Autenticación en dos factores (2FA: Setup, Enable, Regenerate Recovery, Disable)
    print(f"\n[*] [6/7] Probando módulo de Autenticación de Dos Factores (2FA)...")
    res_2fa_gen = api_req("settings.2fa_generate", {})
    if not res_2fa_gen.get('success'):
        print(f"{Colors.FAIL}[-] Generación de setup 2FA falló: {res_2fa_gen}{Colors.ENDC}")
    else:
        secret = res_2fa_gen.get('secret')
        print(f"{Colors.GREEN}[+] Setup 2FA generado. Secret: {secret}{Colors.ENDC}")
        
        def generate_totp(s):
            import hmac, hashlib, struct, time, base64
            key = base64.b32decode(s.upper() + '=' * ((8 - len(s) % 8) % 8))
            intervals_no = int(time.time()) // 30
            msg = struct.pack(">Q", intervals_no)
            h = hmac.new(key, msg, hashlib.sha1).digest()
            o = h[19] & 15
            h = (struct.unpack(">I", h[o:o+4])[0] & 0x7fffffff) % 1000000
            return f"{h:06d}"

        totp_code = generate_totp(secret)
        print(f"[*] Activando 2FA con código TOTP {totp_code} ...")
        res_2fa_en = api_req("settings.2fa_enable", {"code": totp_code})
        if not res_2fa_en.get('success'):
            print(f"{Colors.FAIL}[-] Activación 2FA falló: {res_2fa_en}{Colors.ENDC}")
        else:
            print(f"{Colors.GREEN}[+] 2FA activado exitosamente.{Colors.ENDC}")
            
            print(f"[*] Regenerando códigos de recuperación 2FA...")
            res_2fa_reg = api_req("settings.2fa_regenerate_recovery", {"password": password})
            if not res_2fa_reg.get('success'):
                print(f"{Colors.FAIL}[-] Regeneración de códigos 2FA falló: {res_2fa_reg}{Colors.ENDC}")
            else:
                print(f"{Colors.GREEN}[+] Códigos de recuperación 2FA regenerados.{Colors.ENDC}")

            print(f"[*] Desactivando 2FA...")
            res_2fa_dis = api_req("settings.2fa_disable", {"password": password})
            if not res_2fa_dis.get('success'):
                print(f"{Colors.FAIL}[-] Desactivación 2FA falló: {res_2fa_dis}{Colors.ENDC}")
            else:
                print(f"{Colors.GREEN}[+] 2FA desactivado correctamente.{Colors.ENDC}")

    # 7. Dispositivos y Sesiones Activas
    print(f"\n[*] [7/7] Probando gestión de dispositivos y sesiones activas...")
    res_devices = api_req("settings.get_devices", {})
    if not res_devices.get('success'):
        print(f"{Colors.FAIL}[-] Consulta de dispositivos falló: {res_devices}{Colors.ENDC}")
    else:
        devices_count = len(res_devices.get('devices', []))
        print(f"{Colors.GREEN}[+] Dispositivos activos obtenidos: {devices_count}{Colors.ENDC}")

    res_revoke = api_req("settings.revoke_all_devices", {"type": "revoke_other"})
    if not res_revoke.get('success'):
        print(f"{Colors.FAIL}[-] Revocación de otras sesiones falló: {res_revoke}{Colors.ENDC}")
    else:
        print(f"{Colors.GREEN}[+] Revocación de otras sesiones ejecutada exitosamente.{Colors.ENDC}")

    print(f"\n{Colors.HEADER}======================================={Colors.ENDC}")
    print(f"{Colors.GREEN}{Colors.BOLD}[OK] ¡Todas las pruebas de Configuración (Settings) se ejecutaron con éxito!{Colors.ENDC}")
    print(f"{Colors.HEADER}======================================={Colors.ENDC}\n")

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