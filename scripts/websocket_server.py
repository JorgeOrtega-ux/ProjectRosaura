import asyncio
import websockets
import os
import json
import time
import uuid
from urllib.parse import urlparse, parse_qs
import redis.asyncio as redis
import mysql.connector
import zlib

from mysql.connector import pooling

# Global connection pool for chunks
DB_POOL = None

def get_db_pool():
    global DB_POOL
    if DB_POOL is None:
        try:
            DB_POOL = pooling.MySQLConnectionPool(
                pool_name="chunk_pool",
                pool_size=32,
                pool_reset_session=True,
                host=os.getenv("DB_HOST"),
                user=os.getenv("DB_USER"),
                password=os.getenv("DB_PASS"),
                database=os.getenv("DB_CANVASES_NAME")
            )
        except Exception as e:
            print(f"[!] Error creating DB pool: {e}")
    return DB_POOL

def fetch_chunk_from_db(canvas_id, cx, cy):
    try:
        pool = get_db_pool()
        if not pool:
            return None
            
        db = pool.get_connection()
        cursor = db.cursor()
        cursor.execute("SELECT chunk_data FROM canvas_infinite_chunks WHERE canvas_id = %s AND chunk_x = %s AND chunk_y = %s LIMIT 1", (canvas_id, cx, cy))
        row = cursor.fetchone()
        cursor.close()
        db.close()
        
        if row and row[0]:
            return zlib.decompress(row[0])
        return None
    except Exception as e:
        print(f"[!] Error fetching chunk {cx},{cy} from MySQL for canvas {canvas_id}: {e}")
        return None

NODE_ID = str(uuid.uuid4())
ROOMS = {}
LIVE_ROOMS = {} # Para las sesiones live share: { code: set(websockets) }
OWNER_CONNS = {} # Mapeo { websocket: code } para limpiar si el dueÃ±o se desconecta de golpe
REDIS_CLIENT = None
USER_LOCKS = {}

WS_META = {}

PERKS_CONFIG = None

def get_perks_config():
    global PERKS_CONFIG
    if PERKS_CONFIG is None:
        try:
            config_path = os.path.join(os.path.dirname(__file__), '..', 'public', 'assets', 'data', 'perks.json')
            with open(config_path, 'r', encoding='utf-8') as f:
                PERKS_CONFIG = json.load(f)
        except Exception as e:
            print(f"[!] Error loading perks.json: {e}")
            PERKS_CONFIG = {}
    return PERKS_CONFIG

