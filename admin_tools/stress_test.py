import os
import json
import time
import random
import urllib.request
import urllib.parse
from urllib.error import HTTPError
from http.cookiejar import CookieJar
import threading
import re

class Colors:
    HEADER = '\033[95m'
    BLUE = '\033[94m'
    GREEN = '\033[92m'
    WARNING = '\033[93m'
    FAIL = '\033[91m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'

import subprocess
import uuid

def get_redis_pass():
    env_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".env")
    try:
        with open(env_path, "r", encoding="utf-8") as f:
            for line in f:
                if line.startswith("REDIS_PASS="):
                    return line.strip().split("=", 1)[1]
    except Exception as e:
        pass
    return "8f4e2d1c9b7a5f6e3d2c1b0a9f8e7d6c5b4a3f2e1d0c9b8a7f6e5d4c3b2a1f0e"

def run_canvas_bot(bot_id, target_url, canvas_id, pixels_per_bot, canvas_width, canvas_height):
    try:
        import websocket
    except ImportError:
        print(f"{Colors.FAIL}Error: La librería 'websocket-client' no está instalada. Ejecuta 'pip install websocket-client'.{Colors.ENDC}")
        return

    print(f"[{bot_id}] Inyectando ticket de Sesión VIP en Redis...")
    
    redis_pass = get_redis_pass()
    ticket = str(uuid.uuid4())
    # Generar un ID de usuario único falso por bot (e.g. 10001, 10002)
    fake_user_id = 10000 + int(bot_id.replace("Bot-", ""))
    
    # Payload del ticket de websocket (simula usuario logueado)
    ticket_payload = json.dumps({
        "type": "auth",
        "user_id": fake_user_id,
        "canvas_id": int(canvas_id),
        "created_at": int(time.time())
    })

    try:
        # Inyectar el ticket directamente en Redis
        subprocess.run([
            "docker", "exec", "rosaura_redis", "redis-cli", "-a", redis_pass, 
            "SET", f"ws:ticket:{ticket}", ticket_payload, "EX", "60"
        ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        
        # Inyectar el perk de NO COOLDOWN para que el bot pueda pintar rápido
        subprocess.run([
            "docker", "exec", "rosaura_redis", "redis-cli", "-a", redis_pass, 
            "SET", f"user:{fake_user_id}:perk:no_cooldown", "1", "EX", "300"
        ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    except Exception as e:
        print(f"{Colors.FAIL}[{bot_id}] Error inyectando Redis. Asegúrate de tener docker corriendo: {e}{Colors.ENDC}")
        return

    ws_url = target_url.replace("http", "ws").replace("https", "wss")
    from urllib.parse import urlparse
    parsed = urlparse(ws_url)
    # The websocket server runs on port 8765 normally
    ws_url = f"{parsed.scheme}://{parsed.hostname}:8765/canvas/{canvas_id}?ticket={urllib.parse.quote(ticket)}"
    
    print(f"[{bot_id}] Conectando a {ws_url}...")
    ws = websocket.WebSocket()
    try:
        ws.connect(ws_url, origin=target_url)
    except Exception as e:
        print(f"{Colors.FAIL}[{bot_id}] Error de conexión WS: {e}{Colors.ENDC}")
        return

    # Cargar paletas reales del juego
    try:
        palettes_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "public", "assets", "data", "palettes.json")
        with open(palettes_path, "r", encoding="utf-8") as f:
            palettes_data = json.load(f)
            
        valid_colors = []
        for p_key, p_data in palettes_data.items():
            for c in p_data.get("colors", []):
                valid_colors.append(c["hex"].lower())
        if not valid_colors:
            valid_colors = ["#ff0000", "#00ff00", "#0000ff", "#000000", "#ffffff"]
    except Exception as e:
        print(f"{Colors.WARNING}[{bot_id}] No se pudo cargar palettes.json ({e}). Usando colores por defecto.{Colors.ENDC}")
        valid_colors = ["#ff0000", "#00ff00", "#0000ff", "#000000", "#ffffff"]

    print(f"{Colors.GREEN}[{bot_id}] Conectado. Iniciando ataque de pixeles ({pixels_per_bot} pixeles)...{Colors.ENDC}")
    success_count = 0
    for i in range(pixels_per_bot):
        x = random.randint(0, canvas_width - 1)
        y = random.randint(0, canvas_height - 1)
        color = random.choice(valid_colors)
        
        msg = {
            "type": "pixel",
            "x": x,
            "y": y,
            "color": color,
            "width": canvas_width,
            "userId": 0 # Guest user ID fallback
        }
        
        try:
            ws.send(json.dumps(msg))
            success_count += 1
            # Delay aleatorio pequeño para no colapsar el propio cliente y simular red real
            time.sleep(random.uniform(0.01, 0.1))
        except Exception as e:
            print(f"{Colors.FAIL}[{bot_id}] Error enviando pixel: {e}{Colors.ENDC}")
            break
            
    ws.close()
    print(f"{Colors.GREEN}[{bot_id}] Bot finalizado. Pixeles colocados: {success_count}/{pixels_per_bot}{Colors.ENDC}")

def run_canvas_stress_test():
    print(f"\n{Colors.HEADER}{Colors.BOLD}--- Prueba de Estrés: WebSocket de Lienzos ---{Colors.ENDC}")
    target_url = input("URL del servidor (ej: http://localhost): ").strip() or "http://localhost"
    
    # Extraer base URL por si el usuario pegó la URL completa del lienzo (ej: http://localhost/design/123)
    if target_url.startswith("http"):
        parsed_url = urllib.parse.urlparse(target_url)
        target_url = f"{parsed_url.scheme}://{parsed_url.netloc}"
        
    canvas_id = input("ID numérico o UUID del lienzo: ").strip()
    
    if not canvas_id:
        print(f"{Colors.FAIL}Error: Debes proporcionar un ID de lienzo válido.{Colors.ENDC}")
        return

    try:
        num_bots = int(input("Número de conexiones concurrentes (bots) [ej: 10]: ").strip() or "10")
        pixels_per_bot = int(input("Pixeles a colocar por bot [ej: 100]: ").strip() or "100")
        canvas_width = int(input("Ancho del lienzo (para calcular posición X máxima) [ej: 64]: ").strip() or "64")
        canvas_height = int(input("Alto del lienzo (para calcular posición Y máxima) [ej: 64]: ").strip() or "64")
    except ValueError:
        print(f"{Colors.FAIL}Error: Por favor ingresa números válidos.{Colors.ENDC}")
        return

    print(f"\n{Colors.WARNING}Iniciando {num_bots} bots. Cada uno colocará {pixels_per_bot} pixeles aleatorios...{Colors.ENDC}")
    
    threads = []
    for i in range(num_bots):
        t = threading.Thread(target=run_canvas_bot, args=(f"Bot-{i+1}", target_url, canvas_id, pixels_per_bot, canvas_width, canvas_height))
        threads.append(t)
        t.start()
        # Escalonar ligeramente las conexiones para no ahogar el API HTTP solicitando tickets al mismo ms
        time.sleep(0.2)
        
    for t in threads:
        t.join()
        
    print(f"\n{Colors.GREEN}{Colors.BOLD}✅ Prueba de estrés de Lienzos finalizada.{Colors.ENDC}")

def run_menu():
    print(f"\n{Colors.HEADER}{Colors.BOLD}--- Menú de Pruebas de Estrés ---{Colors.ENDC}")
    print("1 - Prueba de Estrés de WebSocket (Lienzos)")
    print("0 - Volver al Menú Principal")
    
    choice = input(f"{Colors.WARNING}Selecciona una opción: {Colors.ENDC}").strip()
    if choice == '1':
        run_canvas_stress_test()
    elif choice == '0':
        return
    else:
        print(f"{Colors.FAIL}Opción no válida.{Colors.ENDC}")
