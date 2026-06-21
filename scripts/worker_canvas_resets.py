import os
import time
import json
import redis
import mysql.connector
import zlib
from datetime import datetime, timezone

# Configuración Redis
REDIS_HOST = os.getenv("REDIS_HOST", "redis")
REDIS_PORT = int(os.getenv("REDIS_PORT", 6379))
REDIS_PASS = os.getenv("REDIS_PASS", None)

# Configuración MySQL
DB_HOST = os.getenv("DB_HOST", "db")
DB_USER = os.getenv("DB_USER", "system_web_executor")
DB_PASS = os.getenv("DB_PASS", "secret")
DB_NAME = os.getenv("DB_CANVASES_NAME", "db_canvases")

# Intervalo de revisión (Recomendado 10 segundos)
SYNC_INTERVAL = int(os.getenv("WORKER_RESETS_SYNC_INTERVAL", 10))

def get_db_connection():
    try:
        return mysql.connector.connect(
            host=DB_HOST,
            user=DB_USER,
            password=DB_PASS,
            database=DB_NAME
        )
    except Exception as e:
        print(f"[!] Error conectando a MySQL en Resets Worker: {e}")
        return None

def process_canvas_reset(r, db_conn, row):
    canvas_id, is_active, next_reset_at, take_snapshot, timer_action, canvas_size = row
    
    print(f"[*] Iniciando secuencia de reinicio para el lienzo {canvas_id}...")
    
    # 1. Aplicar Bloqueo (Evita trazos fantasma en el WS y otras mutaciones)
    lock_key = f"canvas:{canvas_id}:reset_lock"
    r.setex(lock_key, 300, "1") # Candado de seguridad (Máx 5 minutos)
    
    # 2. Avisar a los clientes (vía WS) para que muestren el overlay de bloqueo
    lock_event = {
        "type": "canvas_locked",
        "canvas_id": canvas_id
    }
    r.publish("admin:canvas_events", json.dumps(lock_event))
    time.sleep(1) # Pequeño margen para que la red aplique el bloqueo visual a los usuarios
    
    cursor = db_conn.cursor()
    
    try:
        # 3. Forzar sincronización de Redis a MySQL antes del Snapshot (Para que la foto sea la última versión)
        state_key = f"canvas:{canvas_id}:state"
        current_state = r.get(state_key)
        
        if current_state:
            compressed_state = zlib.compress(current_state)
            sync_query = """
                INSERT INTO canvas_snapshots (canvas_id, snapshot_data, last_updated)
                VALUES (%s, %s, CURRENT_TIMESTAMP)
                ON DUPLICATE KEY UPDATE snapshot_data = %s, last_updated = CURRENT_TIMESTAMP
            """
            cursor.execute(sync_query, (canvas_id, compressed_state, compressed_state))
            db_conn.commit()

        # 4. Solicitar el Snapshot si está activado
        if take_snapshot:
            print(f"    - Solicitando Snapshot HQ para el lienzo {canvas_id}...")
            r.sadd("canvases:pending_snapshots", canvas_id)
            
            # Esperamos activamente la confirmación (Polling) del worker de snapshots
            snapshot_done_key = f"canvas:{canvas_id}:snapshot_done"
            waited = 0
            while not r.exists(snapshot_done_key) and waited < 60:
                time.sleep(1)
                waited += 1
                
            if r.exists(snapshot_done_key):
                print(f"    - Snapshot confirmado. Procediendo a borrar.")
                r.delete(snapshot_done_key)
            else:
                print(f"    - [!] Timeout esperando al worker de snapshots. Limpiando de todas formas.")

        # 5. Generar lienzo limpio (Todo a 255)
        try:
            size_int = int(canvas_size.split('x')[0]) if 'x' in canvas_size else int(canvas_size)
        except:
            size_int = 64
            
        total_pixels = size_int * size_int
        empty_state = bytes([255] * total_pixels)
        compressed_empty = zlib.compress(empty_state)
        
        # 6. Borrar la Base de Datos y Redis
        print(f"    - Limpiando MySQL y Redis...")
        
        # Actualizamos la foto en BD a un lienzo en blanco
        wipe_query = """
            INSERT INTO canvas_snapshots (canvas_id, snapshot_data, last_updated)
            VALUES (%s, %s, CURRENT_TIMESTAMP)
            ON DUPLICATE KEY UPDATE snapshot_data = %s, last_updated = CURRENT_TIMESTAMP
        """
        cursor.execute(wipe_query, (canvas_id, compressed_empty, compressed_empty))
        
        # Desactivamos el reinicio programado (para que no se cicle)
        off_query = "UPDATE canvas_reset_settings SET is_active = 0 WHERE canvas_id = %s"
        cursor.execute(off_query, (canvas_id,))
        db_conn.commit()
        
        # Vaciamos la memoria RAM
        r.set(state_key, empty_state) # Metemos el estado vacío para evitar consultas a DB
        r.delete(f"canvas:next_reset:{canvas_id}")
        
        # 7. Liberar el candado y notificar éxito al cliente
        print(f"    - Operación completada. Desbloqueando lienzo.")
        r.delete(lock_key)
        
        clear_event = {
            "type": "canvas_cleared",
            "canvas_id": canvas_id,
            "next_reset_at": None # Instruye al cliente a ocultar o detener el temporizador
        }
        r.publish("admin:canvas_events", json.dumps(clear_event))

    except Exception as e:
        print(f"    - [!] Error fatal durante la orquestación del reinicio: {e}")
        db_conn.rollback()
        r.delete(lock_key) # Liberamos como fallback
    finally:
        cursor.close()

def main():
    print("[*] Iniciando Worker de Reinicios Programados (Cron & Limpieza)...")
    
    try:
        r = redis.Redis(
            host=REDIS_HOST, 
            port=REDIS_PORT, 
            password=REDIS_PASS, 
            db=0
        )
        r.ping()
        print("[+] Conectado a Redis exitosamente.")
    except Exception as e:
        print(f"[!] No se pudo conectar a Redis: {e}")
        return

    while True:
        try:
            db_conn = get_db_connection()
            if db_conn:
                cursor = db_conn.cursor()
                
                # Buscamos lienzos que: 
                # 1. Tengan la configuración activa
                # 2. Su fecha programada (UTC) sea igual o menor a este momento (UTC)
                query = """
                    SELECT r.canvas_id, r.is_active, r.next_reset_at, r.take_snapshot, r.timer_action, c.size 
                    FROM canvas_reset_settings r
                    JOIN canvases c ON r.canvas_id = c.id
                    WHERE r.is_active = 1 
                    AND r.next_reset_at <= UTC_TIMESTAMP()
                """
                cursor.execute(query)
                pending_resets = cursor.fetchall()
                
                for row in pending_resets:
                    process_canvas_reset(r, db_conn, row)
                    
                cursor.close()
                db_conn.close()
                
        except Exception as e:
            print(f"[!] Error en el ciclo principal del Resets Worker: {e}")

        time.sleep(SYNC_INTERVAL)

if __name__ == "__main__":
    main()