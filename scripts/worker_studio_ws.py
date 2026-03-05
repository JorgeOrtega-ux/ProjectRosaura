# scripts/worker_studio_ws.py

import asyncio
import websockets
import logging

# Configuración básica de logs en la terminal
logging.basicConfig(
    level=logging.INFO, 
    format='%(asctime)s - %(levelname)s - [Studio WS] %(message)s'
)

# CORRECCIÓN: Quitamos el parámetro 'path' ya que la versión reciente 
# de la librería websockets solo envía el objeto 'websocket'
async def studio_connection_handler(websocket):
    """
    Controlador que se ejecuta por cada cliente que entra a la sección /studio
    """
    # remote_address es una tupla (IP, puerto)
    client_ip = websocket.remote_address[0] if websocket.remote_address else "Desconocida"
    logging.info(f"Nuevo cliente conectado desde: {client_ip}")
    
    try:
        # Bucle para mantener viva la conexión y escuchar mensajes del cliente
        async for message in websocket:
            logging.info(f"Mensaje recibido de {client_ip}: {message}")
            
            # Ejemplo de eco: regresar una respuesta básica al cliente
            await websocket.send(f"Servidor Python recibió: {message}")
            
    except websockets.exceptions.ConnectionClosedOK:
        logging.info(f"El cliente {client_ip} se desconectó voluntariamente (salió de /studio).")
    except websockets.exceptions.ConnectionClosedError as e:
        logging.warning(f"La conexión con {client_ip} se cerró inesperadamente: {e}")
    except Exception as e:
        logging.error(f"Error con el cliente {client_ip}: {e}")
    finally:
        logging.info(f"Conexión finalizada y limpiada para {client_ip}")

async def main():
    # 0.0.0.0 permite conexiones desde la red local (ej. 192.168.8.13)
    host = "0.0.0.0"
    port = 8765
    
    logging.info(f"Iniciando servidor WebSocket para ProjectRosaura Studio en ws://{host}:{port}")
    
    # Inicia el servidor WebSocket
    async with websockets.serve(studio_connection_handler, host, port):
        # Mantiene el bucle de eventos corriendo para siempre
        await asyncio.Future()

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logging.info("Servidor WebSocket detenido manualmente.")