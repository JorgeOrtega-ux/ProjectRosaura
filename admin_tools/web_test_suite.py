import os
import sys
import time
import json
import base64
import hmac
import hashlib
import struct
import random
import string
from datetime import datetime
import pymysql
import redis
import requests

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', line_buffering=True)

# ==============================================================================
# COLORES Y FORMATEO ANSI
# ==============================================================================
class Colors:
    HEADER = '\033[95m'
    BLUE = '\033[94m'
    CYAN = '\033[96m'
    GREEN = '\033[92m'
    WARNING = '\033[93m'
    FAIL = '\033[91m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'
    DIM = '\033[2m'

# ==============================================================================
# GENERADOR NATIVO TOTP (RFC 6238 / GOOGLE AUTHENTICATOR)
# ==============================================================================
def generate_totp_code(secret: str, time_step: int = 30, digits: int = 6) -> str:
    """Genera un código TOTP de 6 dígitos válido en Python puro usando RFC 6238."""
    secret_clean = secret.strip().replace(' ', '').upper()
    padding = '=' * ((8 - len(secret_clean) % 8) % 8)
    key = base64.b32decode(secret_clean + padding)
    counter = int(time.time() // time_step)
    msg = struct.pack(">Q", counter)
    h = hmac.new(key, msg, hashlib.sha1).digest()
    offset = h[-1] & 0x0F
    code = (struct.unpack(">I", h[offset:offset+4])[0] & 0x7FFFFFFF) % (10 ** digits)
    return str(code).zfill(digits)

# ==============================================================================
# CARGADOR DE ENTORNO (.ENV)
# ==============================================================================
def load_project_env(project_root: str) -> dict:
    env_path = os.path.join(project_root, '.env')
    env_vars = {}
    if os.path.exists(env_path):
        with open(env_path, 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    k, v = line.split('=', 1)
                    env_vars[k.strip()] = v.strip().strip("'").strip('"')
    return env_vars

# ==============================================================================
# CLIENTE HTTP PARA PRUEBAS (API CLIENT CON SESIÓN Y CSRF)
# ==============================================================================
class TestApiClient:
    def __init__(self, base_url: str):
        self.base_url = base_url.rstrip('/')
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'RosauraE2ETestRunner/2.0 (Automated Suite)',
            'Accept': 'application/json'
        })
        self.csrf_token = None
        self.dummy_turnstile = 'XXXX.DUMMY.TOKEN.XXXX'

    def refresh_csrf(self) -> str:
        url = f"{self.base_url}/api/index.php?route=csrf.refresh"
        try:
            resp = self.session.get(url, timeout=10)
            if resp.status_code == 200:
                data = resp.json()
                if data.get('success') and data.get('csrf_token'):
                    self.csrf_token = data['csrf_token']
                    self.session.headers.update({'X-CSRF-Token': self.csrf_token})
                    return self.csrf_token
        except Exception:
            pass
        return ""

    def post_json(self, route: str, payload: dict = None) -> requests.Response:
        if not self.csrf_token:
            self.refresh_csrf()
        
        data = payload.copy() if payload else {}
        data['route'] = route
        if self.csrf_token:
            data['csrf_token'] = self.csrf_token

        headers = {
            'Content-Type': 'application/json',
            'X-CSRF-Token': self.csrf_token or ''
        }
        url = f"{self.base_url}/api/index.php"
        try:
            resp = self.session.post(url, json=data, headers=headers, timeout=25)
            try:
                res_json = resp.json()
                if isinstance(res_json, dict) and res_json.get('csrf_token'):
                    self.csrf_token = res_json['csrf_token']
                    self.session.headers.update({'X-CSRF-Token': self.csrf_token})
            except Exception:
                pass
            return resp
        except Exception as e:
            resp = requests.Response()
            resp.status_code = 504
            resp._content = json.dumps({'success': False, 'message': f'Timeout o error de conexion: {e}'}).encode('utf-8')
            return resp

    def get_route(self, route: str, params: dict = None) -> requests.Response:
        url = f"{self.base_url}/api/index.php"
        queryParams = {'route': route}
        if params:
            queryParams.update(params)
        try:
            return self.session.get(url, params=queryParams, timeout=25)
        except Exception as e:
            resp = requests.Response()
            resp.status_code = 504
            resp._content = json.dumps({'success': False, 'message': f'Timeout o error de conexion: {e}'}).encode('utf-8')
            return resp

    def reset_session(self):
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'RosauraE2ETestRunner/2.0 (Automated Suite)',
            'Accept': 'application/json'
        })
        self.csrf_token = None
        self.refresh_csrf()

