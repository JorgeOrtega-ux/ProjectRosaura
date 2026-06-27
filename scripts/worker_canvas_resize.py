# scripts/worker_canvas_resize.py
import os
import json
import time
import zlib
import pymysql
import redis

def get_redis_client():
    return redis.Redis(
        host=os.getenv("REDIS_HOST", "redis"),
        port=int(os.getenv("REDIS_PORT", 6379)),
        password=os.getenv("REDIS_PASS", None),
        decode_responses=False
    )

def get_db_connection():
    return pymysql.connect(
        host=os.getenv("DB_HOST", "mysql"),
        port=int(os.getenv("DB_PORT", 3306)),
        user=os.getenv("DB_USER", "root"),
        password=os.getenv("DB_PASS", "root_password"),
        database=os.getenv("DB_NAME", "canvases_db"),
        cursorclass=pymysql.cursors.DictCursor
    )

def process_resize_task(r, db, task_data):
    try:
        canvas_id = int(task_data.get('canvas_id'))
        old_size = int(task_data.get('old_size'))
        new_size = int(task_data.get('new_size'))

        print(f"[*] Iniciando redimensión del lienzo {canvas_id}. {old_size}x{old_size} -> {new_size}x{new_size}")

        state_key = f"canvas:{canvas_id}:state"
        old_state = r.get(state_key)

        if not old_state:
            print(f"[!] No se encontró el estado binario para el lienzo {canvas_id} en Redis.")
            return

        # 1. Transformación Matemática Binaria
        # Inicializamos un nuevo buffer del tamaño correcto, relleno completamente de 255 (vacío/transparente)
        new_state = bytearray([255] * (new_size * new_size))
        
        # Iteramos en el menor de los rangos para mapear los pixeles y evitar desbordamientos
        limit = min(old_size, new_size)
        
        for y in range(limit):
            for x in range(limit):
                old_idx = (y * old_size) + x
                new_idx = (y * new_size) + x
                # Transferimos el color
                new_state[new_idx] = old_state[old_idx]

        new_state_bytes = bytes(new_state)

        # 2. Reemplazamos en Redis
        r.set(state_key, new_state_bytes)

        # 3. Guardamos en MySQL
        # a) Actualizamos configuración del tamaño en la tabla principal
        with db.cursor() as cursor:
            cursor.execute("UPDATE canvases SET size = %s WHERE id = %s", (new_size, canvas_id))
            
            # b) Actualizamos el snapshot base del lienzo comprimido
            compressed_state = zlib.compress(new_state_bytes)
            cursor.execute("""
                INSERT INTO canvas_snapshots (canvas_id, snapshot_data) 
                VALUES (%s, %s)
                ON DUPLICATE KEY UPDATE snapshot_data = %s, last_updated = CURRENT_TIMESTAMP
            """, (canvas_id, compressed_state, compressed_state))
            
            db.commit()

        # 4. Limpiamos Bloqueos y Emitimos Evento de Completado a las Salas WS
        lock_key = f"canvas:{canvas_id}:resize_lock"
        r.delete(lock_key)

        completed_msg = json.dumps({
            "type": "canvas_resize_completed",
            "canvas_id": canvas_id,
            "new_size": new_size
        })
        
        r.publish("admin:canvas_events", completed_msg.encode('utf-8'))
        print(f"[+] Redimensión de lienzo {canvas_id} completada exitosamente.")

    except Exception as e:
        print(f"[!] Error procesando redimensión: {e}")
        # En caso de error severo, siempre nos aseguramos de liberar el cerrojo
        if 'canvas_id' in locals():
            try:
                r.delete(f"canvas:{canvas_id}:resize_lock")
            except:
                pass

def main():
    print("[*] Iniciando Worker de Expansión/Redimensión de Lienzos...")
    
    # Inicialización de dependencias con tolerancia a fallos
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
            # Revalidamos la conexión MySQL (evita el "MySQL has gone away" en inactividad prolongada)
            db.ping(reconnect=True)
            
            # Bloqueamos (BLPOP) hasta que exista una tarea
            # Retorna una tupla: (nombre_de_lista, valor)
            result = r.blpop(queue_key, timeout=30)
            
            if result:
                _, task_json = result
                # Decode en caso de que venga como bytes
                if isinstance(task_json, bytes):
                    task_json = task_json.decode('utf-8')
                    
                task_data = json.loads(task_json)
                process_resize_task(r, db, task_data)

        except Exception as e:
            print(f"[!] Error en el bucle principal del Worker: {e}")
            time.sleep(5)

if __name__ == "__main__":
    main()