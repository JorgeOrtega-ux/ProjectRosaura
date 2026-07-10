import os
import time
import json
import redis
import mysql.connector

REDIS_HOST = os.getenv("REDIS_HOST", "redis")
REDIS_PORT = int(os.getenv("REDIS_PORT", 6379))
REDIS_PASS = os.getenv("REDIS_PASS", None)

DB_HOST = os.getenv("DB_HOST", "db")
DB_USER = os.getenv("DB_USER", "system_web_executor")
DB_PASS = os.getenv("DB_PASS", "secret")
DB_NAME = os.getenv("DB_CANVASES_NAME", "db_canvases")

SYNC_INTERVAL = int(os.getenv("WORKER_CHAT_SYNC_INTERVAL", 2)) # Frecuencia del loop (2 segundos es rapido y permite lotes)
BATCH_SIZE = int(os.getenv("WORKER_CHAT_BATCH_SIZE", 50))      # Maximos mensajes por transaccion

def get_db_connection():
    try:
        return mysql.connector.connect(
            host=DB_HOST,
            user=DB_USER,
            password=DB_PASS,
            database=DB_NAME
        )
    except Exception as e:
        print(f"[!] Error connecting to MySQL: {e}")
        return None

def main():
    print("[*] Starting Chat Persistence Worker...")
    
    try:
        r = redis.Redis(
            host=REDIS_HOST, 
            port=REDIS_PORT, 
            password=REDIS_PASS, 
            db=0, 
            decode_responses=False
        )
        r.ping()
        print("[+] Connected to Redis successfully.")
    except Exception as e:
        print(f"[!] Could not connect to Redis: {e}")
        return

    while True:
        try:
            # Intentamos obtener multiples mensajes. 
            # BLPOP extraeria de a uno bloqueando, pero si queremos lotes es mejor leer el size.
            queue_len = r.llen('canvas_chat_queue')
            
            if queue_len > 0:
                # Tomamos hasta BATCH_SIZE
                limit = min(queue_len, BATCH_SIZE)
                
                # Obtenemos los mensajes
                raw_messages = r.lrange('canvas_chat_queue', 0, limit - 1)
                
                if raw_messages:
                    # Conectar a la DB si tenemos mensajes
                    db_conn = get_db_connection()
                    if db_conn:
                        cursor = db_conn.cursor()
                        try:
                            # Preparamos los datos para executemany
                            insert_data = []
                            for raw_msg in raw_messages:
                                msg_data = json.loads(raw_msg.decode('utf-8'))
                                # (canvas_id, user_id, message, attachments, created_at)
                                insert_data.append((
                                    msg_data['canvas_id'],
                                    msg_data['user_id'],
                                    msg_data['message'],
                                    msg_data['attachments'],
                                    msg_data['created_at']
                                ))
                            
                            query = """
                                INSERT INTO canvas_chat_messages (canvas_id, user_id, message, attachments, created_at) 
                                VALUES (%s, %s, %s, %s, %s)
                            """
                            cursor.executemany(query, insert_data)
                            db_conn.commit()
                            
                            # Si insertamos con exito en MySQL, eliminamos ese batch exacto de Redis
                            r.ltrim('canvas_chat_queue', limit, -1)
                            
                            print(f"[+] Bulk inserted {len(insert_data)} chat messages into MySQL.")
                        
                        except Exception as e:
                            print(f"[!] Error bulk inserting chat to DB: {e}")
                            db_conn.rollback()
                        finally:
                            cursor.close()
                            db_conn.close()
                    else:
                        print("[!] MySQL inaccessible, keeping messages in Redis queue...")
                        
        except Exception as e:
            print(f"[!] Error processing chat messages from Redis: {e}")

        # Sleep the defined interval to allow queue to build up
        time.sleep(SYNC_INTERVAL)

if __name__ == "__main__":
    main()
