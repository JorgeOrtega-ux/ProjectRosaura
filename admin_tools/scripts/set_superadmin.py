import pymysql
import os
import redis

def main():
    env_path = os.path.join(os.path.dirname(__file__), '..', '..', '.env')
    env_vars = {}
    if os.path.exists(env_path):
        with open(env_path, 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    k, v = line.split('=', 1)
                    env_vars[k.strip()] = v.strip().strip("'").strip('"')

    db_host = '127.0.0.1'
    db_port = int(env_vars.get('DB_PORT', 3306))
    db_user = env_vars.get('DB_ROOT_USER', 'root')
    db_pass = env_vars.get('DB_ROOT_PASSWORD', 'c7a91e4d5b2f8a0c3d6e9f1b4a7c0d2e5f8b1c4a9d6e3f0b7c2a5d8e1f4b9c6a')

    conn = pymysql.connect(
        host=db_host,
        port=db_port,
        user=db_user,
        password=db_pass,
        database='db_identity',
        charset='utf8mb4',
        cursorclass=pymysql.cursors.DictCursor
    )

    with conn.cursor() as cur:
        # Ver roles
        cur.execute("SELECT * FROM roles")
        roles = cur.fetchall()
        print("Roles disponibles en db_identity:", roles)

        # Ver usuario 1
        cur.execute("SELECT id, username, email FROM users WHERE id = 1")
        user = cur.fetchone()
        print("Usuario objetivo:", user)

        if user:
            # Asignar rol 4 (SuperAdministrator) a usuario 1
            cur.execute("""
                INSERT INTO user_roles (user_id, role_id) 
                VALUES (1, 4) 
                ON DUPLICATE KEY UPDATE role_id = 4
            """)
            conn.commit()
            print(f"[+] Rol SuperAdministrator (ID 4) asignado a {user['username']} (ID {user['id']})")

            # Verificar roles asignados a usuario 1
            cur.execute("""
                SELECT ur.user_id, ur.role_id, r.name as role_name, r.weight 
                FROM user_roles ur 
                JOIN roles r ON ur.role_id = r.id 
                WHERE ur.user_id = 1
            """)
            assigned = cur.fetchall()
            print("Roles asignados actualmente:", assigned)

    conn.close()

    # Limpiar TODA la caché en Redis
    redis_host = env_vars.get('REDIS_HOST', '127.0.0.1')
    if redis_host in ('redis', 'localhost'):
        redis_host = '127.0.0.1'
    redis_port = int(env_vars.get('REDIS_PORT', 6379))
    redis_pass = env_vars.get('REDIS_PASS', None)

    try:
        r = redis.Redis(host=redis_host, port=redis_port, password=redis_pass, decode_responses=True)
        r.flushdb()
        print("[+] Redis FLUSHDB ejecutado: Toda la caché y sesiones cacheadas han sido limpiadas.")
    except Exception as e:
        print(f"[-] Error en Redis: {e}")

if __name__ == '__main__':
    main()
