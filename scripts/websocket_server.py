import asyncio
import websockets
import os
from dotenv import load_dotenv

ENV_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '.env'))
load_dotenv(dotenv_path=ENV_PATH)

import json
import time
import uuid
from urllib.parse import urlparse, parse_qs
import redis.asyncio as redis
import mysql.connector
import zlib
import gzip

from mysql.connector import pooling

PAINT_PIXEL_LUA = """
local protected_by = redis.call('GET', KEYS[2])
if protected_by then
    return {'PROTECTED_ERROR', protected_by}
end

local config_batch = tonumber(ARGV[3])
local config_sec = tonumber(ARGV[4])
local now = tonumber(ARGV[5])

local u_state = redis.call('HMGET', KEYS[3], 'b', 't', 'mb')
local balance = config_batch
local last_t = now

if u_state[1] then
    balance = tonumber(u_state[1]) or config_batch
    last_t = tonumber(u_state[2]) or now
    local old_mb = tonumber(u_state[3] or '0')
    if old_mb > 0 and old_mb < config_batch and balance >= old_mb then
        balance = config_batch
    end
end

if config_sec > 0 then
    local elapsed = now - last_t
    local replenish = math.floor(elapsed / config_sec)
    if replenish > 0 then
        balance = math.min(config_batch, balance + replenish)
        last_t = last_t + (replenish * config_sec)
    end
end

if balance >= config_batch then
    last_t = now
end

local is_no_cooldown = redis.call('EXISTS', KEYS[4])
local prot_left = tonumber(redis.call('GET', KEYS[5]) or '0')
local eraser_left = tonumber(redis.call('GET', KEYS[6]) or '0')

if balance >= 1 or is_no_cooldown == 1 then
    if is_no_cooldown == 0 then
        balance = balance - 1
        redis.call('HMSET', KEYS[3], 'b', tostring(balance), 't', tostring(last_t), 'mb', tostring(config_batch))
    end
    
    redis.call('SETRANGE', KEYS[1], tonumber(ARGV[1]), ARGV[2])
    redis.call('XADD', KEYS[7], '*', 'u', ARGV[6], 'x', ARGV[7], 'y', ARGV[8], 'c', ARGV[9])
    
    return {'OK', tostring(balance), tostring(last_t), tostring(is_no_cooldown), tostring(prot_left), tostring(eraser_left)}
else
    return {'COOLDOWN_ERROR', tostring(balance), tostring(last_t), tostring(is_no_cooldown), tostring(prot_left), tostring(eraser_left)}
end
"""


# Global connection pool for chunks
DB_POOL = None

IS_DOCKER = os.path.exists('/.dockerenv') or os.getenv('DOCKER_CONTAINER') == 'true'

def get_db_pool():
    global DB_POOL
    if DB_POOL is None:
        try:
            db_host = os.getenv("DB_HOST", "db" if IS_DOCKER else "127.0.0.1")
            if not IS_DOCKER and db_host == "db":
                db_host = "127.0.0.1"
            DB_POOL = pooling.MySQLConnectionPool(
                pool_name="chunk_pool",
                pool_size=32,
                pool_reset_session=True,
                host=db_host,
                user=os.getenv("DB_USER"),
                password=os.getenv("DB_PASS"),
                database=os.getenv("DB_CANVASES_NAME")
            )
        except Exception as e:
            print(f"[!] Error creating DB pool: {e}")
    return DB_POOL

