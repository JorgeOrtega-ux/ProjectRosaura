import urllib.request
import urllib.parse
import json
import random
import string
import subprocess
import re
from http.cookiejar import CookieJar

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

if __name__ == '__main__':
    run_auth_tests()
