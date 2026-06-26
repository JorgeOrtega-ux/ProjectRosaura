# scripts/worker_typesense_sync.py

import os
import pymysql
import typesense
from dotenv import load_dotenv
import logging

# Se utiliza el logger nativo de Python para contenedores; sin prints o console logs
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

    try:
        client.collections['canvases'].delete()
        logger.info("Colección 'canvases' anterior eliminada.")
    except Exception:
        pass

    try:
        client.collections.create(schema)
        logger.info("Colección 'canvases' creada con éxito.")
    except Exception as e:
        logger.error(f"Error crítico al crear esquema Typesense: {e}")
        return

    try:
        connection = pymysql.connect(
            host=DB_HOST,
            user=DB_USER,
            password=DB_PASS,
            database=DB_NAME,
            cursorclass=pymysql.cursors.DictCursor
        )
    except Exception as e:
        logger.error(f"Error de conexión MySQL: {e}")
        return

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
                try:
                    client.collections['canvases'].documents.import_(documents, {'action': 'create'})
                    logger.info(f"Sincronización completada: {len(documents)} lienzos indexados en Typesense.")
                except Exception as e:
                    logger.error(f"Error al importar documentos hacia Typesense: {e}")
            else:
                logger.info("No hay lienzos en la base de datos para indexar.")

if __name__ == "__main__":
    main()