def consume_user_perk(user_id, perk_id):
    try:
        pool = get_db_pool()
        if not pool:
            print("[!] consume_user_perk: DB pool is unavailable")
            return False
        db = pool.get_connection()
        cursor = db.cursor()
        identity_db = os.getenv("DB_IDENTITY_NAME") or "db_identity"
        
        query_sel = f"SELECT id FROM `{identity_db}`.`user_perks` WHERE user_id = %s AND perk_id = %s AND is_used = 0 ORDER BY created_at ASC LIMIT 1"
        cursor.execute(query_sel, (user_id, perk_id))
        row = cursor.fetchone()
        
        if row:
            perk_row_id = row[0]
            query_upd = f"UPDATE `{identity_db}`.`user_perks` SET is_used = 1, used_at = NOW() WHERE id = %s AND is_used = 0"
            cursor.execute(query_upd, (perk_row_id,))
            db.commit()
            affected = cursor.rowcount
            cursor.close()
            db.close()
            return affected > 0
            
        cursor.close()
        db.close()
        print(f"[!] consume_user_perk: No unused perk found for user_id={user_id}, perk_id={perk_id} in {identity_db}.user_perks")
        return False
    except Exception as e:
        print(f"[!] Error consuming perk {perk_id} for user {user_id}: {e}")
        return False

def fetch_canvas_config_from_db(canvas_id):
    try:
        pool = get_db_pool()
        if not pool:
            return 5, 10
        db = pool.get_connection()
        cursor = db.cursor(dictionary=True)
        tbl_canvases = os.getenv("DB_CANVASES_NAME", "db_canvases")
        cursor.execute(f"SELECT cooldown_pixels_batch, cooldown_seconds, is_locked FROM `{tbl_canvases}`.`canvases` WHERE id = %s LIMIT 1", (canvas_id,))
        row = cursor.fetchone()
        cursor.close()
        db.close()
        if row:
            batch = int(row.get('cooldown_pixels_batch') or 5)
            sec = int(row.get('cooldown_seconds') or 10)
            is_locked = int(row.get('is_locked') or 0)
            return batch, sec, is_locked
    except Exception as e:
        print(f"[!] Error fetching canvas config from DB: {e}")
    return 5, 10

