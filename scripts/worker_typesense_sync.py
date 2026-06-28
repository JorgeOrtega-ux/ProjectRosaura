# scripts/worker_typesense_sync.py

import os
import time
import pymysql
import typesense
from dotenv import load_dotenv
import logging

# Se utiliza el logger nativo de Python para contenedores
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger('TypesenseSync')

load_dotenv()

TS_HOST = os.environ.get('TYPESENSE_HOST', 'typesense')
TS_PORT = os.environ.get('TYPESENSE_PORT', '8108')
TS_PROTOCOL = os.environ.get('TYPESENSE_PROTOCOL', 'http')
TS_API_KEY = os.environ.get('TYPESENSE_API_KEY', '')

DB_HOST = os.environ.get('DB_HOST', 'db')
DB_USER = os.environ.get('DB_USER', 'root')
DB_PASS = os.environ.get('DB_PASS', '')
DB_NAME = os.environ.get('DB_CANVASES_NAME', 'db_canvases')

# Intervalo de sincronización en segundos (ej. 60 segundos)
SYNC_INTERVAL = int(os.environ.get('TYPESENSE_SYNC_INTERVAL', 60))

def main():
    if not TS_API_KEY:
        logger.error("TYPESENSE_API_KEY no configurada en .env.")
        return

    client = typesense.Client({
        'nodes': [{
            'host': TS_HOST,
            'port': TS_PORT,
            'protocol': TS_PROTOCOL,
        }],
        'api_key': TS_API_KEY,
        'connection_timeout_seconds': 5
    })

    schema = {
        'name': 'canvases',
        'fields': [
            {'name': 'id', 'type': 'string'},
            {'name': 'uuid', 'type': 'string'},
            {'name': 'name', 'type': 'string'},
            {'name': 'owner_id', 'type': 'int32', 'optional': True},
            {'name': 'privacy', 'type': 'string', 'facet': True},
            {'name': 'scope_type', 'type': 'string', 'facet': True},
            {'name': 'created_at', 'type': 'int64'}
        ]
    }

    # 1. Crear la colección SOLO si no existe (fuera del bucle principal)
    try:
        client.collections['canvases'].retrieve()
        logger.info("La colección 'canvases' ya existe en Typesense.")
    except typesense.exceptions.ObjectNotFound:
        try:
            client.collections.create(schema)
            logger.info("Colección 'canvases' creada con éxito por primera vez.")
        except Exception as e:
            logger.error(f"Error crítico al crear esquema Typesense: {e}")
            return

    logger.info(f"Iniciando bucle de sincronización (cada {SYNC_INTERVAL} segundos)...")

    # 2. Bucle infinito para mantener vivo el contenedor
    while True:
        try:
            connection = pymysql.connect(
                host=DB_HOST,
                user=DB_USER,
                password=DB_PASS,
                database=DB_NAME,
                cursorclass=pymysql.cursors.DictCursor
            )

            with connection:
                with connection.cursor() as cursor:
                    cursor.execute("SELECT id, uuid, name, owner_id, privacy, scope_type, UNIX_TIMESTAMP(created_at) as created_at FROM canvases")
                    canvases = cursor.fetchall()
                    
                    documents = []
                    for c in canvases:
                        documents.append({
                            'id': str(c['id']),
                            'uuid': c['uuid'],
                            'name': c['name'],
                            'owner_id': c['owner_id'] if c['owner_id'] else 0,
                            'privacy': c['privacy'],
                            'scope_type': c['scope_type'] if c['scope_type'] else 'personal',
                            'created_at': int(c['created_at']) if c['created_at'] else 0
                        })
                    
                    if documents:
                        # IMPORTANTE: Cambiado a 'upsert' para no tener que borrar la colección completa
                        client.collections['canvases'].documents.import_(documents, {'action': 'upsert'})
                        logger.info(f"Sincronización completada: {len(documents)} lienzos indexados/actualizados.")
                    else:
                        logger.info("No hay lienzos en la base de datos para indexar.")
                        
        except Exception as e:
            logger.error(f"Error durante el ciclo de sincronización: {e}")

        # 3. Pausar la ejecución antes del siguiente ciclo
        time.sleep(SYNC_INTERVAL)

if __name__ == "__main__":
    main()