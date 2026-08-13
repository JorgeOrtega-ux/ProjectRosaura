<?php

namespace App\Core\System;

/**
 * CacheInvalidator — directorio centralizado de invalidaciones de caché.
 *
 * Cada método encapsula el conjunto completo de claves Redis que deben
 * eliminarse cuando cambia una entidad determinada.  Todos los repositorios
 * y servicios deben usar esta clase en lugar de llamar a $redis->del() de
 * forma dispersa.
 *
 * Uso:
 *   $inv = new CacheInvalidator($redisClient);
 *   $inv->user(42, 'some-uuid');
 *   $inv->canvas(7);
 */
class CacheInvalidator {

    /** @var \Predis\ClientInterface|\Redis|null */
    private $redis;

    public function __construct($redis) {
        $this->redis = $redis;
    }

    // -------------------------------------------------------------------------
    // Usuario
    // -------------------------------------------------------------------------

    /**
     * Invalida todas las claves de caché relacionadas con el perfil de un usuario.
     *
     * Debe llamarse siempre que se modifique cualquier campo de la tabla users,
     * user_restrictions, o cuando cambien sus roles/permisos.
     *
     * @param int         $userId   ID numérico del usuario.
     * @param string|null $uuid     UUID del usuario (si se conoce; evita un SELECT extra).
     */
    public function user(int $userId, ?string $uuid = null): void {
        if (!$this->redis) return;
        try {
            // Perfil (indexado por ID numérico y por UUID)
            $this->redis->del(CacheConstants::PREFIX_USER_PROFILE . $userId);
            $this->redis->del(CacheConstants::PREFIX_USER_TEMPLATE_TOKENS . $userId);

            if ($uuid) {
                $this->redis->del(CacheConstants::PREFIX_USER_PROFILE . $uuid);
            }

            // Roles y permisos RBAC
            $this->redis->del(CacheConstants::PREFIX_USER_ROLES        . $userId);
            $this->redis->del(CacheConstants::PREFIX_USER_PERMS        . $userId);
            $this->redis->del(CacheConstants::PREFIX_USER_HIGHEST_ROLE . $userId);

            // Almacenamiento
            $this->redis->del(CacheConstants::PREFIX_USER_STORAGE . $userId);
        } catch (\Throwable $e) {}
    }

    // -------------------------------------------------------------------------
    // Perks de usuario
    // -------------------------------------------------------------------------

    /**
     * Invalida el caché de perks (beneficios comprados) de un usuario.
     */
    public function userPerks(int $userId): void {
        if (!$this->redis) return;
        try {
            $this->redis->del(CacheConstants::PREFIX_USER_PERKS . CacheConstants::SUBKEY_PERKS_ALL    . $userId);
            $this->redis->del(CacheConstants::PREFIX_USER_PERKS . CacheConstants::SUBKEY_PERKS_UNUSED . $userId);
        } catch (\Throwable $e) {}
    }

    // -------------------------------------------------------------------------
    // Suscripción de usuario
    // -------------------------------------------------------------------------

    /**
     * Invalida el caché de suscripción de un usuario.
     */
    public function userSubscription(int $userId): void {
        if (!$this->redis) return;
        try {
            $this->redis->del(CacheConstants::PREFIX_USER_SUBSCRIPTION . $userId);
        } catch (\Throwable $e) {}
    }

    // -------------------------------------------------------------------------
    // Canvas individual
    // -------------------------------------------------------------------------

    /**
     * Invalida el caché de detalle de un canvas y las primeras páginas de
     * listados públicos que podrían contenerlo.
     *
     * @param int $canvasId ID del canvas.
     */
    public function canvas(int $canvasId): void {
        if (!$this->redis) return;
        try {
            $this->redis->del(CacheConstants::PREFIX_CANVAS_DETAIL . $canvasId);
            $this->redis->del(CacheConstants::PREFIX_CANVAS_RESET_SETTINGS . $canvasId);
            $this->redis->del(CacheConstants::PREFIX_CANVAS_RESIZE_SETTINGS . $canvasId);
            $this->redis->del("canvas:{$canvasId}:config");

            // Invalida detalle por UUID
            $uuidKeys = $this->redis->keys(CacheConstants::PREFIX_CANVAS_DETAIL . 'uuid:*');
            if (!empty($uuidKeys)) {
                $this->redis->del($uuidKeys);
            }

            // Invalida vistas PHP iniciales y preloads de layout
            $viewKeys = $this->redis->keys('canvas:view_data:*');
            if (!empty($viewKeys)) {
                $this->redis->del($viewKeys);
            }
            $preloadKeys = $this->redis->keys('canvas:layout_preload:*');
            if (!empty($preloadKeys)) {
                $this->redis->del($preloadKeys);
            }

            // Invalida todas las respuestas de getCanvas cacheadas por usuario para este lienzo
            $metaPattern = CacheConstants::PREFIX_CANVAS_META . $canvasId . CacheConstants::SUFFIX_CANVAS_META_USER . '*';
            $metaKeys = $this->redis->keys($metaPattern);
            if (!empty($metaKeys)) {
                $this->redis->del($metaKeys);
            }

            // Primeras páginas de listados públicos
            foreach (['newest', 'oldest', 'members'] as $sort) {
                foreach ([20, 50] as $lim) {
                    $this->redis->del(CacheConstants::PREFIX_CANVAS_PUBLIC_PAGE . "{$sort}:{$lim}:0");
                }
            }

            // Feeds públicos/home
            $homeKeys = $this->redis->keys(CacheConstants::PREFIX_CANVAS_HOME_FEED . '*');
            if (!empty($homeKeys)) {
                $this->redis->del($homeKeys);
            }
        } catch (\Throwable $e) {}
    }

