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

    # Buscar todas las llaves que empiecen con video:views:
    # Usamos scan_iter para no bloquear Redis si hay millones de llaves
    keys_to_process = []
    for key in r.scan_iter(match='video:views:*'):
        keys_to_process.append(key)

    if not keys_to_process:
        return # Nada que hacer

    # Diccionario para almacenar {video_id: numero_de_vistas_nuevas}
    views_data = {}
    
    # Usamos un pipeline (transacción en Redis) para sacar el valor y borrar la llave atómicamente
    # Esto evita que si entra una visita justo en medio, la perdamos. GETSET o MULTI/EXEC son ideales.
    pipe = r.pipeline()
    for key in keys_to_process:
        # Extraer ID del video del formato 'video:views:15'
        video_id = int(key.split(':')[-1])
        # GETDEL es perfecto para esto, lo saca y lo borra (requiere Redis >= 6.2)
        pipe.execute_command('GETDEL', key)

    results = pipe.execute()

    for idx, key in enumerate(keys_to_process):
        video_id = int(key.split(':')[-1])
        val = results[idx]
        if val is not None:
            views_data[video_id] = int(val)

    if not views_data:
        return

    # Ahora hacemos el volcado masivo a MySQL
    db = get_db_connection()
    if not db:
        print("[!] No se pudo procesar las visitas por error de BD.")
        return

    try:
        cursor = db.cursor()
        
        # Opcion mas rápida: Hacer multiples UPDATES en un solo ciclo
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

if __name__ == "__main__":
    print(f"[*] Worker de Métricas Iniciado. Sincronizando cada {SYNC_INTERVAL_SECONDS} segundos.")
    while True:
        try:
            process_pending_views()
        except Exception as e:
            print(f"[!] Error crítico en el Worker: {e}")
        
        # Dormir hasta el siguiente ciclo
        time.sleep(SYNC_INTERVAL_SECONDS)