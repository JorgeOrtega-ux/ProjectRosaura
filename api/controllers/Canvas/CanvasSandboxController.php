<?php

namespace App\Api\Controllers\Canvas;

use App\Api\Controllers\BaseController;
use App\Config\Database\DatabaseManager;
use App\Core\Interfaces\SessionManagerInterface;
use App\Core\System\DatabaseConstants as DB;
use PDO;

class CanvasSandboxController extends BaseController {
    private $dbManager;
    private $session;

    public function __construct(DatabaseManager $dbManager, SessionManagerInterface $session) {
        $this->dbManager = $dbManager;
        $this->session = $session;
    }

    public function sync_list($input) {
        try {
            if (!$this->session->isLoggedIn()) {
                return $this->respond([
                    'success' => false,
                    'message' => __('err_auth_required'),
                    'http_code' => 401
                ]);
            }

            $userId = $this->session->getActiveAccountId();
            $sandboxes = $input['sandboxes'] ?? [];

            $pdo = $this->dbManager->getConnection(DB::CONN_CANVASES);

            if (!empty($sandboxes) && is_array($sandboxes)) {
                $sqlInsert = "INSERT INTO user_sandboxes (uuid, user_id, name, width, height, palette_id, cooldown_batch)
                              VALUES (:uuid, :user_id, :name, :width, :height, :palette_id, :cooldown_batch)
                              ON DUPLICATE KEY UPDATE
                              user_id = :user_id_upd,
                              name = :name_upd,
                              width = :width_upd,
                              height = :height_upd,
                              palette_id = :palette_id_upd,
                              cooldown_batch = :cooldown_batch_upd";

                $stmt = $pdo->prepare($sqlInsert);

                foreach ($sandboxes as $sb) {
                    $uuid = $sb['uuid'] ?? null;
                    if (!$uuid) continue;

                    // Verify owner if it exists before overwrite (prevent syncing onto someone else's sandbox)
                    $chkStmt = $pdo->prepare("SELECT user_id FROM user_sandboxes WHERE uuid = ?");
                    $chkStmt->execute([$uuid]);
                    $existingUserId = $chkStmt->fetchColumn();

                    if ($existingUserId !== false && (int)$existingUserId !== (int)$userId) {
                        continue; // Skip if owned by someone else
                    }

                    $stmt->execute([
                        ':uuid' => $uuid,
                        ':user_id' => $userId,
                        ':name' => $sb['name'] ?? 'Sandbox',
                        ':width' => (int)($sb['width'] ?? ($sb['size'] ?? 64)),
                        ':height' => (int)($sb['height'] ?? ($sb['size'] ?? 64)),
                        ':palette_id' => $sb['palette'] ?? ($sb['paletteId'] ?? 'default'),
                        ':cooldown_batch' => (int)($sb['cooldownBatch'] ?? ($sb['cooldown_batch'] ?? 100)),
                        ':user_id_upd' => $userId,
                        ':name_upd' => $sb['name'] ?? 'Sandbox',
                        ':width_upd' => (int)($sb['width'] ?? ($sb['size'] ?? 64)),
                        ':height_upd' => (int)($sb['height'] ?? ($sb['size'] ?? 64)),
                        ':palette_id_upd' => $sb['palette'] ?? ($sb['paletteId'] ?? 'default'),
                        ':cooldown_batch_upd' => (int)($sb['cooldownBatch'] ?? ($sb['cooldown_batch'] ?? 100))
                    ]);
                }
            }

            // Retrieve current cloud list
            $selStmt = $pdo->prepare("SELECT uuid, name, width, height, palette_id as palette, cooldown_batch as cooldownBatch FROM user_sandboxes WHERE user_id = ?");
            $selStmt->execute([$userId]);
            $list = $selStmt->fetchAll(PDO::FETCH_ASSOC);

            return $this->respond([
                'success' => true,
                'sandboxes' => $list
            ]);

        } catch (\Throwable $e) {
            return $this->handleException($e, __FUNCTION__);
        }
    }

