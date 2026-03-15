# scripts/worker_studio_ws.py

import asyncio
import websockets
import logging
import json
import os
import time
import sys
import redis.asyncio as aioredis
import mysql.connector
from mysql.connector import Error
from dotenv import load_dotenv

logging.basicConfig(level=logging.INFO, format='%(asctime)s - [WS Listener] %(message)s')

load_dotenv()

WS_HOST = os.getenv("WS_HOST")
WS_PORT_RAW = os.getenv("WS_PORT")
AUTH_TOKEN_SECRET = os.getenv("WS_AUTH_TOKEN")
REDIS_HOST = os.getenv('REDIS_HOST', 'localhost')
REDIS_PORT = os.getenv('REDIS_PORT', '6379')

# Configuración BD
DB_HOST = os.getenv('DB_HOST', 'localhost')
DB_USER = os.getenv('DB_USER', 'root')
DB_PASS = os.getenv('DB_PASS', '')
DB_NAME = os.getenv('DB_NAME', 'projectrosaura')

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

# NUEVA FUNCIÓN: BARRERA DE SEGURIDAD 3 - Verificación en Base de Datos
def check_db_upload_permission(user_uuid):
    try:
        conn = mysql.connector.connect(
            host=DB_HOST, user=DB_USER, password=DB_PASS, database=DB_NAME
        )
        cursor = conn.cursor(dictionary=True)
        # El user_id que envía el frontend puede ser UUID (lo más seguro) o el ID numérico
        cursor.execute("SELECT role, can_upload_videos FROM users WHERE uuid = %s OR id = %s", (user_uuid, user_uuid))
        user = cursor.fetchone()
        cursor.close()
        conn.close()
        
        if user:
            if user['role'] in ['founder', 'administrator'] or user['can_upload_videos'] == 1:
                return True
    except Error as e:
        logging.error(f"Error DB en WS auth: {e}")
    return False

async def authenticate_client(websocket, client_ip):
    try:
        auth_message_raw = await asyncio.wait_for(websocket.recv(), timeout=5.0)
        auth_data = json.loads(auth_message_raw)
        
        if auth_data.get("type") == "auth" and auth_data.get("token") == AUTH_TOKEN_SECRET:
            user_id = auth_data.get("userId")
            if not user_id:
                raise ValueError("Falta userId")
            
            # Verificamos permiso contra MySQL sin bloquear el event loop
            has_permission = await asyncio.to_thread(check_db_upload_permission, user_id)
            if not has_permission:
                logging.warning(f"Intento denegado (Sin Permisos) para {client_ip} (Usuario: {user_id}).")
                await websocket.send(json.dumps({"status": "error", "code": "FORBIDDEN"}))
                return False, None

            logging.info(f"✅ Auth OK | IP: {client_ip} | Frontend solicitó canal para userId: '{user_id}'")
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

async def redis_listener(websocket, user_id):
    try:
        redis_url = f"redis://{REDIS_HOST}:{REDIS_PORT}"
        redis = await aioredis.from_url(redis_url)
        pubsub = redis.pubsub()
        channel_name = f"studio_updates_{user_id}"
        
        await pubsub.subscribe(channel_name)
        logging.info(f"🎧 Suscrito exitosamente a Redis en canal: {channel_name}")
        
        async for message in pubsub.listen():
            if message['type'] == 'message':
                data = message['data'].decode('utf-8')
                logging.info(f"📤 Reenviando por WebSocket al frontend -> {data}")
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

        redis_task = asyncio.create_task(redis_listener(websocket, user_id))

        async for message in websocket:
            if is_rate_limited(client_ip):
                await websocket.send(json.dumps({"status": "error", "error": "Rate limit."}))
                continue
            
    except websockets.exceptions.ConnectionClosed:
        logging.info(f"🔴 Cliente {client_ip} desconectado.")
    finally:
        if 'redis_task' in locals():
            redis_task.cancel()
        if client_ip in client_message_tracker:
            del client_message_tracker[client_ip]

async def main():
    logging.info(f"🚀 Iniciando WS seguro en ws://{WS_HOST}:{WS_PORT}")
    async with websockets.serve(studio_connection_handler, WS_HOST, WS_PORT, max_size=1048576, ping_interval=20, ping_timeout=20):
        await asyncio.Future()

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logging.info("Detenido.")