# scripts/worker_studio_ws.py

import asyncio
import websockets
import logging
import json
import os
import time
import sys
import redis.asyncio as aioredis # <-- LÍNEA CORREGIDA
from dotenv import load_dotenv

logging.basicConfig(
    level=logging.INFO, 
    format='%(asctime)s - %(levelname)s - [Studio WS] %(message)s'
)

load_dotenv()

WS_HOST = os.getenv("WS_HOST")
WS_PORT_RAW = os.getenv("WS_PORT")
AUTH_TOKEN_SECRET = os.getenv("WS_AUTH_TOKEN")
REDIS_HOST = os.getenv('REDIS_HOST', 'localhost')
REDIS_PORT = os.getenv('REDIS_PORT', '6379')

if not WS_HOST or not WS_PORT_RAW or not AUTH_TOKEN_SECRET:
    logging.error("ERROR CRÍTICO: Faltan variables requeridas en el archivo .env.")
    sys.exit(1)

try:
    WS_PORT = int(WS_PORT_RAW)
except ValueError:
    logging.error(f"ERROR CRÍTICO: WS_PORT inválido.")
    sys.exit(1)

RATE_LIMIT_MESSAGES = 20 
RATE_LIMIT_WINDOW = 10   
client_message_tracker = {}

def is_rate_limited(client_ip):
    now = time.time()
    if client_ip not in client_message_tracker:
        client_message_tracker[client_ip] = []
    
    client_message_tracker[client_ip] = [ts for ts in client_message_tracker[client_ip] if now - ts < RATE_LIMIT_WINDOW]
    
    if len(client_message_tracker[client_ip]) >= RATE_LIMIT_MESSAGES:
        return True
    
    client_message_tracker[client_ip].append(now)
    return False

async def authenticate_client(websocket, client_ip):
    try:
        auth_message_raw = await asyncio.wait_for(websocket.recv(), timeout=5.0)
        auth_data = json.loads(auth_message_raw)
        
        if auth_data.get("type") == "auth" and auth_data.get("token") == AUTH_TOKEN_SECRET:
            user_id = auth_data.get("userId") # <-- Extraemos el ID del usuario
            if not user_id:
                raise ValueError("Falta userId")
                
            logging.info(f"Cliente {client_ip} (User ID: {user_id}) autenticado.")
            await websocket.send(json.dumps({"status": "success", "message": "Autenticación exitosa"}))
            return True, user_id
        else:
            logging.warning(f"Intento denegado para {client_ip}.")
            await websocket.send(json.dumps({"status": "error", "code": "AUTH_FAILED"}))
            return False, None
            
    except Exception as e:
        logging.error(f"Error autenticación {client_ip}: {e}")
        await websocket.send(json.dumps({"status": "error", "code": "AUTH_FAILED"}))
        return False, None

# Tarea en segundo plano para escuchar Redis y enviar al WebSocket
async def redis_listener(websocket, user_id):
    try:
        redis_url = f"redis://{REDIS_HOST}:{REDIS_PORT}"
        redis = await aioredis.from_url(redis_url)
        pubsub = redis.pubsub()
        channel_name = f"studio_updates_{user_id}"
        await pubsub.subscribe(channel_name)
        
        logging.info(f"Suscrito a canal Redis: {channel_name}")
        
        async for message in pubsub.listen():
            if message['type'] == 'message':
                data = message['data'].decode('utf-8')
                # Retransmitir al frontend
                await websocket.send(data)
    except asyncio.CancelledError:
        pass
    except Exception as e:
        logging.error(f"Error en redis_listener para user {user_id}: {e}")
    finally:
        await redis.close()

async def studio_connection_handler(websocket):
    client_ip = websocket.remote_address[0] if websocket.remote_address else "Desconocida"
    
    try:
        is_authenticated, user_id = await authenticate_client(websocket, client_ip)
        if not is_authenticated:
            await websocket.close(code=4000)
            return

        # Iniciamos el listener de Redis asociado a esta conexión
        redis_task = asyncio.create_task(redis_listener(websocket, user_id))

        async for message in websocket:
            if is_rate_limited(client_ip):
                await websocket.send(json.dumps({"status": "error", "error": "Rate limit."}))
                continue

            try:
                data = json.loads(message)
                logging.info(f"Comando de {client_ip}: {data}")
                # Lógica extra de WS entrante aquí...
            except json.JSONDecodeError:
                continue
            
    except websockets.exceptions.ConnectionClosed:
        pass
    finally:
        if 'redis_task' in locals():
            redis_task.cancel()
        if client_ip in client_message_tracker:
            del client_message_tracker[client_ip]

async def main():
    logging.info(f"Iniciando WS seguro en ws://{WS_HOST}:{WS_PORT}")
    async with websockets.serve(studio_connection_handler, WS_HOST, WS_PORT, max_size=1048576, ping_interval=20, ping_timeout=20):
        await asyncio.Future()

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logging.info("Detenido.")