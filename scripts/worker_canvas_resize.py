# scripts/worker_canvas_resize.py
import os
import json
import time
import zlib
import pymysql
import redis
import traceback # AGREGADO PARA LOGS PROFUNDOS

def get_redis_client():
    return redis.Redis(
        host=os.getenv("REDIS_HOST", "redis"),
        port=int(os.getenv("REDIS_PORT", 6379)),
        password=os.getenv("REDIS_PASS", None),
        decode_responses=False
    )

def get_db_connection():
    # Alineado exactamente con la arquitectura de tu .env
    return pymysql.connect(
        host=os.getenv("DB_HOST", "db"),
        port=int(os.getenv("DB_PORT", 3306)),
        user=os.getenv("DB_USER", "system_web_executor"),
        password=os.getenv("DB_PASS", ""),
        database=os.getenv("DB_CANVASES_NAME", "db_canvases"), # <-- AQUÍ ESTABA EL ERROR
        cursorclass=pymysql.cursors.DictCursor
    )

def process_resize_task(r, db, task_data):
    try:
        print(f"\n==============================================")
        print(f"[WORKER LOG] === NUEVA TAREA RECIBIDA ===")
        print(f"[WORKER LOG] Payload recibido: {task_data}")
        
        canvas_id = int(task_data.get('canvas_id'))
        old_size = int(task_data.get('old_size'))
        new_size = int(task_data.get('new_size'))

        print(f"[WORKER LOG] Preparando lienzo {canvas_id}. {old_size}x{old_size} -> {new_size}x{new_size}")

        state_key = f"canvas:{canvas_id}:state"
        print(f"[WORKER LOG] Buscando estado en Redis: {state_key}")
        old_state = r.get(state_key)

        if not old_state:
            raise ValueError(f"No se encontró el estado binario para el lienzo {canvas_id} en Redis.")

        print(f"[WORKER LOG] Estado obtenido. Bytes recibidos: {len(old_state)}. Esperados: {old_size * old_size}")
        
        # Validamos que el estado antiguo no esté corrupto para evitar IndexError
        expected_size = old_size * old_size
        if len(old_state) < expected_size:
            raise ValueError(f"El estado en Redis está corrupto. Tamaño esperado: {expected_size}, actual: {len(old_state)}.")

        # 1. Transformación Matemática Binaria
        print(f"[WORKER LOG] Iniciando mapeo matemático de pixeles...")
        new_state = bytearray([255] * (new_size * new_size))
        limit = min(old_size, new_size)
        
        for y in range(limit):
            for x in range(limit):
                old_idx = (y * old_size) + x
                new_idx = (y * new_size) + x
                new_state[new_idx] = old_state[old_idx]

        new_state_bytes = bytes(new_state)
        print(f"[WORKER LOG] Mapeo finalizado. Nuevo tamaño de matriz: {len(new_state_bytes)} bytes")

        # 2. Reemplazamos en Redis
        print(f"[WORKER LOG] Guardando nueva matriz en Redis...")
        r.set(state_key, new_state_bytes)

        # 3. Guardamos en MySQL
        print(f"[WORKER LOG] Comprimiendo matriz con Zlib y guardando en MySQL...")
        with db.cursor() as cursor:
            cursor.execute("UPDATE canvases SET size = %s WHERE id = %s", (new_size, canvas_id))
            
            compressed_state = zlib.compress(new_state_bytes)
            cursor.execute("""
                INSERT INTO canvas_snapshots (canvas_id, snapshot_data) 
                VALUES (%s, %s)
                ON DUPLICATE KEY UPDATE snapshot_data = %s, last_updated = CURRENT_TIMESTAMP
            """, (canvas_id, compressed_state, compressed_state))
            
            db.commit()
            print(f"[WORKER LOG] MySQL actualizado exitosamente.")

        # 4. Limpiamos Bloqueos y Emitimos Evento
        lock_key = f"canvas:{canvas_id}:resize_lock"
        r.delete(lock_key)

        completed_msg = json.dumps({
            "type": "canvas_resize_completed",
            "canvas_id": canvas_id,
            "new_size": new_size
        })
        
        print(f"[WORKER LOG] Emitiendo señal a WebSockets (PubSub: admin:canvas_events)...")
        r.publish("admin:canvas_events", completed_msg.encode('utf-8'))
        print(f"[WORKER LOG] === REDIMENSIÓN FINALIZADA OK ===")
        print(f"==============================================\n")

    except Exception as e:
        print(f"\n[!!! ERROR CRÍTICO EN WORKER DE REDIMENSIÓN !!!]")
        print(f"Tipo de error: {type(e).__name__}")
        print(f"Mensaje: {str(e)}")
        print(f"Traceback detallado:")
        traceback.print_exc()
        
        # En caso de error severo, intentamos notificar al frontend
        if 'canvas_id' in locals():
            try:
                print(f"[WORKER LOG] Intentando liberar frontend de la pantalla de carga infinita...")
                r.delete(f"canvas:{canvas_id}:resize_lock")
                
                error_msg = json.dumps({
                    "type": "canvas_resize_error",
                    "canvas_id": canvas_id,
                    "error": f"Error del Servidor: {type(e).__name__} - {str(e)}"
                })
                r.publish("admin:canvas_events", error_msg.encode('utf-8'))
                print(f"[WORKER LOG] Evento de error enviado a PubSub.")
            except Exception as cleanup_error:
                print(f"[!!!] Fallo catastrófico al intentar limpiar cerrojos: {cleanup_error}")
        print(f"==============================================\n")

def main():
    print("[*] Iniciando Worker de Expansión/Redimensión de Lienzos con LOGS DETALLADOS...")
    
    while True:
        try:
            r = get_redis_client()
            r.ping()
            
            db = get_db_connection()
            db.ping(reconnect=True)
            print("[+] Conectado a Redis y MySQL correctamente.")
            break
        except Exception as e:
            print(f"[!] Esperando servicios (Redis/MySQL)... {e}")
            time.sleep(5)

    queue_key = "canvases:pending_resizes"

    while True:
        try:
            db.ping(reconnect=True)
            
            # Bloqueamos (BLPOP) hasta que exista una tarea
            result = r.blpop(queue_key, timeout=30)
            
            if result:
                _, task_json = result
                if isinstance(task_json, bytes):
                    task_json = task_json.decode('utf-8')
                    
                task_data = json.loads(task_json)
                process_resize_task(r, db, task_data)

        except Exception as e:
            print(f"[!] Error en el bucle principal del Worker (BLPOP fallido): {e}")
            traceback.print_exc()
            time.sleep(5)

if __name__ == "__main__":
    main()