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
            resp = self.session.post(url, json=data, headers=headers, timeout=15)
            # Manejo proactivo de rotación de token CSRF
            try:
                rd = resp.json()
                if rd.get('csrf_token'):
                    self.csrf_token = rd['csrf_token']
                    self.session.headers.update({'X-CSRF-Token': self.csrf_token})
            except Exception:
                pass

            if resp.status_code == 403:
                # Reintentar una vez con token renovado si fue error de CSRF
                try:
                    rd = resp.json()
                    if rd.get('message_key') == 'error.invalid_csrf_token' and rd.get('csrf_token'):
                        self.csrf_token = rd['csrf_token']
                        self.session.headers.update({'X-CSRF-Token': self.csrf_token})
                        data['csrf_token'] = self.csrf_token
                        headers['X-CSRF-Token'] = self.csrf_token
                        resp = self.session.post(url, json=data, headers=headers, timeout=15)
                except Exception:
                    pass

            return resp
        except Exception as e:
            dummy = requests.Response()
            dummy.status_code = 500
            dummy._content = json.dumps({'success': False, 'message': str(e)}).encode('utf-8')
            return dummy

    def get_route(self, route: str, params: dict = None) -> requests.Response:
        p = params.copy() if params else {}
        p['route'] = route
        url = f"{self.base_url}/api/index.php"
        try:
            return self.session.get(url, params=p, timeout=15)
        except Exception as e:
            dummy = requests.Response()
            dummy.status_code = 500
            dummy._content = json.dumps({'success': False, 'message': str(e)}).encode('utf-8')
            return dummy

    def reset_session(self):
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'RosauraE2ETestRunner/2.0 (Automated Suite)',
            'Accept': 'application/json'
        })
        self.csrf_token = None
        self.refresh_csrf()

