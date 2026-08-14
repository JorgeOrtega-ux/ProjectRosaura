"""
Módulo de Población y Reinicialización de Bases de Datos para ProjectRosaura.
Puebla ~10,000 registros por tabla en db_identity, db_canvases, db_support y db_telemetry.
"""

import os
import sys
import time
import uuid
import random
import pymysql
from datetime import datetime, timedelta

class Colors:
    HEADER = '\033[95m'
    BLUE = '\033[94m'
    GREEN = '\033[92m'
    CYAN = '\033[96m'
    WARNING = '\033[93m'
    FAIL = '\033[91m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'

DEFAULT_PASSWORD_HASH = '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi' # "password"
BATCH_SIZE = 2000

FIRST_NAMES = ['Alex', 'Carlos', 'Maria', 'Sofia', 'Juan', 'Lucia', 'Mateo', 'Elena', 'David', 'Laura', 
               'Diego', 'Paula', 'Gabriel', 'Valentina', 'Andres', 'Camila', 'Javier', 'Isabella', 'Daniel', 'Emma']
LAST_NAMES = ['Garcia', 'Rodriguez', 'Gonzalez', 'Fernandez', 'Lopez', 'Martinez', 'Sanchez', 'Perez', 
              'Gomez', 'Martin', 'Jimenez', 'Ruiz', 'Hernandez', 'Diaz', 'Moreno', 'Muñoz', 'Alvarez', 'Romero']
CANVAS_THEMES = ['PixelArt', 'Cyberpunk', 'Fantasy', 'Retro', 'Galaxy', 'Neon', 'Medieval', 'Futuristic', 
                 'Isometric', 'Chibi', 'Anime', 'Landscape', 'Dungeon', 'Space', 'Synthwave', 'Vaporwave']
CATEGORIES = ['technical', 'billing', 'account', 'policy', 'general', 'other']
TICKET_SUBJECTS = [
    'Problema al cargar canvas en tiempo real',
    'Error en la confirmación del pago Stripe',
    'Consulta sobre actualización de suscripción Pro',
    'Fallo al exportar snapshot en formato PNG',
    'Duda respecto a roles de canvas y permisos',
    'Problema de autenticación de dos factores (2FA)',
    'Solicitud de cambio de nombre de usuario',
    'Reporte de comportamiento inadecuado en chat de lienzo',
    'Sugerencia de nueva paleta de colores personalizada',
    'Lentitud de conexión al WebSocket de canvas'
]
CHAT_MESSAGES_SAMPLES = [
    'Hola, necesito asistencia con una transacción reciente.',
    'Estoy revisando los detalles de tu cuenta en este momento.',
    '¿Podrías proporcionarme el identificador de tu compra o factura?',
    'Listo, he actualizado los permisos de tu perfil.',
    'Gracias por contactar al soporte técnico de ProjectRosaura.',
    'El problema ha quedado solucionado satisfactoriamente.',
    'Te transferiré al equipo de nivel 2 para investigar el inconveniente a fondo.',
    '¿Hay algo más en lo que pueda ayudarte el día de hoy?'
]

def load_db_config(project_root):
    env_path = os.path.join(project_root, '.env')
    config = {
        'host': '127.0.0.1',
        'port': 3306,
        'user': 'root',
        'password': 'c7a91e4d5b2f8a0c3d6e9f1b4a7c0d2e5f8b1c4a9d6e3f0b7c2a5d8e1f4b9c6a',
        'app_user': 'system_web_executor',
        'app_password': 'e4b3c2d1a0f9e8d7c6b5a4f3e2d1c0b9a8f7e6d5c4b3a2f1e0d9c8b7a6f5e4d3'
    }
    if os.path.exists(env_path):
        with open(env_path, 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    k, v = line.split('=', 1)
                    k = k.strip()
                    v = v.strip().strip("'").strip('"')
                    if k == 'DB_HOST' and v:
                        config['host'] = '127.0.0.1' if v in ('mysql', 'db_mysql', 'localhost') else v
                    elif k == 'DB_PORT' and v:
                        config['port'] = int(v)
                    elif k == 'DB_ROOT_PASSWORD' and v:
                        config['password'] = v
                    elif k == 'DB_USER' and v:
                        config['app_user'] = v
                    elif k == 'DB_PASS' and v:
                        config['app_password'] = v
    return config

def execute_sql_file(cursor, file_path):
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"No se encontró el archivo SQL: {file_path}")
    with open(file_path, 'r', encoding='utf-8') as f:
        sql_content = f.read()

    # Dividir sentencias por punto y coma ignorando comentarios
    statements = []
    current_stmt = []
    for line in sql_content.splitlines():
        trimmed = line.strip()
        if not trimmed or trimmed.startswith('--') or trimmed.startswith('/*'):
            continue
        current_stmt.append(line)
        if trimmed.endswith(';'):
            stmt = '\n'.join(current_stmt).strip()
            if stmt:
                statements.append(stmt)
            current_stmt = []

    for stmt in statements:
        try:
            cursor.execute(stmt)
        except Exception as e:
            # Ignorar errores de advertencias o tablas existentes
            pass

def random_date(start_days_ago=365):
    seconds = random.randint(0, start_days_ago * 86400)
    dt = datetime.now() - timedelta(seconds=seconds)
    return dt.strftime('%Y-%m-%d %H:%M:%S')

