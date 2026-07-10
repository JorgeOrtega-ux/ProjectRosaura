
import os
import time
import pymysql
import typesense
from dotenv import load_dotenv
import logging

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

SYNC_INTERVAL = int(os.environ.get('TYPESENSE_SYNC_INTERVAL', 60))

def main():
    if not TS_API_KEY:
        logger.error("TYPESENSE_API_KEY not configured in .env.")
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
        client.collections['canvases'].retrieve()
        logger.info("'canvases' collection already exists in Typesense.")
    except typesense.exceptions.ObjectNotFound:
        try:
            client.collections.create(schema)
            logger.info("'canvases' collection created successfully for the first time.")
        except Exception as e:
            logger.error(f"Critical error creating Typesense schema: {e}")
            return

    logger.info(f"Starting sync loop (every {SYNC_INTERVAL} seconds)...")

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
                        client.collections['canvases'].documents.import_(documents, {'action': 'upsert'})
                        logger.info(f"Sync completed: {len(documents)} canvases indexed/updated.")
                    else:
                        logger.info("No canvases in database to index.")
                        
        except Exception as e:
            logger.error(f"Error during sync cycle: {e}")

        time.sleep(SYNC_INTERVAL)

if __name__ == "__main__":
    main()
