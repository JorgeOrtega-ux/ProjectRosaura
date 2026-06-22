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
            decode_responses=False # Mantenemos esto para usar bytes globalmente
        )
    return REDIS_CLIENT

async def get_user_cooldown(r, canvas_id, user_id, config_batch, config_sec):
    """
    Calcula y devuelve el saldo en tiempo real de un usuario basado en la última vez que pintó.
    """
    user_key = f"canvas:{canvas_id}:user:{user_id}:cooldown"
    now = time.time()
    
    u_state = await r.hgetall(user_key)
    
    if not u_state:
        balance = float(config_batch)
        last_t = now
    else:
        balance = float(u_state.get(b'b', config_batch))
        last_t = float(u_state.get(b't', now))
        
    if config_sec > 0:
        elapsed = now - last_t
        replenish = int(elapsed // config_sec)
        if replenish > 0:
            balance = min(float(config_batch), balance + replenish)
            last_t = last_t + (replenish * config_sec)
            
    return balance, last_t, user_key, now

async def admin_events_listener():
    """
    Escucha eventos administrativos (como bloqueos de reinicio) a través de Redis Pub/Sub
    y los retransmite instantáneamente a todos los clientes conectados a la sala afectada.
    """
    r = await get_redis_client()
    pubsub = r.pubsub()
    await pubsub.subscribe("admin:canvas_events")
    
    print("[*] WS Server escuchando eventos administrativos en 'admin:canvas_events'")
    
    try:
        async for message in pubsub.listen():
            if message["type"] == "message":
                try:
                    data = json.loads(message["data"].decode('utf-8'))
                    canvas_id = str(data.get("canvas_id"))
                    
                    if canvas_id in ROOMS:
                        # Retransmitimos el evento exacto al frontend (ej. type: canvas_locked)
                        msg_str = json.dumps(data)
                        tasks = [
                            asyncio.create_task(client.send(msg_str))
                            for client in ROOMS[canvas_id]
                        ]
                        if tasks:
                            await asyncio.gather(*tasks)
                except Exception as e:
                    print(f"[!] Error procesando mensaje Pub/Sub: {e}")
    except Exception as e:
        print(f"[!] Error fatal en el listener de Pub/Sub: {e}")

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
    lock_key = f"canvas:{canvas_id}:reset_lock"
    config_key = f"canvas:{canvas_id}:config"

    try:
        async for message in websocket:
            try:
                data = json.loads(message)
                
                # ==========================================
                # EVENTO INIT - SINCRONIZACIÓN INICIAL
                # ==========================================
                if data.get("type") == "init":
                    user_id = data.get("userId")
                    if user_id:
                        raw_config = await r.hgetall(config_key)
                        config_batch = int(raw_config.get(b'cooldown_batch', 5))
                        config_sec = int(raw_config.get(b'cooldown_seconds', 10))
                        
                        balance, last_t, _, now = await get_user_cooldown(r, canvas_id, user_id, config_batch, config_sec)
                        
                        # Informar estado actual al cliente
                        init_msg = json.dumps({
                            "type": "init_cooldown",
                            "balance": int(balance),
                            "max_batch": config_batch,
                            "cooldown_sec": config_sec,
                            "next_replenish_in": round(config_sec - (now - last_t), 2) if config_sec > 0 and balance < config_batch else 0
                        })
                        await websocket.send(init_msg)

                # ==========================================
                # EVENTO PIXEL - INTENTO DE PINTAR
                # ==========================================
                elif data.get("type") == "pixel":
                    is_locked = await r.exists(lock_key)
                    if is_locked:
                        continue 
                    
                    x = int(data.get("x", 0))
                    y = int(data.get("y", 0))
                    width = int(data.get("width", 64))
                    user_id = data.get("userId")
                    
                    raw_color = data.get("color", 0)
                    try:
                        color_index = int(raw_color)
                    except ValueError:
                        continue

                    if not user_id:
                        continue # Solo usuarios identificados pueden colocar

                    # 1. Validar Cooldown
                    raw_config = await r.hgetall(config_key)
                    config_batch = int(raw_config.get(b'cooldown_batch', 5))
                    config_sec = int(raw_config.get(b'cooldown_seconds', 10))
                    
                    balance, last_t, user_key, now = await get_user_cooldown(r, canvas_id, user_id, config_batch, config_sec)
                    
                    if balance >= 1:
                        # Descontar saldo y guardar en Redis
                        balance -= 1
                        await r.hset(user_key, mapping={'b': balance, 't': last_t})
                        
                        # Devolver confirmación al usuario
                        confirm_msg = json.dumps({
                            "type": "pixel_confirm",
                            "balance": int(balance),
                            "max_batch": config_batch,
                            "cooldown_sec": config_sec,
                            "next_replenish_in": round(config_sec - (now - last_t), 2) if config_sec > 0 else 0
                        })
                        await websocket.send(confirm_msg)

                        # 2. Escribir Pixel en Memoria (State y Stream)
                        if 0 <= color_index <= 255:
                            offset = (y * width) + x
                            redis_state_key = f"canvas:{canvas_id}:state"
                            await r.setrange(redis_state_key, offset, bytes([color_index]))
                            
                            stream_key = f"canvas:{canvas_id}:stream"
                            event_dict = {
                                "u": str(user_id),
                                "x": str(x),
                                "y": str(y),
                                "c": str(color_index)
                            }
                            await r.xadd(stream_key, event_dict)

                            # 3. Hacer broadcast a todos MENOS al emisor original
                            clients_in_room = ROOMS.get(canvas_id, set())
                            if len(clients_in_room) > 1:
                                tasks = [
                                    asyncio.create_task(client.send(message))
                                    for client in clients_in_room if client != websocket
                                ]
                                if tasks:
                                    await asyncio.gather(*tasks)

                    else:
                        # 4. Denegar Pixel (Cooldown Activo)
                        error_msg = json.dumps({
                            "type": "cooldown_error",
                            "balance": 0,
                            "max_batch": config_batch,
                            "cooldown_sec": config_sec,
                            "next_replenish_in": round(config_sec - (now - last_t), 2) if config_sec > 0 else 0
                        })
                        await websocket.send(error_msg)

            except Exception as e:
                print(f"[!] Error procesando escritura en Redis: {e}")

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
    
    # Iniciamos el listener de eventos en segundo plano
    asyncio.create_task(admin_events_listener())
    
    async with websockets.serve(handler, host, port):
        await asyncio.Future()

if __name__ == "__main__":
    asyncio.run(main())