async def get_redis_client():
    global REDIS_CLIENT
    if REDIS_CLIENT is None:
        redis_host = os.getenv("REDIS_HOST")
        redis_port = int(os.getenv("REDIS_PORT")) if os.getenv("REDIS_PORT") else None
        redis_pass = os.getenv("REDIS_PASS")
        
        print(f"[DEBUG REDIS] Connecting to redis on {redis_host}:{redis_port}")
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
    
    print(f"[DEBUG PY] Querying key: {user_key}")
    u_state = await r.hgetall(user_key)
    
    if not u_state:
        print(f"[DEBUG PY] No previous state for {user_id}. Assigning max batch: {config_batch}")
        balance = float(config_batch)
        last_t = now
    else:
        try:
            balance = float(u_state.get(b'b', config_batch))
            last_t = float(u_state.get(b't', now))
            print(f"[DEBUG PY] State found in Redis -> b: {balance}, t: {last_t}")
        except (TypeError, ValueError) as e:
            print(f"[DEBUG PY] Error decoding state in Redis for {user_id}. Resetting. Details: {e}")
            balance = float(config_batch)
            last_t = now
        
    if config_sec > 0:
        elapsed = now - last_t
        replenish = int(elapsed // config_sec)
        print(f"[DEBUG PY] Calculating regeneration: {elapsed}s elapsed, regenerating {replenish} pixels.")
        if replenish > 0:
            balance = min(float(config_batch), balance + replenish)
            last_t = last_t + (replenish * config_sec)
            
    if balance >= float(config_batch):
        last_t = now 
            
    print(f"[DEBUG PY] Final result get_user_cooldown -> balance: {balance}, last_t: {last_t}")
    return balance, last_t, user_key, now

async def admin_events_listener():
    r = await get_redis_client()
    pubsub = r.pubsub()
    await pubsub.subscribe("admin:canvas_events")
    
    print("[*] WS Server listening for administrative events on 'admin:canvas_events'")
    
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
                    print(f"[!] Error processing Pub/Sub message: {e}")
    except Exception as e:
        print(f"[!] Fatal error in Pub/Sub listener: {e}")

async def sync_events_listener():
    r = await get_redis_client()
    pubsub = r.pubsub()
    await pubsub.subscribe("canvas:sync_events")
    
    print("[*] WS Server listening for global sync events on 'canvas:sync_events'")
    
    try:
        async for message in pubsub.listen():
            if message["type"] == "message":
                try:
                    data = json.loads(message["data"].decode('utf-8'))
                    
                    if data.get("source_node") == NODE_ID:
                        continue
                        
                    target_type = data.get("target_type")
                    payload = data.get("payload")
                    
                    if target_type == "canvas":
                        canvas_id = str(data.get("canvas_id"))
                        if canvas_id in ROOMS:
                            tasks = [
                                asyncio.create_task(client.send(payload))
                                for client in ROOMS[canvas_id]
                            ]
                            if tasks:
                                await asyncio.gather(*tasks)
                                
                    elif target_type == "live":
                        code = str(data.get("code"))
                        if code in LIVE_ROOMS:
                            tasks = [
                                asyncio.create_task(client.send(payload))
                                for client in LIVE_ROOMS[code]
                            ]
                            if tasks:
                                await asyncio.gather(*tasks)
                except Exception as e:
                    print(f"[!] Error processing sync event message: {e}")
    except Exception as e:
        print(f"[!] Fatal error in sync_events_listener: {e}")

async def sync_online_counts():
    r = await get_redis_client()
    print("[*] WS Server starting live player counter synchronization to Redis.")
    while True:
        try:
            counts = {str(c_id): len(conns) for c_id, conns in ROOMS.items() if len(conns) > 0}
            
            pipe = r.pipeline()
            pipe.delete("canvas:online_counts")
            if counts:
                pipe.hset("canvas:online_counts", mapping=counts)
            await pipe.execute()
        except Exception as e:
            print(f"[!] Error synchronizing online counters: {e}")
        
        await asyncio.sleep(5)

async def handler(websocket):
    origin = websocket.request.headers.get("Origin")    app_url = os.getenv("APP_URL").rstrip("/") if os.getenv("APP_URL") else ""
    if origin and origin != app_url and origin != app_url.replace("http://", "https://"):
        print(f"[!] Connection rejected by CORS: Origin '{origin}' does not match '{app_url}'")
        await websocket.close(code=1008, reason="CORS policy violation")
        return

    path = websocket.request.path
    parsed_path = urlparse(path)
    path_parts = parsed_path.path.strip("/").split("/")

    if len(path_parts) != 2 or path_parts[0] != "canvas":
        await websocket.close(code=1008, reason="Invalid path format. Use: /canvas/<canvas_id>")
        return

    canvas_id = path_parts[1]
    
    query_params = parse_qs(parsed_path.query)
    ticket = query_params.get('ticket', [None])[0]

    if not ticket:
        print("[DEBUG WS] Connection rejected: No previous HTTP ticket.")
        await websocket.close(code=1008, reason="Ticket required for connection.")
        return

    r = await get_redis_client()
    ticket_key = f"ws:ticket:{ticket}"
    
    ticket_data_raw = await r.get(ticket_key)

    if not ticket_data_raw:
        print(f"[DEBUG WS] Connection rejected: Ticket '{ticket}' invalid or expired.")
        await websocket.close(code=1008, reason="Ticket invalid or expired.")
        return

    await r.delete(ticket_key)
    
    try:
        decoded_str = ticket_data_raw.decode('utf-8') if isinstance(ticket_data_raw, bytes) else ticket_data_raw
        ticket_data = json.loads(decoded_str)
        user_type = ticket_data.get('type', 'guest')
        ticket_user_id = ticket_data.get('user_id')
    except Exception as e:
        print(f"[DEBUG WS] Error parsing Redis ticket: {e}")
        await websocket.close(code=1008, reason="Corrupt ticket data.")
        return

    MAX_CONNECTIONS = int(os.getenv("WS_MAX_CONNECTIONS"))
    QOS_THRESHOLD = int(os.getenv("WS_QOS_THRESHOLD"))

    if len(WS_META) >= QOS_THRESHOLD:
        if user_type == 'guest':
            if len(WS_META) >= MAX_CONNECTIONS:
                print(f"[QoS] Server full. Blocking Guest connection.")
                await websocket.close(code=4001, reason="Server full. Registered users prioritized.")
                return
        else:
            if len(WS_META) >= MAX_CONNECTIONS:
                guest_to_evict = next((ws for ws, meta in WS_META.items() if meta.get('type') == 'guest'), None)
                if guest_to_evict:
                    print(f"[QoS] Evicting guest connection to prioritize user {ticket_user_id}")
                    await guest_to_evict.close(code=4001, reason="Evicted for QoS to prioritize registered users.")
                else:
                    print(f"[QoS] Server full with only registered users. Connection blocked.")
                    await websocket.close(code=1013, reason="Server at maximum capacity.")
                    return

    if canvas_id not in ROOMS:
        ROOMS[canvas_id] = set()
    
    ROOMS[canvas_id].add(websocket)
    WS_META[websocket] = {
        'canvas_id': canvas_id,
        'type': user_type,
        'user_id': ticket_user_id
    }
    
    print(f"[+] Client ({user_type}) connected to room '{canvas_id}'. Global total: {len(WS_META)}")

    lock_key = f"canvas:{canvas_id}:reset_lock"
    resize_lock_key = f"canvas:{canvas_id}:resize_lock"
    config_key = f"canvas:{canvas_id}:config"

    try:
        last_message_time = time.time()
        message_count = 0

        async for message in websocket:
            now = time.time()
            if now - last_message_time > 1.0:
                last_message_time = now
                message_count = 0
            
            message_count += 1
            if message_count > 200:
                print(f"[!] Spam detected (UserId: {ticket_user_id}). Disconnecting WS.")
                await websocket.close(code=1008, reason="Rate limit exceeded")
                return

            print(f"[DEBUG WS-PY] Received from frontend: {message}")
            try:
                data = json.loads(message)
                
                if data.get("type") == "init":
                    user_id = WS_META[websocket].get('user_id')
                    print(f"[DEBUG PY] Processing INIT request. UserId: {user_id}")
                    
                    raw_config = await r.hgetall(config_key)
                    config_batch = int(raw_config.get(b'cooldown_batch', 5))
                    config_sec = int(raw_config.get(b'cooldown_seconds', 10))
                    print(f"[DEBUG PY] Canvas config in Redis -> batch: {config_batch}, sec: {config_sec}")
                    
                    if user_id:
                        balance, last_t, _, now = await get_user_cooldown(r, canvas_id, user_id, config_batch, config_sec)
                        next_in = round(config_sec - (now - last_t), 2) if config_sec > 0 and balance < config_batch else 0
                        is_no_cooldown = await r.exists(f"user:{user_id}:perk:no_cooldown")
                        protection_left = await r.get(f"user:{user_id}:perk:protection")
                        protection_left = int(protection_left) if protection_left else 0
                        eraser_left = await r.get(f"user:{user_id}:perk:eraser")
                        eraser_left = int(eraser_left) if eraser_left else 0
                        
                        active_bomb = None
                        for b_id in ['pixel_misil_1', 'bomba_pixel_1', 'bomba_atomica_1']:
                            val = await r.get(f"user:{user_id}:perk:{b_id}")
                            if val and int(val) > 0:
                                active_bomb = b_id
                                break
                    else:
                        print(f"[DEBUG PY] Unidentified user, returning default max batch.")
                        balance = config_batch
                        next_in = 0
                        is_no_cooldown = 0
                        protection_left = 0
                        eraser_left = 0
                        active_bomb = None
                        
                    init_msg = json.dumps({
                        "type": "init_cooldown",
                        "node_id": NODE_ID,
                        "balance": int(balance),
                        "max_batch": config_batch,
                        "cooldown_sec": config_sec,
                        "next_replenish_in": next_in,
                        "perk_no_cooldown": bool(is_no_cooldown),
                        "perk_protection_left": protection_left,
                        "perk_eraser_left": eraser_left,
                        "perk_bomb_ready": active_bomb
                    })
                    print(f"[DEBUG PY] Sending INIT response to front: {init_msg}")
                    await websocket.send(init_msg)

                    current_time = int(time.time())
                    zset_key = f"canvas:{canvas_id}:protected_zset"
                    await r.zremrangebyscore(zset_key, 0, current_time)
                    protected_offsets = await r.zrange(zset_key, 0, -1)
                    if protected_offsets:
                        protected_offsets_int = [int(o) for o in protected_offsets]
                        init_prot_msg = json.dumps({
                            "type": "init_protected_pixels",
                            "offsets": protected_offsets_int
                        })
                        await websocket.send(init_prot_msg)

                elif data.get("type") == "join_live_share":
                    code = data.get("code")
                    if not code: continue
                    
                    if code not in LIVE_ROOMS:
                        LIVE_ROOMS[code] = set()
                    LIVE_ROOMS[code].add(websocket)
                    
                    print(f"[DEBUG LIVE] WS joined live session: {code}. Total: {len(LIVE_ROOMS[code])}")
                    
                elif data.get("type") == "update_live_share":
                    code = data.get("code")
                    if code and code in LIVE_ROOMS:
                        if websocket not in OWNER_CONNS:
                            OWNER_CONNS[websocket] = code
                            print(f"[DEBUG LIVE] WS registered as owner of session {code}")
                        
                        # === Update Redis Cache with the latest state ===
                        redis_key = f"live_share:{code}"
                        existing_data_str = await r.get(redis_key)
                        if existing_data_str:
                            try:
                                existing_data = json.loads(existing_data_str)
                                if data.get("empty"):
                                    existing_data["empty"] = True
                                else:
                                    existing_data["empty"] = False
                                    if data.get("x") is not None: existing_data["x"] = data.get("x")
                                    if data.get("y") is not None: existing_data["y"] = data.get("y")
                                    if data.get("w") is not None: existing_data["w"] = data.get("w")
                                    if data.get("h") is not None: existing_data["h"] = data.get("h")
                                    if data.get("opacity") is not None: existing_data["opacity"] = data.get("opacity")
                                    if data.get("angle") is not None: existing_data["angle"] = data.get("angle")
                                
                                await r.set(redis_key, json.dumps(existing_data))
                            except Exception as e:
                                print(f"[DEBUG LIVE] Error updating Redis state for {code}: {e}")

                        update_msg = json.dumps({
                            "type": "live_image_updated",
                            "code": code,
                            "empty": data.get("empty"),
                            "x": data.get("x"),
                            "y": data.get("y"),
                            "w": data.get("w"),
                            "h": data.get("h"),
                            "opacity": data.get("opacity"),
                            "angle": data.get("angle")
                        })
                        tasks = [
                            asyncio.create_task(client.send(update_msg))
                            for client in LIVE_ROOMS[code] if client != websocket
                        ]
                        if tasks:
                            await asyncio.gather(*tasks)
                        await r.publish("canvas:sync_events", json.dumps({"source_node": NODE_ID, "target_type": "live", "code": code, "payload": update_msg}))
                            
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
                        await r.publish("canvas:sync_events", json.dumps({"source_node": NODE_ID, "target_type": "live", "code": code, "payload": end_msg}))
                            
                        del LIVE_ROOMS[code]
                        await r.delete(f"live_share:{code}")
                        if websocket in OWNER_CONNS:
                            del OWNER_CONNS[websocket]
                        print(f"[DEBUG LIVE] Room {code} intentionally destroyed by owner.")

                elif data.get("type") == "pixel":
                    
                    is_locked = await r.exists(lock_key)
                    is_resize_locked = await r.exists(resize_lock_key)
                    
                    if is_locked or is_resize_locked:
                        print(f"[DEBUG PY] Canvas blocked for maintenance or expansion. Ignoring pixel.")
                        error_msg = json.dumps({
                            "type": "canvas_locked_error"
                        })
                        await websocket.send(error_msg)
                        continue 
                    
                    x = int(data.get("x", 0))
                    y = int(data.get("y", 0))
                    width = int(data.get("width", 64))
                    user_id = WS_META[websocket].get('user_id')
                    
                    raw_color = data.get("color", "transparent")
                    color_bytes = b'\x00\x00\x00\x00'
                    color_hex = "transparent"
                    
                    if isinstance(raw_color, str) and raw_color.startswith("#") and len(raw_color) == 7:
                        try:
                            r_c = int(raw_color[1:3], 16)
                            g_c = int(raw_color[3:5], 16)
                            b_c = int(raw_color[5:7], 16)
                            color_bytes = bytes([r_c, g_c, b_c, 255])
                            color_hex = raw_color.lower()
                        except ValueError:
                            continue
                    elif raw_color != "transparent":
                        # Invalid format, ignore
                        continue

                    raw_config = await r.hgetall(config_key)
                    config_batch = int(raw_config.get(b'cooldown_batch', 5))
                    config_sec = int(raw_config.get(b'cooldown_seconds', 10))

                    if not user_id:
                        print(f"[DEBUG PY] Painting attempt by unidentified user. Denied.")
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
                        if width == 0:
                            offset = f"{x},{y}"
                        else:
                            offset = (y * width) + x
                        protected_key = f"canvas:{canvas_id}:protected_pixels:{offset}"
                        protected_by = await r.get(protected_key)
                        
                        if protected_by:
                            print(f"[DEBUG PY] Pixel {x},{y} protected by user {protected_by.decode('utf-8')}")
                            
                            if width == 0:
                                chunk_x = x // 512
                                chunk_y = y // 512
                                local_x = x % 512
                                local_y = y % 512
                                redis_state_key = f"canvas:{canvas_id}:chunk:{chunk_x}:{chunk_y}"
                                byte_offset = ((local_y * 512) + local_x) * 4
                            else:
                                redis_state_key = f"canvas:{canvas_id}:state"
                                byte_offset = (y * width + x) * 4
                                
                            orig_color = await r.getrange(redis_state_key, byte_offset, byte_offset + 3)
                            
                            orig_c_hex = "transparent"
                            if orig_color and len(orig_color) == 4:
                                if orig_color[3] != 0:
                                    orig_c_hex = f"#{orig_color[0]:02x}{orig_color[1]:02x}{orig_color[2]:02x}"
                            
                            balance, last_t, user_key, now = await get_user_cooldown(r, canvas_id, user_id, config_batch, config_sec)
                            user_no_cooldown_key = f"user:{user_id}:perk:no_cooldown"
                            is_no_cooldown = await r.exists(user_no_cooldown_key)
                            user_protection_key = f"user:{user_id}:perk:protection"
                            protection_left = await r.get(user_protection_key)
                            protection_left = int(protection_left) if protection_left else 0
                            
                            user_eraser_key = f"user:{user_id}:perk:eraser"
                            eraser_left = await r.get(user_eraser_key)
                            eraser_left = int(eraser_left) if eraser_left else 0
                            
                            error_msg = json.dumps({
                                "type": "pixel_protected_error",
                                "message": "err_pixel_protected",
                                "x": x,
                                "y": y,
                                "color": orig_c_hex,
                                "balance": int(balance),
                                "max_batch": config_batch,
                                "cooldown_sec": config_sec,
                                "next_replenish_in": round(config_sec - (now - last_t), 2) if config_sec > 0 else 0,
                                "perk_no_cooldown": bool(is_no_cooldown),
                                "perk_protection_left": protection_left,
                                "perk_eraser_left": eraser_left
                            })
                            await websocket.send(error_msg)
                            continue

                        balance, last_t, user_key, now = await get_user_cooldown(r, canvas_id, user_id, config_batch, config_sec)
                        
                        user_no_cooldown_key = f"user:{user_id}:perk:no_cooldown"
                        is_no_cooldown = await r.exists(user_no_cooldown_key)

                        user_protection_key = f"user:{user_id}:perk:protection"
                        protection_left = await r.get(user_protection_key)
                        protection_left = int(protection_left) if protection_left else 0

                        user_eraser_key = f"user:{user_id}:perk:eraser"
                        eraser_left = await r.get(user_eraser_key)
                        eraser_left = int(eraser_left) if eraser_left else 0

                        if balance >= 1 or is_no_cooldown:
                            if not is_no_cooldown:
                                balance -= 1
                                print(f"[DEBUG PY] Deducting 1 pixel. Remaining balance: {balance}")
                                await r.hset(user_key, mapping={b'b': str(balance).encode(), b't': str(last_t).encode()})
                            else:
                                print(f"[DEBUG PY] no_cooldown_10s Perk active for {user_id}. Balance not deducted.")
                            
                            confirm_msg = json.dumps({
                                "type": "pixel_confirm",
                                "balance": int(balance),
                                "max_batch": config_batch,
                                "cooldown_sec": config_sec,
                                "next_replenish_in": round(config_sec - (now - last_t), 2) if config_sec > 0 else 0,
                                "perk_no_cooldown": bool(is_no_cooldown),
                                "perk_protection_left": protection_left - 1 if (color_hex != "transparent" and protection_left > 0) else protection_left,
                                "perk_eraser_left": eraser_left
                            })
                            print(f"[DEBUG PY] Confirming pixel. Msg: {confirm_msg}")
                            await websocket.send(confirm_msg)

                            if width == 0:
                                chunk_x = x // 512
                                chunk_y = y // 512
                                local_x = x % 512
                                local_y = y % 512
                                redis_state_key = f"canvas:{canvas_id}:chunk:{chunk_x}:{chunk_y}"
                                byte_offset = ((local_y * 512) + local_x) * 4
                            else:
                                redis_state_key = f"canvas:{canvas_id}:state"
                                byte_offset = (y * width + x) * 4
                                
                            await r.setrange(redis_state_key, byte_offset, color_bytes)
                            
                            stream_key = f"canvas:{canvas_id}:stream"
                            event_dict = {
                                "u": str(user_id),
                                "x": str(x),
                                "y": str(y),
                                "c": color_hex
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
                            await r.publish("canvas:sync_events", json.dumps({"source_node": NODE_ID, "target_type": "canvas", "canvas_id": canvas_id, "payload": message}))

                        else:
                            print(f"[DEBUG PY] Cooldown active. Insufficient pixels for {user_id}.")
                            user_no_cooldown_key = f"user:{user_id}:perk:no_cooldown"
                            is_no_cooldown = await r.exists(user_no_cooldown_key)

                            user_protection_key = f"user:{user_id}:perk:protection"
                            protection_left = await r.get(user_protection_key)
                            protection_left = int(protection_left) if protection_left else 0
                            
                            error_msg = json.dumps({
                                "type": "cooldown_error",
                                "balance": 0,
                                "max_batch": config_batch,
                                "cooldown_sec": config_sec,
                                "next_replenish_in": round(config_sec - (now - last_t), 2) if config_sec > 0 else 0,
                                "perk_no_cooldown": bool(is_no_cooldown),
                                "perk_protection_left": protection_left
                            })
                            await websocket.send(error_msg)

                elif data.get("type") == "protect_pixel":
                    x = int(data.get("x", 0))
                    y = int(data.get("y", 0))
                    width = int(data.get("width", 64))
                    user_id = WS_META[websocket].get('user_id')
                    
                    if not user_id:
                        continue
                        
                    if user_id not in USER_LOCKS:
                        USER_LOCKS[user_id] = asyncio.Lock()

                    async with USER_LOCKS[user_id]:
                        user_protection_key = f"user:{user_id}:perk:protection"
                        protection_left = await r.get(user_protection_key)
                        protection_left = int(protection_left) if protection_left else 0
                        
                        if protection_left > 0:
                            if width == 0:
                                offset = f"{x},{y}"
                            else:
                                offset = (y * width) + x
                            protected_key = f"canvas:{canvas_id}:protected_pixels:{offset}"
                            
                            protected_by = await r.get(protected_key)
                            if protected_by:
                                error_msg = json.dumps({
                                    "type": "pixel_protected_error",
                                    "message": "Este pÃ­xel ya estÃ¡ protegido",
                                    "perk_protection_left": protection_left
                                })
                                await websocket.send(error_msg)
                                continue

                            await r.decr(user_protection_key)
                            perks_conf = get_perks_config()
                            prot_duration = perks_conf.get('pixel_protection_25', {}).get('duration_seconds', 86400)
                            await r.setex(protected_key, prot_duration, str(user_id))
                            
                            zset_key = f"canvas:{canvas_id}:protected_zset"
                            expire_at = int(time.time()) + prot_duration
                            await r.zadd(zset_key, {str(offset): expire_at})
                            
                            confirm_msg = json.dumps({
                                "type": "pixel_confirm",
                                "perk_protection_left": protection_left - 1
                            })
                            await websocket.send(confirm_msg)
                            
                            broadcast_msg = json.dumps({
                                "type": "pixel_protected_broadcast",
                                "offset": offset,
                                "x": x,
                                "y": y
                            })
                            clients_in_room = ROOMS.get(canvas_id, set())
                            if len(clients_in_room) > 0:
                                tasks = [asyncio.create_task(client.send(broadcast_msg)) for client in clients_in_room]
                                await asyncio.gather(*tasks)
                            await r.publish("canvas:sync_events", json.dumps({"source_node": NODE_ID, "target_type": "canvas", "canvas_id": canvas_id, "payload": broadcast_msg}))
                        else:
                            error_msg = json.dumps({
                                "type": "pixel_protected_error",
                                "message": "err_no_protection_uses",
                                "perk_protection_left": 0
                            })
                            await websocket.send(error_msg)

                elif data.get("type") == "erase_pixel":
                    x = int(data.get("x", 0))
                    y = int(data.get("y", 0))
                    width = int(data.get("width", 64))
                    user_id = WS_META[websocket].get('user_id')
                    
                    if not user_id:
                        continue
                        
                    if user_id not in USER_LOCKS:
                        USER_LOCKS[user_id] = asyncio.Lock()

                    async with USER_LOCKS[user_id]:
                        user_eraser_key = f"user:{user_id}:perk:eraser"
                        eraser_left = await r.get(user_eraser_key)
                        eraser_left = int(eraser_left) if eraser_left else 0
                        
                        if eraser_left > 0:
                            if width == 0:
                                offset = f"{x},{y}"
                            else:
                                offset = (y * width) + x
                            protected_key = f"canvas:{canvas_id}:protected_pixels:{offset}"
                            
                            protected_by = await r.get(protected_key)
                            
                            if not protected_by:
                                error_msg = json.dumps({
                                    "type": "pixel_protected_error",
                                    "message": "err_pixel_not_protected",
                                    "perk_eraser_left": eraser_left
                                })
                                await websocket.send(error_msg)
                                continue
                                
                            await r.decr(user_eraser_key)
                            await r.delete(protected_key)
                            
                            if width == 0:
                                chunk_x = x // 512
                                chunk_y = y // 512
                                local_x = x % 512
                                local_y = y % 512
                                redis_state_key = f"canvas:{canvas_id}:chunk:{chunk_x}:{chunk_y}"
                                byte_offset = ((local_y * 512) + local_x) * 4
                            else:
                                redis_state_key = f"canvas:{canvas_id}:state"
                                byte_offset = (y * width + x) * 4
                            
                            await r.setrange(redis_state_key, byte_offset, b'\x00\x00\x00\x00')
                            
                            stream_key = f"canvas:{canvas_id}:stream"
                            event_dict = {
                                "u": str(user_id),
                                "x": str(x),
                                "y": str(y),
                                "c": "transparent"
                            }
                            await r.xadd(stream_key, event_dict)

                            confirm_msg = json.dumps({
                                "type": "pixel_confirm",
                                "perk_eraser_left": eraser_left - 1
                            })
                            await websocket.send(confirm_msg)
                            
                            broadcast_msg = json.dumps({
                                "type": "pixel_unprotected_broadcast",
                                "offset": offset,
                                "x": x,
                                "y": y
                            })
                            clients_in_room = ROOMS.get(canvas_id, set())
                            if len(clients_in_room) > 0:
                                tasks = [asyncio.create_task(client.send(broadcast_msg)) for client in clients_in_room]
                                await asyncio.gather(*tasks)
                            await r.publish("canvas:sync_events", json.dumps({"source_node": NODE_ID, "target_type": "canvas", "canvas_id": canvas_id, "payload": broadcast_msg}))

                            clients_in_room = ROOMS.get(canvas_id, set())
                            if len(clients_in_room) > 1:
                                broadcast_msg = json.dumps({
                                    "type": "pixel",
                                    "x": x,
                                    "y": y,
                                    "color": "transparent"
                                })
                                tasks = [
                                    asyncio.create_task(client.send(broadcast_msg))
                                    for client in clients_in_room if client != websocket
                                ]
                                if tasks:
                                    await asyncio.gather(*tasks)
                                await r.publish("canvas:sync_events", json.dumps({"source_node": NODE_ID, "target_type": "canvas", "canvas_id": canvas_id, "payload": broadcast_msg}))
                        else:
                            error_msg = json.dumps({
                                "type": "pixel_protected_error",
                                "message": "err_no_eraser_uses",
                                "perk_eraser_left": 0
                            })
                            await websocket.send(error_msg)

                elif data.get("type") == "bomb_pixel":
                    cx = int(data.get("x", 0))
                    cy = int(data.get("y", 0))
                    width = int(data.get("width", 64))
                    perk = data.get("perk")
                    user_id = WS_META[websocket].get('user_id')
                    
                    if not user_id or not perk:
                        continue
                        
                    if user_id not in USER_LOCKS:
                        USER_LOCKS[user_id] = asyncio.Lock()

                    async with USER_LOCKS[user_id]:
                        user_bomb_key = f"user:{user_id}:perk:{perk}"
                        bombs_left = await r.get(user_bomb_key)
                        bombs_left = int(bombs_left) if bombs_left else 0
                        
                        if bombs_left > 0:
                            # Leer radio dinámico de la configuración o usar defaults
                            perks_cfg = get_perks_config()
                            perk_data = perks_cfg.get(perk, {})
                            radii_cfg = perk_data.get('radii', {})
                            
                            w_str = str(width)
                            if w_str in radii_cfg:
                                radius = int(radii_cfg[w_str])
                            else:
                                # Fallback robusto en caso de que el tamaño de lienzo sea diferente a los estándar
                                if width == 0:
                                    if perk == 'pixel_misil_1': radius = 5
                                    elif perk == 'bomba_pixel_1': radius = 15
                                    elif perk == 'bomba_racimo_1': radius = 20
                                    elif perk == 'lluvia_meteoritos_1': radius = 10
                                    else: radius = 50
                                else:
                                    base_nuke = max(10, int(width * 0.23))
                                    base_racimo = max(6, int(width * 0.12))
                                    base_bomb = max(4, int(width * 0.08))
                                    base_misil = max(2, int(width * 0.03))
                                    
                                    if perk == 'pixel_misil_1' or perk == 'lluvia_meteoritos_1': radius = base_misil
                                    elif perk == 'bomba_pixel_1': radius = base_bomb
                                    elif perk == 'bomba_racimo_1': radius = base_racimo
                                    else: radius = base_nuke
                            
                            if bombs_left <= 1:
                                await r.delete(user_bomb_key)
                            else:
                                await r.decr(user_bomb_key)
                                
                            confirm_msg = json.dumps({"type": "pixel_confirm"})
                            await websocket.send(confirm_msg)
                            
                            async def execute_explosion(ex, ey, eradius, delay=0):
                                if delay > 0:
                                    await asyncio.sleep(delay)
                                    
                                pipeline = r.pipeline()
                                pipeline.sadd("canvases:dirty_states", canvas_id)
                                
                                zset_key = f"canvas:{canvas_id}:protected_zset"
                                protected_offsets = await r.zrange(zset_key, 0, -1)
                                to_remove_protected = []
                                for offset_bytes in protected_offsets:
                                    offset_str = offset_bytes.decode('utf-8')
                                    px, py = 0, 0
                                    if width == 0:
                                        if "," in offset_str:
                                            px, py = map(int, offset_str.split(","))
                                        else: continue
                                    else:
                                        off_int = int(offset_str)
                                        px = off_int % width
                                        py = off_int // width
                                    if (px - ex)**2 + (py - ey)**2 <= eradius**2:
                                        protected_key = f"canvas:{canvas_id}:protected_pixels:{offset_str}"
                                        pipeline.delete(protected_key)
                                        to_remove_protected.append(offset_bytes)
                                
                                if to_remove_protected:
                                    pipeline.zrem(zset_key, *to_remove_protected)

                                import math
                                for iy in range(ey - eradius, ey + eradius + 1):
                                    dy = iy - ey
                                    if abs(dy) > eradius: continue
                                    dx = int(math.sqrt(eradius**2 - dy**2))
                                    x_start = ex - dx
                                    x_end = ex + dx
                                    
                                    if width != 0:
                                        if iy < 0: continue
                                        x_start = max(0, x_start)
                                        x_end = min(width - 1, x_end)
                                        if x_start > x_end: continue
                                        
                                        length = x_end - x_start + 1
                                        redis_state_key = f"canvas:{canvas_id}:state"
                                        byte_offset = (iy * width + x_start) * 4
                                        pipeline.setrange(redis_state_key, byte_offset, b'\x00\x00\x00\x00' * length)
                                    else:
                                        chunk_y = iy // 512
                                        local_y = iy % 512
                                        
                                        current_x = x_start
                                        while current_x <= x_end:
                                            chunk_x = current_x // 512
                                            local_x_start = current_x % 512
                                            
                                            pixels_left_in_chunk = 512 - local_x_start
                                            pixels_to_write = min(x_end - current_x + 1, pixels_left_in_chunk)
                                            
                                            redis_state_key = f"canvas:{canvas_id}:chunk:{chunk_x}:{chunk_y}"
                                            byte_offset = ((local_y * 512) + local_x_start) * 4
                                            pipeline.setrange(redis_state_key, byte_offset, b'\x00\x00\x00\x00' * pixels_to_write)
                                            pipeline.sadd(f"canvas:{canvas_id}:dirty_chunks", f"{chunk_x}:{chunk_y}")

                                            
                                            current_x += pixels_to_write
                                
                                await pipeline.execute()
                                
                                broadcast_msg = json.dumps({
                                    "type": "bomb_pixel",
                                    "x": ex,
                                    "y": ey,
                                    "r": eradius,
                                    "perk": perk
                                })
                                clients_in_room = ROOMS.get(canvas_id, set())
                                if len(clients_in_room) > 0:
                                    tasks = [asyncio.create_task(client.send(broadcast_msg)) for client in clients_in_room]
                                    await asyncio.gather(*tasks)
                                await r.publish("canvas:sync_events", json.dumps({"source_node": NODE_ID, "target_type": "canvas", "canvas_id": canvas_id, "payload": broadcast_msg}))
                                
                                stream_key = f"canvas:{canvas_id}:stream"
                                event_dict = {
                                    "type": "bomb_pixel",
                                    "x": str(ex),
                                    "y": str(ey),
                                    "r": str(eradius),
                                    "perk": str(perk)
                                }
                                await r.xadd(stream_key, event_dict)

                            targets = data.get("targets")
                            if not targets:
                                targets = [{"x": cx, "y": cy}]

                            if perk == 'lluvia_meteoritos_1':
                                import random
                                new_targets = []
                                for _ in range(20):
                                    if width == 0:
                                        rx = cx + random.randint(-200, 200)
                                        ry = cy + random.randint(-200, 200)
                                    else:
                                        rx = max(0, min(width - 1, cx + random.randint(-int(width/2), int(width/2))))
                                        ry = max(0, min(width - 1, cy + random.randint(-int(width/2), int(width/2))))
                                    new_targets.append({"x": rx, "y": ry, "delay": random.uniform(2, 7)})
                                
                                clients_in_room = ROOMS.get(canvas_id, set())
                                for t in new_targets:
                                    warning_msg = json.dumps({
                                        "type": "nuclear_warning",
                                        "x": t["x"],
                                        "y": t["y"],
                                        "duration": t["delay"],
                                        "perk": perk
                                    })
                                    if len(clients_in_room) > 0:
                                        tasks = [asyncio.create_task(client.send(warning_msg)) for client in clients_in_room]
                                        await asyncio.gather(*tasks)
                                    await r.publish("canvas:sync_events", json.dumps({"source_node": NODE_ID, "target_type": "canvas", "canvas_id": canvas_id, "payload": warning_msg}))
                                    asyncio.create_task(execute_explosion(t["x"], t["y"], radius, t["delay"]))

                            elif perk == 'bomba_racimo_1':
                                clients_in_room = ROOMS.get(canvas_id, set())
                                for t in targets:
                                    tx = int(t.get("x", 0))
                                    ty = int(t.get("y", 0))
                                    warning_msg = json.dumps({
                                        "type": "nuclear_warning",
                                        "x": tx,
                                        "y": ty,
                                        "duration": 5,
                                        "perk": perk
                                    })
                                    if len(clients_in_room) > 0:
                                        tasks = [asyncio.create_task(client.send(warning_msg)) for client in clients_in_room]
                                        await asyncio.gather(*tasks)
                                    await r.publish("canvas:sync_events", json.dumps({"source_node": NODE_ID, "target_type": "canvas", "canvas_id": canvas_id, "payload": warning_msg}))
                                    asyncio.create_task(execute_explosion(tx, ty, radius, 5))

                            elif perk == 'bomba_atomica_1':
                                warning_msg = json.dumps({
                                    "type": "nuclear_warning",
                                    "x": cx,
                                    "y": cy,
                                    "duration": 10,
                                    "perk": perk
                                })
                                clients_in_room = ROOMS.get(canvas_id, set())
                                if len(clients_in_room) > 0:
                                    tasks = [asyncio.create_task(client.send(warning_msg)) for client in clients_in_room]
                                    await asyncio.gather(*tasks)
                                await r.publish("canvas:sync_events", json.dumps({"source_node": NODE_ID, "target_type": "canvas", "canvas_id": canvas_id, "payload": warning_msg}))
                                asyncio.create_task(execute_explosion(cx, cy, radius, 10))

                            else:
                                asyncio.create_task(execute_explosion(cx, cy, radius, 0))

                elif data.get("type") == "request_chunks":
                    import base64
                    chunks = data.get("chunks", [])
                    if isinstance(chunks, list):
                        chunks = chunks[:30] # Limit to 30 chunks per request
                    for c in chunks:
                        cx = c.get("x")
                        cy = c.get("y")
                        if cx is not None and cy is not None:
                            chunk_key = f"canvas:{canvas_id}:chunk:{cx}:{cy}"
                            chunk_data = await r.get(chunk_key)
                            
                            # Lazy load from DB if not in Redis
                            if not chunk_data:
                                db_chunk = await asyncio.to_thread(fetch_chunk_from_db, canvas_id, cx, cy)
                                if db_chunk:
                                    chunk_data = db_chunk
                                    # Cache it back in Redis for next time
                                    await r.set(chunk_key, chunk_data)

                            b64_data = ""
                            if chunk_data:
                                b64_data = base64.b64encode(chunk_data).decode('utf-8')
                            
                            chunk_msg = json.dumps({
                                "type": "chunk_data",
                                "chunk_x": cx,
                                "chunk_y": cy,
                                "state_base64": b64_data
                            })
                            await websocket.send(chunk_msg)

                elif data.get("type") == "chat_typing":
                    user_id = WS_META[websocket].get('user_id')
                    if user_id:
                        is_restricted = await r.exists(f"canvas:{canvas_id}:chat_restricted:{user_id}")
                        if is_restricted:
                            continue
                            
                        typing_msg = json.dumps({
                            "type": "chat_typing",
                            "user_id": user_id,
                            "username": data.get("username", "Alguien"),
                            "isTyping": data.get("isTyping", False)
                        })
                        clients_in_room = ROOMS.get(canvas_id, set())
                        if len(clients_in_room) > 1:
                            tasks = [asyncio.create_task(client.send(typing_msg)) for client in clients_in_room if client != websocket]
                            if tasks:
                                await asyncio.gather(*tasks)
                        await r.publish("canvas:sync_events", json.dumps({"source_node": NODE_ID, "target_type": "canvas", "canvas_id": canvas_id, "payload": typing_msg}))

            except Exception as e:
                print(f"[!] Error processing WS message or writing to Redis: {e}")

    except websockets.exceptions.ConnectionClosed:
        pass
    except Exception as e:
        print(f"[!] Unexpected error in connection: {e}")
    finally:
        if canvas_id in ROOMS and websocket in ROOMS[canvas_id]:
            ROOMS[canvas_id].remove(websocket)
            
            if len(ROOMS[canvas_id]) == 0:
                del ROOMS[canvas_id]
                print(f"[*] Room '{canvas_id}' deleted due to inactivity.")

        for code, clients in list(LIVE_ROOMS.items()):
            if websocket in clients:
                clients.remove(websocket)
                
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
            
        if websocket in WS_META:
            user_id = WS_META[websocket].get('user_id')
            del WS_META[websocket]
            print(f"[-] Client disconnected. Remaining global total: {len(WS_META)}")
            
            if user_id and user_id in USER_LOCKS:
                user_still_connected = any(meta.get('user_id') == user_id for meta in WS_META.values())
                if not user_still_connected:
                    del USER_LOCKS[user_id]
                    print(f"[-] User lock for {user_id} garbage collected.")

async def main():
    host = os.getenv("WS_HOST")
    port = int(os.getenv("WS_PORT")) if os.getenv("WS_PORT") else None
    
    print(f"Starting WebSocket server on ws://{host}:{port}")
    
    asyncio.create_task(admin_events_listener())
    asyncio.create_task(sync_events_listener())
    asyncio.create_task(sync_online_counts())
    
    async with websockets.serve(handler, host, port, max_size=524288):
        await asyncio.Future()

if __name__ == "__main__":
    asyncio.run(main())
