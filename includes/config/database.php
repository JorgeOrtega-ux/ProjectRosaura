<?php
// includes/config/database.php

namespace App\Config;

use PDO;
use PDOException;
use App\Core\System\Logger;

class Database {
    private $pdo;

    public function __construct() {
        // Cargar variables de entorno desde el archivo .env usando la raíz absoluta
        $this->loadEnv(ROOT_PATH . '/.env');

        // Leer credenciales del entorno o usar valores por defecto
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

    /**
     * Función interna y ligera para parsear el archivo .env
     */
    private function loadEnv($path) {
        if (!file_exists($path)) {
            return; // Si no existe, dependemos del entorno del servidor o los valores por defecto
        }

        $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
        foreach ($lines as $line) {
            // Ignorar los comentarios
            if (strpos(trim($line), '#') === 0) {
                continue;
            }

            // Separar llave y valor
            list($name, $value) = explode('=', $line, 2);
            $name = trim($name);
            $value = trim($value);

            if (!array_key_exists($name, $_SERVER) && !array_key_exists($name, $_ENV)) {
                putenv(sprintf('%s=%s', $name, $value));
                $_ENV[$name] = $value;
                $_SERVER[$name] = $value;
            }
        }
    }
}
?>