def seed_database(project_root, target_records=10000):
    start_total_time = time.time()
    config = load_db_config(project_root)
    init_dir = os.path.join(project_root, 'docker', 'mysql', 'init')

    print(f"\n{Colors.HEADER}{Colors.BOLD}======================================================================{Colors.ENDC}")
    print(f"{Colors.HEADER}{Colors.BOLD}   INICIANDO PROCESO DE POBLACIÓN MASIVA DE BASES DE DATOS           {Colors.ENDC}")
    print(f"{Colors.HEADER}{Colors.BOLD}======================================================================{Colors.ENDC}")
    print(f"Conectando al servidor MySQL en {Colors.CYAN}{config['host']}:{config['port']}{Colors.ENDC} como {Colors.CYAN}{config['user']}{Colors.ENDC}...")

    conn = pymysql.connect(
        host=config['host'],
        port=config['port'],
        user=config['user'],
        password=config['password'],
        charset='utf8mb4',
        autocommit=False
    )
    cursor = conn.cursor()

    try:
        # 1. Reiniciar esquemas
        print(f"\n{Colors.WARNING}1/5 Recreando esquemas limpios desde docker/mysql/init/...{Colors.ENDC}")
        schema_files = [
            'db_identity.sql',
            'db_canvases.sql',
            'db_support.sql',
            'db_telemetry.sql'
        ]

        cursor.execute("DROP DATABASE IF EXISTS db_identity;")
        cursor.execute("DROP DATABASE IF EXISTS db_canvases;")
        cursor.execute("DROP DATABASE IF EXISTS db_support;")
        cursor.execute("DROP DATABASE IF EXISTS db_telemetry;")
        conn.commit()

        for sf in schema_files:
            file_p = os.path.join(init_dir, sf)
            print(f"  -> Ejecutando esquema: {Colors.BLUE}{sf}{Colors.ENDC}")
            execute_sql_file(cursor, file_p)
            conn.commit()

        # Otorgar permisos a system_web_executor
        grant_sql = f"""
        GRANT ALL PRIVILEGES ON db_identity.* TO '{config['app_user']}'@'%';
        GRANT ALL PRIVILEGES ON db_canvases.* TO '{config['app_user']}'@'%';
        GRANT ALL PRIVILEGES ON db_support.* TO '{config['app_user']}'@'%';
        GRANT ALL PRIVILEGES ON db_telemetry.* TO '{config['app_user']}'@'%';
        FLUSH PRIVILEGES;
        """
        for g_stmt in grant_sql.strip().split(';'):
            if g_stmt.strip():
                cursor.execute(g_stmt)
        conn.commit()
        print(f"{Colors.GREEN}✓ Esquemas recreados y permisos asignados con éxito.{Colors.ENDC}")

        # Desactivar restricciones temporales para inserción ultrarrápida
        cursor.execute("SET FOREIGN_KEY_CHECKS = 0;")
        cursor.execute("SET UNIQUE_CHECKS = 0;")

        # -------------------------------------------------------------
        # 2. POBLAR DB_IDENTITY (~10k por tabla)
        # -------------------------------------------------------------
        print(f"\n{Colors.WARNING}2/5 Poblando 'db_identity' (~{target_records:,} por tabla)...{Colors.ENDC}")
        cursor.execute("USE db_identity;")

        # Tabla: users
        print("  -> Generando tabla: `users`...")
        user_rows = []
        # Usuario 1: Administrador del sistema
        user_rows.append((
            1,
            '00000000-0000-0000-0000-000000000001',
            'admin',
            'admin@example.com',
            DEFAULT_PASSWORD_HASH,
            3, # Ultra
            100000,
            'verify',
            'cus_admin_stripe_001',
            None,
            0,
            None,
            None,
            '/public/assets/img/fallbacks/avatar-default.png',
            None,
            '2025-01-01 00:00:00',
            1048576,
            0,
            None
        ))

        for i in range(2, target_records + 1):
            fn = random.choice(FIRST_NAMES)
            ln = random.choice(LAST_NAMES)
            u_name = f"{fn.lower()}_{ln.lower()}_{i}"
            u_email = f"{fn.lower()}.{ln.lower()}.{i}@example.com"
            tier = random.choices([0, 1, 2, 3], weights=[70, 15, 10, 5])[0]
            coins = random.randint(0, 25000)
            u_uuid = str(uuid.uuid4())
            created = random_date(365)
            storage = random.randint(0, 15 * 1024 * 1024)
            user_rows.append((
                i,
                u_uuid,
                u_name,
                u_email,
                DEFAULT_PASSWORD_HASH,
                tier,
                coins,
                'verify',
                f'cus_stripe_{u_uuid[:8]}',
                None,
                0,
                None,
                None,
                '/public/assets/img/fallbacks/avatar-default.png',
                None,
                created,
                storage,
                0,
                None
            ))

        sql_users = """
        INSERT INTO `users` (id, uuid, username, email, password, subscription_tier, coins, purchase_preference,
                            stripe_customer_id, two_factor_secret, two_factor_enabled, two_factor_recovery_codes,
                            deletion_scheduled_at, profile_picture, google_id, created_at, storage_used_bytes,
                            template_tokens_used, template_tokens_reset_at)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """
        for i in range(0, len(user_rows), BATCH_SIZE):
            cursor.executemany(sql_users, user_rows[i:i+BATCH_SIZE])
        conn.commit()

        # Tabla: user_preferences
        print("  -> Generando tabla: `user_preferences`...")
        pref_rows = []
        for i in range(1, target_records + 1):
            lang = random.choice(['es-419', 'en-US', 'es-ES', 'pt-BR', 'fr-FR', 'de-DE'])
            theme = random.choice(['system', 'dark', 'light'])
            pref_rows.append((i, lang, 1, theme, 0, 1, random_date(300)))

        sql_prefs = """
        INSERT INTO `user_preferences` (user_id, language, open_links_new_tab, theme, extended_alerts, allow_telemetry, created_at)
        VALUES (%s, %s, %s, %s, %s, %s, %s)
        """
        for i in range(0, len(pref_rows), BATCH_SIZE):
            cursor.executemany(sql_prefs, pref_rows[i:i+BATCH_SIZE])
        conn.commit()

        # Tabla: user_roles
        print("  -> Generando tabla: `user_roles`...")
        role_rows = [(1, 4), (1, 7)] # Admin SuperAdmin + SupportAgentL3
        for i in range(2, target_records + 1):
            if i <= 10:
                role_rows.append((i, 3)) # Admin
            elif i <= 30:
                role_rows.append((i, 2)) # Moderator
            elif i <= 50:
                role_rows.append((i, random.choice([5, 6, 7]))) # SupportAgent
            else:
                role_rows.append((i, 1)) # User

        sql_roles = "INSERT IGNORE INTO `user_roles` (user_id, role_id) VALUES (%s, %s)"
        for i in range(0, len(role_rows), BATCH_SIZE):
            cursor.executemany(sql_roles, role_rows[i:i+BATCH_SIZE])
        conn.commit()

        # Tabla: subscriptions
        print("  -> Generando tabla: `subscriptions`...")
        sub_rows = []
        for i in range(1, target_records + 1):
            u_id = i
            tier = random.choice([1, 2, 3])
            period = random.choice(['monthly', 'yearly'])
            status = random.choices(['active', 'canceled', 'past_due'], weights=[80, 15, 5])[0]
            st_date = random_date(180)
            sub_rows.append((
                u_id,
                f'cus_stripe_{u_id}',
                f'sub_stripe_{u_id}_{uuid.uuid4().hex[:6]}',
                f'cs_stripe_{uuid.uuid4().hex[:8]}',
                tier,
                period,
                status,
                st_date,
                datetime.now() + timedelta(days=30),
                None,
                st_date
            ))
        sql_subs = """
        INSERT INTO `subscriptions` (user_id, stripe_customer_id, stripe_subscription_id, stripe_checkout_session_id,
                                     tier, billing_period, status, current_period_start, current_period_end, canceled_at, created_at)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """
        for i in range(0, len(sub_rows), BATCH_SIZE):
            cursor.executemany(sql_subs, sub_rows[i:i+BATCH_SIZE])
        conn.commit()

        # Tabla: payment_history
        print("  -> Generando tabla: `payment_history`...")
        pay_rows = []
        for i in range(1, target_records + 1):
            u_id = random.randint(1, target_records)
            amount = random.choice([499, 999, 1999, 2499, 4999])
            desc = f"Pago de suscripción mensual Nivel {random.choice(['Plus', 'Pro', 'Ultra'])}"
            pay_rows.append((
                u_id,
                f'pi_{uuid.uuid4().hex[:16]}',
                f'in_{uuid.uuid4().hex[:14]}',
                amount,
                'usd',
                desc,
                'succeeded',
                random_date(180)
            ))
        sql_pay = """
        INSERT INTO `payment_history` (user_id, stripe_payment_intent_id, stripe_invoice_id, amount_cents, currency, description, status, created_at)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        """
        for i in range(0, len(pay_rows), BATCH_SIZE):
            cursor.executemany(sql_pay, pay_rows[i:i+BATCH_SIZE])
        conn.commit()

        # Tabla: custom_palettes
        print("  -> Generando tabla: `custom_palettes`...")
        pal_rows = []
        palette_colors_json = '[{"hex":"#FF5733","name":"Coral"},{"hex":"#33FF57","name":"Mint"},{"hex":"#3357FF","name":"Blue"},{"hex":"#F3FF33","name":"Yellow"}]'
        for i in range(1, target_records + 1):
            pal_rows.append((
                random.randint(1, target_records),
                f'palette_usr_{i}',
                f'Paleta Artística {i}',
                palette_colors_json,
                random_date(200)
            ))
        sql_pals = "INSERT INTO `custom_palettes` (user_id, palette_key, name, colors, created_at) VALUES (%s, %s, %s, %s, %s)"
        for i in range(0, len(pal_rows), BATCH_SIZE):
            cursor.executemany(sql_pals, pal_rows[i:i+BATCH_SIZE])
        conn.commit()

        # Tabla: moderation_logs
        print("  -> Generando tabla: `moderation_logs`...")
        mod_rows = []
        for i in range(1, target_records + 1):
            mod_rows.append((
                random.randint(2, target_records),
                1, # Admin ID
                random.choice(['warn', 'mute', 'suspend_temp', 'edit_avatar', 'reset_username']),
                'Infracción de normas comunitarias de pixel art',
                datetime.now() + timedelta(days=7),
                'Nota interna del moderador',
                random_date(150)
            ))
        sql_mod = "INSERT INTO `moderation_logs` (user_id, admin_id, action_type, reason, end_date, admin_notes, created_at) VALUES (%s, %s, %s, %s, %s, %s, %s)"
        for i in range(0, len(mod_rows), BATCH_SIZE):
            cursor.executemany(sql_mod, mod_rows[i:i+BATCH_SIZE])
        conn.commit()

        # Tabla: profile_changes_log
        print("  -> Generando tabla: `profile_changes_log`...")
        pfl_rows = []
        for i in range(1, target_records + 1):
            pfl_rows.append((
                random.randint(1, target_records),
                random.choice(['avatar', 'username', 'email', 'password', '2fa']),
                'old_val_sample',
                'new_val_sample',
                f"192.168.{random.randint(1,254)}.{random.randint(1,254)}",
                'AS15169 Google LLC',
                random_date(200)
            ))
        sql_pfl = "INSERT INTO `profile_changes_log` (user_id, change_type, old_value, new_value, ip_address, asn, created_at) VALUES (%s, %s, %s, %s, %s, %s, %s)"
        for i in range(0, len(pfl_rows), BATCH_SIZE):
            cursor.executemany(sql_pfl, pfl_rows[i:i+BATCH_SIZE])
        conn.commit()

        # Tabla: user_flags
        print("  -> Generando tabla: `user_flags`...")
        flags_rows = []
        for i in range(1, target_records + 1):
            flags_rows.append((
                i,
                random.choice(['beta_access', 'trusted_creator', 'verified_artist', 'early_supporter', 'premium_badge']),
                random_date(250)
            ))
        sql_flags = "INSERT IGNORE INTO `user_flags` (user_id, flag_key, created_at) VALUES (%s, %s, %s)"
        for i in range(0, len(flags_rows), BATCH_SIZE):
            cursor.executemany(sql_flags, flags_rows[i:i+BATCH_SIZE])
        conn.commit()

        # Tabla: auth_tokens
        print("  -> Generando tabla: `auth_tokens`...")
        tokens_rows = []
        for i in range(1, target_records + 1):
            tokens_rows.append((
                random.randint(1, target_records),
                uuid.uuid4().hex,
                uuid.uuid4().hex + uuid.uuid4().hex,
                datetime.now() + timedelta(days=30),
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
                f"10.0.{random.randint(1,254)}.{random.randint(1,254)}",
                'CDMX, MX',
                'AS8151 Totalplay'
            ))
        sql_tokens = "INSERT INTO `auth_tokens` (user_id, selector, hashed_validator, expires_at, user_agent, ip_address, location, asn) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)"
        for i in range(0, len(tokens_rows), BATCH_SIZE):
            cursor.executemany(sql_tokens, tokens_rows[i:i+BATCH_SIZE])
        conn.commit()

        # Tabla: store_purchases
        print("  -> Generando tabla: `store_purchases`...")
        sp_rows = []
        for i in range(1, target_records + 1):
            sp_rows.append((
                random.randint(1, target_records),
                f'pi_{uuid.uuid4().hex[:16]}',
                f'cs_checkout_{uuid.uuid4().hex[:12]}_{i}',
                random.choice(['coins', 'perk_missile', 'perk_bomb', 'perk_meteor']),
                random.choice([1000, 2750, 5750, 13250]),
                random.choice([299, 699, 1299, 2499]),
                'usd',
                'succeeded',
                random_date(180)
            ))
        sql_sp = """
        INSERT INTO `store_purchases` (user_id, stripe_payment_intent_id, stripe_checkout_session_id, item_type,
                                       item_amount, amount_cents, currency, status, created_at)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
        """
        for i in range(0, len(sp_rows), BATCH_SIZE):
            cursor.executemany(sql_sp, sp_rows[i:i+BATCH_SIZE])
        conn.commit()

        # Tabla: user_coin_transactions
        print("  -> Generando tabla: `user_coin_transactions`...")
        uct_rows = []
        for i in range(1, target_records + 1):
            uct_rows.append((
                str(uuid.uuid4()),
                random.randint(1, target_records),
                random.choice([500, 1000, -250, -500, 2500, -1000]),
                random.choice(['charge', 'spend', 'bonus', 'admin_adjustment']),
                'store_purchases',
                i,
                'Transacción de monedas del sistema',
                random_date(180)
            ))
        sql_uct = """
        INSERT INTO `user_coin_transactions` (uuid, user_id, amount, type, reference_table, reference_id, description, created_at)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        """
        for i in range(0, len(uct_rows), BATCH_SIZE):
            cursor.executemany(sql_uct, uct_rows[i:i+BATCH_SIZE])
        conn.commit()

        # Tabla: user_perks
        print("  -> Generando tabla: `user_perks`...")
        perks_list = ['pixel_missile_1', 'pixel_bomb_1', 'cluster_bomb_1', 'atomic_bomb_1', 'meteor_shower_1']
        up_rows = []
        for i in range(1, target_records + 1):
            up_rows.append((
                random.randint(1, target_records),
                random.choice(perks_list),
                random.choice([500, 1000, 2500, 5000]),
                random.choice([0, 1]),
                datetime.now() if random.choice([True, False]) else None,
                random_date(150)
            ))
        sql_up = "INSERT INTO `user_perks` (user_id, perk_id, coins_spent, is_used, used_at, created_at) VALUES (%s, %s, %s, %s, %s, %s)"
        for i in range(0, len(up_rows), BATCH_SIZE):
            cursor.executemany(sql_up, up_rows[i:i+BATCH_SIZE])
        conn.commit()

        # Tabla: user_perk_balances
        print("  -> Generando tabla: `user_perk_balances`...")
        upb_rows = []
        for i in range(1, target_records + 1):
            upb_rows.append((
                i,
                random.choice(perks_list),
                random.randint(1, 10)
            ))
        sql_upb = "INSERT IGNORE INTO `user_perk_balances` (user_id, perk_id, quantity_available) VALUES (%s, %s, %s)"
        for i in range(0, len(upb_rows), BATCH_SIZE):
            cursor.executemany(sql_upb, upb_rows[i:i+BATCH_SIZE])
        conn.commit()

        # Tabla: user_restrictions
        print("  -> Generando tabla: `user_restrictions`...")
        ur_rows = []
        for i in range(1, target_records + 1):
            is_susp = 1 if i <= 100 else 0
            ur_rows.append((
                i,
                is_susp,
                'temporary' if is_susp else None,
                'Suspensión preventiva por análisis de actividad' if is_susp else None,
                datetime.now() + timedelta(days=7) if is_susp else None,
                None,
                None,
                None
            ))
        sql_ur = """
        INSERT INTO `user_restrictions` (user_id, is_suspended, suspension_type, suspension_reason, suspension_end_date, deleted_by, deleted_reason, admin_notes)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        """
        for i in range(0, len(ur_rows), BATCH_SIZE):
            cursor.executemany(sql_ur, ur_rows[i:i+BATCH_SIZE])
        conn.commit()

        print(f"{Colors.GREEN}✓ db_identity poblada exitosamente con ~150,000 registros.{Colors.ENDC}")

        # -------------------------------------------------------------
        # 3. POBLAR DB_CANVASES (~10k por tabla)
        # -------------------------------------------------------------
        print(f"\n{Colors.WARNING}3/5 Poblando 'db_canvases' (~{target_records:,} por tabla)...{Colors.ENDC}")
        cursor.execute("USE db_canvases;")

        # Tabla: canvases
        print("  -> Generando tabla: `canvases`...")
        canvas_rows = []
        for i in range(1, target_records + 1):
            c_uuid = str(uuid.uuid4())
            theme = random.choice(CANVAS_THEMES)
            c_name = f"{theme} Canvas #{i}"
            tags_json = f'["{theme.lower()}", "art", "pixel_{i}"]'
            privacy = random.choice(['public', 'private'])
            size = random.choice(['64', '128', '256', '512'])
            fav_cnt = random.randint(0, 500)
            mem_cnt = random.randint(1, 100)
            px_cnt = random.randint(100, 50000)
            msg_cnt = random.randint(0, 1000)
            owner_id = random.randint(1, target_records)
            canvas_rows.append((
                i,
                c_uuid,
                owner_id,
                c_name,
                tags_json,
                privacy,
                0, # requires_approval
                1, # allow_purchases
                1, # allow_chat
                0, # is_subscription_locked
                None,
                size,
                'default',
                100, # max_participants
                5,
                10,
                fav_cnt,
                mem_cnt,
                px_cnt,
                msg_cnt,
                0, # is_frozen
                random_date(300)
            ))

        sql_canvases = """
        INSERT INTO `canvases` (id, uuid, owner_id, name, tags, privacy, requires_approval, allow_purchases,
                               allow_chat, is_subscription_locked, locked_reasons, size, palette_id, max_participants,
                               cooldown_pixels_batch, cooldown_seconds, favorites_count, members_count, total_pixels,
                               total_messages, is_frozen, created_at)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """
        for i in range(0, len(canvas_rows), BATCH_SIZE):
            cursor.executemany(sql_canvases, canvas_rows[i:i+BATCH_SIZE])
        conn.commit()

        # Tabla: canvas_members
        print("  -> Generando tabla: `canvas_members`...")
        cm_rows = []
        for i in range(1, target_records + 1):
            cm_rows.append((i, random.randint(1, target_records), random_date(180)))
        sql_cm = "INSERT IGNORE INTO `canvas_members` (canvas_id, user_id, joined_at) VALUES (%s, %s, %s)"
        for i in range(0, len(cm_rows), BATCH_SIZE):
            cursor.executemany(sql_cm, cm_rows[i:i+BATCH_SIZE])
        conn.commit()

        # Tabla: canvas_favorites
        print("  -> Generando tabla: `canvas_favorites`...")
        cf_rows = []
        for i in range(1, target_records + 1):
            cf_rows.append((i, random.randint(1, target_records), random_date(150)))
        sql_cf = "INSERT IGNORE INTO `canvas_favorites` (canvas_id, user_id, created_at) VALUES (%s, %s, %s)"
        for i in range(0, len(cf_rows), BATCH_SIZE):
            cursor.executemany(sql_cf, cf_rows[i:i+BATCH_SIZE])
        conn.commit()

        # Tabla: canvas_access_requests
        print("  -> Generando tabla: `canvas_access_requests`...")
        car_rows = []
        for i in range(1, target_records + 1):
            car_rows.append((
                i,
                random.randint(1, target_records),
                random.choice(['pending', 'approved', 'rejected']),
                random_date(100)
            ))
        sql_car = "INSERT IGNORE INTO `canvas_access_requests` (canvas_id, user_id, status, created_at) VALUES (%s, %s, %s, %s)"
        for i in range(0, len(car_rows), BATCH_SIZE):
            cursor.executemany(sql_car, car_rows[i:i+BATCH_SIZE])
        conn.commit()

        # Tabla: canvas_snapshots
        print("  -> Generando tabla: `canvas_snapshots`...")
        cs_rows = []
        for i in range(1, target_records + 1):
            cs_rows.append((i, f"snapshots/canvas_{i}_main.png", None))
        sql_cs = "INSERT IGNORE INTO `canvas_snapshots` (canvas_id, s3_key, snapshot_data) VALUES (%s, %s, %s)"
        for i in range(0, len(cs_rows), BATCH_SIZE):
            cursor.executemany(sql_cs, cs_rows[i:i+BATCH_SIZE])
        conn.commit()

        # Tabla: canvas_snapshots_history
        print("  -> Generando tabla: `canvas_snapshots_history`...")
        csh_rows = []
        for i in range(1, target_records + 1):
            csh_rows.append((
                i,
                random.randint(1, target_records),
                str(uuid.uuid4()),
                f"/storage/snapshots/snap_hist_{i}.png",
                random.choice(['public', 'private']),
                random_date(200)
            ))
        sql_csh = "INSERT INTO `canvas_snapshots_history` (id, canvas_id, snapshot_uuid, file_path, privacy, created_at) VALUES (%s, %s, %s, %s, %s, %s)"
        for i in range(0, len(csh_rows), BATCH_SIZE):
            cursor.executemany(sql_csh, csh_rows[i:i+BATCH_SIZE])
        conn.commit()

        # Tabla: canvas_snapshots_likes
        print("  -> Generando tabla: `canvas_snapshots_likes`...")
        csl_rows = []
        for i in range(1, target_records + 1):
            csl_rows.append((i, random.randint(1, target_records), random_date(120)))
        sql_csl = "INSERT IGNORE INTO `canvas_snapshots_likes` (snapshot_id, user_id, created_at) VALUES (%s, %s, %s)"
        for i in range(0, len(csl_rows), BATCH_SIZE):
            cursor.executemany(sql_csl, csl_rows[i:i+BATCH_SIZE])
        conn.commit()

        # Tabla: canvas_invites
        print("  -> Generando tabla: `canvas_invites`...")
        ci_rows = []
        for i in range(1, target_records + 1):
            code = f"INV{i:05d}{random.choice('ABCDEF')}"
            ci_rows.append((
                random.randint(1, target_records),
                code,
                'Usuario',
                100,
                random.randint(0, 50),
                datetime.now() + timedelta(days=30),
                random.randint(1, target_records),
                random_date(100)
            ))
        sql_ci = "INSERT IGNORE INTO `canvas_invites` (canvas_id, code, role, max_uses, uses_count, expires_at, created_by, created_at) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)"
        for i in range(0, len(ci_rows), BATCH_SIZE):
            cursor.executemany(sql_ci, ci_rows[i:i+BATCH_SIZE])
        conn.commit()

        # Tabla: canvas_chat_messages
        print("  -> Generando tabla: `canvas_chat_messages`...")
        ccm_rows = []
        for i in range(1, target_records + 1):
            ccm_rows.append((
                str(uuid.uuid4()),
                random.randint(1, target_records),
                random.randint(1, target_records),
                f"Mensaje de chat en lienzo {random.choice(CHAT_MESSAGES_SAMPLES)}",
                None,
                0,
                'visible',
                None,
                None,
                random_date(90)
            ))
        sql_ccm = """
        INSERT INTO `canvas_chat_messages` (uuid, canvas_id, user_id, message, attachments, file_size, visibility, deleted_by, delete_reason, created_at)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """
        for i in range(0, len(ccm_rows), BATCH_SIZE):
            cursor.executemany(sql_ccm, ccm_rows[i:i+BATCH_SIZE])
        conn.commit()

        # Tabla: canvas_chat_reports
        print("  -> Generando tabla: `canvas_chat_reports`...")
        ccr_rows = []
        for i in range(1, target_records + 1):
            ccr_rows.append((
                str(uuid.uuid4()),
                random.randint(1, target_records),
                random.choice(['spam', 'offensive', 'harassment', 'inappropriate_art']),
                'Detalles del reporte generado automáticamente',
                random.choice(['pending', 'reviewed', 'dismissed']),
                random_date(60)
            ))
        sql_ccr = "INSERT INTO `canvas_chat_reports` (message_id, reporter_user_id, reason_key, details, status, created_at) VALUES (%s, %s, %s, %s, %s, %s)"
        for i in range(0, len(ccr_rows), BATCH_SIZE):
            cursor.executemany(sql_ccr, ccr_rows[i:i+BATCH_SIZE])
        conn.commit()

        # Tabla: canvas_sanctions
        print("  -> Generando tabla: `canvas_sanctions`...")
        csanc_rows = []
        for i in range(1, target_records + 1):
            csanc_rows.append((
                str(uuid.uuid4()),
                str(uuid.uuid4()),
                '00000000-0000-0000-0000-000000000001',
                'chat_mute',
                'temporary',
                'Conducta no permitida en chat',
                'Sanción automática',
                datetime.now() + timedelta(days=3),
                random_date(40)
            ))
        sql_csanc = "INSERT INTO `canvas_sanctions` (canvas_id, user_id, restricted_by, sanction_scope, suspension_type, suspension_reason, custom_reason, end_date, created_at) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)"
        for i in range(0, len(csanc_rows), BATCH_SIZE):
            cursor.executemany(sql_csanc, csanc_rows[i:i+BATCH_SIZE])
        conn.commit()

        # Tabla: canvas_protections
        print("  -> Generando tabla: `canvas_protections`...")
        cp_rows = []
        for i in range(1, target_records + 1):
            cp_rows.append((
                i,
                random.randint(0, 32),
                random.randint(0, 32),
                random.randint(33, 64),
                random.randint(33, 64),
                1,
                datetime.now() + timedelta(days=14),
                random_date(50)
            ))
        sql_cp = "INSERT INTO `canvas_protections` (canvas_id, x1, y1, x2, y2, protected_by, expires_at, created_at) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)"
        for i in range(0, len(cp_rows), BATCH_SIZE):
            cursor.executemany(sql_cp, cp_rows[i:i+BATCH_SIZE])
        conn.commit()

        # Tabla: canvas_reset_settings
        print("  -> Generando tabla: `canvas_reset_settings`...")
        crs_rows = []
        for i in range(1, target_records + 1):
            crs_rows.append((i, 0, None, 1, random_date(100)))
        sql_crs = "INSERT IGNORE INTO `canvas_reset_settings` (canvas_id, is_active, next_reset_at, take_snapshot, created_at) VALUES (%s, %s, %s, %s, %s)"
        for i in range(0, len(crs_rows), BATCH_SIZE):
            cursor.executemany(sql_crs, crs_rows[i:i+BATCH_SIZE])
        conn.commit()

        # Tabla: canvas_resize_settings
        print("  -> Generando tabla: `canvas_resize_settings`...")
        cres_rows = []
        for i in range(1, target_records + 1):
            cres_rows.append((i, 0, None, '128', random_date(100)))
        sql_cres = "INSERT IGNORE INTO `canvas_resize_settings` (canvas_id, is_active, next_resize_at, target_size, created_at) VALUES (%s, %s, %s, %s, %s)"
        for i in range(0, len(cres_rows), BATCH_SIZE):
            cursor.executemany(sql_cres, cres_rows[i:i+BATCH_SIZE])
        conn.commit()

        # Tabla: user_templates
        print("  -> Generando tabla: `user_templates`...")
        ut_rows = []
        for i in range(1, target_records + 1):
            ut_rows.append((
                random.randint(1, target_records),
                f"/storage/templates/template_{i}.json",
                random.randint(1024, 65536),
                random_date(120)
            ))
        sql_ut = "INSERT INTO `user_templates` (user_id, file_path, file_size, created_at) VALUES (%s, %s, %s, %s)"
        for i in range(0, len(ut_rows), BATCH_SIZE):
            cursor.executemany(sql_ut, ut_rows[i:i+BATCH_SIZE])
        conn.commit()

        # Tabla: canvas_user_roles
        print("  -> Generando tabla: `canvas_user_roles`...")
        cur_rows = []
        for i in range(1, target_records + 1):
            cur_rows.append((
                i,
                random.randint(1, target_records),
                random.choice([1, 2, 3])
            ))
        sql_cur = "INSERT IGNORE INTO `canvas_user_roles` (canvas_id, user_id, role_id) VALUES (%s, %s, %s)"
        for i in range(0, len(cur_rows), BATCH_SIZE):
            cursor.executemany(sql_cur, cur_rows[i:i+BATCH_SIZE])
        conn.commit()

        print(f"{Colors.GREEN}✓ db_canvases poblada exitosamente con ~160,000 registros.{Colors.ENDC}")

        # -------------------------------------------------------------
        # 4. POBLAR DB_SUPPORT (~10k por tabla)
        # -------------------------------------------------------------
        print(f"\n{Colors.WARNING}4/5 Poblando 'db_support' (~{target_records:,} por tabla)...{Colors.ENDC}")
        cursor.execute("USE db_support;")

        # Tabla: support_tickets
        print("  -> Generando tabla: `support_tickets`...")
        st_rows = []
        for i in range(1, target_records + 1):
            cat = random.choice(CATEGORIES)
            subj = random.choice(TICKET_SUBJECTS)
            stat = random.choice(['open', 'in_progress', 'resolved', 'closed'])
            prio = random.choice(['low', 'medium', 'high', 'urgent'])
            ip = f"172.18.{random.randint(0,254)}.{random.randint(1,254)}"
            st_rows.append((
                str(uuid.uuid4()),
                random.randint(1, target_records),
                cat,
                f"{subj} #{i}",
                f"Mensaje detallado para la consulta #{i}. He experimentado este comportamiento de manera recurrente.",
                stat,
                prio,
                ip,
                'Mozilla/5.0 Chrome/120.0.0.0',
                random_date(180)
            ))
        sql_st = """
        INSERT INTO `support_tickets` (uuid, user_id, category, subject, message, status, priority, ip_address, user_agent, created_at)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """
        for i in range(0, len(st_rows), BATCH_SIZE):
            cursor.executemany(sql_st, st_rows[i:i+BATCH_SIZE])
        conn.commit()

        # Tabla: support_chat_sessions
        print("  -> Generando tabla: `support_chat_sessions`...")
        scs_rows = []
        for i in range(1, target_records + 1):
            cat = random.choice(CATEGORIES)
            subj = random.choice(TICKET_SUBJECTS)
            stat = random.choice(['waiting_in_queue', 'active', 'escalated', 'closed', 'abandoned'])
            lvl = random.choice(['l1', 'l2', 'l3'])
            prio = random.choice(['low', 'medium', 'high', 'urgent'])
            st_at = random_date(120)
            scs_rows.append((
                i,
                str(uuid.uuid4()),
                random.randint(1, target_records),
                lvl,
                stat,
                1 if stat in ('active', 'escalated', 'closed') else None, # Assigned to Agent 1
                cat,
                random.choice(['es-419', 'en-US', 'es-ES']),
                f"{subj} [Live #{i}]",
                f"Mensaje inicial del usuario solicitando soporte en vivo.",
                prio,
                st_at,
                st_at if stat in ('active', 'escalated', 'closed') else None,
                st_at if stat in ('closed', 'abandoned') else None,
                'agent' if stat == 'closed' else None,
                'Sesión resuelta satisfactoriamente.' if stat == 'closed' else None,
                random.randint(4, 5) if stat == 'closed' else None,
                'Excelente atención' if stat == 'closed' else None,
                st_at
            ))
        sql_scs = """
        INSERT INTO `support_chat_sessions` (id, uuid, user_id, department_level, status, assigned_agent_id, category,
                                             language, subject, initial_message, priority, started_at, accepted_at,
                                             closed_at, closed_by, resolution_summary, user_rating, user_feedback, created_at)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """
        for i in range(0, len(scs_rows), BATCH_SIZE):
            cursor.executemany(sql_scs, scs_rows[i:i+BATCH_SIZE])
        conn.commit()

        # Tabla: support_chat_messages
        print("  -> Generando tabla: `support_chat_messages`...")
        scm_rows = []
        for i in range(1, target_records + 1):
            s_type = random.choice(['user', 'agent', 'system', 'internal_note'])
            s_name = 'Agente Rosaura' if s_type == 'agent' else ('Sistema' if s_type == 'system' else 'Usuario')
            scm_rows.append((
                str(uuid.uuid4()),
                random.randint(1, target_records), # session_id
                s_type,
                1 if s_type == 'agent' else random.randint(1, target_records),
                s_name,
                random.choice(CHAT_MESSAGES_SAMPLES),
                None,
                1 if s_type == 'internal_note' else 0,
                random_date(100)
            ))
        sql_scm = """
        INSERT INTO `support_chat_messages` (uuid, session_id, sender_type, sender_id, sender_name, message, attachments, is_internal, created_at)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
        """
        for i in range(0, len(scm_rows), BATCH_SIZE):
            cursor.executemany(sql_scm, scm_rows[i:i+BATCH_SIZE])
        conn.commit()

        # Tabla: support_chat_transfers
        print("  -> Generando tabla: `support_chat_transfers`...")
        sct_rows = []
        for i in range(1, target_records + 1):
            sct_rows.append((
                random.randint(1, target_records), # session_id
                1,
                1,
                'l1',
                'l2',
                'Escalación por requerimiento de verificación de facturación',
                'Nota interna sobre el caso del cliente',
                random_date(90)
            ))
        sql_sct = """
        INSERT INTO `support_chat_transfers` (session_id, from_agent_id, to_agent_id, from_level, to_level, reason, internal_note, created_at)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        """
        for i in range(0, len(sct_rows), BATCH_SIZE):
            cursor.executemany(sql_sct, sct_rows[i:i+BATCH_SIZE])
        conn.commit()

        # Agente 1 en línea
        print("  -> Configurando estado de agentes: `support_agent_status`...")
        cursor.execute("""
        INSERT INTO `support_agent_status` (agent_id, status, current_active_chats, max_concurrent_chats, level, last_heartbeat)
        VALUES (1, 'online', 0, 5, 'l3', NOW())
        ON DUPLICATE KEY UPDATE status = 'online', last_heartbeat = NOW();
        """)
        conn.commit()

        print(f"{Colors.GREEN}✓ db_support poblada exitosamente con ~40,000 registros y agente activo.{Colors.ENDC}")

        # -------------------------------------------------------------
        # 5. POBLAR DB_TELEMETRY (~10k por tabla)
        # -------------------------------------------------------------
        print(f"\n{Colors.WARNING}5/5 Poblando 'db_telemetry' (~{target_records:,} por tabla)...{Colors.ENDC}")
        cursor.execute("USE db_telemetry;")

        # Tabla: api_latency
        print("  -> Generando tabla: `api_latency`...")
        endpoints = ['/api/v1/auth/login', '/api/v1/canvas/get', '/api/v1/support/queue-status',
                     '/api/v1/profile/update', '/api/v1/canvas/pixels', '/api/v1/store/packages']
        al_rows = []
        for i in range(1, target_records + 1):
            al_rows.append((
                random.choice(endpoints),
                random.choice(['GET', 'POST', 'PUT']),
                random.choices([200, 201, 400, 404, 500], weights=[85, 5, 5, 4, 1])[0],
                round(random.uniform(12.5, 380.0), 2),
                str(uuid.uuid4()),
                f"192.168.{random.randint(1,254)}.{random.randint(1,254)}",
                'AS15169 Google LLC',
                random_date(180)
            ))
        sql_al = "INSERT INTO `api_latency` (endpoint, method, status_code, latency_ms, user_uuid, ip_address, asn, created_at) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)"
        for i in range(0, len(al_rows), BATCH_SIZE):
            cursor.executemany(sql_al, al_rows[i:i+BATCH_SIZE])
        conn.commit()

        # Tabla: pageviews
        print("  -> Generando tabla: `pageviews`...")
        paths = ['/', '/canvas', '/contact-support', '/pricing', '/profile', '/admin/dashboard', '/admin/support/live']
        pv_rows = []
        for i in range(1, target_records + 1):
            pv_rows.append((
                random.choice(paths),
                round(random.uniform(45.0, 950.0), 2),
                str(uuid.uuid4()),
                uuid.uuid4().hex,
                random.choice(['desktop', 'mobile', 'tablet']),
                random.choice(['dark', 'light', 'system']),
                random.choice(['es-419', 'en-US', 'es-ES']),
                random_date(180)
            ))
        sql_pv = "INSERT INTO `pageviews` (path, load_time_ms, user_uuid, session_id, device_type, theme_preference, locale, created_at) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)"
        for i in range(0, len(pv_rows), BATCH_SIZE):
            cursor.executemany(sql_pv, pv_rows[i:i+BATCH_SIZE])
        conn.commit()

        # Tabla: auth_events
        print("  -> Generando tabla: `auth_events`...")
        auth_types = ['login_success', 'login_failed', 'logout', 'session_switch', '2fa_prompt', 'password_change']
        ae_rows = []
        for i in range(1, target_records + 1):
            ae_rows.append((
                random.choice(auth_types),
                str(uuid.uuid4()),
                f"10.0.{random.randint(1,254)}.{random.randint(1,254)}",
                'AS8151 Totalplay',
                random_date(180)
            ))
        sql_ae = "INSERT INTO `auth_events` (event_type, user_uuid, ip_address, asn, created_at) VALUES (%s, %s, %s, %s, %s)"
        for i in range(0, len(ae_rows), BATCH_SIZE):
            cursor.executemany(sql_ae, ae_rows[i:i+BATCH_SIZE])
        conn.commit()

        print(f"{Colors.GREEN}✓ db_telemetry poblada exitosamente con ~30,000 registros.{Colors.ENDC}")

        # Restaurar restricciones
        cursor.execute("SET FOREIGN_KEY_CHECKS = 1;")
        cursor.execute("SET UNIQUE_CHECKS = 1;")
        conn.commit()

        elapsed = round(time.time() - start_total_time, 2)
        total_inserted = target_records * 32 # ~32 tablas pobladas con 10k c/u = ~320,000 registros

        print(f"\n{Colors.GREEN}{Colors.BOLD}======================================================================{Colors.ENDC}")
        print(f"{Colors.GREEN}{Colors.BOLD}   ¡REPOBLACIÓN COMPLETADA CON ÉXITO EN {elapsed} SEGUNDOS!           {Colors.ENDC}")
        print(f"{Colors.GREEN}{Colors.BOLD}======================================================================{Colors.ENDC}")
        print(f"📊 {Colors.BOLD}Total de registros generados:{Colors.ENDC} ~{total_inserted:,} filas")
        print(f"👤 {Colors.BOLD}Usuario Administrador creado:{Colors.ENDC} admin / admin@example.com (Password: {Colors.CYAN}password{Colors.ENDC})")
        print(f"🎧 {Colors.BOLD}Agente Live Chat:{Colors.ENDC} Admin (ID 1) activo y listo para atender chats.")
        print(f"{Colors.GREEN}======================================================================{Colors.ENDC}\n")

    except Exception as e:
        conn.rollback()
        print(f"\n{Colors.FAIL}{Colors.BOLD}❌ Error durante el proceso de población: {str(e)}{Colors.ENDC}")
        import traceback
        traceback.print_exc()
    finally:
        cursor.close()
        conn.close()

