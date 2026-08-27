<?php

namespace App\Core\System;

use App\Config\Database\DatabaseManager;
use App\Core\System\DatabaseConstants as DB;
use App\Core\System\Logger;
use App\Core\Helpers\Utils;
use PDO;
use Exception;

class DatabaseHealingService {
    private DatabaseManager $dbManager;
    private PDO $pdoIdentity;
    private PDO $pdoCanvases;

    public function __construct(DatabaseManager $dbManager) {
        $this->dbManager = $dbManager;
        $this->pdoIdentity = $dbManager->getConnection(DB::CONN_IDENTITY);
        $this->pdoCanvases = $dbManager->getConnection(DB::CONN_CANVASES);
    }

    /**
     * Auto-sana un usuario específico comprobando rol, preferencias, restricciones y UUID.
     */
    public function healUser(int $userId): array {
        $repaired = [];
        try {
            $stmtUser = $this->pdoIdentity->prepare("SELECT id, uuid, username, email FROM " . DB::TBL_USERS . " WHERE id = ? LIMIT 1");
            $stmtUser->execute([$userId]);
            $user = $stmtUser->fetch(PDO::FETCH_ASSOC);

            if (!$user) {
                return ['success' => false, 'message' => 'User not found'];
            }

            // 1. UUID
            if (empty($user['uuid'])) {
                $newUuid = Utils::generateUUID();
                $this->pdoIdentity->prepare("UPDATE " . DB::TBL_USERS . " SET uuid = ? WHERE id = ?")->execute([$newUuid, $userId]);
                $repaired[] = 'uuid_generated';
            }

            // 2. Roles
            $stmtRole = $this->pdoIdentity->prepare("SELECT 1 FROM " . DB::TBL_USER_ROLES . " WHERE user_id = ? LIMIT 1");
            $stmtRole->execute([$userId]);
            if (!$stmtRole->fetchColumn()) {
                $this->pdoIdentity->prepare("INSERT IGNORE INTO " . DB::TBL_USER_ROLES . " (user_id, role_id) VALUES (?, 1)")->execute([$userId]);
                $repaired[] = 'default_role_assigned';
            }

            // 3. Preferencias
            $stmtPref = $this->pdoIdentity->prepare("SELECT 1 FROM " . DB::TBL_USER_PREFERENCES . " WHERE user_id = ? LIMIT 1");
            $stmtPref->execute([$userId]);
            if (!$stmtPref->fetchColumn()) {
                $this->pdoIdentity->prepare("INSERT IGNORE INTO " . DB::TBL_USER_PREFERENCES . " (user_id, language, theme, open_links_new_tab, extended_alerts, allow_telemetry) VALUES (?, 'es-419', 'system', 1, 0, 1)")->execute([$userId]);
                $repaired[] = 'preferences_created';
            }

            // 4. Restricciones
            $stmtRestr = $this->pdoIdentity->prepare("SELECT 1 FROM " . DB::TBL_USER_RESTRICTIONS . " WHERE user_id = ? LIMIT 1");
            $stmtRestr->execute([$userId]);
            if (!$stmtRestr->fetchColumn()) {
                $this->pdoIdentity->prepare("INSERT IGNORE INTO " . DB::TBL_USER_RESTRICTIONS . " (user_id, is_suspended) VALUES (?, 0)")->execute([$userId]);
                $repaired[] = 'restrictions_created';
            }

            return ['success' => true, 'repaired' => $repaired];
        } catch (Exception $e) {
            Logger::error("DatabaseHealingService healUser exception: " . $e->getMessage(), ['user_id' => $userId]);
            return ['success' => false, 'error' => $e->getMessage()];
        }
    }

