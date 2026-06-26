# scripts/websocket_server.py
import asyncio
import websockets
import os
import json
import time
from urllib.parse import urlparse, parse_qs
import redis.asyncio as redis

ROOMS = {}
LIVE_ROOMS = {} # Para las sesiones live share: { code: set(websockets) }
OWNER_CONNS = {} # Mapeo { websocket: code } para limpiar si el dueño se desconecta de golpe
REDIS_CLIENT = None
USER_LOCKS = {}

# Mapeo global de metadatos de las conexiones para QoS
# WS_META[websocket] = { 'canvas_id': string, 'type': 'guest'|'auth', 'user_id': int|None }
WS_META = {}

async def get_redis_client():
    global REDIS_CLIENT
    if REDIS_CLIENT is None:
        redis_host = os.getenv("REDIS_HOST", "redis")
        redis_port = int(os.getenv("REDIS_PORT", 6379))
        redis_pass = os.getenv("REDIS_PASS", None)
        
        print(f"[DEBUG REDIS] Conectando a redis en {redis_host}:{redis_port}")
        REDIS_CLIENT = redis.Redis(
            host=redis_host, 
            port=redis_port, 
            password=redis_pass,
            db=0,
            decode_responses=False 
        )
    return REDIS_CLIENT

async def get_user_cooldown(r, canvas_id, user_id, config_batch, config_sec):
    user_key = f"canvas:{canvas_id}:user:{user_id}:cooldown"
    now = time.time()
    
    print(f"[DEBUG PY] Consultando key: {user_key}")
    u_state = await r.hgetall(user_key)
    
    if not u_state:
        print(f"[DEBUG PY] No hay estado previo para {user_id}. Asignando batch máximo: {config_batch}")
        balance = float(config_batch)
        last_t = now
    else:
        try:
            balance = float(u_state.get(b'b', config_batch))
            last_t = float(u_state.get(b't', now))
            print(f"[DEBUG PY] Estado encontrado en Redis -> b: {balance}, t: {last_t}")
        except (TypeError, ValueError) as e:
            print(f"[DEBUG PY] Error decodificando estado en Redis para {user_id}. Reiniciando. Detalles: {e}")
            balance = float(config_batch)
            last_t = now
        
    if config_sec > 0:
        elapsed = now - last_t
        replenish = int(elapsed // config_sec)
        print(f"[DEBUG PY] Calculando regeneración: {elapsed}s transcurridos, regenerando {replenish} pixeles.")
        if replenish > 0:
            balance = min(float(config_batch), balance + replenish)
            last_t = last_t + (replenish * config_sec)
            
    if balance >= float(config_batch):
        last_t = now 
            
    print(f"[DEBUG PY] Resultado final get_user_cooldown -> balance: {balance}, last_t: {last_t}")
    return balance, last_t, user_key, now

async def admin_events_listener():
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
    path = websocket.request.path
    parsed_path = urlparse(path)
    path_parts = parsed_path.path.strip("/").split("/")

    if len(path_parts) != 2 or path_parts[0] != "canvas":
        await websocket.close(code=1008, reason="Ruta inválida. Utilice el formato: /canvas/<canvas_id>")
        return

    canvas_id = path_parts[1]
    
    # ------------------------------------------------------------------
    # FASE 1: SISTEMA DE TICKETS DE UN SOLO USO
    # ------------------------------------------------------------------
    query_params = parse_qs(parsed_path.query)
    ticket = query_params.get('ticket', [None])[0]

    if not ticket:
        print("[DEBUG WS] Conexión rechazada: Sin ticket HTTP previo.")
        await websocket.close(code=1008, reason="Ticket requerido para conexión.")
        return

    r = await get_redis_client()
    ticket_key = f"ws:ticket:{ticket}"
    
    # Extraer el ticket de Redis
    ticket_data_raw = await r.get(ticket_key)

    if not ticket_data_raw:
        print(f"[DEBUG WS] Conexión rechazada: Ticket '{ticket}' inválido o expirado.")
        await websocket.close(code=1008, reason="Ticket inválido o expirado.")
        return

    # Quemar el ticket instantáneamente
    await r.delete(ticket_key)
    
    # Decodificar estado del usuario que viene desde PHP
    try:
        decoded_str = ticket_data_raw.decode('utf-8') if isinstance(ticket_data_raw, bytes) else ticket_data_raw
        ticket_data = json.loads(decoded_str)
        user_type = ticket_data.get('type', 'guest')
        ticket_user_id = ticket_data.get('user_id')
    except Exception as e:
        print(f"[DEBUG WS] Error parseando ticket de Redis: {e}")
        await websocket.close(code=1008, reason="Datos de ticket corruptos.")
        return

    # ------------------------------------------------------------------
    # FASE 2: QUALITY OF SERVICE (QoS) & EVICTION
    # ------------------------------------------------------------------
    MAX_CONNECTIONS = int(os.getenv("WS_MAX_CONNECTIONS", 10000))
    QOS_THRESHOLD = int(os.getenv("WS_QOS_THRESHOLD", 9000))

    if len(WS_META) >= QOS_THRESHOLD:
        if user_type == 'guest':
            # Si el servidor roza el límite, denegamos la entrada a los mirones (guests)
            if len(WS_META) >= MAX_CONNECTIONS:
                print(f"[QoS] Servidor lleno. Bloqueando conexión Guest.")
                await websocket.close(code=4001, reason="Servidor lleno. Prioridad a usuarios registrados.")
                return
        else:
            # Si entra un usuario Autenticado y estamos llenos, desalojamos un Guest al azar
            guest_to_evict = next((ws for ws, meta in WS_META.items() if meta['type'] == 'guest'), None)
            if guest_to_evict:
                print(f"[QoS] Desalojando a un Guest para dar paso a un usuario Registrado (ID: {ticket_user_id})")
                try:
                    await guest_to_evict.close(code=4001, reason="Desalojado por QoS para dar prioridad a usuarios registrados.")
                except:
                    pass
            elif len(WS_META) >= MAX_CONNECTIONS:
                # Caso extremo: Servidor lleno solo de usuarios autenticados
                print(f"[QoS] Servidor absolutamente saturado con cuentas autenticadas.")
                await websocket.close(code=1013, reason="Servidor absolutamente lleno.")
                return

    # Si pasó los filtros, se registra la conexión
    if canvas_id not in ROOMS:
        ROOMS[canvas_id] = set()
    
    ROOMS[canvas_id].add(websocket)
    WS_META[websocket] = {
        'canvas_id': canvas_id,
        'type': user_type,
        'user_id': ticket_user_id
    }
    
    print(f"[+] Cliente ({user_type}) conectado a la sala '{canvas_id}'. Total global: {len(WS_META)}")

    lock_key = f"canvas:{canvas_id}:reset_lock"
    config_key = f"canvas:{canvas_id}:config"

    try:
        async for message in websocket:
            print(f"[DEBUG WS-PY] Recibido desde frontend: {message}")
            try:
                data = json.loads(message)
                
                # ==========================================
                # EVENTO INIT - SINCRONIZACIÓN INICIAL
                # ==========================================
                if data.get("type") == "init":
                    user_id = data.get("userId")
                    print(f"[DEBUG PY] Procesando petición INIT. UserId: {user_id}")
                    
                    raw_config = await r.hgetall(config_key)
                    config_batch = int(raw_config.get(b'cooldown_batch', 5))
                    config_sec = int(raw_config.get(b'cooldown_seconds', 10))
                    print(f"[DEBUG PY] Config del lienzo en Redis -> batch: {config_batch}, sec: {config_sec}")
                    
                    if user_id:
                        balance, last_t, _, now = await get_user_cooldown(r, canvas_id, user_id, config_batch, config_sec)
                        next_in = round(config_sec - (now - last_t), 2) if config_sec > 0 and balance < config_batch else 0
                    else:
                        print(f"[DEBUG PY] Usuario no identificado, devolviendo max batch por defecto.")
                        balance = config_batch
                        next_in = 0
                        
                    init_msg = json.dumps({
                        "type": "init_cooldown",
                        "balance": int(balance),
                        "max_batch": config_batch,
                        "cooldown_sec": config_sec,
                        "next_replenish_in": next_in
                    })
                    print(f"[DEBUG PY] Enviando respuesta de INIT al front: {init_msg}")
                    await websocket.send(init_msg)

                # ==========================================
                # EVENTOS LIVE SHARE
                # ==========================================
                elif data.get("type") == "join_live_share":
                    code = data.get("code")
                    if not code: continue
                    
                    if code not in LIVE_ROOMS:
                        LIVE_ROOMS[code] = set()
                    LIVE_ROOMS[code].add(websocket)
                    
                    print(f"[DEBUG LIVE] WS unido a sesión en vivo: {code}. Total: {len(LIVE_ROOMS[code])}")
                    
                elif data.get("type") == "update_live_share":
                    code = data.get("code")
                    if code and code in LIVE_ROOMS:
                        if websocket not in OWNER_CONNS:
                            OWNER_CONNS[websocket] = code
                            print(f"[DEBUG LIVE] WS registrado como dueño de la sesión {code}")
                            
                        update_msg = json.dumps({
                            "type": "live_image_updated",
                            "code": code,
                            "x": data.get("x"),
                            "y": data.get("y"),
                            "w": data.get("w"),
                            "h": data.get("h"),
                            "opacity": data.get("opacity")
                        })
                        tasks = [
                            asyncio.create_task(client.send(update_msg))
                            for client in LIVE_ROOMS[code] if client != websocket
                        ]
                        if tasks:
                            await asyncio.gather(*tasks)
                            
                elif data.get("type") == "end_live_share":
                    code = data.get("code")
                    if code and code in LIVE_ROOMS:
                        end_msg = json.dumps({
                            "type": "live_session_ended",
                            "code": code
                        })
                        tasks = [
                            asyncio.create_task(client.send(end_msg))
                            for client in LIVE_ROOMS[code] if client != websocket
                        ]
                        if tasks:
                            await asyncio.gather(*tasks)
                            
                        del LIVE_ROOMS[code]
                        await r.delete(f"live_share:{code}")
                        if websocket in OWNER_CONNS:
                            del OWNER_CONNS[websocket]
                        print(f"[DEBUG LIVE] Sala {code} destruida intencionalmente por el dueño.")

                # ==========================================
                # EVENTO PIXEL - INTENTO DE PINTAR
                # ==========================================
                elif data.get("type") == "pixel":
                    is_locked = await r.exists(lock_key)
                    if is_locked:
                        print(f"[DEBUG PY] Lienzo bloqueado. Ignorando pixel.")
                        # Notificar al cliente que detenga sus intentos
                        error_msg = json.dumps({
                            "type": "canvas_locked_error"
                        })
                        await websocket.send(error_msg)
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

                    raw_config = await r.hgetall(config_key)
                    config_batch = int(raw_config.get(b'cooldown_batch', 5))
                    config_sec = int(raw_config.get(b'cooldown_seconds', 10))

                    if not user_id:
                        print(f"[DEBUG PY] Intento de pintar de usuario no identificado. Denegado.")
                        error_msg = json.dumps({
                            "type": "cooldown_error",
                            "balance": 0,
                            "max_batch": config_batch,
                            "cooldown_sec": config_sec,
                            "next_replenish_in": 0
                        })
                        await websocket.send(error_msg)
                        continue 

                    if user_id not in USER_LOCKS:
                        USER_LOCKS[user_id] = asyncio.Lock()

                    async with USER_LOCKS[user_id]:
                        balance, last_t, user_key, now = await get_user_cooldown(r, canvas_id, user_id, config_batch, config_sec)
                        
                        if balance >= 1:
                            balance -= 1
                            print(f"[DEBUG PY] Descontando 1 pixel. Balance restante: {balance}")
                            
                            await r.hset(user_key, mapping={b'b': str(balance).encode(), b't': str(last_t).encode()})
                            
                            confirm_msg = json.dumps({
                                "type": "pixel_confirm",
                                "balance": int(balance),
                                "max_batch": config_batch,
                                "cooldown_sec": config_sec,
                                "next_replenish_in": round(config_sec - (now - last_t), 2) if config_sec > 0 else 0
                            })
                            print(f"[DEBUG PY] Confirmando pixel. Msg: {confirm_msg}")
                            await websocket.send(confirm_msg)

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

                                clients_in_room = ROOMS.get(canvas_id, set())
                                if len(clients_in_room) > 1:
                                    tasks = [
                                        asyncio.create_task(client.send(message))
                                        for client in clients_in_room if client != websocket
                                    ]
                                    if tasks:
                                        await asyncio.gather(*tasks)

                        else:
                            print(f"[DEBUG PY] Cooldown activo. Pixeles insuficientes para {user_id}.")
                            error_msg = json.dumps({
                                "type": "cooldown_error",
                                "balance": 0,
                                "max_batch": config_batch,
                                "cooldown_sec": config_sec,
                                "next_replenish_in": round(config_sec - (now - last_t), 2) if config_sec > 0 else 0
                            })
                            await websocket.send(error_msg)

            except Exception as e:
                print(f"[!] Error procesando mensaje del WS o escritura en Redis: {e}")

    except websockets.exceptions.ConnectionClosed:
        pass
    except Exception as e:
        print(f"[!] Error inesperado en la conexión: {e}")
    finally:
        # Desconexión de Salas del Lienzo
        if canvas_id in ROOMS and websocket in ROOMS[canvas_id]:
            ROOMS[canvas_id].remove(websocket)
            
            if len(ROOMS[canvas_id]) == 0:
                del ROOMS[canvas_id]
                print(f"[*] Sala '{canvas_id}' eliminada por inactividad.")

        # Desconexión y Limpieza de Salas Live Share
        for code, clients in list(LIVE_ROOMS.items()):
            if websocket in clients:
                clients.remove(websocket)
                
                # Si el que se desconecta era el dueño, destruimos la sesión
                if websocket in OWNER_CONNS and OWNER_CONNS[websocket] == code:
                    end_msg = json.dumps({"type": "live_session_ended", "code": code})
                    tasks = [
                        asyncio.create_task(c.send(end_msg))
                        for c in clients
                    ]
                    if tasks:
                        await asyncio.gather(*tasks)
                        
                    del LIVE_ROOMS[code]
                    try:
                        redis_client = await get_redis_client()
                        await redis_client.delete(f"live_share:{code}")
                    except Exception as e:
                        pass
                        
        if websocket in OWNER_CONNS:
            del OWNER_CONNS[websocket]
            
        # Limpieza de QoS Global
        if websocket in WS_META:
            del WS_META[websocket]
            print(f"[-] Cliente desconectado. Total global restante: {len(WS_META)}")

async def main():
    host = os.getenv("WS_HOST", "0.0.0.0")
    port = int(os.getenv("WS_PORT", 8765))
    
    print(f"Iniciando servidor WebSocket en ws://{host}:{port}")
    
    asyncio.create_task(admin_events_listener())
    
    async with websockets.serve(handler, host, port):
        await asyncio.Future()

if __name__ == "__main__":
    asyncio.run(main())