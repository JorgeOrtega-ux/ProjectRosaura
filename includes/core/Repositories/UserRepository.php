<?php
// includes/core/Repositories/UserRepository.php

namespace App\Core\Repositories;

use App\Core\Interfaces\UserRepositoryInterface;
use PDO;
use Exception;
use App\Config\RedisCache;

class UserRepository implements UserRepositoryInterface {
    private $pdo;

    public function __construct(PDO $pdo) {
        $this->pdo = $pdo;
    }

    /**
     * Encola evento a Redis usando Predis para sincronizar canal en Meilisearch
     */
    private function pushToSearchQueue(int $id, string $action): void {
        try {
            $redisCache = new RedisCache();
            $client = $redisCache->getClient();
            
            if ($client) {
                $payload = json_encode([
                    'type' => 'channel',
                    'action' => $action,
                    'id' => $id
                ]);
                $client->rpush('queue:search_sync', [$payload]);
            }
        } catch (Exception $e) {
            error_log("Error encolando sincronización de canal a Redis: " . $e->getMessage());
        }
    }

    public function findById(int $id): ?array {
        $stmt = $this->pdo->prepare("
            SELECT u.*, 
                   ur.is_suspended, ur.suspension_type, ur.suspension_reason, ur.suspension_end_date, 
                   ur.deleted_by, ur.deleted_reason, ur.admin_notes,
                   up.relationship_status, up.interested_in, up.gender, up.height, up.weight, 
                   up.hair_color, up.boobs, up.ethnicity, up.eye_color, up.country,
                   up.tattoos, up.piercings, up.interests,
                   up.social_facebook, up.social_youtube, up.social_instagram, 
                   up.social_x, up.social_onlyfans, up.social_snapchat
            FROM users u 
            LEFT JOIN user_restrictions ur ON u.id = ur.user_id 
            LEFT JOIN user_profiles up ON u.id = up.user_id
            WHERE u.id = ?
        ");
        $stmt->execute([$id]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);
        return $user ?: null;
    }

    public function findByEmail(string $email): ?array {
        $stmt = $this->pdo->prepare("
            SELECT u.*, 
                   ur.is_suspended, ur.suspension_type, ur.suspension_reason, ur.suspension_end_date, 
                   ur.deleted_by, ur.deleted_reason, ur.admin_notes,
                   up.relationship_status, up.interested_in, up.gender, up.height, up.weight, 
                   up.hair_color, up.boobs, up.ethnicity, up.eye_color, up.country,
                   up.tattoos, up.piercings, up.interests,
                   up.social_facebook, up.social_youtube, up.social_instagram, 
                   up.social_x, up.social_onlyfans, up.social_snapchat
            FROM users u 
            LEFT JOIN user_restrictions ur ON u.id = ur.user_id 
            LEFT JOIN user_profiles up ON u.id = up.user_id
            WHERE u.email = ?
        ");
        $stmt->execute([$email]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);
        return $user ?: null;
    }

    public function findByUsername(string $username): ?array {
        $stmt = $this->pdo->prepare("
            SELECT u.*, 
                   ur.is_suspended, ur.suspension_type, ur.suspension_reason, ur.suspension_end_date, 
                   ur.deleted_by, ur.deleted_reason, ur.admin_notes,
                   up.relationship_status, up.interested_in, up.gender, up.height, up.weight, 
                   up.hair_color, up.boobs, up.ethnicity, up.eye_color, up.country,
                   up.tattoos, up.piercings, up.interests,
                   up.social_facebook, up.social_youtube, up.social_instagram, 
                   up.social_x, up.social_onlyfans, up.social_snapchat
            FROM users u 
            LEFT JOIN user_restrictions ur ON u.id = ur.user_id 
            LEFT JOIN user_profiles up ON u.id = up.user_id
            WHERE u.username = ?
        ");
        $stmt->execute([$username]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);
        return $user ?: null;
    }

    public function findByIdentifier(string $identifier): ?array {
        $stmt = $this->pdo->prepare("
            SELECT u.*, 
                   ur.is_suspended, ur.suspension_type, ur.suspension_reason, ur.suspension_end_date, 
                   ur.deleted_by, ur.deleted_reason, ur.admin_notes,
                   up.relationship_status, up.interested_in, up.gender, up.height, up.weight, 
                   up.hair_color, up.boobs, up.ethnicity, up.eye_color, up.country,
                   up.tattoos, up.piercings, up.interests,
                   up.social_facebook, up.social_youtube, up.social_instagram, 
                   up.social_x, up.social_onlyfans, up.social_snapchat
            FROM users u 
            LEFT JOIN user_restrictions ur ON u.id = ur.user_id 
            LEFT JOIN user_profiles up ON u.id = up.user_id
            WHERE u.channel_identifier = ?
        ");
        $stmt->execute([$identifier]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);
        return $user ?: null;
    }

    public function createUser(array $data): int {
        try {
            $this->pdo->beginTransaction();
            
            $stmtUser = $this->pdo->prepare("INSERT INTO users (uuid, username, email, password, role, user_status, profile_picture, channel_identifier) VALUES (?, ?, ?, ?, 'user', 'active', ?, ?)");
            $stmtUser->execute([
                $data['uuid'], 
                $data['username'], 
                $data['email'], 
                $data['password'], 
                $data['profile_picture'],
                $data['channel_identifier']
            ]);
            $userId = (int) $this->pdo->lastInsertId();

            $stmtRest = $this->pdo->prepare("INSERT INTO user_restrictions (user_id) VALUES (?)");
            $stmtRest->execute([$userId]);

            $stmtProfile = $this->pdo->prepare("INSERT INTO user_profiles (user_id) VALUES (?)");
            $stmtProfile->execute([$userId]);

            $this->pdo->commit();
            
            $this->pushToSearchQueue($userId, 'upsert');
            
            return $userId;
        } catch (\Exception $e) {
            $this->pdo->rollBack();
            return 0;
        }
    }

    public function liftSuspension(int $id): bool {
        $stmt = $this->pdo->prepare("
            UPDATE user_restrictions 
            SET is_suspended = 0, suspension_type = NULL, suspension_reason = NULL, suspension_end_date = NULL 
            WHERE user_id = ?
        ");
        $success = $stmt->execute([$id]);
        if ($success) $this->pushToSearchQueue($id, 'upsert');
        return $success;
    }

    public function updateAvatar(int $id, string $path): bool {
        $stmt = $this->pdo->prepare("UPDATE users SET profile_picture = ? WHERE id = ?");
        $success = $stmt->execute([$path, $id]);
        if ($success) $this->pushToSearchQueue($id, 'upsert');
        return $success;
    }

    public function updateBanner(int $id, string $path): bool {
        $stmt = $this->pdo->prepare("UPDATE users SET banner_path = ? WHERE id = ?");
        return $stmt->execute([$path, $id]);
    }

    public function updateChannelProfile(int $id, ?string $description, ?string $identifier, ?string $contactEmail): bool {
        $stmt = $this->pdo->prepare("UPDATE users SET channel_description = ?, channel_identifier = ?, channel_contact_email = ? WHERE id = ?");
        $success = $stmt->execute([$description, $identifier, $contactEmail, $id]);
        if ($success) $this->pushToSearchQueue($id, 'upsert');
        return $success;
    }

    public function updateExtendedProfile(int $id, array $profileData): bool {
        $checkStmt = $this->pdo->prepare("SELECT user_id FROM user_profiles WHERE user_id = ?");
        $checkStmt->execute([$id]);
        
        if ($checkStmt->fetch()) {
            $stmt = $this->pdo->prepare("
                UPDATE user_profiles 
                SET relationship_status = ?, interested_in = ?, gender = ?, 
                    height = ?, weight = ?, hair_color = ?, boobs = ?, ethnicity = ?, eye_color = ?, country = ?, 
                    tattoos = ?, piercings = ?, interests = ?,
                    social_facebook = ?, social_youtube = ?, social_instagram = ?, 
                    social_x = ?, social_onlyfans = ?, social_snapchat = ?
                WHERE user_id = ?
            ");
            return $stmt->execute([
                $profileData['relationship_status'],
                $profileData['interested_in'],
                $profileData['gender'],
                $profileData['height'],
                $profileData['weight'],
                $profileData['hair_color'],
                $profileData['boobs'],
                $profileData['ethnicity'],
                $profileData['eye_color'],
                $profileData['country'],
                $profileData['tattoos'],
                $profileData['piercings'],
                $profileData['interests'],
                $profileData['social_facebook'],
                $profileData['social_youtube'],
                $profileData['social_instagram'],
                $profileData['social_x'],
                $profileData['social_onlyfans'],
                $profileData['social_snapchat'],
                $id
            ]);
        } else {
            $stmt = $this->pdo->prepare("
                INSERT INTO user_profiles 
                (user_id, relationship_status, interested_in, gender, height, weight, hair_color, boobs, ethnicity, eye_color, country, tattoos, piercings, interests, social_facebook, social_youtube, social_instagram, social_x, social_onlyfans, social_snapchat)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ");
            return $stmt->execute([
                $id,
                $profileData['relationship_status'],
                $profileData['interested_in'],
                $profileData['gender'],
                $profileData['height'],
                $profileData['weight'],
                $profileData['hair_color'],
                $profileData['boobs'],
                $profileData['ethnicity'],
                $profileData['eye_color'],
                $profileData['country'],
                $profileData['tattoos'],
                $profileData['piercings'],
                $profileData['interests'],
                $profileData['social_facebook'],
                $profileData['social_youtube'],
                $profileData['social_instagram'],
                $profileData['social_x'],
                $profileData['social_onlyfans'],
                $profileData['social_snapchat']
            ]);
        }
    }

    public function updateIdentifier(int $id, string $identifier): bool {
        $stmt = $this->pdo->prepare("UPDATE users SET channel_identifier = ? WHERE id = ?");
        $success = $stmt->execute([$identifier, $id]);
        if ($success) $this->pushToSearchQueue($id, 'upsert');
        return $success;
    }

    public function updateUsername(int $id, string $username): bool {
        $stmt = $this->pdo->prepare("UPDATE users SET username = ? WHERE id = ?");
        $success = $stmt->execute([$username, $id]);
        if ($success) $this->pushToSearchQueue($id, 'upsert');
        return $success;
    }

    public function updateEmail(int $id, string $email): bool {
        $stmt = $this->pdo->prepare("UPDATE users SET email = ? WHERE id = ?");
        return $stmt->execute([$email, $id]);
    }

    public function updatePassword(int $id, string $hashedPassword): bool {
        $stmt = $this->pdo->prepare("UPDATE users SET password = ? WHERE id = ?");
        return $stmt->execute([$hashedPassword, $id]);
    }

    public function update2FA(int $id, ?string $secret, int $enabled, ?string $recoveryCodes): bool {
        $stmt = $this->pdo->prepare("UPDATE users SET two_factor_secret = ?, two_factor_enabled = ?, two_factor_recovery_codes = ? WHERE id = ?");
        return $stmt->execute([$secret, $enabled, $recoveryCodes, $id]);
    }

    public function updateRecoveryCodes(int $id, string $recoveryCodes): bool {
        $stmt = $this->pdo->prepare("UPDATE users SET two_factor_recovery_codes = ? WHERE id = ?");
        return $stmt->execute([$recoveryCodes, $id]);
    }

 public function updatePreference(int $userId, string $key, $value): bool {
        // Se agregó 'measurement_system' a la lista de claves permitidas
        $allowedKeys = ['language', 'measurement_system', 'open_links_new_tab', 'theme', 'extended_alerts'];
        if (!in_array($key, $allowedKeys)) return false;

        $stmt = $this->pdo->prepare("UPDATE user_preferences SET {$key} = ? WHERE user_id = ?");
        return $stmt->execute([$value, $userId]);
    }

    public function updateRole(int $id, string $role): bool {
        $stmt = $this->pdo->prepare("UPDATE users SET role = ? WHERE id = ?");
        return $stmt->execute([$role, $id]);
    }
}
?>