    /**
     * Auto-sana un lienzo específico comprobando membresía del dueño, rol de dueño y configuraciones base.
     */
    public function healCanvas(int $canvasId): array {
        $repaired = [];
        try {
            $stmt = $this->pdoCanvases->prepare("SELECT id, uuid, owner_id, size, created_at FROM " . DB::TBL_CANVASES . " WHERE id = ? LIMIT 1");
            $stmt->execute([$canvasId]);
            $canvas = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$canvas) {
                return ['success' => false, 'message' => 'Canvas not found'];
            }

            $ownerId = !empty($canvas['owner_id']) ? (int)$canvas['owner_id'] : null;

            if ($ownerId) {
                // 1. Membresía del dueño
                $stmtM = $this->pdoCanvases->prepare("SELECT 1 FROM " . DB::TBL_CANVAS_MEMBERS . " WHERE canvas_id = ? AND user_id = ? LIMIT 1");
                $stmtM->execute([$canvasId, $ownerId]);
                if (!$stmtM->fetchColumn()) {
                    $this->pdoCanvases->prepare("INSERT IGNORE INTO " . DB::TBL_CANVAS_MEMBERS . " (canvas_id, user_id, joined_at) VALUES (?, ?, ?)")
                                      ->execute([$canvasId, $ownerId, $canvas['created_at'] ?? date('Y-m-d H:i:s')]);
                    $repaired[] = 'owner_member_added';
                }

                // 2. Rol del dueño en el lienzo (SuperAdmin / rol 4)
                $stmtR = $this->pdoCanvases->prepare("SELECT 1 FROM " . DB::TBL_CANVAS_USER_ROLES . " WHERE canvas_id = ? AND user_id = ? LIMIT 1");
                $stmtR->execute([$canvasId, $ownerId]);
                if (!$stmtR->fetchColumn()) {
                    $this->pdoCanvases->prepare("INSERT IGNORE INTO " . DB::TBL_CANVAS_USER_ROLES . " (canvas_id, user_id, role_id) VALUES (?, ?, 4)")
                                      ->execute([$canvasId, $ownerId]);
                    $repaired[] = 'owner_role_assigned';
                }
            }

            // 3. Reset settings
            $stmtReset = $this->pdoCanvases->prepare("SELECT 1 FROM " . DB::TBL_CANVAS_RESET_SETTINGS . " WHERE canvas_id = ? LIMIT 1");
            $stmtReset->execute([$canvasId]);
            if (!$stmtReset->fetchColumn()) {
                $this->pdoCanvases->prepare("INSERT IGNORE INTO " . DB::TBL_CANVAS_RESET_SETTINGS . " (canvas_id, is_active, take_snapshot) VALUES (?, 0, 1)")
                                  ->execute([$canvasId]);
                $repaired[] = 'reset_settings_initialized';
            }

            // 4. Resize settings
            $stmtResize = $this->pdoCanvases->prepare("SELECT 1 FROM " . DB::TBL_CANVAS_RESIZE_SETTINGS . " WHERE canvas_id = ? LIMIT 1");
            $stmtResize->execute([$canvasId]);
            if (!$stmtResize->fetchColumn()) {
                $this->pdoCanvases->prepare("INSERT IGNORE INTO " . DB::TBL_CANVAS_RESIZE_SETTINGS . " (canvas_id, is_active, target_size) VALUES (?, 0, ?)")
                                  ->execute([$canvasId, $canvas['size'] ?? '64']);
                $repaired[] = 'resize_settings_initialized';
            }

            return ['success' => true, 'repaired' => $repaired];
        } catch (Exception $e) {
            Logger::error("DatabaseHealingService healCanvas exception: " . $e->getMessage(), ['canvas_id' => $canvasId]);
            return ['success' => false, 'error' => $e->getMessage()];
        }
    }

    /**
     * Auto-sana todos los usuarios existentes en la base de datos.
     */
    public function healAllUsers(): array {
        $stats = ['roles_added' => 0, 'prefs_added' => 0, 'restr_added' => 0, 'uuids_generated' => 0];

        // 1. Roles faltantes
        $stmt = $this->pdoIdentity->prepare("
            INSERT IGNORE INTO " . DB::TBL_USER_ROLES . " (user_id, role_id)
            SELECT u.id, 1 FROM " . DB::TBL_USERS . " u
            LEFT JOIN " . DB::TBL_USER_ROLES . " ur ON u.id = ur.user_id
            WHERE ur.user_id IS NULL
        ");
        $stmt->execute();
        $stats['roles_added'] = $stmt->rowCount();

        // 2. Preferencias faltantes
        $stmt = $this->pdoIdentity->prepare("
            INSERT IGNORE INTO " . DB::TBL_USER_PREFERENCES . " (user_id, language, theme, open_links_new_tab, extended_alerts, allow_telemetry)
            SELECT u.id, 'es-419', 'system', 1, 0, 1 FROM " . DB::TBL_USERS . " u
            LEFT JOIN " . DB::TBL_USER_PREFERENCES . " up ON u.id = up.user_id
            WHERE up.user_id IS NULL
        ");
        $stmt->execute();
        $stats['prefs_added'] = $stmt->rowCount();

        // 3. Restricciones faltantes
        $stmt = $this->pdoIdentity->prepare("
            INSERT IGNORE INTO " . DB::TBL_USER_RESTRICTIONS . " (user_id, is_suspended)
            SELECT u.id, 0 FROM " . DB::TBL_USERS . " u
            LEFT JOIN " . DB::TBL_USER_RESTRICTIONS . " ur ON u.id = ur.user_id
            WHERE ur.user_id IS NULL
        ");
        $stmt->execute();
        $stats['restr_added'] = $stmt->rowCount();

        return $stats;
    }

    /**
     * Auto-sana todos los lienzos existentes sincronizando miembros y roles de dueños.
     */
    public function healAllCanvases(): array {
        $stats = ['members_added' => 0, 'roles_added' => 0, 'reset_added' => 0, 'resize_added' => 0];

        // 1. Dueños no registrados en canvas_members
        $stmt = $this->pdoCanvases->prepare("
            INSERT IGNORE INTO " . DB::TBL_CANVAS_MEMBERS . " (canvas_id, user_id, joined_at)
            SELECT c.id, c.owner_id, c.created_at FROM " . DB::TBL_CANVASES . " c
            LEFT JOIN " . DB::TBL_CANVAS_MEMBERS . " cm ON c.id = cm.canvas_id AND c.owner_id = cm.user_id
            WHERE c.owner_id IS NOT NULL AND cm.user_id IS NULL
        ");
        $stmt->execute();
        $stats['members_added'] = $stmt->rowCount();

        // 2. Dueños sin rol SuperAdmin en canvas_user_roles
        $stmt = $this->pdoCanvases->prepare("
            INSERT IGNORE INTO " . DB::TBL_CANVAS_USER_ROLES . " (canvas_id, user_id, role_id)
            SELECT c.id, c.owner_id, 4 FROM " . DB::TBL_CANVASES . " c
            LEFT JOIN " . DB::TBL_CANVAS_USER_ROLES . " cur ON c.id = cur.canvas_id AND c.owner_id = cur.user_id
            WHERE c.owner_id IS NOT NULL AND cur.user_id IS NULL
        ");
        $stmt->execute();
        $stats['roles_added'] = $stmt->rowCount();

        // 3. Reset settings
        $stmt = $this->pdoCanvases->prepare("
            INSERT IGNORE INTO " . DB::TBL_CANVAS_RESET_SETTINGS . " (canvas_id, is_active, take_snapshot)
            SELECT c.id, 0, 1 FROM " . DB::TBL_CANVASES . " c
            LEFT JOIN " . DB::TBL_CANVAS_RESET_SETTINGS . " crs ON c.id = crs.canvas_id
            WHERE crs.canvas_id IS NULL
        ");
        $stmt->execute();
        $stats['reset_added'] = $stmt->rowCount();

        // 4. Resize settings
        $stmt = $this->pdoCanvases->prepare("
            INSERT IGNORE INTO " . DB::TBL_CANVAS_RESIZE_SETTINGS . " (canvas_id, is_active, target_size)
            SELECT c.id, 0, c.size FROM " . DB::TBL_CANVASES . " c
            LEFT JOIN " . DB::TBL_CANVAS_RESIZE_SETTINGS . " cres ON c.id = cres.canvas_id
            WHERE cres.canvas_id IS NULL
        ");
        $stmt->execute();
        $stats['resize_added'] = $stmt->rowCount();

        return $stats;
    }

    /**
     * Recalcula y sincroniza contadores en caché (members_count, favorites_count).
     */
    public function recalculateCounters(): array {
        $this->pdoCanvases->exec("
            UPDATE " . DB::TBL_CANVASES . " c 
            SET members_count = (
                SELECT COUNT(*) FROM " . DB::TBL_CANVAS_MEMBERS . " cm 
                WHERE cm.canvas_id = c.id
            )
        ");

        $this->pdoCanvases->exec("
            UPDATE " . DB::TBL_CANVASES . " c 
            SET favorites_count = (
                SELECT COUNT(*) FROM " . DB::TBL_CANVAS_FAVORITES . " cf 
                WHERE cf.canvas_id = c.id
            )
        ");

        return ['success' => true];
    }

    /**
     * Limpieza de huérfanos entre bases de datos diferentes.
     */
    public function cleanCrossDatabaseOrphans(): array {
        $stats = ['orphans_cleaned' => 0];

        $stmt = $this->pdoIdentity->query("SELECT id FROM " . DB::TBL_USERS);
        $activeUserIds = $stmt->fetchAll(PDO::FETCH_COLUMN);

        if (!empty($activeUserIds)) {
            $placeholders = implode(',', array_fill(0, count($activeUserIds), '?'));

            $stmt = $this->pdoCanvases->prepare("DELETE FROM " . DB::TBL_CANVAS_MEMBERS . " WHERE user_id NOT IN ({$placeholders})");
            $stmt->execute($activeUserIds);
            $stats['orphans_cleaned'] += $stmt->rowCount();

            $stmt = $this->pdoCanvases->prepare("DELETE FROM " . DB::TBL_CANVAS_USER_ROLES . " WHERE user_id NOT IN ({$placeholders})");
            $stmt->execute($activeUserIds);
            $stats['orphans_cleaned'] += $stmt->rowCount();

            $stmt = $this->pdoCanvases->prepare("DELETE FROM " . DB::TBL_CANVAS_FAVORITES . " WHERE user_id NOT IN ({$placeholders})");
            $stmt->execute($activeUserIds);
            $stats['orphans_cleaned'] += $stmt->rowCount();
        }

        return $stats;
    }

    /**
     * Ejecuta una auto-sanación completa de todo el ecosistema de base de datos.
     */
    public function healAll(): array {
        $users = $this->healAllUsers();
        $canvases = $this->healAllCanvases();
        $counters = $this->recalculateCounters();
        $orphans = $this->cleanCrossDatabaseOrphans();

        return [
            'success'  => true,
            'users'    => $users,
            'canvases' => $canvases,
            'counters' => $counters,
            'orphans'  => $orphans
        ];
    }
}