# ==============================================================================
# GESTOR DE SUITE DE PRUEBAS E2E
# ==============================================================================
class RosauraWebTestSuite:
    def __init__(self, project_root: str, script_dir: str):
        self.project_root = project_root
        self.script_dir = script_dir
        self.env = load_project_env(project_root)
        
        self.app_url = self.env.get('APP_URL', 'http://localhost')
        self.client = TestApiClient(self.app_url)
        
        # Conexiones a BD y Redis
        self.db_host = '127.0.0.1'
        self.db_port = int(self.env.get('DB_PORT', 3306))
        self.db_user = self.env.get('DB_ROOT_USER', 'root')
        self.db_pass = self.env.get('DB_ROOT_PASSWORD', 'c7a91e4d5b2f8a0c3d6e9f1b4a7c0d2e5f8b1c4a9d6e3f0b7c2a5d8e1f4b9c6a')
        
        self.redis_host = '127.0.0.1'
        self.redis_port = int(self.env.get('REDIS_PORT', 6379))
        self.redis_pass = self.env.get('REDIS_PASS', '')
        
        self.redis_client = None
        self._init_redis()

        # Registro de resultados de pruebas
        self.results = []
        self.created_users = []      # Emails para limpieza
        self.created_canvases = []   # UUIDs para limpieza
        self.created_roles = []      # IDs para limpieza
        self.created_palettes = []   # IDs para limpieza
        self.run_id = ''.join(random.choices(string.ascii_lowercase + string.digits, k=6))

    def _init_redis(self):
        try:
            self.redis_client = redis.Redis(
                host=self.redis_host,
                port=self.redis_port,
                password=self.redis_pass if self.redis_pass else None,
                decode_responses=True,
                socket_timeout=3
            )
            self.redis_client.ping()
        except Exception:
            self.redis_client = None

    def get_db_connection(self, db_name: str = 'db_identity'):
        return pymysql.connect(
            host=self.db_host,
            port=self.db_port,
            user=self.db_user,
            password=self.db_pass,
            database=db_name,
            charset='utf8mb4',
            cursorclass=pymysql.cursors.DictCursor
        )

    def flush_rate_limits(self):
        """Limpia contadores de rate limiting en Redis para no bloquear el runner."""
        if not self.redis_client:
            return
        try:
            keys = self.redis_client.keys("rate_limit:*")
            keys += self.redis_client.keys("global_api_ip_*")
            keys += self.redis_client.keys("2fa_used:*")
            if keys:
                self.redis_client.delete(*keys)
        except Exception:
            pass

    def get_verification_code(self, identifier: str, code_type: str = 'account_activation') -> str:
        """Obtiene el código de verificación desde Redis o MySQL."""
        if self.redis_client:
            try:
                key_ident = f"vercode:ident:{identifier}:{code_type}"
                code_id = self.redis_client.get(key_ident)
                if code_id:
                    raw_json = self.redis_client.get(f"vercode:id:{code_id}")
                    if raw_json:
                        data = json.loads(raw_json)
                        if data.get('code'):
                            return str(data['code'])
            except Exception:
                pass

        try:
            conn = self.get_db_connection('db_identity')
            with conn.cursor() as cur:
                cur.execute("SELECT code FROM verification_codes WHERE identifier = %s AND code_type = %s ORDER BY id DESC LIMIT 1", (identifier, code_type))
                row = cur.fetchone()
                if row:
                    conn.close()
                    return str(row['code'])
            conn.close()
        except Exception:
            pass
        return ""

    def log_test(self, module: str, test_name: str, passed: bool, duration_ms: float, details: str = "", response_code: int = 200):
        status_tag = f"{Colors.GREEN}[PASS]{Colors.ENDC}" if passed else f"{Colors.FAIL}[FAIL]{Colors.ENDC}"
        time_tag = f"{Colors.DIM}({int(duration_ms)}ms){Colors.ENDC}"
        http_tag = f"{Colors.BLUE}[{response_code}]{Colors.ENDC}"
        print(f"  {status_tag} {http_tag} {test_name} {time_tag}", flush=True)
        if not passed and details:
            print(f"       {Colors.FAIL}└─ Detalle: {details}{Colors.ENDC}", flush=True)

        self.results.append({
            'module': module,
            'test_name': test_name,
            'passed': passed,
            'duration_ms': round(duration_ms, 2),
            'response_code': response_code,
            'details': details
        })

    # ==========================================================================
    # EJECUCIÓN DE PRUEBAS POR MÓDULO
    # ==========================================================================
    def run_all(self):
        start_total = time.time()
        print(f"\n{Colors.HEADER}{Colors.BOLD}{'='*75}", flush=True)
        print(f"🚀 INICIANDO SUITE DE PRUEBAS INTEGRALES (E2E WEB TEST SUITE)", flush=True)
        print(f"   Objetivo: {Colors.CYAN}{self.app_url}{Colors.ENDC} | ID de Ejecución: {Colors.WARNING}{self.run_id}{Colors.ENDC}", flush=True)
        print(f"{'='*75}{Colors.ENDC}\n", flush=True)

        # 0. Conectividad
        print(f"{Colors.BOLD}▶ Verificando conectividad inicial...{Colors.ENDC}", flush=True)
        if not self.test_connectivity():
            print(f"{Colors.FAIL}❌ Error crítico de conectividad. Abortando pruebas.{Colors.ENDC}", flush=True)
            return

        self.flush_rate_limits()

        # Variables compartidas de usuario de prueba
        test_user = {
            'username': f"tuser_{self.run_id}",
            'email': f"test_{self.run_id}@gmail.com",
            'password': "Password123!@#Test",
            'new_password': "NewPassword123!@#Test",
            'user_id': None,
            '2fa_secret': None
        }
        self.created_users.append(test_user['email'])

        # 1. Módulo Autenticación y Seguridad
        print(f"\n{Colors.HEADER}{Colors.BOLD}━━━ MÓDULO 1: AUTENTICACIÓN, SEGURIDAD & 2FA ━━━{Colors.ENDC}", flush=True)
        self.module_auth(test_user)

        # 2. Módulo Lienzos (Canvases)
        print(f"\n{Colors.HEADER}{Colors.BOLD}━━━ MÓDULO 2: GESTIÓN INTEGRAL DE LIENZOS ━━━{Colors.ENDC}", flush=True)
        self.module_canvases(test_user)

        # 3. Módulo Roles RBAC y Administración
        print(f"\n{Colors.HEADER}{Colors.BOLD}━━━ MÓDULO 3: ROLES RBAC & PERMISOS ADMINISTRATIVOS ━━━{Colors.ENDC}", flush=True)
        self.module_roles_and_admin(test_user)

        # 4. Módulo Configuración de Usuario y Perfil
        print(f"\n{Colors.HEADER}{Colors.BOLD}━━━ MÓDULO 4: PREFERENCIAS Y PERFIL DE USUARIO ━━━{Colors.ENDC}", flush=True)
        self.module_user_profile(test_user)

        # 5. Teardown y Limpieza
        print(f"\n{Colors.HEADER}{Colors.BOLD}━━━ LIMPIEZA AUTOMÁTICA (TEARDOWN) ━━━{Colors.ENDC}", flush=True)
        self.teardown()

        # 6. Resumen y Reporte
        total_time = round(time.time() - start_total, 2)
        self.generate_report(total_time)

    # --------------------------------------------------------------------------
    # 0. CONECTIVIDAD
    # --------------------------------------------------------------------------
    def test_connectivity(self) -> bool:
        t0 = time.time()
        csrf = self.client.refresh_csrf()
        dur = (time.time() - t0) * 1000
        if csrf:
            self.log_test("System", "Verificación de endpoint CSRF (csrf.refresh)", True, dur, f"Token: {csrf[:12]}...")
            return True
        else:
            self.log_test("System", "Verificación de endpoint CSRF (csrf.refresh)", False, dur, "No se pudo obtener CSRF Token")
            return False

    # --------------------------------------------------------------------------
    # 1. MÓDULO: AUTENTICACIÓN & 2FA
    # --------------------------------------------------------------------------
    def module_auth(self, u: dict):
        # 1.1 Registro Paso 1
        t0 = time.time()
        r1 = self.client.post_json('auth.register.step1', {
            'email': u['email'],
            'password': u['password'],
            'turnstile_token': self.client.dummy_turnstile
        })
        dur = (time.time() - t0) * 1000
        d1 = r1.json() if r1.status_code == 200 else {}
        reg_token = d1.get('reg_token')
        p1 = r1.status_code == 200 and d1.get('success') and bool(reg_token)
        self.log_test("Auth", "Registro Paso 1: Email y Contraseña", p1, dur, d1.get('message', ''), r1.status_code)

        if not p1:
            return

        # 1.2 Registro Paso 2
        t0 = time.time()
        r2 = self.client.post_json('auth.register.step2', {
            'username': u['username'],
            'reg_token': reg_token
        })
        dur = (time.time() - t0) * 1000
        d2 = r2.json() if r2.status_code == 200 else {}
        p2 = r2.status_code == 200 and d2.get('success')
        self.log_test("Auth", "Registro Paso 2: Nombre de Usuario y Envío de Código", p2, dur, d2.get('message', ''), r2.status_code)

        # 1.3 Verificación de código de activación
        t0 = time.time()
        time.sleep(0.1)
        code = self.get_verification_code(u['email'], 'account_activation')

        if code:
            r3 = self.client.post_json('auth.register.verify', {
                'reg_token': reg_token,
                'code': code
            })
            dur = (time.time() - t0) * 1000
            d3 = r3.json() if r3.status_code == 200 else {}
            p3 = r3.status_code == 200 and d3.get('success')
            self.log_test("Auth", f"Registro Verificación: Código OTP ({code})", p3, dur, d3.get('message', ''), r3.status_code)
        else:
            self.log_test("Auth", "Registro Verificación: Código OTP", False, (time.time() - t0) * 1000, "Código de activación no encontrado en Redis/DB")

        # 1.4 Intento de Login con contraseña errónea (Debe fallar)
        self.client.reset_session()
        t0 = time.time()
        r_fail = self.client.post_json('auth.login', {
            'email': u['email'],
            'password': 'WrongPassword123!',
            'turnstile_token': self.client.dummy_turnstile
        })
        dur = (time.time() - t0) * 1000
        d_fail = r_fail.json() if r_fail.status_code in (200, 400, 401) else {}
        p_fail = not d_fail.get('success', False)
        self.log_test("Auth", "Login con contraseña inválida (Rechazo esperado)", p_fail, dur, d_fail.get('message', ''), r_fail.status_code)

        # Obtener User ID y elevar tier 3 en DB antes del primer login para que la sesión cargue tier 3
        try:
            conn = self.get_db_connection('db_identity')
            with conn.cursor() as cur:
                cur.execute("SELECT id FROM users WHERE email = %s", (u['email'],))
                row = cur.fetchone()
                if row:
                    u['user_id'] = row['id']
                    cur.execute("UPDATE users SET subscription_tier = 3, real_subscription_tier = 3 WHERE id = %s", (u['user_id'],))
                    conn.commit()
            conn.close()
            if self.redis_client and u['user_id']:
                self.redis_client.delete(f"user:profile:{u['user_id']}")
        except Exception:
            pass

        # 1.5 Login con credenciales válidas
        self.flush_rate_limits()
        t0 = time.time()
        r_login = self.client.post_json('auth.login', {
            'email': u['email'],
            'password': u['password'],
            'turnstile_token': self.client.dummy_turnstile
        })
        dur = (time.time() - t0) * 1000
        d_login = r_login.json() if r_login.status_code == 200 else {}
        p_login = r_login.status_code == 200 and d_login.get('success')
        self.log_test("Auth", "Login con credenciales válidas", p_login, dur, d_login.get('message', ''), r_login.status_code)

        # 1.6 Generación de secreto 2FA
        t0 = time.time()
        r_2fa_gen = self.client.post_json('settings.2fa_generate')
        dur = (time.time() - t0) * 1000
        d_2fa_gen = r_2fa_gen.json() if r_2fa_gen.status_code == 200 else {}
        secret = d_2fa_gen.get('secret')
        u['2fa_secret'] = secret
        p_2fa_gen = r_2fa_gen.status_code == 200 and d_2fa_gen.get('success') and bool(secret)
        self.log_test("Auth", "2FA: Generar secreto TOTP", p_2fa_gen, dur, d_2fa_gen.get('message', ''), r_2fa_gen.status_code)

        # 1.7 Activación de 2FA con código calculado por Python
        if secret:
            totp_code = generate_totp_code(secret)
            t0 = time.time()
            r_2fa_en = self.client.post_json('settings.2fa_enable', {'code': totp_code})
            dur = (time.time() - t0) * 1000
            d_2fa_en = r_2fa_en.json() if r_2fa_en.status_code == 200 else {}
            p_2fa_en = r_2fa_en.status_code == 200 and d_2fa_en.get('success')
            self.log_test("Auth", f"2FA: Habilitar con código calculado ({totp_code})", p_2fa_en, dur, d_2fa_en.get('message', ''), r_2fa_en.status_code)

            # 1.8 Probar flujo de Login con desafío 2FA
            self.client.reset_session()
            self.flush_rate_limits()
            t0 = time.time()
            r_l2 = self.client.post_json('auth.login', {
                'email': u['email'],
                'password': u['password'],
                'turnstile_token': self.client.dummy_turnstile
            })
            dur = (time.time() - t0) * 1000
            d_l2 = r_l2.json() if r_l2.status_code == 200 else {}
            temp_auth_token = d_l2.get('temp_auth_token')
            p_l2 = r_l2.status_code == 200 and (d_l2.get('requires_2fa') or d_l2.get('status') == 'requires_2fa' or bool(temp_auth_token))
            self.log_test("Auth", "2FA: Login solicita desafío de segundo factor", p_l2, dur, d_l2.get('message', ''), r_l2.status_code)

            # Responder al desafío 2FA
            totp_code_2 = generate_totp_code(secret)
            t0 = time.time()
            r_v2fa = self.client.post_json('auth.login.verify_2fa', {
                'code': totp_code_2,
                'temp_auth_token': temp_auth_token,
                'turnstile_token': self.client.dummy_turnstile
            })
            dur = (time.time() - t0) * 1000
            d_v2fa = r_v2fa.json() if r_v2fa.status_code == 200 else {}
            p_v2fa = r_v2fa.status_code == 200 and d_v2fa.get('success')
            self.log_test("Auth", f"2FA: Validación de desafío con TOTP ({totp_code_2})", p_v2fa, dur, d_v2fa.get('message', ''), r_v2fa.status_code)

            # 1.9 Deshabilitar 2FA con contraseña
            t0 = time.time()
            r_2fa_dis = self.client.post_json('settings.2fa_disable', {'password': u['password']})
            dur = (time.time() - t0) * 1000
            d_2fa_dis = r_2fa_dis.json() if r_2fa_dis.status_code == 200 else {}
            p_2fa_dis = r_2fa_dis.status_code == 200 and d_2fa_dis.get('success')
            self.log_test("Auth", "2FA: Desactivar segundo factor", p_2fa_dis, dur, d_2fa_dis.get('message', ''), r_2fa_dis.status_code)

        # 1.10 Recuperación de contraseña (Forgot Password)
        self.client.reset_session()
        self.flush_rate_limits()
        t0 = time.time()
        r_fp = self.client.post_json('auth.forgot_password', {
            'email': u['email'],
            'turnstile_token': self.client.dummy_turnstile
        })
        dur = (time.time() - t0) * 1000
        d_fp = r_fp.json() if r_fp.status_code == 200 else {}
        p_fp = r_fp.status_code == 200 and d_fp.get('success')
        self.log_test("Auth", "Forgot Password: Solicitud de enlace de recuperación", p_fp, dur, d_fp.get('message', ''), r_fp.status_code)

        # 1.11 Reseteo de contraseña (Reset Password)
        time.sleep(0.1)
        reset_token = self.get_verification_code(u['email'], 'password_reset')
        if reset_token:
            t0 = time.time()
            r_rp = self.client.post_json('auth.reset_password', {
                'token': reset_token,
                'password': u['new_password'],
                'turnstile_token': self.client.dummy_turnstile
            })
            dur = (time.time() - t0) * 1000
            d_rp = r_rp.json() if r_rp.status_code == 200 else {}
            p_rp = r_rp.status_code == 200 and d_rp.get('success')
            self.log_test("Auth", f"Reset Password: Cambio exitoso con token ({reset_token[:8]}...)", p_rp, dur, d_rp.get('message', ''), r_rp.status_code)

            # Verificar login con la nueva contraseña
            self.flush_rate_limits()
            t0 = time.time()
            r_lnew = self.client.post_json('auth.login', {
                'email': u['email'],
                'password': u['new_password'],
                'turnstile_token': self.client.dummy_turnstile
            })
            dur = (time.time() - t0) * 1000
            d_lnew = r_lnew.json() if r_lnew.status_code == 200 else {}
            p_lnew = r_lnew.status_code == 200 and d_lnew.get('success')
            self.log_test("Auth", "Login con la nueva contraseña actualizada", p_lnew, dur, d_lnew.get('message', ''), r_lnew.status_code)
            u['password'] = u['new_password']

    # --------------------------------------------------------------------------
    # 2. MÓDULO: LIENZOS (CANVASES)
    # --------------------------------------------------------------------------
    def module_canvases(self, u: dict):
        # Asegurar tier 3 en DB y purgar cache de perfil para permitir paletas y roles personalizados
        if u.get('user_id'):
            try:
                conn = self.get_db_connection('db_identity')
                with conn.cursor() as cur:
                    cur.execute("UPDATE users SET subscription_tier = 3, real_subscription_tier = 3 WHERE id = %s", (u['user_id'],))
                    conn.commit()
                conn.close()
                if self.redis_client:
                    for k in self.redis_client.keys("user:profile:*"):
                        self.redis_client.delete(k)
            except Exception:
                pass

        # 2.1 Crear Lienzo
        canvas_name = f"Canvas Test {self.run_id}"
        t0 = time.time()
        r_create = self.client.post_json('canvases.create', {
            'name': canvas_name,
            'privacy': 'private',
            'requires_approval': False,
            'size': '64x64',
            'palette_id': 'default',
            'cooldown_pixels_batch': 5,
            'cooldown_seconds': 10,
            'allow_chat': 1,
            'tags': ['pixelart', 'art']
        })
        dur = (time.time() - t0) * 1000
        d_create = r_create.json() if r_create.status_code == 200 else {}
        canvas_uuid = d_create.get('data', {}).get('uuid') or d_create.get('uuid')
        p_create = r_create.status_code == 200 and d_create.get('success') and bool(canvas_uuid)
        self.log_test("Canvases", f"Crear nuevo lienzo ('{canvas_name}')", p_create, dur, d_create.get('message', ''), r_create.status_code)

        if not canvas_uuid:
            return

        self.created_canvases.append(canvas_uuid)

        # Obtener ID numérico del lienzo
        canvas_id = None
        try:
            conn = self.get_db_connection('db_canvases')
            with conn.cursor() as cur:
                cur.execute("SELECT id FROM canvases WHERE uuid = %s", (canvas_uuid,))
                row = cur.fetchone()
                if row:
                    canvas_id = row['id']
            conn.close()
        except Exception:
            pass

        # 2.2 Consultar lienzo (canvases.get)
        t0 = time.time()
        r_get = self.client.get_route('canvases.get', {'id': canvas_id})
        dur = (time.time() - t0) * 1000
        d_get = r_get.json() if r_get.status_code == 200 else {}
        p_get = r_get.status_code == 200 and d_get.get('success')
        self.log_test("Canvases", f"Consultar detalles del lienzo (ID: {canvas_id})", p_get, dur, d_get.get('message', ''), r_get.status_code)

        # 2.3 Modificar opciones del lienzo (canvases.update)
        t0 = time.time()
        r_up = self.client.post_json('canvases.update', {
            'id': canvas_id,
            'name': f"Updated {canvas_name}",
            'privacy': 'public',
            'palette_id': 'default',
            'max_members': 20,
            'cooldown_pixels_batch': 5,
            'cooldown_seconds': 10,
            'allow_chat': 0,
            'tags': ['pixelart']
        })
        dur = (time.time() - t0) * 1000
        d_up = r_up.json() if r_up.status_code == 200 else {}
        p_up = r_up.status_code == 200 and d_up.get('success')
        self.log_test("Canvases", "Modificar opciones y privacidad del lienzo", p_up, dur, d_up.get('message', ''), r_up.status_code)

        # 2.4 Paletas personalizadas (Crear, Listar, Eliminar)
        t0 = time.time()
        r_pal = self.client.post_json('canvases.create_custom_palette', {
            'name': f"Palette_{self.run_id}",
            'colors': ['#FF0000', '#00FF00', '#0000FF', '#FFFF00']
        })
        dur = (time.time() - t0) * 1000
        d_pal = r_pal.json() if r_pal.status_code == 200 else {}
        pal_id = d_pal.get('palette_key') or d_pal.get('id') or d_pal.get('data', {}).get('palette_key')
        if pal_id:
            self.created_palettes.append(pal_id)
        p_pal = r_pal.status_code == 200 and d_pal.get('success')
        self.log_test("Canvases", "Crear paleta de colores personalizada", p_pal, dur, d_pal.get('message', ''), r_pal.status_code)

        # Listar paletas personalizadas
        t0 = time.time()
        r_lpal = self.client.get_route('canvases.get_custom_palettes')
        dur = (time.time() - t0) * 1000
        d_lpal = r_lpal.json() if r_lpal.status_code == 200 else {}
        p_lpal = r_lpal.status_code == 200 and d_lpal.get('success')
        self.log_test("Canvases", "Listar paletas personalizadas del usuario", p_lpal, dur, d_lpal.get('message', ''), r_lpal.status_code)

        # Eliminar paleta personalizada
        if pal_id:
            t0 = time.time()
            r_dpal = self.client.post_json('canvases.delete_custom_palette', {'id': pal_id})
            dur = (time.time() - t0) * 1000
            d_dpal = r_dpal.json() if r_dpal.status_code == 200 else {}
            p_dpal = r_dpal.status_code == 200 and d_dpal.get('success')
            self.log_test("Canvases", "Eliminar paleta de colores personalizada", p_dpal, dur, d_dpal.get('message', ''), r_dpal.status_code)

        # 2.5 Roles en el lienzo (Crear rol, listar, eliminar rol)
        crole_id = None
        if canvas_id:
            t0 = time.time()
            r_crole = self.client.post_json('canvases.create_role', {
                'canvas_id': canvas_id,
                'name': f"Editor_{self.run_id}",
                'permissions': ['place_pixels', 'use_chat'],
                'weight': 20
            })
            dur = (time.time() - t0) * 1000
            d_crole = r_crole.json() if r_crole.status_code == 200 else {}
            crole_id = d_crole.get('role_id') or d_crole.get('data', {}).get('role_id')
            p_crole = r_crole.status_code == 200 and d_crole.get('success')
            self.log_test("Canvases", "Crear rol personalizado dentro del lienzo", p_crole, dur, d_crole.get('message', ''), r_crole.status_code)

            # 2.6 Generar invitación al lienzo (vinculada al rol creado o viewer)
            t0 = time.time()
            r_inv = self.client.post_json('canvases.generate_invite', {
                'canvas_id': canvas_id,
                'role': str(crole_id) if crole_id else 'viewer',
                'max_uses': 5
            })
            dur = (time.time() - t0) * 1000
            d_inv = r_inv.json() if r_inv.status_code == 200 else {}
            p_inv = r_inv.status_code == 200 and d_inv.get('success')
            self.log_test("Canvases", "Generar enlace/código de invitación al lienzo", p_inv, dur, d_inv.get('message', ''), r_inv.status_code)

            # 2.7 Listar invitaciones
            t0 = time.time()
            r_linv = self.client.get_route('canvases.list_invites', {'canvas_id': canvas_id})
            dur = (time.time() - t0) * 1000
            d_linv = r_linv.json() if r_linv.status_code == 200 else {}
            p_linv = r_linv.status_code == 200 and d_linv.get('success')
            self.log_test("Canvases", "Listar invitaciones activas del lienzo", p_linv, dur, d_linv.get('message', ''), r_linv.status_code)

            # Eliminar rol del lienzo
            if crole_id:
                t0 = time.time()
                r_dcrole = self.client.post_json('canvases.delete_role', {
                    'canvas_id': canvas_id,
                    'role_id': crole_id
                })
                dur = (time.time() - t0) * 1000
                d_dcrole = r_dcrole.json() if r_dcrole.status_code == 200 else {}
                p_dcrole = r_dcrole.status_code == 200 and d_dcrole.get('success')
                self.log_test("Canvases", "Eliminar rol personalizado del lienzo", p_dcrole, dur, d_dcrole.get('message', ''), r_dcrole.status_code)

        # 2.8 Papelera de lienzos (Soft Delete y Restaurar)
        t0 = time.time()
        r_del = self.client.post_json('canvases.delete', {'uuid': canvas_uuid, 'password': u['password']})
        dur = (time.time() - t0) * 1000
        d_del = r_del.json() if r_del.status_code == 200 else {}
        p_del = r_del.status_code == 200 and d_del.get('success')
        self.log_test("Canvases", "Enviar lienzo a la papelera (Soft Delete)", p_del, dur, d_del.get('message', ''), r_del.status_code)

        # Listar papelera
        t0 = time.time()
        r_trash = self.client.get_route('canvases.get_trash')
        dur = (time.time() - t0) * 1000
        d_trash = r_trash.json() if r_trash.status_code == 200 else {}
        p_trash = r_trash.status_code == 200 and d_trash.get('success')
        self.log_test("Canvases", "Consultar papelera de lienzos (canvases.get_trash)", p_trash, dur, d_trash.get('message', ''), r_trash.status_code)

        # Restaurar lienzo
        t0 = time.time()
        r_res = self.client.post_json('canvases.restore', {'uuid': canvas_uuid})
        dur = (time.time() - t0) * 1000
        d_res = r_res.json() if r_res.status_code == 200 else {}
        p_res = r_res.status_code == 200 and d_res.get('success')
        self.log_test("Canvases", "Restaurar lienzo desde la papelera", p_res, dur, d_res.get('message', ''), r_res.status_code)

        # Enviar nuevamente a la papelera para probar la eliminación definitiva
        self.client.post_json('canvases.delete', {'uuid': canvas_uuid, 'password': u['password']})

        # Eliminación permanente
        t0 = time.time()
        r_pdel = self.client.post_json('canvases.permanent_delete', {'uuid': canvas_uuid, 'password': u['password']})
        dur = (time.time() - t0) * 1000
        d_pdel = r_pdel.json() if r_pdel.status_code == 200 else {}
        p_pdel = r_pdel.status_code == 200 and d_pdel.get('success')
        self.log_test("Canvases", "Eliminación permanente del lienzo (Permanent Delete)", p_pdel, dur, d_pdel.get('message', ''), r_pdel.status_code)

    # --------------------------------------------------------------------------
    # 3. MÓDULO: ROLES RBAC & PANEL DE ADMINISTRACIÓN
    # --------------------------------------------------------------------------
    def module_roles_and_admin(self, u: dict):
        # 3.1 Probar restricción de acceso con usuario común (Debe dar 403 Forbidden)
        unauth_client = TestApiClient(self.app_url)
        t0 = time.time()
        r_unauth = unauth_client.get_route('admin.get_roles')
        dur = (time.time() - t0) * 1000
        d_unauth = r_unauth.json() if r_unauth.status_code in (200, 403) else {}
        p_unauth = r_unauth.status_code == 403 or (r_unauth.status_code == 200 and not d_unauth.get('success'))
        self.log_test("Admin RBAC", "Verificar denegación 403 Forbidden en ruta protegida de Admin", p_unauth, dur, d_unauth.get('message', ''), r_unauth.status_code)

        # 3.2 Elevar a SuperAdministrador en la BD
        if u.get('user_id'):
            try:
                conn = self.get_db_connection('db_identity')
                with conn.cursor() as cur:
                    cur.execute("""
                        INSERT INTO user_roles (user_id, role_id) 
                        VALUES (%s, 4) 
                        ON DUPLICATE KEY UPDATE role_id = 4
                    """, (u['user_id'],))
                    conn.commit()
                conn.close()
                if self.redis_client:
                    self.redis_client.delete(f"user:profile:{u['user_id']}")
                    self.redis_client.delete(f"rbac:user_perms:{u['user_id']}")
                    self.redis_client.delete(f"rbac:user_roles:{u['user_id']}")
                    self.redis_client.delete(f"rbac:user_highest_role:{u['user_id']}")
            except Exception:
                pass

        # Relogin para refrescar sesión con los nuevos roles SuperAdmin
        self.client.reset_session()
        self.flush_rate_limits()
        self.client.post_json('auth.login', {
            'email': u['email'],
            'password': u['password'],
            'turnstile_token': self.client.dummy_turnstile
        })

        # 3.3 Consultar lista de roles (admin.get_roles) con permisos elevados
        t0 = time.time()
        r_roles = self.client.get_route('admin.get_roles')
        dur = (time.time() - t0) * 1000
        d_roles = r_roles.json() if r_roles.status_code == 200 else {}
        p_roles = r_roles.status_code == 200 and d_roles.get('success')
        self.log_test("Admin RBAC", "Consultar lista de roles globales del sistema (admin.get_roles)", p_roles, dur, d_roles.get('message', ''), r_roles.status_code)

        # 3.4 Crear un rol de alta jerarquía (admin.create_role) con peso 85
        role_name = f"Role_{self.run_id}"
        t0 = time.time()
        r_crole = self.client.post_json('admin.create_role', {
            'name': role_name,
            'weight': 85
        })
        dur = (time.time() - t0) * 1000
        d_crole = r_crole.json() if r_crole.status_code == 200 else {}
        p_crole = r_crole.status_code == 200 and d_crole.get('success')
        self.log_test("Admin RBAC", f"Crear rol global del sistema ('{role_name}')", p_crole, dur, d_crole.get('message', ''), r_crole.status_code)

        # Obtener ID del rol creado
        role_id = None
        try:
            conn = self.get_db_connection('db_identity')
            with conn.cursor() as cur:
                cur.execute("SELECT id FROM roles WHERE name = %s", (role_name,))
                row = cur.fetchone()
                if row:
                    role_id = row['id']
                    self.created_roles.append(role_id)
            conn.close()
        except Exception:
            pass

        # 3.5 Asignar matriz de permisos al rol (admin.update_role_permissions)
        if role_id:
            t0 = time.time()
            r_uperm = self.client.post_json('admin.update_role_permissions', {
                'id': role_id,
                'permissions': [1, 2, 22] # access_admin_panel, view_users, view_dashboard
            })
            dur = (time.time() - t0) * 1000
            d_uperm = r_uperm.json() if r_uperm.status_code == 200 else {}
            p_uperm = r_uperm.status_code == 200 and d_uperm.get('success')
            self.log_test("Admin RBAC", "Actualizar matriz de permisos del rol (admin.update_role_permissions)", p_uperm, dur, d_uperm.get('message', ''), r_uperm.status_code)

            # 3.6 Eliminar rol del sistema (admin.delete_role)
            t0 = time.time()
            r_drole = self.client.post_json('admin.delete_role', {'id': role_id})
            dur = (time.time() - t0) * 1000
            d_drole = r_drole.json() if r_drole.status_code == 200 else {}
            p_drole = r_drole.status_code == 200 and d_drole.get('success')
            self.log_test("Admin RBAC", "Eliminar rol de prueba del sistema (admin.delete_role)", p_drole, dur, d_drole.get('message', ''), r_drole.status_code)

    # --------------------------------------------------------------------------
    # 4. MÓDULO: PREFERENCIAS Y PERFIL
    # --------------------------------------------------------------------------
    def module_user_profile(self, u: dict):
        # 4.1 Actualizar preferencias de usuario
        t0 = time.time()
        r_pref = self.client.post_json('settings.update_preferences', {
            'key': 'theme',
            'value': 'dark'
        })
        dur = (time.time() - t0) * 1000
        d_pref = r_pref.json() if r_pref.status_code == 200 else {}
        p_pref = r_pref.status_code == 200 and d_pref.get('success')
        self.log_test("User Profile", "Actualizar preferencias (Tema: dark)", p_pref, dur, d_pref.get('message', ''), r_pref.status_code)

        # 4.2 Logout de sesión
        t0 = time.time()
        r_out = self.client.post_json('auth.logout')
        dur = (time.time() - t0) * 1000
        d_out = r_out.json() if r_out.status_code == 200 else {}
        p_out = r_out.status_code == 200 and d_out.get('success')
        self.log_test("Auth", "Cierre de sesión (auth.logout)", p_out, dur, d_out.get('message', ''), r_out.status_code)

    # --------------------------------------------------------------------------
    # 5. TEARDOWN (LIMPIEZA AUTOMÁTICA DE DATOS DE PRUEBA)
    # --------------------------------------------------------------------------
    def teardown(self):
        t0 = time.time()
        cleaned_users = 0
        cleaned_canvases = 0
        cleaned_roles = 0

        # Limpiar usuarios de prueba
        if self.created_users:
            try:
                conn = self.get_db_connection('db_identity')
                with conn.cursor() as cur:
                    for email in self.created_users:
                        cur.execute("SELECT id FROM users WHERE email = %s", (email,))
                        u_row = cur.fetchone()
                        if u_row:
                            uid = u_row['id']
                            cur.execute("DELETE FROM user_roles WHERE user_id = %s", (uid,))
                            cur.execute("DELETE FROM user_preferences WHERE user_id = %s", (uid,))
                            cur.execute("DELETE FROM auth_tokens WHERE user_id = %s", (uid,))
                            cur.execute("DELETE FROM custom_palettes WHERE user_id = %s", (uid,))
                            cur.execute("DELETE FROM users WHERE id = %s", (uid,))
                            cleaned_users += 1
                    conn.commit()
                conn.close()
            except Exception as e:
                print(f"  {Colors.WARNING}Advertencia en limpieza de usuarios: {e}{Colors.ENDC}", flush=True)

        # Limpiar lienzos de prueba
        if self.created_canvases:
            try:
                conn = self.get_db_connection('db_canvases')
                with conn.cursor() as cur:
                    for uuid in self.created_canvases:
                        cur.execute("SELECT id FROM canvases WHERE uuid = %s", (uuid,))
                        c_row = cur.fetchone()
                        if c_row:
                            cid = c_row['id']
                            cur.execute("DELETE FROM canvas_members WHERE canvas_id = %s", (cid,))
                            cur.execute("DELETE FROM canvas_roles WHERE canvas_id = %s", (cid,))
                            cur.execute("DELETE FROM canvas_invites WHERE canvas_id = %s", (cid,))
                            cur.execute("DELETE FROM canvases WHERE id = %s", (cid,))
                            cleaned_canvases += 1
                    conn.commit()
                conn.close()
            except Exception as e:
                print(f"  {Colors.WARNING}Advertencia en limpieza de lienzos: {e}{Colors.ENDC}", flush=True)

        # Limpiar roles de prueba
        if self.created_roles:
            try:
                conn = self.get_db_connection('db_identity')
                with conn.cursor() as cur:
                    for rid in self.created_roles:
                        cur.execute("DELETE FROM role_permissions WHERE role_id = %s", (rid,))
                        cur.execute("DELETE FROM roles WHERE id = %s", (rid,))
                        cleaned_roles += 1
                    conn.commit()
                conn.close()
            except Exception as e:
                print(f"  {Colors.WARNING}Advertencia en limpieza de roles: {e}{Colors.ENDC}", flush=True)

        # Limpiar Redis de residuos
        if self.redis_client:
            try:
                keys = self.redis_client.keys(f"*{self.run_id}*")
                if keys:
                    self.redis_client.delete(*keys)
            except Exception:
                pass

        dur = (time.time() - t0) * 1000
        print(f"  {Colors.GREEN}✔ Teardown completado ({int(dur)}ms): {cleaned_users} usuarios, {cleaned_canvases} lienzos y {cleaned_roles} roles temporales eliminados.{Colors.ENDC}", flush=True)

    # --------------------------------------------------------------------------
    # 6. GENERACIÓN DE REPORTE FINAL
    # --------------------------------------------------------------------------
    def generate_report(self, total_time: float):
        total_tests = len(self.results)
        passed_tests = sum(1 for r in self.results if r['passed'])
        failed_tests = total_tests - passed_tests
        pass_rate = round((passed_tests / total_tests) * 100, 1) if total_tests > 0 else 0

        today_folder = datetime.now().strftime('%Y-%m-%d')
        reports_dir = os.path.join(self.script_dir, 'reports', today_folder)
        os.makedirs(reports_dir, exist_ok=True)
        
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        report_file = os.path.join(reports_dir, f'e2e_test_report_{timestamp}.md')

        with open(report_file, 'w', encoding='utf-8') as f:
            f.write("# 🧪 Reporte de Suite de Pruebas Integrales E2E (Web Test Suite)\n\n")
            f.write(f"**Fecha y Hora:** {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
            f.write(f"**URL Objetivo:** `{self.app_url}`\n")
            f.write(f"**ID de Ejecución:** `{self.run_id}`\n")
            f.write(f"**Tiempo Total:** `{total_time} segundos`\n")
            f.write(f"**Efectividad:** `{pass_rate}% ({passed_tests}/{total_tests} pasadas)`\n\n")
            f.write("---\n\n")
            
            f.write("## 📊 Resumen por Módulo\n\n")
            f.write("| Módulo | Total | Pasadas | Fallidas | Estado |\n")
            f.write("|---|---|---|---|---|\n")
            
            modules = {}
            for r in self.results:
                m = r['module']
                if m not in modules:
                    modules[m] = {'total': 0, 'passed': 0, 'failed': 0}
                modules[m]['total'] += 1
                if r['passed']:
                    modules[m]['passed'] += 1
                else:
                    modules[m]['failed'] += 1

            for m, counts in sorted(modules.items()):
                status = "✅ PASS" if counts['failed'] == 0 else "❌ FAIL"
                f.write(f"| **{m}** | {counts['total']} | {counts['passed']} | {counts['failed']} | {status} |\n")
            f.write("\n---\n\n")

            f.write("## 📝 Detalle de Pruebas Ejecutadas\n\n")
            f.write("| Módulo | Prueba | Estado | Código HTTP | Tiempo | Detalle |\n")
            f.write("|---|---|---|---|---|---|\n")

            for r in self.results:
                st = "✅ PASS" if r['passed'] else "❌ FAIL"
                details = r['details'].replace('|', '\\|').replace('\n', ' ') if r['details'] else '-'
                f.write(f"| {r['module']} | {r['test_name']} | {st} | `{r['response_code']}` | `{r['duration_ms']}ms` | {details} |\n")

            f.write("\n---\n")
            f.write(f"\n*Reporte generado automáticamente por la Suite de Pruebas de ProjectRosaura.*\n")

        print(f"\n{Colors.BOLD}{'='*75}{Colors.ENDC}", flush=True)
        if failed_tests == 0:
            print(f"{Colors.GREEN}{Colors.BOLD}🎉 RESULTADO: TODAS LAS PRUEBAS PASARON EXITOSAMENTE ({passed_tests}/{total_tests}){Colors.ENDC}", flush=True)
        else:
            print(f"{Colors.FAIL}{Colors.BOLD}⚠ RESULTADO: {failed_tests} de {total_tests} PRUEBAS FALLARON{Colors.ENDC}", flush=True)
        
        print(f"⏱  Tiempo total: {Colors.CYAN}{total_time}s{Colors.ENDC} | Tasa de éxito: {Colors.GREEN if failed_tests == 0 else Colors.WARNING}{pass_rate}%{Colors.ENDC}", flush=True)
        print(f"📄 Reporte Markdown guardado en: {Colors.BLUE}{report_file}{Colors.ENDC}", flush=True)
        print(f"{Colors.BOLD}{'='*75}{Colors.ENDC}\n", flush=True)

# ==============================================================================
# PUNTO DE ENTRADA PRINCIPAL PARA MANAGE_PROJECT.PY
# ==============================================================================
def run_e2e_tests(project_root: str, script_dir: str):
    suite = RosauraWebTestSuite(project_root, script_dir)
    suite.run_all()

if __name__ == '__main__':
    script_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.abspath(os.path.join(script_dir, '../'))
    run_e2e_tests(project_root, script_dir)