    // -------------------------------------------------------------------------
    // Lista de canvases de un usuario (dashboard / counts)
    // -------------------------------------------------------------------------

    /**
     * Invalida los listados, contadores y home feed relacionados con un usuario.
     *
     * @param int $userId ID del usuario propietario/miembro.
     */
    public function userCanvasList(int $userId): void {
        if (!$this->redis) return;
        try {
            $this->redis->del(CacheConstants::PREFIX_CANVAS_COUNT . $userId);

            // Contadores por tier (0-3)
            for ($t = 0; $t <= 3; $t++) {
                $this->redis->del(CacheConstants::PREFIX_CANVAS_TIER_COUNT . "{$userId}:{$t}");
            }

            // Dashboard paginado — primeras páginas con ambos límites habituales
            foreach (['all', 'mine', 'joined', 'favorites'] as $filter) {
                $this->redis->del(CacheConstants::PREFIX_CANVAS_DASHBOARD . "u{$userId}:{$filter}:20:0");
                $this->redis->del(CacheConstants::PREFIX_CANVAS_DASHBOARD . "u{$userId}:{$filter}:50:0");
            }

            // Home feed (usa pattern scan)
            $keys = $this->redis->keys(CacheConstants::PREFIX_CANVAS_HOME_FEED . '*');
            if (!empty($keys)) {
                $this->redis->del($keys);
            }
        } catch (\Throwable $e) {}
    }

    // -------------------------------------------------------------------------
    // Membresía de un usuario en un canvas
    // -------------------------------------------------------------------------

    /**
     * Invalida todas las claves relacionadas con la membresía de un usuario en
     * un canvas concreto: meta, roles, peso, permisos individuales y contadores.
     *
     * @param int $canvasId ID del canvas.
     * @param int $userId   ID del usuario miembro.
     */
    public function canvasMember(int $canvasId, int $userId): void {
        if (!$this->redis) return;
        try {
            // Meta y roles dentro del canvas
            $metaKey = CacheConstants::PREFIX_CANVAS_META . $canvasId
                     . CacheConstants::SUFFIX_CANVAS_META_USER . $userId;
            $this->redis->del($metaKey);
            $this->redis->del(CacheConstants::PREFIX_CANVAS_MEMBER_ROLES . "{$canvasId}:{$userId}");

            // Peso del usuario en el canvas
            $weightKey = CacheConstants::PREFIX_CANVAS_WEIGHT . $userId
                       . CacheConstants::INFIX_CANVAS_WEIGHT  . $canvasId;
            $this->redis->del($weightKey);

            // Permisos individuales dentro del canvas
            $perms = [
                'place_pixels', 'manage_settings', 'manage_members', 'manage_roles',
                'assign_roles', 'view_history', 'manage_resets', 'manage_sanctions',
                'manage_invites', 'create_snapshots',
            ];
            foreach ($perms as $p) {
                $this->redis->del(CacheConstants::PREFIX_CANVAS_PERMISSION . "{$canvasId}:{$userId}:" . md5($p));
            }

            // Contadores y listados del usuario (su participación cambió)
            $this->userCanvasList($userId);
        } catch (\Throwable $e) {}
    }

    // -------------------------------------------------------------------------
    // Configuración del servidor
    // -------------------------------------------------------------------------

    /**
     * Invalida la caché de configuración del servidor.
     */
    public function serverConfig(): void {
        if (!$this->redis) return;
        try {
            $this->redis->del(CacheConstants::KEY_SERVER_CONFIG);
        } catch (\Throwable $e) {}
    }

    // -------------------------------------------------------------------------
    // Monedas, Historial de Pagos, Almacenamiento y Paletas
    // -------------------------------------------------------------------------

    /**
     * Invalida el caché de monedas de un usuario.
     */
    public function userCoins(int $userId): void {
        if (!$this->redis) return;
        try {
            $this->redis->del(CacheConstants::PREFIX_STORE_COINS . $userId);
        } catch (\Throwable $e) {}
    }