async def get_canvas_config(r, canvas_id):
    config_key = f"canvas:{canvas_id}:config"
    raw_config = await r.hgetall(config_key)
    if raw_config and b'cooldown_batch' in raw_config:
        batch = int(raw_config[b'cooldown_batch'])
        sec = int(raw_config.get(b'cooldown_seconds', b'10'))
        is_locked = int(raw_config.get(b'is_locked', b'0'))
        return batch, sec, is_locked
    
    batch, sec, is_locked = await asyncio.to_thread(fetch_canvas_config_from_db, canvas_id)
    await r.hset(config_key, mapping={'cooldown_batch': str(batch), 'cooldown_seconds': str(sec), 'is_locked': str(is_locked)})
    return batch, sec, is_locked

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
        redis_host = os.getenv("REDIS_HOST", "redis" if IS_DOCKER else "127.0.0.1")
        if not IS_DOCKER and redis_host == "redis":
            redis_host = "127.0.0.1"
        redis_port = int(os.getenv("REDIS_PORT")) if os.getenv("REDIS_PORT") else 6379
        redis_pass = os.getenv("REDIS_PASS")
        
        print(f"[DEBUG REDIS] Connecting to redis on {redis_host}:{redis_port}")
        REDIS_CLIENT = redis.Redis(
            host=redis_host, 
            port=redis_port, 
            password=redis_pass,
            db=0,
            socket_keepalive=True,
            retry_on_timeout=True
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
            old_mb = float(u_state.get(b'mb', balance))
            if old_mb > 0 and old_mb < float(config_batch) and balance >= old_mb:
                balance = float(config_batch)
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
        balance = float(config_batch)
        last_t = now 

    await r.hset(user_key, mapping={'b': str(balance), 't': str(last_t), 'mb': str(config_batch)})
            
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
                    
                    if canvas_id in ROOMS and ROOMS[canvas_id]:
                        websockets.broadcast(ROOMS[canvas_id], json.dumps(data))
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
                        if canvas_id in ROOMS and ROOMS[canvas_id]:
                            websockets.broadcast(ROOMS[canvas_id], payload)
                                
                    elif target_type == "live":
                        code = str(data.get("code"))
                        if code in LIVE_ROOMS and LIVE_ROOMS[code]:
                            websockets.broadcast(LIVE_ROOMS[code], payload)
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
    origin = websocket.request.headers.get("Origin")
    app_url = os.getenv("APP_URL").rstrip("/") if os.getenv("APP_URL") else ""
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

    MAX_CONNECTIONS = int(os.getenv("WS_MAX_CONNECTIONS") or 1000)
    QOS_THRESHOLD = int(os.getenv("WS_QOS_THRESHOLD") or 800)

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
                    
                    config_batch, config_sec, _ = await get_canvas_config(r, canvas_id)
                    print(f"[DEBUG PY] Canvas config -> batch: {config_batch}, sec: {config_sec}")
                    
                    if user_id:
                        balance, last_t, _, now = await get_user_cooldown(r, canvas_id, user_id, config_batch, config_sec)
                        next_in = round(config_sec - (now - last_t), 2) if config_sec > 0 and balance < config_batch else 0
                        is_no_cooldown = await r.exists(f"user:{user_id}:perk:no_cooldown")
                        protection_left = await r.get(f"user:{user_id}:perk:protection")
                        protection_left = int(protection_left) if protection_left else 0
                        eraser_left = await r.get(f"user:{user_id}:perk:eraser")
                        eraser_left = int(eraser_left) if eraser_left else 0
                    else:
                        print(f"[DEBUG PY] Unidentified user, returning default max batch.")
                        balance = config_batch
                        next_in = 0
                        is_no_cooldown = 0
                        protection_left = 0
                        eraser_left = 0
                        
                    init_msg = json.dumps({
                        "type": "init_cooldown",
                        "node_id": NODE_ID,
                        "balance": int(balance),
                        "max_batch": config_batch,
                        "cooldown_sec": config_sec,
                        "next_replenish_in": next_in,
                        "perk_no_cooldown": bool(is_no_cooldown),
                        "perk_protection_left": protection_left,
                        "perk_eraser_left": eraser_left
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
                        recipients = LIVE_ROOMS[code] - {websocket}
                        if recipients:
                            websockets.broadcast(recipients, update_msg)
                        await r.publish("canvas:sync_events", json.dumps({"source_node": NODE_ID, "target_type": "live", "code": code, "payload": update_msg}))
                            
                elif data.get("type") == "end_live_share":
                    code = data.get("code")
                    if code and code in LIVE_ROOMS:
                        end_msg = json.dumps({
                            "type": "live_session_ended",
                            "code": code
                        })
                        recipients = LIVE_ROOMS[code] - {websocket}
                        if recipients:
                            websockets.broadcast(recipients, end_msg)
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

                    config_batch, config_sec, is_premium_locked = await get_canvas_config(r, canvas_id)

                    if is_premium_locked:
                        print(f"[DEBUG PY] Canvas {canvas_id} is premium locked. Ignoring pixel.")
                        error_msg = json.dumps({
                            "type": "canvas_locked_error"
                        })
                        await websocket.send(error_msg)
                        continue

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

                        now = time.time()
                        byte_offset = (y * width + x) * 4
                        offset = f"{x},{y}" if width == 0 else (y * width) + x

                        keys = [
                            f"canvas:{canvas_id}:state",
                            f"canvas:{canvas_id}:protected_pixels:{offset}",
                            f"canvas:{canvas_id}:user:{user_id}:cooldown",
                            f"user:{user_id}:perk:no_cooldown",
                            f"user:{user_id}:perk:protection",
                            f"user:{user_id}:perk:eraser",
                            f"canvas:{canvas_id}:stream"
                        ]

                        args = [
                            str(byte_offset),
                            color_bytes,
                            str(config_batch),
                            str(config_sec),
                            str(now),
                            str(user_id),
                            str(x),
                            str(y),
                            color_hex
                        ]

                        res = await r.eval(PAINT_PIXEL_LUA, 7, *keys, *args)

                        if res and len(res) > 0:
                            status = res[0].decode('utf-8') if isinstance(res[0], bytes) else res[0]
                            
                            if status == "PROTECTED_ERROR":
                                protected_by = res[1].decode('utf-8') if isinstance(res[1], bytes) else res[1]
                                print(f"[DEBUG PY] Pixel {x},{y} protected by user {protected_by}")
                                
                                redis_state_key = f"canvas:{canvas_id}:state"
                                orig_color = await r.getrange(redis_state_key, byte_offset, byte_offset + 3)
                                
                                orig_c_hex = "transparent"
                                if orig_color and len(orig_color) == 4 and orig_color[3] != 0:
                                    orig_c_hex = f"#{orig_color[0]:02x}{orig_color[1]:02x}{orig_color[2]:02x}"
                                
                                balance, last_t, user_key, now_t = await get_user_cooldown(r, canvas_id, user_id, config_batch, config_sec)
                                is_no_cooldown = await r.exists(f"user:{user_id}:perk:no_cooldown")
                                protection_left = await r.get(f"user:{user_id}:perk:protection")
                                protection_left = int(protection_left) if protection_left else 0
                                eraser_left = await r.get(f"user:{user_id}:perk:eraser")
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
                                    "next_replenish_in": round(config_sec - (now_t - last_t), 2) if config_sec > 0 else 0,
                                    "perk_no_cooldown": bool(is_no_cooldown),
                                    "perk_protection_left": protection_left,
                                    "perk_eraser_left": eraser_left
                                })
                                await websocket.send(error_msg)
                                continue

                            elif status == "OK":
                                balance = float(res[1].decode('utf-8') if isinstance(res[1], bytes) else res[1])
                                last_t = float(res[2].decode('utf-8') if isinstance(res[2], bytes) else res[2])
                                is_no_cooldown = bool(int(res[3].decode('utf-8') if isinstance(res[3], bytes) else res[3]))
                                protection_left = int(res[4].decode('utf-8') if isinstance(res[4], bytes) else res[4])
                                eraser_left = int(res[5].decode('utf-8') if isinstance(res[5], bytes) else res[5])

                                confirm_msg = json.dumps({
                                    "type": "pixel_confirm",
                                    "balance": int(balance),
                                    "max_batch": config_batch,
                                    "cooldown_sec": config_sec,
                                    "next_replenish_in": round(config_sec - (now - last_t), 2) if config_sec > 0 else 0,
                                    "perk_no_cooldown": is_no_cooldown,
                                    "perk_protection_left": protection_left - 1 if (color_hex != "transparent" and protection_left > 0) else protection_left,
                                    "perk_eraser_left": eraser_left
                                })
                                await websocket.send(confirm_msg)

                                clients_in_room = ROOMS.get(canvas_id, set()) - {websocket}
                                if clients_in_room:
                                    websockets.broadcast(clients_in_room, message)
                                await r.publish("canvas:sync_events", json.dumps({"source_node": NODE_ID, "target_type": "canvas", "canvas_id": canvas_id, "payload": message}))

                            elif status == "COOLDOWN_ERROR":
                                balance = float(res[1].decode('utf-8') if isinstance(res[1], bytes) else res[1])
                                last_t = float(res[2].decode('utf-8') if isinstance(res[2], bytes) else res[2])
                                is_no_cooldown = bool(int(res[3].decode('utf-8') if isinstance(res[3], bytes) else res[3]))
                                protection_left = int(res[4].decode('utf-8') if isinstance(res[4], bytes) else res[4])

                                error_msg = json.dumps({
                                    "type": "cooldown_error",
                                    "balance": 0,
                                    "max_batch": config_batch,
                                    "cooldown_sec": config_sec,
                                    "next_replenish_in": round(config_sec - (now - last_t), 2) if config_sec > 0 else 0,
                                    "perk_no_cooldown": is_no_cooldown,
                                    "perk_protection_left": protection_left
                                })
                                await websocket.send(error_msg)

                elif data.get("type") == "batch_pixels":
                    is_locked = await r.exists(lock_key)
                    is_resize_locked = await r.exists(resize_lock_key)
                    if is_locked or is_resize_locked:
                        await websocket.send(json.dumps({"type": "canvas_locked_error"}))
                        continue

                    pixels_list = data.get("pixels", [])
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
                        continue

                    if not user_id or not pixels_list:
                        continue

                    config_batch, config_sec = await get_canvas_config(r, canvas_id)

                    if user_id not in USER_LOCKS:
                        USER_LOCKS[user_id] = asyncio.Lock()

                    async with USER_LOCKS[user_id]:
                        for px in pixels_list:
                            x = int(px.get("x", 0))
                            y = int(px.get("y", 0))
                            offset = (y * width) + x
                            protected_key = f"canvas:{canvas_id}:protected_pixels:{offset}"
                            protected_by = await r.get(protected_key)
                            if protected_by:
                                continue

                            now_t = time.time()
                            byte_offset = (y * width + x) * 4
                            keys = [
                                f"canvas:{canvas_id}:state",
                                protected_key,
                                f"canvas:{canvas_id}:user:{user_id}:cooldown",
                                f"user:{user_id}:perk:no_cooldown",
                                f"user:{user_id}:perk:protection",
                                f"user:{user_id}:perk:eraser",
                                f"canvas:{canvas_id}:stream"
                            ]
                            args = [
                                str(byte_offset),
                                color_bytes,
                                str(config_batch),
                                str(config_sec),
                                str(now_t),
                                str(user_id),
                                str(x),
                                str(y),
                                color_hex
                            ]
                            await r.eval(PAINT_PIXEL_LUA, 7, *keys, *args)

                        clients_in_room = ROOMS.get(canvas_id, set()) - {websocket}
                        broadcast_msg = json.dumps({
                            "type": "batch_pixels",
                            "pixels": pixels_list,
                            "color": color_hex
                        })
                        if clients_in_room:
                            websockets.broadcast(clients_in_room, broadcast_msg)
                        await r.publish("canvas:sync_events", json.dumps({"source_node": NODE_ID, "target_type": "canvas", "canvas_id": canvas_id, "payload": broadcast_msg}))

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
                        
                        if protection_left <= 0:
                            has_pkg = await asyncio.to_thread(consume_user_perk, user_id, "pixel_protection_25")
                            if has_pkg:
                                protection_left = 25
                                perks_conf = get_perks_config()
                                prot_duration = perks_conf.get('pixel_protection_25', {}).get('duration_seconds', 86400)
                                await r.setex(user_protection_key, prot_duration, "25")
                            else:
                                error_msg = json.dumps({
                                    "type": "pixel_protected_error",
                                    "message": "err_no_protection_uses",
                                    "perk_protection_left": 0
                                })
                                await websocket.send(error_msg)
                                continue

                        if width == 0:
                            offset = f"{x},{y}"
                        else:
                            offset = (y * width) + x
                        protected_key = f"canvas:{canvas_id}:protected_pixels:{offset}"
                        
                        protected_by = await r.get(protected_key)
                        if protected_by:
                            error_msg = json.dumps({
                                "type": "pixel_protected_error",
                                "message": "Este píxel ya está protegido",
                                "perk_protection_left": protection_left
                            })
                            await websocket.send(error_msg)
                            continue

                        await r.decr(user_protection_key)
                        if (protection_left - 1) <= 0:
                            await r.delete(user_protection_key)
                        perks_conf = get_perks_config()
                        prot_duration = perks_conf.get('pixel_protection_25', {}).get('duration_seconds', 86400)
                        await r.setex(protected_key, prot_duration, str(user_id))
                        
                        zset_key = f"canvas:{canvas_id}:protected_zset"
                        expire_at = int(time.time()) + prot_duration
                        await r.zadd(zset_key, {str(offset): expire_at})
                        
                        confirm_msg = json.dumps({
                            "type": "pixel_confirm",
                            "perk_protection_left": max(0, protection_left - 1)
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
                        
                        if eraser_left <= 0:
                            has_pkg = await asyncio.to_thread(consume_user_perk, user_id, "elite_eraser_25")
                            if has_pkg:
                                eraser_left = 25
                                perks_conf = get_perks_config()
                                eraser_duration = perks_conf.get('elite_eraser_25', {}).get('duration_seconds', 86400)
                                await r.setex(user_eraser_key, eraser_duration, "25")
                            else:
                                error_msg = json.dumps({
                                    "type": "pixel_protected_error",
                                    "message": "err_no_eraser_uses",
                                    "perk_eraser_left": 0
                                })
                                await websocket.send(error_msg)
                                continue

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
                        if (eraser_left - 1) <= 0:
                            await r.delete(user_eraser_key)
                        await r.delete(protected_key)
                        
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
                            "perk_eraser_left": max(0, eraser_left - 1)
                        })
                        await websocket.send(confirm_msg)
                        
                        broadcast_msg = json.dumps({
                            "type": "pixel_unprotected_broadcast",
                            "offset": offset,
                            "x": x,
                            "y": y
                        })
                        clients_in_room = ROOMS.get(canvas_id, set())
                        if clients_in_room:
                            websockets.broadcast(clients_in_room, broadcast_msg)
                        await r.publish("canvas:sync_events", json.dumps({"source_node": NODE_ID, "target_type": "canvas", "canvas_id": canvas_id, "payload": broadcast_msg}))

                        recipients = clients_in_room - {websocket}
                        if recipients:
                            broadcast_msg_pixel = json.dumps({
                                "type": "pixel",
                                "x": x,
                                "y": y,
                                "color": "transparent"
                            })
                            websockets.broadcast(recipients, broadcast_msg_pixel)
                            await r.publish("canvas:sync_events", json.dumps({"source_node": NODE_ID, "target_type": "canvas", "canvas_id": canvas_id, "payload": broadcast_msg_pixel}))

                elif data.get("type") == "bomb_pixel":
                    cx = int(data.get("x", 0))
                    cy = int(data.get("y", 0))
                    width = int(data.get("width", 64))
                    height = int(data.get("height", width))
                    perk = data.get("perk")
                    user_id = WS_META[websocket].get('user_id') or data.get('userId') or 'guest'
                    
                    print(f"[PY-BOMB] Bomb request received -> User: {user_id}, Perk: {perk}, Canvas: {canvas_id} ({width}x{height}) at ({cx}, {cy})")

                    if not perk:
                        print(f"[PY-BOMB] Rejected: Missing perk parameter.")
                        continue
                        
                    if user_id not in USER_LOCKS:
                        USER_LOCKS[user_id] = asyncio.Lock()

                    async with USER_LOCKS[user_id]:
                        has_perk = True
                        if user_id != 'guest':
                            has_perk = await asyncio.to_thread(consume_user_perk, user_id, perk)
                        
                        if has_perk:
                            # Leer radio dinámico de la configuración o usar defaults
                            perks_cfg = get_perks_config()
                            perk_data = perks_cfg.get(perk, {})
                            radii_cfg = perk_data.get('radii', {})
                            
                            w_str = str(width)
                            if w_str in radii_cfg:
                                radius = int(radii_cfg[w_str])
                            else:
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

                            print(f"[PY-BOMB] Bomb authorized! -> User: {user_id}, Perk: {perk}, Radius: {radius}. Broadcasting warning.")
                            
                            warning_msg = json.dumps({
                                "type": "nuclear_warning",
                                "x": cx,
                                "y": cy,
                                "radius": radius,
                                "duration": perk_data.get("warning_seconds", 3),
                                "perk": perk
                            })
                            clients_in_room = ROOMS.get(canvas_id, set())
                            if clients_in_room:
                                websockets.broadcast(clients_in_room, warning_msg)
                                
                            confirm_msg = json.dumps({"type": "pixel_confirm"})
                            await websocket.send(confirm_msg)
                            
                            async def execute_explosion(ex, ey, eradius, delay=0):
                                try:
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
                                        if height > 0 and (iy < 0 or iy >= height): continue
                                        x_start = max(0, x_start)
                                        x_end = min(width - 1, x_end) if width > 0 else x_end
                                        if x_start > x_end: continue
                                        
                                        length = x_end - x_start + 1
                                        redis_state_key = f"canvas:{canvas_id}:state"
                                        byte_offset = (iy * width + x_start) * 4
                                        pipeline.setrange(redis_state_key, byte_offset, b'\x00\x00\x00\x00' * length)
                                    
                                    await pipeline.execute()
                                    
                                    broadcast_msg = json.dumps({
                                        "type": "bomb_pixel",
                                        "x": ex,
                                        "y": ey,
                                        "r": eradius,
                                        "perk": perk
                                    })
                                    clients_in_room = ROOMS.get(canvas_id, set())
                                    if clients_in_room:
                                        websockets.broadcast(clients_in_room, broadcast_msg)
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
                                except Exception as e:
                                    print(f"[!] Error in execute_explosion: {e}")

                            targets = data.get("targets")
                            if not targets:
                                targets = [{"x": cx, "y": cy}]

                            perk_config = get_perks_config().get(perk, {})
                            warning_duration = perk_config.get("warning_seconds", 0)
                            spawning_cfg = perk_config.get("spawning", {})
                            spawn_mode = spawning_cfg.get("mode", "direct")
                            spawn_count = int(spawning_cfg.get("count", 1))
                            spread_radius = int(spawning_cfg.get("spread_radius", 200))
                            jitter_delay = float(spawning_cfg.get("jitter_delay", 0.0))

                            spawned_targets = []

                            if spawn_mode == "random_around":
                                import random
                                import math
                                max_dist = spread_radius if width == 0 else int(width/2)
                                for _ in range(spawn_count):
                                    angle = random.uniform(0, 2 * math.pi)
                                    radial_r = max_dist * math.sqrt(random.uniform(0.05, 1.0))
                                    rx = int(cx + radial_r * math.cos(angle))
                                    ry = int(cy + radial_r * math.sin(angle))
                                    if width != 0:
                                        rx = max(0, min(width - 1, rx))
                                        ry = max(0, min(width - 1, ry))
                                    delay = warning_duration + (random.uniform(0, jitter_delay) if jitter_delay > 0 else 0)
                                    spawned_targets.append({"x": rx, "y": ry, "delay": delay})
                            else:
                                import random
                                for t in targets:
                                    tx = int(t.get("x", 0))
                                    ty = int(t.get("y", 0))
                                    delay = warning_duration + (random.uniform(0, jitter_delay) if jitter_delay > 0 else 0)
                                    spawned_targets.append({"x": tx, "y": ty, "delay": delay})

                            clients_in_room = ROOMS.get(canvas_id, set())
                            for st in spawned_targets:
                                tx = st["x"]
                                ty = st["y"]
                                delay = st["delay"]

                                if warning_duration > 0:
                                    warning_msg = json.dumps({
                                        "type": "nuclear_warning",
                                        "x": tx,
                                        "y": ty,
                                        "duration": warning_duration,
                                        "perk": perk,
                                        "radius": radius
                                    })
                                    if clients_in_room:
                                        websockets.broadcast(clients_in_room, warning_msg)
                                    await r.publish("canvas:sync_events", json.dumps({"source_node": NODE_ID, "target_type": "canvas", "canvas_id": canvas_id, "payload": warning_msg}))

                                asyncio.create_task(execute_explosion(tx, ty, radius, delay))
                        else:
                            error_msg = json.dumps({
                                "type": "pixel_protected_error",
                                "message": "err_perk_not_owned"
                            })
                            await websocket.send(error_msg)

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
                        clients_in_room = ROOMS.get(canvas_id, set()) - {websocket}
                        if clients_in_room:
                            websockets.broadcast(clients_in_room, typing_msg)
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
                    if clients:
                        websockets.broadcast(clients, end_msg)
                        
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