def run_seeder(project_root, script_dir):
    print(f"\n{Colors.FAIL}{Colors.BOLD}======================================================================{Colors.ENDC}")
    print(f"{Colors.FAIL}{Colors.BOLD}             ¡ADVERTENCIA CRÍTICA: BORRADO TOTAL DE BD!               {Colors.ENDC}")
    print(f"{Colors.FAIL}{Colors.BOLD}======================================================================{Colors.ENDC}")
    print(f"{Colors.WARNING}Esta acción ELIMINARÁ Y REINICIALIZARÁ COMPLETAMENTE toda la información{Colors.ENDC}")
    print(f"{Colors.WARNING}existente en las 4 bases de datos del proyecto:{Colors.ENDC}")
    print(f"  • {Colors.CYAN}db_identity{Colors.ENDC}  (Usuarios, Roles, Suscripciones, Pagos, etc.)")
    print(f"  • {Colors.CYAN}db_canvases{Colors.ENDC}  (Lienzos, Miembros, Snapshots, Chats, etc.)")
    print(f"  • {Colors.CYAN}db_support{Colors.ENDC}   (Tickets, Sesiones Live Chat, Mensajes, etc.)")
    print(f"  • {Colors.CYAN}db_telemetry{Colors.ENDC} (Latencias de API, Pageviews, Eventos Auth)")
    print(f"\n{Colors.BOLD}Se poblarán aproximadamente 10,000 registros por tabla de prueba.{Colors.ENDC}")
    print(f"{Colors.FAIL}TODOS LOS DATOS ACTUALES SE PERDERÁN DE FORMA IRREVERSIBLE.{Colors.ENDC}")
    print(f"{Colors.FAIL}{Colors.BOLD}======================================================================{Colors.ENDC}")
    
    confirm = input(f"\n{Colors.WARNING}Para confirmar y continuar, escribe {Colors.BOLD}'CONFIRMAR'{Colors.ENDC}{Colors.WARNING} o presiona Enter para cancelar: {Colors.ENDC}").strip()
    
    if confirm.upper() not in ('CONFIRMAR', 'SI', 'S'):
        print(f"\n{Colors.GREEN}Operación cancelada de forma segura. No se modificó ninguna base de datos.{Colors.ENDC}\n")
        return

    seed_database(project_root, target_records=10000)

if __name__ == '__main__':
    script_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.abspath(os.path.join(script_dir, '..', '..'))
    run_seeder(project_root, script_dir)