# ==============================================================================
# SUITE PRINCIPAL DE PRUEBAS
# ==============================================================================
class RosauraWebTestSuite:
    def __init__(self, project_root: str, script_dir: str):
        self.project_root = project_root
        self.script_dir = script_dir
        self.env = load_project_env(project_root)
        
        self.app_url = os.environ.get('APP_URL') or self.env.get('APP_URL', 'http://localhost')
        self.client = TestApiClient(self.app_url)
        
        # Conexiones a BD y Redis
        self.db_host = os.environ.get('DB_HOST') or self.env.get('DB_HOST', '127.0.0.1')
        self.db_port = int(os.environ.get('DB_PORT') or self.env.get('DB_PORT', 3306))
        self.db_user = self.env.get('DB_ROOT_USER', 'root')
        self.db_pass = self.env.get('DB_ROOT_PASSWORD', 'c7a91e4d5b2f8a0c3d6e9f1b4a7c0d2e5f8b1c4a9d6e3f0b7c2a5d8e1f4b9c6a')
        
        self.redis_host = os.environ.get('REDIS_HOST') or self.env.get('REDIS_HOST', '127.0.0.1')
        self.redis_port = int(os.environ.get('REDIS_PORT') or self.env.get('REDIS_PORT', 6379))
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
            keys += self.redis_client.keys("ws:ticket_ratelimit:*")
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
            'duration_ms': int(duration_ms),
            'details': details,
            'response_code': response_code
        })

    # --------------------------------------------------------------------------
    # EJECUTOR PRINCIPAL
    # --------------------------------------------------------------------------
    def run_all(self):
        print(f"\n{Colors.BOLD}{'='*75}{Colors.ENDC}", flush=True)
        print(f"{Colors.HEADER}{Colors.BOLD}🚀 INICIANDO SUITE DE PRUEBAS INTEGRALES (E2E WEB TEST SUITE){Colors.ENDC}", flush=True)
        print(f"   Objetivo: {Colors.CYAN}{self.app_url}{Colors.ENDC} | ID de Ejecución: {Colors.WARNING}{self.run_id}{Colors.ENDC}", flush=True)
        print(f"{Colors.BOLD}{'='*75}{Colors.ENDC}\n", flush=True)

        start_total = time.time()
        self.flush_rate_limits()

        # 0. Verificación Inicial de Conectividad
        print(f"{Colors.BLUE}▶ Verificando conectividad inicial...{Colors.ENDC}", flush=True)
        if not self.test_connectivity():
            print(f"{Colors.FAIL}❌ Falló la verificación de conectividad básica. Abortando suite.{Colors.ENDC}", flush=True)
            return

        # Generar datos del usuario de prueba (usando dominio permitido gmail.com)
        test_user = {
            'username': f"test_{self.run_id}",
            'email': f"test_{self.run_id}@gmail.com",
            'password': f"SecretP@ssw0rd_{self.run_id}!",
            'new_password': f"NewP@ssw0rd_{self.run_id}#2026",
            'user_id': None,
            'uuid': None,
            '2fa_secret': None
        }
        self.created_users.append(test_user['email'])

        # 1. Módulo Auth & Seguridad
        print(f"\n{Colors.HEADER}{Colors.BOLD}━━━ MÓDULO 1: AUTENTICACIÓN, SEGURIDAD & 2FA ━━━{Colors.ENDC}", flush=True)
        self.module_auth(test_user)

        # 2. Módulo Preferencias y Perfil
        print(f"\n{Colors.HEADER}{Colors.BOLD}━━━ MÓDULO 2: PREFERENCIAS, PERFIL & DISPOSITIVOS ━━━{Colors.ENDC}", flush=True)
        self.module_user_profile(test_user)

        # 3. Módulo Lienzos (Canvases)
        print(f"\n{Colors.HEADER}{Colors.BOLD}━━━ MÓDULO 3: GESTIÓN INTEGRAL DE LIENZOS ━━━{Colors.ENDC}", flush=True)
        active_canvas = self.module_canvases(test_user)

        # 4. Módulo Chat & Mensajería
        print(f"\n{Colors.HEADER}{Colors.BOLD}━━━ MÓDULO 4: CHAT EN VIVO & INTERACCIONES ━━━{Colors.ENDC}", flush=True)
        self.module_chat(test_user, active_canvas)

        # 5. Módulo RBAC & Panel de Administración
        print(f"\n{Colors.HEADER}{Colors.BOLD}━━━ MÓDULO 5: ROLES RBAC & PERMISOS ADMINISTRATIVOS ━━━{Colors.ENDC}", flush=True)
        self.module_roles_and_admin(test_user)

        # 6. Teardown y Limpieza
        print(f"\n{Colors.HEADER}{Colors.BOLD}━━━ LIMPIEZA AUTOMÁTICA (TEARDOWN) ━━━{Colors.ENDC}", flush=True)
        self.teardown()

        # 7. Resumen y Reporte
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
                cur.execute("SELECT id, uuid FROM users WHERE email = %s", (u['email'],))
                row = cur.fetchone()
                if row:
                    u['user_id'] = row['id']
                    u['uuid'] = row['uuid']
                    cur.execute("UPDATE users SET subscription_tier = 3 WHERE id = %s", (u['user_id'],))
                    conn.commit()
            conn.close()
            if self.redis_client and u['user_id']:
                self.redis_client.delete(f"user:profile:{u['user_id']}")
        except Exception as e:
            print(f"       {Colors.WARNING}Advertencia al elevar nivel de suscripción: {e}{Colors.ENDC}", flush=True)

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
        self.client.refresh_csrf()
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

            # 1.9 Responder al desafío 2FA
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
            self.client.refresh_csrf()
            self.log_test("Auth", f"2FA: Validación de desafío con TOTP ({totp_code_2})", p_v2fa, dur, d_v2fa.get('message', ''), r_v2fa.status_code)

            # 1.10 Regenerar códigos de recuperación
            t0 = time.time()
            r_rec = self.client.post_json('settings.2fa_regenerate_recovery', {'password': u['password']})
            dur = (time.time() - t0) * 1000
            d_rec = r_rec.json() if r_rec.status_code == 200 else {}
            p_rec = r_rec.status_code == 200 and d_rec.get('success')
            self.log_test("Auth", "2FA: Regenerar códigos de respaldo de emergencia", p_rec, dur, d_rec.get('message', ''), r_rec.status_code)

            # 1.11 Deshabilitar 2FA con contraseña
            t0 = time.time()
            r_2fa_dis = self.client.post_json('settings.2fa_disable', {'password': u['password']})
            dur = (time.time() - t0) * 1000
            d_2fa_dis = r_2fa_dis.json() if r_2fa_dis.status_code == 200 else {}
            p_2fa_dis = r_2fa_dis.status_code == 200 and d_2fa_dis.get('success')
            self.log_test("Auth", "2FA: Desactivar segundo factor", p_2fa_dis, dur, d_2fa_dis.get('message', ''), r_2fa_dis.status_code)

        # 1.12 Recuperación de contraseña (Forgot Password)
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

        # 1.13 Reseteo de contraseña (Reset Password)
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

            # 1.14 Verificar login con la nueva contraseña
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
            self.client.refresh_csrf()
            self.log_test("Auth", "Login con la nueva contraseña actualizada", p_lnew, dur, d_lnew.get('message', ''), r_lnew.status_code)
            u['password'] = u['new_password']

    # --------------------------------------------------------------------------
    # 2. MÓDULO: PREFERENCIAS Y PERFIL
    # --------------------------------------------------------------------------
    def module_user_profile(self, u: dict):
        # 2.1 Actualizar tema (dark)
        t0 = time.time()
        r_pref = self.client.post_json('settings.update_preferences', {
            'key': 'theme',
            'value': 'dark'
        })
        dur = (time.time() - t0) * 1000
        d_pref = r_pref.json() if r_pref.status_code == 200 else {}
        p_pref = r_pref.status_code == 200 and d_pref.get('success')
        self.log_test("User Profile", "Actualizar preferencias (Tema: dark)", p_pref, dur, d_pref.get('message', ''), r_pref.status_code)

        # 2.2 Actualizar idioma (es-419)
        t0 = time.time()
        r_lang = self.client.post_json('settings.update_preferences', {
            'key': 'language',
            'value': 'es-419'
        })
        dur = (time.time() - t0) * 1000
        d_lang = r_lang.json() if r_lang.status_code == 200 else {}
        p_lang = r_lang.status_code == 200 and d_lang.get('success')
        self.log_test("User Profile", "Actualizar preferencia de idioma (es-419)", p_lang, dur, d_lang.get('message', ''), r_lang.status_code)

        # 2.3 Consultar lista de dispositivos/sesiones
        t0 = time.time()
        r_dev = self.client.post_json('settings.get_devices')
        dur = (time.time() - t0) * 1000
        d_dev = r_dev.json() if r_dev.status_code == 200 else {}
        p_dev = r_dev.status_code == 200 and d_dev.get('success')
        self.log_test("User Profile", "Consultar sesiones activas del usuario (settings.get_devices)", p_dev, dur, d_dev.get('message', ''), r_dev.status_code)

        # 2.4 Actualizar bandera de usuario (settings.set_flag)
        t0 = time.time()
        r_flag = self.client.post_json('settings.set_flag', {'flag_key': 'editor_tooltips'})
        dur = (time.time() - t0) * 1000
        d_flag = r_flag.json() if r_flag.status_code == 200 else {}
        p_flag = r_flag.status_code == 200 and d_flag.get('success')
        self.log_test("User Profile", "Configurar bandera de interfaz (settings.set_flag)", p_flag, dur, d_flag.get('message', ''), r_flag.status_code)

        # 2.5 Verificar contraseña actual del usuario
        t0 = time.time()
        r_vp = self.client.post_json('settings.verify_current_password', {'password': u['password']})
        dur = (time.time() - t0) * 1000
        d_vp = r_vp.json() if r_vp.status_code == 200 else {}
        p_vp = r_vp.status_code == 200 and d_vp.get('success')
        self.log_test("User Profile", "Validar contraseña actual del usuario (settings.verify_current_password)", p_vp, dur, d_vp.get('message', ''), r_vp.status_code)

    # --------------------------------------------------------------------------
    # 3. MÓDULO: LIENZOS (CANVASES)
    # --------------------------------------------------------------------------
    def module_canvases(self, u: dict) -> dict:
        # Asegurar tier 3 en DB y purgar cache de perfil para permitir paletas y roles personalizados
        if u.get('user_id'):
            try:
                conn = self.get_db_connection('db_identity')
                with conn.cursor() as cur:
                    cur.execute("UPDATE users SET subscription_tier = 3 WHERE id = %s", (u['user_id'],))
                    conn.commit()
                conn.close()
                if self.redis_client:
                    for k in self.redis_client.keys("user:profile:*"):
                        self.redis_client.delete(k)
            except Exception as e:
                print(f"       {Colors.WARNING}Advertencia al elevar nivel de suscripción: {e}{Colors.ENDC}", flush=True)

        # 3.1 Crear Lienzo
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
            return {}

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

        # 3.2 Consultar lienzo (canvases.get)
        t0 = time.time()
        r_get = self.client.get_route('canvases.get', {'id': canvas_id})
        dur = (time.time() - t0) * 1000
        d_get = r_get.json() if r_get.status_code == 200 else {}
        p_get = r_get.status_code == 200 and d_get.get('success')
        self.log_test("Canvases", f"Consultar detalles del lienzo (ID: {canvas_id})", p_get, dur, d_get.get('message', ''), r_get.status_code)

        # 3.3 Explorar feed público / home
        t0 = time.time()
        r_home = self.client.get_route('canvases.get_home_feed', {'limit': 10})
        dur = (time.time() - t0) * 1000
        d_home = r_home.json() if r_home.status_code == 200 else {}
        p_home = r_home.status_code == 200 and d_home.get('success')
        self.log_test("Canvases", "Consultar feed principal de lienzos (canvases.get_home_feed)", p_home, dur, d_home.get('message', ''), r_home.status_code)

        # 3.4 Consultar lienzos públicos
        t0 = time.time()
        r_pub = self.client.get_route('canvases.get_public', {'limit': 10})
        dur = (time.time() - t0) * 1000
        d_pub = r_pub.json() if r_pub.status_code == 200 else {}
        p_pub = r_pub.status_code == 200 and d_pub.get('success')
        self.log_test("Canvases", "Consultar directorio de lienzos públicos (canvases.get_public)", p_pub, dur, d_pub.get('message', ''), r_pub.status_code)

        # 3.5 Consultar mis lienzos (canvases.get_mine)
        t0 = time.time()
        r_mine = self.client.get_route('canvases.get_mine', {'filter': 'all'})
        dur = (time.time() - t0) * 1000
        d_mine = r_mine.json() if r_mine.status_code == 200 else {}
        p_mine = r_mine.status_code == 200 and d_mine.get('success')
        self.log_test("Canvases", "Consultar lista de lienzos del usuario (canvases.get_mine)", p_mine, dur, d_mine.get('message', ''), r_mine.status_code)

        # 3.6 Búsqueda global de lienzos (search.query)
        t0 = time.time()
        r_search = self.client.get_route('search.query', {'q': self.run_id})
        dur = (time.time() - t0) * 1000
        d_search = r_search.json() if r_search.status_code == 200 else {}
        p_search = r_search.status_code == 200 and d_search.get('success')
        self.log_test("Canvases", f"Búsqueda global de lienzos por término ('{self.run_id}')", p_search, dur, d_search.get('message', ''), r_search.status_code)

        # 3.7 Modificar opciones del lienzo (canvases.update)
        t0 = time.time()
        r_up = self.client.post_json('canvases.update', {
            'id': canvas_id,
            'name': f"Updated {canvas_name}",
            'privacy': 'public',
            'palette_id': 'default',
            'max_members': 20,
            'cooldown_pixels_batch': 5,
            'cooldown_seconds': 10,
            'allow_chat': 1,
            'tags': ['pixelart']
        })
        dur = (time.time() - t0) * 1000
        d_up = r_up.json() if r_up.status_code == 200 else {}
        p_up = r_up.status_code == 200 and d_up.get('success')
        self.log_test("Canvases", "Modificar opciones y privacidad del lienzo", p_up, dur, d_up.get('message', ''), r_up.status_code)

        # 3.8 Activar modo Online en tiempo real (canvases.activate_online)
        t0 = time.time()
        r_on = self.client.post_json('canvases.activate_online', {'canvas_id': canvas_id})
        dur = (time.time() - t0) * 1000
        d_on = r_on.json() if r_on.status_code == 200 else {}
        p_on = r_on.status_code == 200 and d_on.get('success')
        self.log_test("Canvases", "Activar sala online para colaboración en tiempo real (canvases.activate_online)", p_on, dur, d_on.get('message', ''), r_on.status_code)

        # 3.9 Obtener WebSocket ticket para colaboración en tiempo real
        t0 = time.time()
        r_ws = self.client.post_json('canvases.get_ws_ticket', {'canvas_id': canvas_id})
        dur = (time.time() - t0) * 1000
        d_ws = r_ws.json() if r_ws.status_code == 200 else {}
        p_ws = r_ws.status_code == 200 and d_ws.get('success') and bool(d_ws.get('data', {}).get('ticket') or d_ws.get('ticket'))
        self.log_test("Canvases", "Generar Ticket de WebSocket para tiempo real", p_ws, dur, d_ws.get('message', ''), r_ws.status_code)

        # 3.10 Alternar activación de chat (canvases.toggle_chat)
        t0 = time.time()
        r_tchat = self.client.post_json('canvases.toggle_chat', {'id': canvas_id, 'allow_chat': 1})
        dur = (time.time() - t0) * 1000
        d_tchat = r_tchat.json() if r_tchat.status_code == 200 else {}
        p_tchat = r_tchat.status_code == 200 and d_tchat.get('success')
        self.log_test("Canvases", "Alternar activación de chat del lienzo (canvases.toggle_chat)", p_tchat, dur, d_tchat.get('message', ''), r_tchat.status_code)

        # 3.11 Alternar favorito (canvases.toggle_favorite)
        t0 = time.time()
        r_fav = self.client.post_json('canvases.toggle_favorite', {'canvas_id': canvas_id})
        dur = (time.time() - t0) * 1000
        d_fav = r_fav.json() if r_fav.status_code == 200 else {}
        p_fav = r_fav.status_code == 200 and d_fav.get('success')
        self.log_test("Canvases", "Marcar / Desmarcar lienzo como favorito (canvases.toggle_favorite)", p_fav, dur, d_fav.get('message', ''), r_fav.status_code)

        # 3.12 Consultar ajustes de redimensionamiento (canvases.get_resize_settings)
        t0 = time.time()
        r_resz = self.client.get_route('canvases.get_resize_settings', {'id': canvas_id})
        dur = (time.time() - t0) * 1000
        d_resz = r_resz.json() if r_resz.status_code == 200 else {}
        p_resz = r_resz.status_code == 200 and d_resz.get('success')
        self.log_test("Canvases", "Consultar opciones de redimensionamiento del lienzo", p_resz, dur, d_resz.get('message', ''), r_resz.status_code)

        # 3.13 Consultar ajustes de reinicio automático (canvases.get_reset_settings)
        t0 = time.time()
        r_rst = self.client.get_route('canvases.get_reset_settings', {'id': canvas_id})
        dur = (time.time() - t0) * 1000
        d_rst = r_rst.json() if r_rst.status_code == 200 else {}
        p_rst = r_rst.status_code == 200 and d_rst.get('success')
        self.log_test("Canvases", "Consultar ajustes de reseteo programado del lienzo", p_rst, dur, d_rst.get('message', ''), r_rst.status_code)

        # 3.14 Paletas personalizadas (Crear, Listar, Eliminar)
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

        # 3.15 Roles en el lienzo (Crear rol, listar, permisos, eliminar rol)
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
            crole_id = d_crole.get('id') or d_crole.get('role_id') or d_crole.get('data', {}).get('id') or d_crole.get('data', {}).get('role_id')
            p_crole = r_crole.status_code == 200 and d_crole.get('success') and bool(crole_id)
            self.log_test("Canvases", "Crear rol personalizado dentro del lienzo", p_crole, dur, d_crole.get('message', ''), r_crole.status_code)

            # 3.16 Consultar roles del lienzo
            t0 = time.time()
            r_groles = self.client.get_route('canvases.get_roles', {'canvas_id': canvas_id})
            dur = (time.time() - t0) * 1000
            d_groles = r_groles.json() if r_groles.status_code == 200 else {}
            p_groles = r_groles.status_code == 200 and d_groles.get('success')
            self.log_test("Canvases", "Consultar roles configurados en el lienzo", p_groles, dur, d_groles.get('message', ''), r_groles.status_code)

            # 3.17 Consultar catálogo de permisos a nivel de lienzo
            t0 = time.time()
            r_cperms = self.client.get_route('canvases.get_permissions', {'canvas_id': canvas_id})
            dur = (time.time() - t0) * 1000
            d_cperms = r_cperms.json() if r_cperms.status_code == 200 else {}
            p_cperms = r_cperms.status_code == 200 and d_cperms.get('success')
            self.log_test("Canvases", "Consultar catálogo de permisos a nivel de lienzo", p_cperms, dur, d_cperms.get('message', ''), r_cperms.status_code)

            # 3.18 Generar invitación al lienzo
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

            # 3.19 Listar invitaciones
            t0 = time.time()
            r_linv = self.client.get_route('canvases.list_invites', {'canvas_id': canvas_id})
            dur = (time.time() - t0) * 1000
            d_linv = r_linv.json() if r_linv.status_code == 200 else {}
            p_linv = r_linv.status_code == 200 and d_linv.get('success')
            invites_list = d_linv.get('data', [])
            self.log_test("Canvases", "Listar invitaciones activas del lienzo", p_linv, dur, d_linv.get('message', ''), r_linv.status_code)

            # 3.20 Revocar invitación
            if invites_list and isinstance(invites_list, list) and len(invites_list) > 0:
                invite_id = invites_list[0].get('id')
                t0 = time.time()
                r_rinv = self.client.post_json('canvases.revoke_invite', {
                    'canvas_id': canvas_id,
                    'invite_id': invite_id
                })
                dur = (time.time() - t0) * 1000
                d_rinv = r_rinv.json() if r_rinv.status_code == 200 else {}
                p_rinv = r_rinv.status_code == 200 and d_rinv.get('success')
                self.log_test("Canvases", "Revocar código de invitación del lienzo", p_rinv, dur, d_rinv.get('message', ''), r_rinv.status_code)

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

        # 3.21 Consultar plantillas disponibles (canvases.get_templates)
        t0 = time.time()
        r_tmpls = self.client.get_route('canvases.get_templates')
        dur = (time.time() - t0) * 1000
        d_tmpls = r_tmpls.json() if r_tmpls.status_code == 200 else {}
        p_tmpls = r_tmpls.status_code == 200 and d_tmpls.get('success')
        self.log_test("Canvases", "Consultar catálogo de plantillas (canvases.get_templates)", p_tmpls, dur, d_tmpls.get('message', ''), r_tmpls.status_code)

        # Retornamos datos del lienzo activo para ser usado en chat y otras pruebas antes de borrarlo
        return {'id': canvas_id, 'uuid': canvas_uuid}

    # --------------------------------------------------------------------------
    # 4. MÓDULO: CHAT EN VIVO & INTERACCIONES
    # --------------------------------------------------------------------------
    def module_chat(self, u: dict, canvas: dict):
        if not canvas or not canvas.get('id'):
            print(f"       {Colors.WARNING}Saltando módulo de chat: no hay lienzo activo.{Colors.ENDC}", flush=True)
            return

        canvas_id = canvas['id']
        msg_text = f"Hola mundo desde suite de pruebas! ID: {self.run_id}"

        # 4.1 Enviar mensaje al chat
        t0 = time.time()
        r_send = self.client.post_json('chat.send', {
            'canvas_id': canvas_id,
            'message': msg_text
        })
        dur = (time.time() - t0) * 1000
        d_send = r_send.json() if r_send.status_code == 200 else {}
        msg_id = d_send.get('message_id') or d_send.get('id') or d_send.get('data', {}).get('id')
        p_send = r_send.status_code == 200 and d_send.get('success')
        self.log_test("Live Chat", "Enviar mensaje al chat en vivo del lienzo", p_send, dur, d_send.get('message', ''), r_send.status_code)

        # 4.2 Obtener historial de chat
        t0 = time.time()
        r_hist = self.client.get_route('chat.history', {'canvas_id': canvas_id, 'offset': 0})
        dur = (time.time() - t0) * 1000
        d_hist = r_hist.json() if r_hist.status_code == 200 else {}
        p_hist = r_hist.status_code == 200 and d_hist.get('success')
        self.log_test("Live Chat", "Consultar historial de mensajes del lienzo (chat.history)", p_hist, dur, d_hist.get('message', ''), r_hist.status_code)

        if not msg_id and d_hist.get('messages'):
            for m in d_hist['messages']:
                if msg_text in m.get('message', ''):
                    msg_id = m.get('id') or m.get('uuid')
                    break

        # 4.3 Reaccionar a mensaje con emoji
        if msg_id:
            t0 = time.time()
            r_react = self.client.post_json('chat.react', {
                'canvas_id': canvas_id,
                'message_id': msg_id,
                'emoji': '❤️'
            })
            dur = (time.time() - t0) * 1000
            d_react = r_react.json() if r_react.status_code == 200 else {}
            p_react = r_react.status_code == 200 and d_react.get('success')
            self.log_test("Live Chat", "Reaccionar con emoji a un mensaje del chat (chat.react)", p_react, dur, d_react.get('message', ''), r_react.status_code)

            # 4.4 Reportar mensaje a moderación
            t0 = time.time()
            r_rep = self.client.post_json('chat.report', {
                'message_id': msg_id,
                'reason': 'spam',
                'details': f'Prueba automatizada {self.run_id}'
            })
            dur = (time.time() - t0) * 1000
            d_rep = r_rep.json() if r_rep.status_code == 200 else {}
            p_rep = r_rep.status_code == 200 and d_rep.get('success')
            self.log_test("Live Chat", "Reportar mensaje a moderación (chat.report)", p_rep, dur, d_rep.get('message', ''), r_rep.status_code)

            # 4.5 Eliminar mensaje del chat
            t0 = time.time()
            r_delm = self.client.post_json('chat.delete', {
                'canvas_id': canvas_id,
                'message_id': msg_id
            })
            dur = (time.time() - t0) * 1000
            d_delm = r_delm.json() if r_delm.status_code == 200 else {}
            p_delm = r_delm.status_code == 200 and d_delm.get('success')
            self.log_test("Live Chat", "Eliminar mensaje emitido en el chat (chat.delete)", p_delm, dur, d_delm.get('message', ''), r_delm.status_code)

        # 4.6 Consultar galería multimedia del chat
        t0 = time.time()
        r_gal = self.client.get_route('chat.media_gallery', {'canvas_id': canvas_id})
        dur = (time.time() - t0) * 1000
        d_gal = r_gal.json() if r_gal.status_code == 200 else {}
        p_gal = r_gal.status_code == 200 and d_gal.get('success')
        self.log_test("Live Chat", "Consultar galería de archivos compartidos (chat.media_gallery)", p_gal, dur, d_gal.get('message', ''), r_gal.status_code)

        # 4.7 Flujo de Papelera y Borrado del lienzo de prueba
        canvas_uuid = canvas['uuid']

        # Enviar a la papelera (Soft Delete)
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
    # 5. MÓDULO: ROLES RBAC & PANEL DE ADMINISTRACIÓN
    # --------------------------------------------------------------------------
    def module_roles_and_admin(self, u: dict):
        # 5.1 Probar restricción de acceso con usuario común (Debe dar 403 Forbidden)
        unauth_client = TestApiClient(self.app_url)
        t0 = time.time()
        r_unauth = unauth_client.get_route('admin.get_roles')
        dur = (time.time() - t0) * 1000
        d_unauth = r_unauth.json() if r_unauth.status_code in (200, 403) else {}
        p_unauth = r_unauth.status_code == 403 or (r_unauth.status_code == 200 and not d_unauth.get('success'))
        self.log_test("Admin RBAC", "Verificar denegación 403 Forbidden en ruta protegida de Admin", p_unauth, dur, d_unauth.get('message', ''), r_unauth.status_code)

        # 5.2 Elevar a SuperAdministrador en la BD
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
            except Exception as e:
                print(f"       {Colors.WARNING}Advertencia al elevar rol en BD: {e}{Colors.ENDC}", flush=True)

        # Relogin para refrescar sesión con los nuevos roles SuperAdmin
        self.client.reset_session()
        self.flush_rate_limits()
        self.client.post_json('auth.login', {
            'email': u['email'],
            'password': u['password'],
            'turnstile_token': self.client.dummy_turnstile
        })
        self.client.refresh_csrf()

        # 5.3 Consultar métricas del panel de administración
        t0 = time.time()
        r_metrics = self.client.get_route('admin.get_dashboard_metrics')
        dur = (time.time() - t0) * 1000
        d_metrics = r_metrics.json() if r_metrics.status_code == 200 else {}
        p_metrics = r_metrics.status_code == 200 and d_metrics.get('success')
        self.log_test("Admin RBAC", "Consultar métricas generales del sistema (admin.get_dashboard_metrics)", p_metrics, dur, d_metrics.get('message', ''), r_metrics.status_code)

        # 5.4 Consultar lista de roles (admin.get_roles) con permisos elevados
        t0 = time.time()
        r_roles = self.client.get_route('admin.get_roles')
        dur = (time.time() - t0) * 1000
        d_roles = r_roles.json() if r_roles.status_code == 200 else {}
        p_roles = r_roles.status_code == 200 and d_roles.get('success')
        self.log_test("Admin RBAC", "Consultar lista de roles globales del sistema (admin.get_roles)", p_roles, dur, d_roles.get('message', ''), r_roles.status_code)

        # 5.5 Consultar catálogo de permisos globales (admin.get_permissions)
        t0 = time.time()
        r_perms = self.client.get_route('admin.get_permissions')
        dur = (time.time() - t0) * 1000
        d_perms = r_perms.json() if r_perms.status_code == 200 else {}
        p_perms = r_perms.status_code == 200 and d_perms.get('success')
        self.log_test("Admin RBAC", "Consultar catálogo completo de permisos (admin.get_permissions)", p_perms, dur, d_perms.get('message', ''), r_perms.status_code)

        # 5.6 Crear un rol de alta jerarquía (admin.create_role) con peso 85
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

        # 5.7 Asignar matriz de permisos al rol (admin.update_role_permissions)
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

            # 5.8 Consultar permisos asignados al rol específico
            t0 = time.time()
            r_gperm = self.client.get_route('admin.get_role_permissions', {'id': role_id})
            dur = (time.time() - t0) * 1000
            d_gperm = r_gperm.json() if r_gperm.status_code == 200 else {}
            p_gperm = r_gperm.status_code == 200 and d_gperm.get('success')
            self.log_test("Admin RBAC", "Consultar permisos específicos del rol (admin.get_role_permissions)", p_gperm, dur, d_gperm.get('message', ''), r_gperm.status_code)

            # 5.9 Eliminar rol del sistema (admin.delete_role)
            t0 = time.time()
            r_drole = self.client.post_json('admin.delete_role', {'id': role_id})
            dur = (time.time() - t0) * 1000
            d_drole = r_drole.json() if r_drole.status_code == 200 else {}
            p_drole = r_drole.status_code == 200 and d_drole.get('success')
            self.log_test("Admin RBAC", "Eliminar rol de prueba del sistema (admin.delete_role)", p_drole, dur, d_drole.get('message', ''), r_drole.status_code)

        # 5.10 Consultar configuración del servidor (admin.get_server_config)
        t0 = time.time()
        r_cfg = self.client.get_route('admin.get_server_config')
        dur = (time.time() - t0) * 1000
        d_cfg = r_cfg.json() if r_cfg.status_code == 200 else {}
        p_cfg = r_cfg.status_code == 200 and d_cfg.get('success')
        self.log_test("Admin Config", "Consultar variables de configuración del servidor (admin.get_server_config)", p_cfg, dur, d_cfg.get('message', ''), r_cfg.status_code)

        # 5.11 Consultar información de un usuario (admin.get_user)
        if u.get('user_id'):
            t0 = time.time()
            r_uinfo = self.client.get_route('admin.get_user', {'target_user_id': u['user_id']})
            dur = (time.time() - t0) * 1000
            d_uinfo = r_uinfo.json() if r_uinfo.status_code == 200 else {}
            p_uinfo = r_uinfo.status_code == 200 and d_uinfo.get('success')
            self.log_test("Admin Users", "Consultar perfil detallado de usuario (admin.get_user)", p_uinfo, dur, d_uinfo.get('message', ''), r_uinfo.status_code)

        # 5.12 Consultar esquema de backups (admin.get_backup_schema)
        t0 = time.time()
        r_schema = self.client.get_route('admin.get_backup_schema')
        dur = (time.time() - t0) * 1000
        d_schema = r_schema.json() if r_schema.status_code == 200 else {}
        p_schema = r_schema.status_code == 200 and d_schema.get('success')
        self.log_test("Admin Backups", "Consultar esquema y tablas de base de datos para backups", p_schema, dur, d_schema.get('message', ''), r_schema.status_code)

        # 5.13 Comprobar estado de workers de mantenimiento (admin.check_worker_status)
        t0 = time.time()
        r_worker = self.client.get_route('admin.check_worker_status')
        dur = (time.time() - t0) * 1000
        d_worker = r_worker.json() if r_worker.status_code == 200 else {}
        p_worker = r_worker.status_code == 200 and d_worker.get('success')
        self.log_test("Admin System", "Comprobar estado de workers y colas (admin.check_worker_status)", p_worker, dur, d_worker.get('message', ''), r_worker.status_code)

        # 5.14 Consultar proveedores de anuncios (admin.advertisements.list)
        t0 = time.time()
        r_ads = self.client.get_route('admin.advertisements.list')
        dur = (time.time() - t0) * 1000
        d_ads = r_ads.json() if r_ads.status_code == 200 else {}
        p_ads = r_ads.status_code == 200 and ('providers' in d_ads or d_ads.get('success'))
        self.log_test("Admin Ads", "Consultar lista de proveedores de anuncios publicitarios", p_ads, dur, d_ads.get('message', ''), r_ads.status_code)

        # 5.15 Consultar traducciones del panel de administración
        t0 = time.time()
        r_trans = self.client.get_route('admin.get_translations')
        dur = (time.time() - t0) * 1000
        d_trans = r_trans.json() if r_trans.status_code == 200 else {}
        p_trans = r_trans.status_code == 200 and d_trans.get('success')
        self.log_test("Admin System", "Consultar diccionario de traducciones administrativas", p_trans, dur, d_trans.get('message', ''), r_trans.status_code)

        # 5.16 Cierre de sesión final
        t0 = time.time()
        r_out = self.client.post_json('auth.logout')
        dur = (time.time() - t0) * 1000
        d_out = r_out.json() if r_out.status_code == 200 else {}
        p_out = r_out.status_code == 200 and d_out.get('success')
        self.log_test("Auth", "Cierre de sesión final (auth.logout)", p_out, dur, d_out.get('message', ''), r_out.status_code)

    # --------------------------------------------------------------------------
    # 6. TEARDOWN (LIMPIEZA AUTOMÁTICA DE DATOS DE PRUEBA)
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
    # 7. GENERACIÓN DE REPORTE FINAL
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
