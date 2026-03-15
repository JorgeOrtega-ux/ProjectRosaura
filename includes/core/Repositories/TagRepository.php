<?php
// includes/core/Repositories/TagRepository.php

namespace App\Core\Repositories;

use App\Core\Interfaces\TagRepositoryInterface;
use PDO;
use Exception;
use App\Config\RedisCache;

class TagRepository implements TagRepositoryInterface {
    private $db;

    public function __construct(PDO $db) {
        $this->db = $db;
    }

    /**
     * Encola evento a Redis usando Predis para sincronizar tags en Meilisearch
     */
    private function pushToSearchQueue(int $id, string $action): void {
        try {
            $redisCache = new RedisCache();
            $client = $redisCache->getClient();
            
            if ($client) {
                $payload = json_encode([
                    'type' => 'tag',
                    'action' => $action,
                    'id' => $id
                ]);
                $client->rpush('queue:search_sync', [$payload]);
            }
        } catch (Exception $e) {
            error_log("Error encolando sincronización de tag a Redis: " . $e->getMessage());
        }
    }

    public function getAll() {
        $stmt = $this->db->query("SELECT * FROM tags ORDER BY type ASC, name ASC");
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function getByType($type) {
        $stmt = $this->db->prepare("SELECT * FROM tags WHERE type = :type ORDER BY name ASC");
        $stmt->execute(['type' => $type]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function findById($id) {
        $stmt = $this->db->prepare("SELECT * FROM tags WHERE id = :id");
        $stmt->execute(['id' => $id]);
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }

    public function findByName($name) {
        $stmt = $this->db->prepare("SELECT * FROM tags WHERE name = :name");
        $stmt->execute(['name' => $name]);
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }

    public function create($name, $type, $gender = null) {
        $stmt = $this->db->prepare("INSERT INTO tags (name, type, gender) VALUES (:name, :type, :gender)");
        return $stmt->execute(['name' => $name, 'type' => $type, 'gender' => $gender]);
    }

    public function findOrCreate($name, $type, $gender = null) {
        $name = trim($name);
        
        $existing = $this->findByName($name);
        if ($existing) {
            return (int) $existing['id'];
        }
        
        $this->create($name, $type, $gender);
        return (int) $this->db->lastInsertId();
    }

    public function update($id, $name, $type, $gender = null) {
        $stmt = $this->db->prepare("UPDATE tags SET name = :name, type = :type, gender = :gender WHERE id = :id");
        $success = $stmt->execute(['id' => $id, 'name' => $name, 'type' => $type, 'gender' => $gender]);
        
        if ($success) {
            $this->pushToSearchQueue($id, 'update');
        }
        
        return $success;
    }

    public function delete($id) {
        $stmt = $this->db->prepare("DELETE FROM tags WHERE id = :id");
        $success = $stmt->execute(['id' => $id]);
        
        if ($success) {
            $this->pushToSearchQueue($id, 'update');
        }
        
        return $success;
    }

    public function getGlobalTopCategories(int $limit = 5): array {
        $sql = "SELECT t.id, t.name, LOWER(REPLACE(t.name, ' ', '-')) as slug, SUM(v.views) as total_views
                FROM tags t
                JOIN video_tags vt ON t.id = vt.tag_id
                JOIN videos v ON vt.video_id = v.id
                WHERE t.type = 'category' AND v.status = 'published' AND v.visibility = 'public'
                GROUP BY t.id, t.name
                ORDER BY total_views DESC
                LIMIT :limit";
                
        $stmt = $this->db->prepare($sql);
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmt->execute();
        
        return $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
    }

    public function getGlobalTopModels(int $limit = 5): array {
        $sql = "SELECT t.id, t.name, LOWER(REPLACE(t.name, ' ', '-')) as slug, SUM(v.views) as total_views
                FROM tags t
                JOIN video_tags vt ON t.id = vt.tag_id
                JOIN videos v ON vt.video_id = v.id
                WHERE t.type = 'modelo' AND v.status = 'published' AND v.visibility = 'public'
                GROUP BY t.id, t.name
                ORDER BY total_views DESC
                LIMIT :limit";
                
        $stmt = $this->db->prepare($sql);
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmt->execute();
        
        return $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
    }

    // ==========================================
    // METODO NUEVO PARA LA SECCIÓN DE TENDENCIAS
    // ==========================================

    /**
     * Obtiene las etiquetas (tags) más populares del momento basándose en la cantidad de videos publicados recientemente con ellas.
     */
    public function getHotTags(int $limit = 10): array {
        // En tu DB, si la tabla tags no guarda tags personalizados, usamos COALESCE como en getVideoTags
        $sql = "SELECT COALESCE(t.name, vt.custom_tag_name) as name, COUNT(vt.video_id) as usage_count
                FROM video_tags vt
                LEFT JOIN tags t ON vt.tag_id = t.id
                JOIN videos v ON vt.video_id = v.id
                WHERE v.status = 'published' AND v.visibility = 'public' 
                  AND v.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
                GROUP BY name
                HAVING name IS NOT NULL
                ORDER BY usage_count DESC
                LIMIT :limit";
                
        $stmt = $this->db->prepare($sql);
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmt->execute();
        
        return $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
    }
}
?>