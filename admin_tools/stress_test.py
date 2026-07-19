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
    return os.getenv("REDIS_PASS")

def run_canvas_bot(bot_id, target_url, canvas_id, pixels_per_bot, canvas_width, canvas_height):
    try:
        import websocket
    except ImportError:
        print(f"{Colors.FAIL}Error: 'websocket-client' library is not installed. Run 'pip install websocket-client'.{Colors.ENDC}")
        return

    print(f"[{bot_id}] Injecting VIP Session ticket into Redis...")
    
    redis_pass = get_redis_pass()
    ticket = str(uuid.uuid4())
    fake_user_id = 10000 + int(bot_id.replace("Bot-", ""))
    
    ticket_payload = json.dumps({
        "type": "auth",
        "user_id": fake_user_id,
        "canvas_id": int(canvas_id),
        "created_at": int(time.time())
    })

    try:
        subprocess.run([
            "docker", "exec", "rosaura_redis", "redis-cli", "-a", redis_pass, 
            "SET", f"ws:ticket:{ticket}", ticket_payload, "EX", "60"
        ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        
        subprocess.run([
            "docker", "exec", "rosaura_redis", "redis-cli", "-a", redis_pass, 
            "SET", f"user:{fake_user_id}:perk:no_cooldown", "1", "EX", "300"
        ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    except Exception as e:
        print(f"{Colors.FAIL}[{bot_id}] Error injecting to Redis. Make sure Docker is running: {e}{Colors.ENDC}")
        return

    ws_url = target_url.replace("http", "ws").replace("https", "wss")
    from urllib.parse import urlparse
    parsed = urlparse(ws_url)
    ws_url = f"{parsed.scheme}://{parsed.hostname}:8765/canvas/{canvas_id}?ticket={urllib.parse.quote(ticket)}"
    
    print(f"[{bot_id}] Connecting to {ws_url}...")
    ws = websocket.WebSocket()
    try:
        ws.connect(ws_url, origin=target_url)
    except Exception as e:
        print(f"{Colors.FAIL}[{bot_id}] WS Connection Error: {e}{Colors.ENDC}")
        return

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
        print(f"{Colors.WARNING}[{bot_id}] Could not load palettes.json ({e}). Using default colors.{Colors.ENDC}")
        valid_colors = ["#ff0000", "#00ff00", "#0000ff", "#000000", "#ffffff"]

    print(f"{Colors.GREEN}[{bot_id}] Connected. Starting pixel attack ({pixels_per_bot} pixels)...{Colors.ENDC}")
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
            "userId": 0
        }
        
        try:
            ws.send(json.dumps(msg))
            success_count += 1
            time.sleep(random.uniform(0.01, 0.1))
        except Exception as e:
            print(f"{Colors.FAIL}[{bot_id}] Error sending pixel: {e}{Colors.ENDC}")
            break
            
    ws.close()
    print(f"{Colors.GREEN}[{bot_id}] Bot finished. Pixels placed: {success_count}/{pixels_per_bot}{Colors.ENDC}")

def run_canvas_stress_test():
    print(f"\n{Colors.HEADER}{Colors.BOLD}--- Stress Test: Canvas WebSocket ---{Colors.ENDC}")
    target_url = input("Server URL (e.g. http://localhost): ").strip() or "http://localhost"
    
    if target_url.startswith("http"):
        parsed_url = urllib.parse.urlparse(target_url)
        target_url = f"{parsed_url.scheme}://{parsed_url.netloc}"
        
    canvas_id = input("Numeric ID or UUID of canvas: ").strip()
    
    if not canvas_id:
        print(f"{Colors.FAIL}Error: You must provide a valid canvas ID.{Colors.ENDC}")
        return

    try:
        num_bots = int(input("Number of concurrent connections (bots) [e.g. 10]: ").strip() or "10")
        pixels_per_bot = int(input("Pixels to place per bot [e.g. 100]: ").strip() or "100")
        canvas_width = int(input("Canvas width [e.g. 64]: ").strip() or "64")
        canvas_height = int(input("Canvas height [e.g. 64]: ").strip() or "64")
    except ValueError:
        print(f"{Colors.FAIL}Error: Please enter valid numbers.{Colors.ENDC}")
        return

    print(f"\n{Colors.WARNING}Starting {num_bots} bots. Each will place {pixels_per_bot} random pixels...{Colors.ENDC}")
    
    threads = []
    for i in range(num_bots):
        t = threading.Thread(target=run_canvas_bot, args=(f"Bot-{i+1}", target_url, canvas_id, pixels_per_bot, canvas_width, canvas_height))
        threads.append(t)
        t.start()
        time.sleep(0.2)
        
    for t in threads:
        t.join()
        
    print(f"\n{Colors.GREEN}{Colors.BOLD}Canvas stress test completed.{Colors.ENDC}")

def run_menu():
    print(f"\n{Colors.HEADER}{Colors.BOLD}--- Stress Test Menu ---{Colors.ENDC}")
    print("1 - WebSocket Canvas Stress Test")
    print("0 - Return to Main Menu")
    
    choice = input(f"{Colors.WARNING}Select an option: {Colors.ENDC}").strip()
    if choice == '1':
        run_canvas_stress_test()
    elif choice == '0':
        return
    else:
        print(f"{Colors.FAIL}Invalid option.{Colors.ENDC}")