    /**
     * Invalida el caché de historial de pagos de un usuario.
     */
    public function userPaymentHistory(int $userId): void {
        if (!$this->redis) return;
        try {
            $this->redis->del(CacheConstants::PREFIX_USER_PAYMENT_HISTORY . $userId);
        } catch (\Throwable $e) {}
    }

    // -------------------------------------------------------------------------
    // Roles y Permisos Globales (RBAC)
    // -------------------------------------------------------------------------

    /**
     * Invalida la lista global de roles y permisos del sistema.
     */
    public function globalRoles(): void {
        if (!$this->redis) return;
        try {
            $this->redis->del(CacheConstants::PREFIX_ROLES_ALL);
            $this->redis->del(CacheConstants::PREFIX_ALL_PERMISSIONS);
        } catch (\Throwable $e) {}
    }

    /**
     * Invalida el caché de un rol global concreto.
     *
     * @param int         $roleId   ID del rol.
     * @param string|null $roleName Nombre del rol (opcional).
     */
    public function globalRole(int $roleId, ?string $roleName = null): void {
        if (!$this->redis) return;
        try {
            $this->redis->del(CacheConstants::PREFIX_ROLE_BY_ID . $roleId);
            $this->redis->del(CacheConstants::PREFIX_ROLE_PERMS . $roleId);
            $this->redis->del(CacheConstants::PREFIX_ROLES_ALL);
            $this->redis->del(CacheConstants::PREFIX_ALL_PERMISSIONS);
            if ($roleName !== null) {
                $this->redis->del(CacheConstants::PREFIX_ROLE_BY_NAME . $roleName);
            }
        } catch (\Throwable $e) {}
    }

    /**
     * Invalida la lista global de permisos del sistema.
     */
    public function globalPermissions(): void {
        if (!$this->redis) return;
        try {
            $this->redis->del(CacheConstants::PREFIX_ALL_PERMISSIONS);
            $this->redis->del(CacheConstants::PREFIX_ROLES_ALL);
        } catch (\Throwable $e) {}
    }

    // -------------------------------------------------------------------------
    // Roles de Canvas y Snapshots
    // -------------------------------------------------------------------------

    /**
     * Invalida la lista de roles asociados a un lienzo (o los roles globales de lienzo).
     *
     * @param int|null $canvasId ID del lienzo (null para globales de lienzo).
     */
    public function canvasRoles(?int $canvasId = null): void {
        if (!$this->redis) return;
        try {
            $this->redis->del(CacheConstants::PREFIX_CANVAS_ROLES_LIST . ($canvasId ?? 'global'));
            $this->redis->del(CacheConstants::PREFIX_CANVAS_ROLES_LIST . 'global');
        } catch (\Throwable $e) {}
    }

    /**
     * Invalida el listado de snapshots/capturas de un lienzo.
     *
     * @param int $canvasId ID del lienzo.
     */
    public function canvasSnapshots(int $canvasId): void {
        if (!$this->redis) return;
        try {
            $this->redis->del(CacheConstants::PREFIX_CANVAS_SNAPSHOTS . $canvasId);
        } catch (\Throwable $e) {}
    }

    /**
     * Invalida las restricciones y bans de un usuario en un lienzo concreto.
     *
     * @param int $canvasId ID del lienzo.
     * @param int $userId   ID del usuario.
     */
    public function canvasSanctions(int $canvasId, int $userId): void {
        if (!$this->redis) return;
        try {
            $this->redis->del(sprintf(CacheConstants::PREFIX_CANVAS_BANNED, $canvasId, $userId));
            $this->redis->del(sprintf(CacheConstants::PREFIX_CHAT_RESTRICTED, $canvasId, $userId));
        } catch (\Throwable $e) {}
    }

    /**
     * Invalida la caché de todos los perfiles de usuario (usado en cambios globales de planes/suscripciones).
     */
    public function allUsers(): void {
        if (!$this->redis) return;
        try {
            $keys = $this->redis->keys('user:*');
            if (!empty($keys)) {
                $this->redis->del($keys);
            }
        } catch (\Throwable $e) {}
    }

    /**
     * Invalida el caché de almacenamiento de un usuario.
     */
    public function userStorage(int $userId): void {
        if (!$this->redis) return;
        try {
            $this->redis->del(CacheConstants::PREFIX_USER_STORAGE . $userId);
        } catch (\Throwable $e) {}
    }

    /**
     * Invalida el caché de paletas de un usuario.
     */
    public function userPalettes(int $userId): void {
        if (!$this->redis) return;
        try {
            $this->redis->del(CacheConstants::PREFIX_USER_PALETTE . $userId);
        } catch (\Throwable $e) {}
    }
}
?>
