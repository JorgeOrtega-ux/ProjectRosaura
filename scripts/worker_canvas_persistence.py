import os
import time
import json
import redis
import mysql.connector
from zlib import compress

# Configuración Redis
REDIS_HOST = os.getenv("REDIS_HOST", "redis")
REDIS_PORT = int(os.getenv("REDIS_PORT", 6379))
REDIS_PASS = os.getenv("REDIS_PASS", None)

# Configuración MySQL (Para los Snapshots)
DB_HOST = os.getenv("DB_HOST", "db")
DB_USER = os.getenv("DB_USER", "system_web_executor")
DB_PASS = os.getenv("DB_PASS", "secret")
DB_NAME = os.getenv("DB_CANVASES_NAME", "db_canvases")

# Configuración Worker
SYNC_INTERVAL = int(os.getenv("WORKER_TIMELAPSE_SYNC_INTERVAL", 5)) # Frecuencia del loop
BATCH_SIZE = int(os.getenv("WORKER_TIMELAPSE_BATCH_SIZE", 5000))    # Píxeles por archivo de golpe
TIMELAPSE_DIR = os.getenv("TIMELAPSE_DIR", "/app/storage/canvases/timelapses")

CONSUMER_GROUP = "timelapse_workers"
CONSUMER_NAME = "worker-1"

def get_db_connection():
    try:
        return mysql.connector.connect(
            host=DB_HOST,
            user=DB_USER,
            password=DB_PASS,
            database=DB_NAME
        )
    except Exception as e:
        print(f"[!] Error conectando a MySQL: {e}")
        return None

def main():
    print("[*] Iniciando Worker de Persistencia (Archivos + DB)...")
    
    # Asegurar que el directorio físico exista
    os.makedirs(TIMELAPSE_DIR, exist_ok=True)
    
    try:
        r = redis.Redis(
            host=REDIS_HOST, 
            port=REDIS_PORT, 
            password=REDIS_PASS, 
            db=0, 
            decode_responses=False
        )
        r.ping()
        print("[+] Conectado a Redis exitosamente.")
    except Exception as e:
        print(f"[!] No se pudo conectar a Redis: {e}")
        return

    while True:
        
        # =========================================================
        # 1. PROCESAR HISTORIAL DE PÍXELES (REDIS STREAMS -> .JSONL)
        # =========================================================
        try:
            # Buscar todos los streams de lienzos activos
            keys = r.keys("canvas:*:stream")
            streams = {}
            
            for key in keys:
                stream_name = key.decode('utf-8')
                # Intentar crear el grupo de consumo (si ya existe, ignora el error)
                try:
                    r.xgroup_create(stream_name, CONSUMER_GROUP, id='0', mkstream=True)
                except redis.exceptions.ResponseError as e:
                    if "BUSYGROUP" not in str(e):
                        print(f"[!] Error creando grupo para {stream_name}: {e}")
                
                streams[stream_name] = '>' # '>' indica que queremos mensajes nuevos
            
            if streams:
                # Leer múltiples streams de golpe
                messages = r.xreadgroup(CONSUMER_GROUP, CONSUMER_NAME, streams, count=BATCH_SIZE, block=1000)
                
                for stream_name_b, msgs in messages:
                    if not msgs:
                        continue
                        
                    stream_name = stream_name_b.decode('utf-8')
                    canvas_id = stream_name.split(":")[1]
                    file_path = os.path.join(TIMELAPSE_DIR, f"canvas_{canvas_id}.jsonl")
                    
                    # Batch Append al archivo físico
                    with open(file_path, "a", encoding="utf-8") as f:
                        for msg_id_b, msg_data_b in msgs:
                            msg_id = msg_id_b.decode('utf-8') # El ID generado por Redis (incluye timestamp)
                            
                            # Decodificar el payload binario a string
                            event = {k.decode('utf-8'): v.decode('utf-8') for k, v in msg_data_b.items()}
                            event["_id"] = msg_id # Inyectar el id/timestamp para el frontend
                            
                            f.write(json.dumps(event) + "\n")
                    
                    # Confirmar a Redis que ya guardamos estos eventos en el disco
                    msg_ids = [msg_id_b for msg_id_b, _ in msgs]
                    r.xack(stream_name, CONSUMER_GROUP, *msg_ids)
                    
                    # Eliminar físicamente los mensajes procesados de la memoria RAM de Redis
                    r.xdel(stream_name, *msg_ids)
                    
                    print(f"[+] Escritos y confirmados {len(msgs)} eventos al archivo de timelapse del canvas {canvas_id}.")
        
        except Exception as e:
            print(f"[!] Error procesando Streams a disco: {e}")


        # =========================================================
        # 2. PROCESAR SNAPSHOTS MAESTROS (REDIS STATE -> MYSQL BLOB)
        # =========================================================
        db_conn = get_db_connection()
        if db_conn:
            cursor = db_conn.cursor()
            try:
                keys_state = r.keys("canvas:*:state")
                for key in keys_state:
                    canvas_id_str = key.decode('utf-8').split(":")[1]
                    canvas_bytes = r.get(key)
                    
                    if canvas_bytes:
                        compressed_data = compress(canvas_bytes)
                        query = """
                            INSERT INTO canvas_snapshots (canvas_id, snapshot_data) 
                            VALUES (%s, %s)
                            ON DUPLICATE KEY UPDATE snapshot_data = VALUES(snapshot_data), last_updated = CURRENT_TIMESTAMP
                        """
                        cursor.execute(query, (canvas_id_str, compressed_data))
                        
                        # Registrar el ID del lienzo en el Set de pendientes para el worker de imágenes
                        r.sadd("canvases:pending_snapshots", canvas_id_str)
                
                db_conn.commit()
                # print(f"[+] Snapshots sincronizados.") # Descomentar para debug intenso
            except Exception as e:
                print(f"[!] Error guardando Snapshots en DB: {e}")
                db_conn.rollback()
            finally:
                cursor.close()
                db_conn.close()
        else:
            print("[!] MySQL inaccesible, pero los archivos .jsonl continúan guardándose (Modo Tolerancia a Fallos).")

        # Dormir hasta el siguiente ciclo
        time.sleep(SYNC_INTERVAL)

if __name__ == "__main__":
    main()