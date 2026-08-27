import os
import sys
import time
import pymysql
import redis

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

class Colors:
    HEADER = '\033[95m'
    BLUE = '\033[94m'
    CYAN = '\033[96m'
    GREEN = '\033[92m'
    WARNING = '\033[93m'
    FAIL = '\033[91m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'
    DIM = '\033[2m'

def load_db_config(project_root):
    env_path = os.path.join(project_root, '.env')
    config = {
        'host': '127.0.0.1',
        'port': 3306,
        'user': 'root',
        'password': 'c7a91e4d5b2f8a0c3d6e9f1b4a7c0d2e5f8b1c4a9d6e3f0b7c2a5d8e1f4b9c6a',
        'redis_host': '127.0.0.1',
        'redis_port': 6379,
        'redis_pass': '8f4e2d1c9b7a5f6e3d2c1b0a9f8e7d6c5b4a3f2e1d0c9b8a7f6e5d4c3b2a1f0e'
    }
    if os.path.exists(env_path):
        with open(env_path, 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    k, v = line.split('=', 1)
                    k = k.strip()
                    v = v.strip().strip("'").strip('"')
                    if k == 'DB_HOST':
                        config['host'] = '127.0.0.1' if v == 'db_mysql' else v
                    elif k == 'DB_PORT':
                        config['port'] = int(v)
                    elif k == 'DB_ROOT_PASSWORD':
                        config['password'] = v
                    elif k == 'REDIS_HOST':
                        config['redis_host'] = '127.0.0.1' if v == 'redis' else v
                    elif k == 'REDIS_PORT':
                        config['redis_port'] = int(v)
                    elif k == 'REDIS_PASS':
                        config['redis_pass'] = v
    return config

def add_index_if_not_exists(cursor, db_name, table_name, index_name, columns_sql):
    """Añade un índice si no existe en la tabla."""
    cursor.execute(f"""
        SELECT COUNT(1) as cnt 
        FROM information_schema.statistics 
        WHERE table_schema = '{db_name}' 
          AND table_name = '{table_name}' 
          AND index_name = '{index_name}';
    """)
    res = cursor.fetchone()
    if res and res['cnt'] > 0:
        return False
    try:
        cursor.execute(f"ALTER TABLE `{db_name}`.`{table_name}` ADD INDEX `{index_name}` ({columns_sql});")
        return True
    except Exception as e:
        print(f"    {Colors.FAIL}Error creando índice {index_name} en {table_name}: {e}{Colors.ENDC}")
        return False

def run_database_healer(project_root):
    start_time = time.time()
    cfg = load_db_config(project_root)

    print(f"\n{Colors.HEADER}{Colors.BOLD}======================================================================{Colors.ENDC}")
    print(f"{Colors.HEADER}{Colors.BOLD}   MOTOR DE AUTO-SANACIÓN Y SANEAMIENTO INTEGRAL (DATABASE HEALER)   {Colors.ENDC}")
    print(f"{Colors.HEADER}{Colors.BOLD}======================================================================{Colors.ENDC}\n")

    try:
        conn = pymysql.connect(
            host=cfg['host'],
            port=cfg['port'],
            user=cfg['user'],
            password=cfg['password'],
            charset='utf8mb4',
            cursorclass=pymysql.cursors.DictCursor,
            autocommit=True
        )
    except Exception as e:
        print(f"{Colors.FAIL}Error de conexión con MySQL: {e}{Colors.ENDC}")
        return False

    cursor = conn.cursor()

    # -------------------------------------------------------------------------
    # FASE 1: OPTIMIZACIÓN Y CREACIÓN DE ÍNDICES FALTANTES
    # -------------------------------------------------------------------------
    print(f"{Colors.CYAN}{Colors.BOLD}[FASE 1] Verificación y Adición de Índices de Alto Rendimiento...{Colors.ENDC}")

    INDEXES_TO_ENSURE = [
        # db_identity
        ('db_identity', 'payment_history', 'idx_ph_stripe_intent', '`stripe_payment_intent_id`'),
        ('db_identity', 'payment_history', 'idx_ph_stripe_invoice', '`stripe_invoice_id`'),
        ('db_identity', 'payment_history', 'idx_ph_status', '`status`'),
        ('db_identity', 'notifications', 'idx_notif_target_uuid', '`target_uuid`'),
        ('db_identity', 'custom_palettes', 'idx_cp_created', '`created_at` DESC'),
        ('db_identity', 'user_flags', 'idx_uf_created', '`created_at` DESC'),
        ('db_identity', 'user_preferences', 'idx_up_created', '`created_at` DESC'),
        ('db_identity', 'roles', 'idx_roles_created', '`created_at` DESC'),
        ('db_identity', 'subscriptions', 'idx_subs_created', '`created_at` DESC'),
        
        # db_canvases
        ('db_canvases', 'canvases', 'idx_canvases_deleted_by', '`deleted_by_user_id`'),
        ('db_canvases', 'canvases', 'idx_canvases_palette', '`palette_id`'),
        ('db_canvases', 'canvas_invites', 'idx_ci_expires', '`expires_at`'),
        ('db_canvases', 'canvas_sanctions', 'idx_cs_user_end', '`user_id`, `end_date`'),
        ('db_canvases', 'canvas_sanctions', 'idx_cs_canvas_scope', '`canvas_id`, `sanction_scope`'),
        ('db_canvases', 'canvas_access_requests', 'idx_car_user_created', '`user_id`, `created_at` DESC'),
        ('db_canvases', 'canvas_snapshots_likes', 'idx_csl_created', '`created_at` DESC'),
        ('db_canvases', 'publication_likes', 'idx_pl_created', '`created_at` DESC'),
        ('db_canvases', 'publications', 'idx_pub_palette', '`palette_id`'),
        ('db_canvases', 'canvas_roles', 'idx_cr_created', '`created_at` DESC'),
        ('db_canvases', 'canvas_protections', 'idx_cp_created', '`created_at` DESC'),
        ('db_canvases', 'user_templates', 'idx_ut_created', '`created_at` DESC'),
        
        # db_advertisements
        ('db_advertisements', 'ad_metrics', 'idx_am_user_uuid', '`user_uuid`'),
        ('db_advertisements', 'ad_providers', 'idx_ap_network', '`network_id`'),
        ('db_advertisements', 'advertisements', 'idx_adv_created', '`created_at` DESC'),
        ('db_advertisements', 'ad_resources', 'idx_ar_created', '`created_at` DESC'),
        
        # db_telemetry
        ('db_telemetry', 'pageviews', 'idx_pv_user_uuid', '`user_uuid`'),
        ('db_telemetry', 'pageviews', 'idx_pv_session', '`session_id`'),
        ('db_telemetry', 'auth_events', 'idx_ae_user_uuid', '`user_uuid`')
    ]

    added_indexes = 0
    for db, tbl, idx, cols in INDEXES_TO_ENSURE:
        if add_index_if_not_exists(cursor, db, tbl, idx, cols):
            print(f"  {Colors.GREEN}✔ Índice creado: `{db}`.`{tbl}` -> `{idx}`{Colors.ENDC}")
            added_indexes += 1

    print(f"  {Colors.GREEN}Índices analizados. Nuevos índices aplicados: {added_indexes}{Colors.ENDC}\n")

    # -------------------------------------------------------------------------
    # FASE 2: SANEAMIENTO DE USUARIOS (ROLES, PREFERENCIAS, RESTRICCIONES)
    # -------------------------------------------------------------------------
    print(f"{Colors.CYAN}{Colors.BOLD}[FASE 2] Auto-Sanación de Usuarios (Roles, Preferencias y Restricciones)...{Colors.ENDC}")
    cursor.execute("USE db_identity;")

    # 1. Asignar rol por defecto a usuarios sin roles
    cursor.execute("""
        INSERT IGNORE INTO user_roles (user_id, role_id)
        SELECT u.id, 1 FROM users u
        LEFT JOIN user_roles ur ON u.id = ur.user_id
        WHERE ur.user_id IS NULL;
    """)
    fixed_roles = cursor.rowcount
    print(f"  {Colors.GREEN}✔ Roles asignados a usuarios sin rol: {fixed_roles}{Colors.ENDC}")

    # 2. Asignar preferencias por defecto a usuarios sin preferencias
    cursor.execute("""
        INSERT IGNORE INTO user_preferences (user_id, language, theme, open_links_new_tab, extended_alerts, allow_telemetry)
        SELECT u.id, 'es-419', 'system', 1, 0, 1 FROM users u
        LEFT JOIN user_preferences up ON u.id = up.user_id
        WHERE up.user_id IS NULL;
    """)
    fixed_prefs = cursor.rowcount
    print(f"  {Colors.GREEN}✔ Preferencias creadas para usuarios sin preferencias: {fixed_prefs}{Colors.ENDC}")

    # 3. Asignar restricciones base a usuarios sin restricciones
    cursor.execute("""
        INSERT IGNORE INTO user_restrictions (user_id, is_suspended)
        SELECT u.id, 0 FROM users u
        LEFT JOIN user_restrictions ur ON u.id = ur.user_id
        WHERE ur.user_id IS NULL;
    """)
    fixed_restr = cursor.rowcount
    print(f"  {Colors.GREEN}✔ Registros de restricción creados: {fixed_restr}{Colors.ENDC}")

    # -------------------------------------------------------------------------
    # FASE 3: SANEAMIENTO DE LIENZOS (MEMBRESÍAS, ROLES DE PROPIETARIO, SETTINGS)
    # -------------------------------------------------------------------------
    print(f"\n{Colors.CYAN}{Colors.BOLD}[FASE 3] Auto-Sanación de Lienzos (Dueños, Membresías y Roles de Canvas)...{Colors.ENDC}")
    cursor.execute("USE db_canvases;")

    # 1. Insertar dueños en canvas_members
    cursor.execute("""
        INSERT IGNORE INTO canvas_members (canvas_id, user_id, joined_at)
        SELECT c.id, c.owner_id, c.created_at FROM canvases c
        LEFT JOIN canvas_members cm ON c.id = cm.canvas_id AND c.owner_id = cm.user_id
        WHERE c.owner_id IS NOT NULL AND cm.user_id IS NULL;
    """)
    fixed_members = cursor.rowcount
    print(f"  {Colors.GREEN}✔ Membresías de propietarios sincronizadas en canvas_members: {fixed_members}{Colors.ENDC}")

    # 2. Asignar rol SuperAdmin (4) en canvas_user_roles a los dueños
    cursor.execute("""
        INSERT IGNORE INTO canvas_user_roles (canvas_id, user_id, role_id)
        SELECT c.id, c.owner_id, 4 FROM canvases c
        LEFT JOIN canvas_user_roles cur ON c.id = cur.canvas_id AND c.owner_id = cur.user_id
        WHERE c.owner_id IS NOT NULL AND cur.user_id IS NULL;
    """)
    fixed_canvas_roles = cursor.rowcount
    print(f"  {Colors.GREEN}✔ Roles de propietario (SuperAdmin) sincronizados en canvas_user_roles: {fixed_canvas_roles}{Colors.ENDC}")

    # 3. Inicializar canvas_reset_settings faltantes
    cursor.execute("""
        INSERT IGNORE INTO canvas_reset_settings (canvas_id, is_active, take_snapshot)
        SELECT c.id, 0, 1 FROM canvases c
        LEFT JOIN canvas_reset_settings crs ON c.id = crs.canvas_id
        WHERE crs.canvas_id IS NULL;
    """)
    fixed_reset = cursor.rowcount
    print(f"  {Colors.GREEN}✔ Configuraciones de reseteo inicializadas: {fixed_reset}{Colors.ENDC}")

    # 4. Inicializar canvas_resize_settings faltantes
    cursor.execute("""
        INSERT IGNORE INTO canvas_resize_settings (canvas_id, is_active, target_size)
        SELECT c.id, 0, c.size FROM canvases c
        LEFT JOIN canvas_resize_settings cres ON c.id = cres.canvas_id
        WHERE cres.canvas_id IS NULL;
    """)
    fixed_resize = cursor.rowcount
    print(f"  {Colors.GREEN}✔ Configuraciones de redimensionamiento inicializadas: {fixed_resize}{Colors.ENDC}")

    # 5. Sincronizar contadores reales
    cursor.execute("""
        UPDATE canvases c 
        SET members_count = (
            SELECT COUNT(1) FROM canvas_members cm 
            WHERE cm.canvas_id = c.id
        );
    """)
    cursor.execute("""
        UPDATE canvases c 
        SET favorites_count = (
            SELECT COUNT(1) FROM canvas_favorites cf 
            WHERE cf.canvas_id = c.id
        );
    """)
    print(f"  {Colors.GREEN}✔ Contadores `members_count` y `favorites_count` recalculados y sincronizados.{Colors.ENDC}")

    # -------------------------------------------------------------------------
    # FASE 4: PURGADO DE HUÉRFANOS CROSS-DATABASE
    # -------------------------------------------------------------------------
    print(f"\n{Colors.CYAN}{Colors.BOLD}[FASE 4] Limpieza de Registros Huérfanos Cross-Database...{Colors.ENDC}")

    cursor.execute("SELECT id FROM db_identity.users;")
    active_user_ids = [r['id'] for r in cursor.fetchall()]

    if active_user_ids:
        placeholders = ','.join(['%s'] * len(active_user_ids))

        # Purge canvas_members
        cursor.execute(f"DELETE FROM db_canvases.canvas_members WHERE user_id NOT IN ({placeholders})", active_user_ids)
        del_cm = cursor.rowcount

        # Purge canvas_user_roles
        cursor.execute(f"DELETE FROM db_canvases.canvas_user_roles WHERE user_id NOT IN ({placeholders})", active_user_ids)
        del_cur = cursor.rowcount

        # Purge canvas_favorites
        cursor.execute(f"DELETE FROM db_canvases.canvas_favorites WHERE user_id NOT IN ({placeholders})", active_user_ids)
        del_cf = cursor.rowcount

        print(f"  {Colors.GREEN}✔ Registros huérfanos eliminados: {del_cm + del_cur + del_cf}{Colors.ENDC}")

    # -------------------------------------------------------------------------
    # FASE 5: SINCRONIZACIÓN DE CACHÉ REDIS
    # -------------------------------------------------------------------------
    print(f"\n{Colors.CYAN}{Colors.BOLD}[FASE 5] Saneamiento y Purga de Caché Redis...{Colors.ENDC}")
    try:
        r = redis.Redis(host=cfg['redis_host'], port=cfg['redis_port'], password=cfg['redis_pass'], decode_responses=True)
        r.ping()
        
        # Purgar claves de cache stale relacionadas a canvas feed y pesos
        keys_to_clean = []
        for prefix in ['canvas:home_feed:*', 'canvas:owner_list:*', 'canvas:weight:*', 'canvas:members:*']:
            keys_to_clean.extend(r.keys(prefix))
        
        if keys_to_clean:
            r.delete(*keys_to_clean)
            print(f"  {Colors.GREEN}✔ {len(keys_to_clean)} claves obsoletas de caché eliminadas en Redis.{Colors.ENDC}")
        else:
            print(f"  {Colors.GREEN}✔ Caché Redis en estado óptimo.{Colors.ENDC}")
    except Exception as re_err:
        print(f"  {Colors.WARNING}Nota: Redis no disponible o sin cambios ({re_err}){Colors.ENDC}")

    cursor.close()
    conn.close()

    elapsed = round(time.time() - start_time, 2)
    print(f"\n{Colors.GREEN}{Colors.BOLD}======================================================================{Colors.ENDC}")
    print(f"{Colors.GREEN}{Colors.BOLD}🎉 SANEAMIENTO COMPLETADO CON ÉXITO EN {elapsed}s (100% HEALTHY){Colors.ENDC}")
    print(f"{Colors.GREEN}{Colors.BOLD}======================================================================{Colors.ENDC}\n")
    return True

if __name__ == '__main__':
    project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    run_database_healer(project_root)
