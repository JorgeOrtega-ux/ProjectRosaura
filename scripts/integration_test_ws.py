import asyncio
import websockets
import redis
import json
import os
import sys

async def run_test():
    # 1. Connect to Redis to insert the ticket
    redis_host = os.environ.get("REDIS_HOST", "redis")
    redis_port = int(os.environ.get("REDIS_PORT", 6379))
    redis_pass = os.environ.get("REDIS_PASS", "")
    
    print(f"Connecting to Redis at {redis_host}:{redis_port}...")
    r = redis.Redis(host=redis_host, port=redis_port, password=redis_pass, decode_responses=True)
    
    r.ping()
    print("Redis connected successfully.")
    
    ticket = "test_ticket_12345"
    ticket_key = f"ws:ticket:{ticket}"
    ticket_data = {
        "type": "auth",
        "user_id": 1,
        "username": "test_user"
    }
    
    r.set(ticket_key, json.dumps(ticket_data), ex=60)
    print(f"Stored ticket '{ticket}' in Redis.")

    # 2. Connect to WebSocket server
    ws_url = f"ws://rosaura_websocket_node_rust:8765/canvas/1?ticket={ticket}"
    print(f"Connecting to WebSocket at {ws_url}...")
    
    async with websockets.connect(ws_url) as websocket:
        print("Connected to WebSocket server.")
        
        # Send init message immediately
        init_msg = {
            "type": "init"
        }
        await websocket.send(json.dumps(init_msg))
        print("Sent 'init' action immediately on connection.")
        
        # Send bomb_pixel message
        bomb_msg = {
            "type": "bomb_pixel",
            "perk": "bomba_pixel_1",
            "x": 10,
            "y": 10
        }
        await websocket.send(json.dumps(bomb_msg))
        print("Sent 'bomb_pixel' action with perk 'bomba_pixel_1'.")
        
        # Loop to receive messages until we get the response for bomb_pixel
        bomb_response_received = False
        while not bomb_response_received:
            response = await asyncio.wait_for(websocket.recv(), timeout=5.0)
            print(f"Received from server: {response}")
            data = json.loads(response)
            msg_type = data.get("type")
            if msg_type == "pixel_confirm":
                print("TEST SUCCESS: Perk was successfully consumed and confirmed by the WebSocket server!")
                bomb_response_received = True
            elif msg_type == "pixel_protected_error" and data.get("message") == "err_perk_not_owned":
                print("TEST SUCCESS: Server returned err_perk_not_owned, verifying the HTTP call was executed and returned false!")
                bomb_response_received = True

if __name__ == "__main__":
    asyncio.run(run_test())
