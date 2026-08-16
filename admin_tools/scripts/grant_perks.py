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
        # 1. Asegurar columna is_usable en la BD en vivo
        cur.execute("SHOW COLUMNS FROM store_perk_packages LIKE 'is_usable'")
        if not cur.fetchone():
            print("Agregando columna is_usable a store_perk_packages...")
            cur.execute("ALTER TABLE store_perk_packages ADD COLUMN is_usable TINYINT(1) NOT NULL DEFAULT 1 AFTER is_active")
            conn.commit()
            print("Columna is_usable agregada con éxito.")
        else:
            print("Columna is_usable ya existía.")

        # 2. Obtener lista de perks
        cur.execute("SELECT perk_id FROM store_perk_packages")
        perks = [r['perk_id'] for r in cur.fetchall()]
        all_known_perks = list(set(perks + [
            'pixel_missile_1', 'pixel_bomb_1', 'cluster_bomb_1', 'atomic_bomb_1',
            'meteor_shower_1', 'orbital_cannon_1', 'black_hole_1', 'mines_1',
            'supernova_blast', 'ion_strike'
        ]))
        print(f"Perks a otorgar ({len(all_known_perks)}):", all_known_perks)

        # 3. Obtener usuarios
        cur.execute("SELECT id, username, email FROM users")
        users = cur.fetchall()
        print("Usuarios encontrados:", [(u['id'], u['username']) for u in users])

        # 4. Asignar 999 de cada perk a cada usuario
        for u in users:
            uid = u['id']
            for pid in all_known_perks:
                cur.execute("""
                    INSERT INTO user_perk_balances (user_id, perk_id, quantity_available) 
                    VALUES (%s, %s, 999) 
                    ON DUPLICATE KEY UPDATE quantity_available = 999
                """, (uid, pid))
        conn.commit()
        print("Balances actualizados a 999 de cada ventaja con éxito.")

        # 5. Mostrar verificación
        for u in users:
            cur.execute("SELECT perk_id, quantity_available FROM user_perk_balances WHERE user_id = %s ORDER BY perk_id ASC", (u['id'],))
            balances = cur.fetchall()
            print(f"\n[+] Inventario actualizado para {u['username']} (ID {u['id']}):")
            for b in balances:
                print(f"    - {b['perk_id']}: {b['quantity_available']} disponibles")

    conn.close()

    # 6. Invalidar caché en Redis
    redis_host = env_vars.get('REDIS_HOST', '127.0.0.1')
    if redis_host in ('redis', 'localhost'):
        redis_host = '127.0.0.1'
    redis_port = int(env_vars.get('REDIS_PORT', 6379))
    redis_pass = env_vars.get('REDIS_PASS', None)

    try:
        r = redis.Redis(host=redis_host, port=redis_port, password=redis_pass, decode_responses=True)
        keys_user = r.keys('user:perks:*')
        keys_store = r.keys('*store*')
        to_delete = keys_user + keys_store
        if to_delete:
            print(f"\nLimpiando {len(to_delete)} claves de caché en Redis...")
            for k in to_delete:
                r.delete(k)
        print("Caché Redis sincronizada e invalidada correctamente.")
    except Exception as e:
        print(f"Aviso Redis: {e}")

if __name__ == '__main__':
    main()
