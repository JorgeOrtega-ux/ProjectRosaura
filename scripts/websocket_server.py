import asyncio
import websockets
import os
import json
import time
from urllib.parse import urlparse
import redis.asyncio as redis

# Diccionario en memoria para gestionar las salas
# Estructura: { "canvas_id": { client1, client2, ... } }
ROOMS = {}
REDIS_CLIENT = None

async def get_redis_client():
    global REDIS_CLIENT
    if REDIS_CLIENT is None:
        redis_host = os.getenv("REDIS_HOST", "redis")
        redis_port = int(os.getenv("REDIS_PORT", 6379))
        redis_pass = os.getenv("REDIS_PASS", None)
        
        REDIS_CLIENT = redis.Redis(
            host=redis_host, 
            port=redis_port, 
            password=redis_pass,
            db=0,
            decode_responses=False
        )
    return REDIS_CLIENT

async def handler(websocket):
    """
    Maneja la conexión de un cliente, su asignación a una sala,
    la escritura en Redis y la retransmisión de mensajes.
    """
    path = websocket.request.path
    parsed_path = urlparse(path)
    path_parts = parsed_path.path.strip("/").split("/")

    if len(path_parts) != 2 or path_parts[0] != "canvas":
        await websocket.close(code=1008, reason="Ruta inválida. Utilice el formato: /canvas/<canvas_id>")
        return

    canvas_id = path_parts[1]

    if canvas_id not in ROOMS:
        ROOMS[canvas_id] = set()
    
    ROOMS[canvas_id].add(websocket)
    print(f"[+] Cliente conectado a la sala '{canvas_id}'. Total en sala: {len(ROOMS[canvas_id])}")

    r = await get_redis_client()

    try:
        async for message in websocket:
            try:
                data = json.loads(message)
                if data.get("type") == "pixel":
                    x = int(data.get("x", 0))
                    y = int(data.get("y", 0))
                    width = int(data.get("width", 64))
                    user_id = data.get("userId")
                    
                    # Intercepción estricta del color para evitar fallos silenciosos
                    raw_color = data.get("color", 0)
                    try:
                        color_index = int(raw_color)
                    except ValueError:
                        print(f"[!] AVISO: El frontend intentó pintar con '{raw_color}'. Debe ser un índice entero (0-255). Se ignoró el píxel.")
                        continue
                    
                    # Validación básica de color (1 byte = 0-255)
                    if 0 <= color_index <= 255:
                        offset = (y * width) + x
                        redis_state_key = f"canvas:{canvas_id}:state"
                        
                        # 1. Sobrescribe exactamente el byte del píxel (Estado actual / Snapshot)
                        await r.setrange(redis_state_key, offset, bytes([color_index]))
                        
                        # 2. Inyectar el evento en un REDIS STREAM (Para el archivo .jsonl / Timelapse)
                        stream_key = f"canvas:{canvas_id}:stream"
                        event_dict = {
                            "u": str(user_id) if user_id else "null",
                            "x": str(x),
                            "y": str(y),
                            "c": str(color_index)
                        }
                        # xadd emite el evento al stream de forma cronológica
                        await r.xadd(stream_key, event_dict)
                    else:
                        print(f"[!] AVISO: Índice de color {color_index} fuera de rango (0-255).")

            except Exception as e:
                print(f"[!] Error procesando escritura en Redis: {e}")

            # Hacer broadcast (retransmitir) a todos MENOS al emisor original
            clients_in_room = ROOMS.get(canvas_id, set())
            if len(clients_in_room) > 1:
                tasks = [
                    asyncio.create_task(client.send(message))
                    for client in clients_in_room if client != websocket
                ]
                if tasks:
                    await asyncio.gather(*tasks)

    except websockets.exceptions.ConnectionClosed:
        pass
    except Exception as e:
        print(f"[!] Error inesperado en la conexión: {e}")
    finally:
        if canvas_id in ROOMS and websocket in ROOMS[canvas_id]:
            ROOMS[canvas_id].remove(websocket)
            print(f"[-] Cliente desconectado de la sala '{canvas_id}'. Total en sala: {len(ROOMS[canvas_id])}")
            
            if len(ROOMS[canvas_id]) == 0:
                del ROOMS[canvas_id]
                print(f"[*] Sala '{canvas_id}' eliminada por inactividad.")

async def main():
    host = os.getenv("WS_HOST", "0.0.0.0")
    port = int(os.getenv("WS_PORT", 8765))
    
    print(f"Iniciando servidor WebSocket en ws://{host}:{port}")
    
    async with websockets.serve(handler, host, port):
        await asyncio.Future()

if __name__ == "__main__":
    asyncio.run(main())