    public function sync_state($input) {
        try {
            if (!$this->session->isLoggedIn()) {
                return $this->respond([
                    'success' => false,
                    'message' => __('err_auth_required'),
                    'http_code' => 401
                ]);
            }

            $userId = $this->session->getActiveAccountId();
            $uuid = $input['uuid'] ?? null;
            $settings = $input['settings'] ?? null;
            $chunks = $input['chunks'] ?? [];

            if (!$uuid) {
                return $this->respond([
                    'success' => false,
                    'message' => __('err_uuid_missing')
                ]);
            }

            $pdo = $this->dbManager->getConnection(DB::CONN_CANVASES);

            // Verify owner
            $chkStmt = $pdo->prepare("SELECT user_id FROM user_sandboxes WHERE uuid = ?");
            $chkStmt->execute([$uuid]);
            $existingUserId = $chkStmt->fetchColumn();

            if ($existingUserId !== false && (int)$existingUserId !== (int)$userId) {
                return $this->respond([
                    'success' => false,
                    'message' => __('err_unauthorized'),
                    'http_code' => 403
                ]);
            }

            $pdo->beginTransaction();

            // Insert/update settings if sent
            if ($settings) {
                $sqlSettings = "INSERT INTO user_sandboxes (uuid, user_id, name, width, height, palette_id, cooldown_batch)
                                VALUES (:uuid, :user_id, :name, :width, :height, :palette_id, :cooldown_batch)
                                ON DUPLICATE KEY UPDATE
                                name = :name_upd,
                                width = :width_upd,
                                height = :height_upd,
                                palette_id = :palette_id_upd,
                                cooldown_batch = :cooldown_batch_upd";

                $stmtSettings = $pdo->prepare($sqlSettings);
                $stmtSettings->execute([
                    ':uuid' => $uuid,
                    ':user_id' => $userId,
                    ':name' => $settings['name'] ?? 'Sandbox',
                    ':width' => (int)($settings['width'] ?? 64),
                    ':height' => (int)($settings['height'] ?? 64),
                    ':palette_id' => $settings['paletteId'] ?? 'default',
                    ':cooldown_batch' => (int)($settings['cooldownBatch'] ?? 100),
                    ':name_upd' => $settings['name'] ?? 'Sandbox',
                    ':width_upd' => (int)($settings['width'] ?? 64),
                    ':height_upd' => (int)($settings['height'] ?? 64),
                    ':palette_id_upd' => $settings['paletteId'] ?? 'default',
                    ':cooldown_batch_upd' => (int)($settings['cooldownBatch'] ?? 100)
                ]);
            }

            // Insert/update chunks
            if (!empty($chunks) && is_array($chunks)) {
                $sqlChunk = "INSERT INTO user_sandbox_chunks (sandbox_uuid, chunk_key, data)
                             VALUES (:sandbox_uuid, :chunk_key, :data)
                             ON DUPLICATE KEY UPDATE
                             data = :data_upd";
                $stmtChunk = $pdo->prepare($sqlChunk);

                foreach ($chunks as $key => $base64Data) {
                    $stmtChunk->execute([
                        ':sandbox_uuid' => $uuid,
                        ':chunk_key' => $key,
                        ':data' => $base64Data,
                        ':data_upd' => $base64Data
                    ]);
                }
            }

            $pdo->commit();

            return $this->respond([
                'success' => true
            ]);

        } catch (\Throwable $e) {
            if (isset($pdo) && $pdo->inTransaction()) {
                $pdo->rollBack();
            }
            return $this->handleException($e, __FUNCTION__);
        }
    }

    public function get_state($input) {
        try {
            if (!$this->session->isLoggedIn()) {
                return $this->respond([
                    'success' => false,
                    'message' => __('err_auth_required'),
                    'http_code' => 401
                ]);
            }

            $userId = $this->session->getActiveAccountId();
            $uuid = $input['uuid'] ?? null;

            if (!$uuid) {
                return $this->respond([
                    'success' => false,
                    'message' => __('err_uuid_missing')
                ]);
            }

            $pdo = $this->dbManager->getConnection(DB::CONN_CANVASES);

            // Fetch sandbox settings
            $selStmt = $pdo->prepare("SELECT uuid, user_id, name, width, height, palette_id as paletteId, cooldown_batch as cooldownBatch FROM user_sandboxes WHERE uuid = ?");
            $selStmt->execute([$uuid]);
            $settings = $selStmt->fetch(PDO::FETCH_ASSOC);

            if (!$settings) {
                return $this->respond([
                    'success' => false,
                    'message' => __('err_canvas_not_found')
                ]);
            }

            if ((int)$settings['user_id'] !== (int)$userId) {
                return $this->respond([
                    'success' => false,
                    'message' => __('err_unauthorized'),
                    'http_code' => 403
                ]);
            }

            // Fetch sandbox chunks
            $chunkStmt = $pdo->prepare("SELECT chunk_key, data FROM user_sandbox_chunks WHERE sandbox_uuid = ?");
            $chunkStmt->execute([$uuid]);
            $rows = $chunkStmt->fetchAll(PDO::FETCH_ASSOC);

            $chunks = [];
            foreach ($rows as $row) {
                $chunks[$row['chunk_key']] = $row['data'];
            }

            return $this->respond([
                'success' => true,
                'settings' => [
                    'name' => $settings['name'],
                    'width' => (int)$settings['width'],
                    'height' => (int)$settings['height'],
                    'paletteId' => $settings['paletteId'],
                    'cooldownBatch' => (int)$settings['cooldownBatch']
                ],
                'chunks' => $chunks
            ]);

        } catch (\Throwable $e) {
            return $this->handleException($e, __FUNCTION__);
        }
    }

    public function delete($input) {
        try {
            if (!$this->session->isLoggedIn()) {
                return $this->respond([
                    'success' => false,
                    'message' => __('err_auth_required'),
                    'http_code' => 401
                ]);
            }

            $userId = $this->session->getActiveAccountId();
            $uuid = $input['uuid'] ?? null;

            if (!$uuid) {
                return $this->respond([
                    'success' => false,
                    'message' => __('err_uuid_missing')
                ]);
            }

            $pdo = $this->dbManager->getConnection(DB::CONN_CANVASES);

            // Verify owner
            $chkStmt = $pdo->prepare("SELECT user_id FROM user_sandboxes WHERE uuid = ?");
            $chkStmt->execute([$uuid]);
            $existingUserId = $chkStmt->fetchColumn();

            if ($existingUserId !== false && (int)$existingUserId !== (int)$userId) {
                return $this->respond([
                    'success' => false,
                    'message' => __('err_unauthorized'),
                    'http_code' => 403
                ]);
            }

            $pdo->beginTransaction();

            // Delete settings
            $delSettings = $pdo->prepare("DELETE FROM user_sandboxes WHERE uuid = ? AND user_id = ?");
            $delSettings->execute([$uuid, $userId]);

            // Delete chunks
            $delChunks = $pdo->prepare("DELETE FROM user_sandbox_chunks WHERE sandbox_uuid = ?");
            $delChunks->execute([$uuid]);

            $pdo->commit();

            return $this->respond([
                'success' => true
            ]);

        } catch (\Throwable $e) {
            if (isset($pdo) && $pdo->inTransaction()) {
                $pdo->rollBack();
            }
            return $this->handleException($e, __FUNCTION__);
        }
    }
}
