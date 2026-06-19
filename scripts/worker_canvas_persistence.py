import os
import time
import json
import redis
import mysql.connector
from zlib import compress

# Configuración Redis
REDIS_HOST = os.getenv("REDIS_HOST", "redis")
REDIS_PORT = int(os.getenv("REDIS_PORT", 6379))

# Configuración MySQL
DB_HOST = os.getenv("DB_HOST", "mysql")
DB_USER = os.getenv("DB_USER", "system_web_executor")
DB_PASS = os.getenv("DB_PASSWORD", "secret") # Ajustar según .env
DB_NAME = os.getenv("DB_NAME", "db_canvases")

SYNC_INTERVAL = 60 # Segundos de espera entre cada guardado maestro

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
    print("[*] Iniciando Worker de Persistencia de Lienzos...")
    
    try:
        # decode_responses=False para poder leer los bytes crudos del lienzo
        r = redis.Redis(host=REDIS_HOST, port=REDIS_PORT, db=0, decode_responses=False)
        r.ping()
        print("[+] Conectado a Redis exitosamente.")
    except Exception as e:
        print(f"[!] No se pudo conectar a Redis: {e}")
        return

    while True:
        db_conn = get_db_connection()
        if not db_conn:
            time.sleep(10)
            continue
        
        cursor = db_conn.cursor()

        try:
            # 1. PROCESAR HISTORIAL DE PÍXELES EN LOTES (BATCH)
            logs_to_insert = []
            while True:
                log_item = r.rpop("canvas_logs_queue")
                if not log_item:
                    break
                
                log_data = json.loads(log_item.decode('utf-8'))
                logs_to_insert.append((
                    log_data['canvas_id'],
                    log_data.get('user_id'),
                    log_data['x'],
                    log_data['y'],
                    log_data['color_index']
                ))
                
                # Insertar en bloques de 500 para eficiencia
                if len(logs_to_insert) >= 500:
                    break

            if logs_to_insert:
                cursor.executemany(
                    "INSERT INTO canvas_logs (canvas_id, user_id, x, y, color_index) VALUES (%s, %s, %s, %s, %s)",
                    logs_to_insert
                )
                db_conn.commit()
                print(f"[+] Guardados {len(logs_to_insert)} eventos de píxel en el historial.")

            # 2. PROCESAR SNAPSHOTS MAESTROS (LONGBLOB)
            keys = r.keys("canvas:*:state")
            for key in keys:
                canvas_id_str = key.decode('utf-8').split(":")[1]
                canvas_bytes = r.get(key)
                
                if canvas_bytes:
                    # Comprimir los bytes crudos reduce drásticamente el peso en DB
                    compressed_data = compress(canvas_bytes)
                    
                    query = """
                        INSERT INTO canvas_snapshots (canvas_id, snapshot_data) 
                        VALUES (%s, %s)
                        ON DUPLICATE KEY UPDATE snapshot_data = VALUES(snapshot_data), last_updated = CURRENT_TIMESTAMP
                    """
                    cursor.execute(query, (canvas_id_str, compressed_data))
            
            db_conn.commit()
            if keys:
                print(f"[+] Snapshots sincronizados para {len(keys)} lienzos activos.")

        except Exception as e:
            print(f"[!] Error durante el ciclo de sincronización: {e}")
            db_conn.rollback()
        finally:
            cursor.close()
            db_conn.close()

        # Esperar hasta el próximo ciclo de guardado en frío
        time.sleep(SYNC_INTERVAL)

if __name__ == "__main__":
    main()