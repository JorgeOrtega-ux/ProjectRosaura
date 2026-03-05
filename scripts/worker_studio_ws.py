# scripts/worker_studio_ws.py

import asyncio
import websockets
import logging
import json
import os
import time
import sys
from dotenv import load_dotenv

# Configuración de logs en la terminal
logging.basicConfig(
    level=logging.INFO, 
    format='%(asctime)s - %(levelname)s - [Studio WS] %(message)s'
)

# --- 1. CONFIGURACIÓN ESTRICTA DE ENTORNO (.env) ---
# Forzamos la carga del archivo .env. Si no existe, no cargará variables.
load_dotenv()

# Obtenemos las variables SIN valores por defecto
WS_HOST = os.getenv("WS_HOST")
WS_PORT_RAW = os.getenv("WS_PORT")
AUTH_TOKEN_SECRET = os.getenv("WS_AUTH_TOKEN")

# Validación estricta: Si falta alguna variable, detenemos el servidor de inmediato
if not WS_HOST or not WS_PORT_RAW or not AUTH_TOKEN_SECRET:
    logging.error("ERROR CRÍTICO: Faltan variables requeridas en el archivo .env.")
    logging.error("Asegúrate de definir: WS_HOST, WS_PORT y WS_AUTH_TOKEN")
    sys.exit(1) # Cierra el programa con código de error

# Validamos que el puerto sea un número válido
try:
    WS_PORT = int(WS_PORT_RAW)
except ValueError:
    logging.error(f"ERROR CRÍTICO: El valor de WS_PORT ('{WS_PORT_RAW}') no es un número válido.")
    sys.exit(1)


# --- 2. PREVENCIÓN DoS: LIMITADOR DE TASA (RATE LIMITING) ---
RATE_LIMIT_MESSAGES = 20 # Mensajes máximos permitidos...
RATE_LIMIT_WINDOW = 10   # ...en esta cantidad de segundos
client_message_tracker = {}

def is_rate_limited(client_ip):
    now = time.time()
    if client_ip not in client_message_tracker:
        client_message_tracker[client_ip] = []
    
    # Filtrar marcas de tiempo viejas
    client_message_tracker[client_ip] = [ts for ts in client_message_tracker[client_ip] if now - ts < RATE_LIMIT_WINDOW]
    
    if len(client_message_tracker[client_ip]) >= RATE_LIMIT_MESSAGES:
        return True
    
    client_message_tracker[client_ip].append(now)
    return False

# --- 3. FASE DE AUTENTICACIÓN ---
async def authenticate_client(websocket, client_ip):
    """
    Exige que el cliente envíe su token en el primer mensaje antes de permitirle hacer nada más.
    Esto previene secuestro de sesión (CSWSH) y conexiones anónimas.
    """
    try:
        # Esperar máximo 5 segundos para que el cliente se autentique
        auth_message_raw = await asyncio.wait_for(websocket.recv(), timeout=5.0)
        auth_data = json.loads(auth_message_raw)
        
        # Validar el token contra la variable estricta del .env
        if auth_data.get("type") == "auth" and auth_data.get("token") == AUTH_TOKEN_SECRET:
            logging.info(f"Cliente {client_ip} autenticado exitosamente.")
            await websocket.send(json.dumps({"status": "success", "message": "Autenticación exitosa"}))
            return True
        else:
            logging.warning(f"Intento de acceso denegado para {client_ip}: Token inválido.")
            await websocket.send(json.dumps({"status": "error", "code": "AUTH_FAILED", "error": "Token inválido o expirado"}))
            return False
            
    except asyncio.TimeoutError:
        logging.warning(f"Timeout de autenticación para {client_ip}. Desconectando.")
        await websocket.send(json.dumps({"status": "error", "code": "AUTH_TIMEOUT", "error": "Tiempo agotado"}))
        return False
    except json.JSONDecodeError:
        logging.warning(f"Formato inválido de {client_ip} durante el login. Se esperaba JSON.")
        return False
    except Exception as e:
        logging.error(f"Error en fase de autenticación para {client_ip}: {e}")
        return False

# --- 4. CONTROLADOR PRINCIPAL ---
async def studio_connection_handler(websocket):
    # Detección de IP
    client_ip = websocket.remote_address[0] if websocket.remote_address else "Desconocida"
    logging.info(f"Conexión detectada desde: {client_ip}. Esperando credenciales...")
    
    try:
        # Obligar al cliente a autenticarse primero
        is_authenticated = await authenticate_client(websocket, client_ip)
        if not is_authenticated:
            # 4000 es un código de cierre personalizado (Bad Request / No Autorizado)
            await websocket.close(code=4000, reason="Fallo de Autenticación")
            return

        # Bucle principal de comunicaciones seguras
        async for message in websocket:
            # Validar Rate Limiting
            if is_rate_limited(client_ip):
                logging.warning(f"Rate limit excedido por {client_ip}.")
                await websocket.send(json.dumps({"status": "error", "error": "Límite de mensajes alcanzado. Espera un momento."}))
                continue

            # Validar y Sanitizar Formato (Solo JSON estricto)
            try:
                data = json.loads(message)
            except json.JSONDecodeError:
                logging.warning(f"Ataque o error de formato prevenido desde {client_ip}")
                await websocket.send(json.dumps({"status": "error", "error": "El servidor solo acepta formato JSON."}))
                continue

            # >> AQUÍ PROCESAS LA LÓGICA DE TU APLICACIÓN <<
            logging.info(f"Comando seguro recibido de {client_ip}: {data}")
            
            # Ejemplo de eco seguro
            await websocket.send(json.dumps({
                "status": "success", 
                "accion_procesada": data.get("action", "ninguna")
            }))
            
    except websockets.exceptions.ConnectionClosed as e:
        logging.info(f"El cliente {client_ip} cerró la conexión. Razón: {e}")
    except Exception as e:
        logging.error(f"Error general con {client_ip}: {e}")
    finally:
        # Limpiar datos de memoria al desconectar para prevenir fugas de memoria
        if client_ip in client_message_tracker:
            del client_message_tracker[client_ip]
        logging.info(f"Sesión finalizada completamente para {client_ip}")

async def main():
    logging.info(f"Iniciando servidor WebSocket SEGURO en ws://{WS_HOST}:{WS_PORT}")
    
    # Inicia el servidor con mitigaciones de seguridad
    async with websockets.serve(
        studio_connection_handler, 
        WS_HOST, 
        WS_PORT,
        max_size=1048576, # Previene DoS impidiendo mensajes gigantes (Límite 1MB)
        ping_interval=20, # Keep-Alive automático
        ping_timeout=20
    ):
        await asyncio.Future()

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logging.info("Servidor WebSocket detenido manualmente.")