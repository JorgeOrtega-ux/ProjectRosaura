import asyncio
import websockets
import os
import json
from urllib.parse import urlparse

# Diccionario en memoria para gestionar las salas
# Estructura: { "canvas_id": { client1, client2, ... } }
ROOMS = {}

async def handler(websocket):
    """
    Maneja la conexión de un cliente, su asignación a una sala y la retransmisión de mensajes.
    En websockets v14+, el path se lee desde websocket.request.path
    """
    # Leer la ruta desde el request del websocket
    path = websocket.request.path
    
    # Parsear la ruta para extraer el ID del lienzo
    parsed_path = urlparse(path)
    path_parts = parsed_path.path.strip("/").split("/")

    # Validar que la conexión tiene la estructura correcta (/canvas/<canvas_id>)
    if len(path_parts) != 2 or path_parts[0] != "canvas":
        await websocket.close(code=1008, reason="Ruta inválida. Utilice el formato: /canvas/<canvas_id>")
        return

    canvas_id = path_parts[1]

    # Registrar al cliente en la sala correspondiente
    if canvas_id not in ROOMS:
        ROOMS[canvas_id] = set()
    
    ROOMS[canvas_id].add(websocket)
    print(f"[+] Cliente conectado a la sala '{canvas_id}'. Total en sala: {len(ROOMS[canvas_id])}")

    try:
        # Bucle principal para escuchar mensajes del cliente
        async for message in websocket:
            # Recuperar todos los clientes de la sala actual
            clients_in_room = ROOMS.get(canvas_id, set())
            
            # Hacer broadcast (retransmitir) a todos MENOS al emisor original
            if len(clients_in_room) > 1:
                # Se crean las tareas de envío asíncrono
                tasks = [
                    asyncio.create_task(client.send(message))
                    for client in clients_in_room if client != websocket
                ]
                
                # Ejecutar todas las tareas de envío en paralelo
                if tasks:
                    await asyncio.gather(*tasks)

    except websockets.exceptions.ConnectionClosed:
        # Este error es normal cuando el cliente cierra la pestaña o pierde conexión
        pass
    except Exception as e:
        print(f"[!] Error inesperado en la conexión: {e}")
    finally:
        # Bloque de limpieza: se ejecuta siempre al desconectarse el cliente
        if canvas_id in ROOMS and websocket in ROOMS[canvas_id]:
            ROOMS[canvas_id].remove(websocket)
            print(f"[-] Cliente desconectado de la sala '{canvas_id}'. Total en sala: {len(ROOMS[canvas_id])}")
            
            # Si la sala queda vacía, la eliminamos de memoria para evitar memory leaks
            if len(ROOMS[canvas_id]) == 0:
                del ROOMS[canvas_id]
                print(f"[*] Sala '{canvas_id}' eliminada por inactividad.")

async def main():
    # Cargar variables de entorno con fallbacks seguros
    host = os.getenv("WS_HOST", "0.0.0.0")
    port = int(os.getenv("WS_PORT", 8765))
    
    print(f"Iniciando servidor WebSocket en ws://{host}:{port}")
    
    # Iniciar el servidor asíncrono
    async with websockets.serve(handler, host, port):
        # Mantener el proceso vivo indefinidamente
        await asyncio.Future()

if __name__ == "__main__":
    # Ejecutar el event loop de asyncio
    asyncio.run(main())