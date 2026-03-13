<?php
// includes/config/database.php

namespace App\Config;

use PDO;
use PDOException;
use App\Core\System\Logger;

class Database {
    private $pdo;

    public function __construct() {
        // Leer credenciales del entorno procesadas previamente por vlucas/phpdotenv
        $host = $_ENV['DB_HOST'] ?? 'localhost';
        $dbname = $_ENV['DB_NAME'] ?? 'projectrosaura';
        $user = $_ENV['DB_USER'] ?? 'root';
        $pass = $_ENV['DB_PASS'] ?? '';

        // Definir variables globales para Meilisearch si no existen en el .env
        $_ENV['MEILISEARCH_HOST'] = $_ENV['MEILISEARCH_HOST'] ?? 'http://127.0.0.1:7700';
        $_ENV['MEILISEARCH_MASTER_KEY'] = $_ENV['MEILISEARCH_MASTER_KEY'] ?? 'TU_MASTER_KEY_AQUI';

        try {
            $this->pdo = new PDO("mysql:host=$host;dbname=$dbname;charset=utf8mb4", $user, $pass);
            $this->pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        } catch (PDOException $e) {
            // El error real se queda en el servidor, no en la respuesta HTTP
            Logger::database("Error de conexión a la base de datos: " . $e->getMessage(), 'error');
            
            die(json_encode(['success' => false, 'message' => 'Ocurrió un error interno en el servidor.']));
        }
    }

    /**
     * Retorna la instancia de conexión PDO
     * @return PDO
     */
    public function getConnection() {
        return $this->pdo;
    }
}
?>