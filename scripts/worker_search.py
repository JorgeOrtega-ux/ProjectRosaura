# scripts/worker_search.py
import redis
import meilisearch
import pymysql
import json
import os
import time
from dotenv import load_dotenv

# Cargar variables de entorno
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

# Configuración Redis
REDIS_HOST = os.getenv('REDIS_HOST', '127.0.0.1')
REDIS_PORT = int(os.getenv('REDIS_PORT', 6379))
REDIS_PASS = os.getenv('REDIS_PASS', None)

# Configuración Base de Datos
DB_HOST = os.getenv('DB_HOST', '127.0.0.1')
DB_NAME = os.getenv('DB_NAME', 'projectrosaura')
DB_USER = os.getenv('DB_USER', 'root')
DB_PASS = os.getenv('DB_PASS', '')

# Configuración Meilisearch
MEILI_HOST = os.getenv('MEILISEARCH_HOST', 'http://127.0.0.1:7700')
MEILI_KEY = os.getenv('MEILISEARCH_MASTER_KEY', '')

QUEUE_NAME = 'queue:search_sync'

def get_db_connection():
    return pymysql.connect(
        host=DB_HOST, user=DB_USER, password=DB_PASS, database=DB_NAME,
        cursorclass=pymysql.cursors.DictCursor
    )

def get_redis_connection():
    return redis.Redis(host=REDIS_HOST, port=REDIS_PORT, password=REDIS_PASS, decode_responses=True)

def get_meili_client():
    return meilisearch.Client(MEILI_HOST, MEILI_KEY)

def fetch_video_data(db, video_id):
    with db.cursor() as cursor:
        # Obtener datos base del video y su canal
        sql = """
            SELECT v.id, v.uuid AS id_video, v.user_id, v.title, v.description, 
                   v.thumbnail_path, v.thumbnail_dominant_color, v.hls_path, v.duration, v.views, 
                   UNIX_TIMESTAMP(v.created_at) as created_at, v.status, v.visibility,
                   u.username AS channel_name, u.channel_identifier AS channel_handle, u.profile_picture AS avatar_path
            FROM videos v
            JOIN users u ON v.user_id = u.id
            WHERE v.id = %s
        """
        cursor.execute(sql, (video_id,))
        video = cursor.fetchone()
        
        if not video:
            return None

        # Obtener tags, categorías y modelos
        sql_tags = """
            SELECT COALESCE(t.name, vt.custom_tag_name) as name, COALESCE(t.type, vt.custom_tag_type) as type
            FROM video_tags vt
            LEFT JOIN tags t ON vt.tag_id = t.id
            WHERE vt.video_id = %s
        """
        cursor.execute(sql_tags, (video_id,))
        tags_raw = cursor.fetchall()

        video['category'] = [t['name'] for t in tags_raw if t['type'] == 'category']
        video['models'] = [t['name'] for t in tags_raw if t['type'] == 'modelo']
        video['tags'] = [t['name'] for t in tags_raw if t['type'] == 'custom']

        return video

def fetch_channel_data(db, user_id):
    with db.cursor() as cursor:
        sql = """
            SELECT id, username, channel_identifier AS handle, profile_picture AS avatar_path, channel_description AS description, user_status
            FROM users WHERE id = %s
        """
        cursor.execute(sql, (user_id,))
        return cursor.fetchone()

def process_message(msg_data, db, meili):
    action = msg_data.get('action')
    entity_type = msg_data.get('type')
    entity_id = msg_data.get('id')

    print(f"[{time.strftime('%Y-%m-%d %H:%M:%S')}] Procesando: {entity_type} | Acción: {action} | ID: {entity_id}")

    if entity_type == 'video':
        if action == 'upsert':
            video = fetch_video_data(db, entity_id)
            if video and video['status'] == 'published' and video['visibility'] == 'public':
                meili.index('videos').add_documents([video], primary_key='id')
                print(f"   -> Video {entity_id} indexado en Meilisearch.")
            else:
                # Si no es público o fue despublicado, asegurar que no esté en el buscador
                meili.index('videos').delete_document(entity_id)
                print(f"   -> Video {entity_id} eliminado de Meilisearch (no es público).")
        
        elif action == 'delete':
            meili.index('videos').delete_document(entity_id)
            print(f"   -> Video {entity_id} eliminado de Meilisearch.")

    elif entity_type == 'channel':
        if action == 'upsert':
            channel = fetch_channel_data(db, entity_id)
            if channel and channel['user_status'] == 'active':
                # Removemos 'user_status' antes de indexar para no ensuciar el documento
                channel.pop('user_status', None)
                meili.index('channels').add_documents([channel], primary_key='id')
                print(f"   -> Canal {entity_id} indexado.")
            else:
                meili.index('channels').delete_document(entity_id)
                print(f"   -> Canal {entity_id} eliminado de Meilisearch (inactivo).")
                
        elif action == 'delete':
            meili.index('channels').delete_document(entity_id)
            print(f"   -> Canal {entity_id} eliminado de Meilisearch.")

    elif entity_type == 'tag' and action == 'update':
        # Si un tag global se actualiza, debemos re-indexar todos los videos asociados
        with db.cursor() as cursor:
            cursor.execute("SELECT video_id FROM video_tags WHERE tag_id = %s", (entity_id,))
            videos = cursor.fetchall()
            for v in videos:
                # Reencolar los videos afectados para que el worker los actualice individualmente
                redis_conn = get_redis_connection()
                redis_conn.rpush(QUEUE_NAME, json.dumps({
                    'type': 'video', 'action': 'upsert', 'id': v['video_id']
                }))
        print(f"   -> Tag {entity_id} modificado. {len(videos)} videos encolados para re-indexación.")

def main():
    print("Iniciando Worker de Búsqueda (Meilisearch Sync)...")
    redis_client = get_redis_connection()
    meili_client = get_meili_client()
    
    while True:
        try:
            # blpop bloquea hasta que haya un elemento en la cola
            result = redis_client.blpop(QUEUE_NAME, timeout=0)
            if result:
                _, message = result
                msg_data = json.loads(message)
                
                # Conectar a DB por cada procesamiento para evitar desconexiones por timeout
                db = get_db_connection()
                try:
                    process_message(msg_data, db, meili_client)
                except Exception as e:
                    print(f"❌ Error procesando mensaje: {e}")
                    # Retorno exponencial simple: Devolver a la cola tras un error de conexión de Meili
                    time.sleep(2)
                    redis_client.lpush(QUEUE_NAME, message)
                finally:
                    db.close()
                    
        except redis.ConnectionError:
            print("❌ Error de conexión con Redis. Reintentando en 5 segundos...")
            time.sleep(5)
            redis_client = get_redis_connection()
        except Exception as e:
            print(f"❌ Error fatal en worker: {e}")
            time.sleep(5)

if __name__ == "__main__":
    main()