# scripts/worker_metrics.py
import os
import time
import redis
import mysql.connector
from mysql.connector import Error
from dotenv import load_dotenv

# Obtener ruta absoluta al .env
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
load_dotenv(os.path.join(BASE_DIR, '.env'))

# Configuración
SYNC_INTERVAL_SECONDS = 5 # Frecuencia con la que vuelca a BD. 5 segundos es ideal para sensación "en vivo".

def get_redis_connection():
    try:
        r = redis.Redis(
            host=os.getenv('REDIS_HOST', '127.0.0.1'),
            port=int(os.getenv('REDIS_PORT', 6379)),
            password=os.getenv('REDIS_PASS', None),
            decode_responses=True
        )
        r.ping()
        return r
    except redis.ConnectionError as e:
        print(f"[!] Error conectando a Redis: {e}")
        return None

def get_db_connection():
    try:
        conn = mysql.connector.connect(
            host=os.getenv('DB_HOST', '127.0.0.1'),
            user=os.getenv('DB_USER', 'root'),
            password=os.getenv('DB_PASS', ''),
            database=os.getenv('DB_NAME', 'projectrosaura')
        )
        return conn
    except Error as e:
        print(f"[!] Error conectando a MySQL: {e}")
        return None

def process_pending_views():
    r = get_redis_connection()
    if not r:
        return

    keys_to_process = []
    for key in r.scan_iter(match='video:views:*'):
        keys_to_process.append(key)

    if not keys_to_process:
        return 

    views_data = {}
    
    pipe = r.pipeline()
    for key in keys_to_process:
        video_id = int(key.split(':')[-1])
        pipe.execute_command('GETDEL', key)

    results = pipe.execute()

    for idx, key in enumerate(keys_to_process):
        video_id = int(key.split(':')[-1])
        val = results[idx]
        if val is not None:
            views_data[video_id] = int(val)

    if not views_data:
        return

    db = get_db_connection()
    if not db:
        print("[!] No se pudo procesar las visitas por error de BD.")
        return

    try:
        cursor = db.cursor()
        for vid, new_views in views_data.items():
            if new_views > 0:
                query = "UPDATE videos SET views = views + %s WHERE id = %s"
                cursor.execute(query, (new_views, vid))
        
        db.commit()
        print(f"[+] Sincronizadas visitas de {len(views_data)} videos a la Base de Datos.")
        
    except Error as e:
        print(f"[!] Error actualizando MySQL: {e}")
        db.rollback()
    finally:
        if db.is_connected():
            cursor.close()
            db.close()

def process_pending_comment_reactions():
    r = get_redis_connection()
    if not r:
        return

    pending_comments = r.smembers('pending_comment_reactions')
    if not pending_comments:
        return

    db = get_db_connection()
    if not db:
        print("[!] No se pudo procesar reacciones por error de BD.")
        return

    try:
        cursor = db.cursor()
        
        for comment_id in pending_comments:
            counters_key = f"comment:{comment_id}:counters"
            counters = r.hgetall(counters_key)
            if counters:
                likes = int(counters.get('like', 0))
                dislikes = int(counters.get('dislike', 0))
                
                update_query = "UPDATE video_comments SET likes = %s, dislikes = %s WHERE id = %s"
                cursor.execute(update_query, (likes, dislikes, comment_id))
            
            sync_users_key = f"comment:{comment_id}:sync_users"
            users_to_sync = r.smembers(sync_users_key)
            reaction_key = f"comment:{comment_id}:user_reaction"
            
            for user_id in users_to_sync:
                user_reaction = r.hget(reaction_key, user_id)
                
                if user_reaction:
                    upsert_query = """
                        INSERT INTO comment_reactions (comment_id, user_id, reaction_type)
                        VALUES (%s, %s, %s)
                        ON DUPLICATE KEY UPDATE reaction_type = VALUES(reaction_type)
                    """
                    cursor.execute(upsert_query, (comment_id, user_id, user_reaction))
                else:
                    del_query = "DELETE FROM comment_reactions WHERE comment_id = %s AND user_id = %s"
                    cursor.execute(del_query, (comment_id, user_id))
            
            r.delete(sync_users_key)
            
        r.delete('pending_comment_reactions')
        db.commit()
        print(f"[+] Sincronizadas reacciones de {len(pending_comments)} comentarios a la BD.")

    except Error as e:
        print(f"[!] Error actualizando MySQL comment reactions: {e}")
        db.rollback()
    finally:
        if db.is_connected():
            cursor.close()
            db.close()

if __name__ == "__main__":
    print(f"[*] Worker de Métricas Iniciado. Sincronizando cada {SYNC_INTERVAL_SECONDS} segundos.")
    while True:
        try:
            process_pending_views()
            process_pending_comment_reactions()
        except Exception as e:
            print(f"[!] Error crítico en el Worker: {e}")
        
        time.sleep(SYNC_INTERVAL_SECONDS)