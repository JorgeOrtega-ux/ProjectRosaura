<?php
/**
 * Script para poblar la tabla `user_perk_balances` con los datos históricos de `user_perks`.
 */

require_once __DIR__ . '/../vendor/autoload.php';

$dotenv = Dotenv\Dotenv::createImmutable(__DIR__ . '/../');
$dotenv->load();

$host = $_ENV['DB_HOST'] ?? '127.0.0.1';
$port = $_ENV['DB_PORT'] ?? 3306;
$user = $_ENV['DB_USER'] ?? 'root';
$pass = $_ENV['DB_PASS'] ?? '';
$dbName = $_ENV['DB_IDENTITY_NAME'] ?? 'db_identity';

try {
    $dsn = "mysql:host={$host};port={$port};dbname={$dbName};charset=utf8mb4";
    $pdo = new PDO($dsn, $user, $pass, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION
    ]);

    echo "Iniciando migración de user_perks a user_perk_balances...\n";

    // Primero contamos las ventajas sin usar
    $stmt = $pdo->query("
        SELECT user_id, perk_id, COUNT(*) as quantity
        FROM user_perks
        WHERE is_used = 0
        GROUP BY user_id, perk_id
    ");

    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
    $total = count($rows);
    echo "Se encontraron {$total} saldos únicos de usuarios-ventajas.\n";

    $pdo->beginTransaction();

    $insertStmt = $pdo->prepare("
        INSERT INTO user_perk_balances (user_id, perk_id, quantity_available)
        VALUES (:uid, :pid, :qty)
        ON DUPLICATE KEY UPDATE quantity_available = quantity_available + :qty
    ");

    $count = 0;
    foreach ($rows as $row) {
        $insertStmt->execute([
            ':uid' => $row['user_id'],
            ':pid' => $row['perk_id'],
            ':qty' => (int) $row['quantity']
        ]);
        $count++;
    }

    $pdo->commit();
    echo "¡Migración exitosa! {$count} saldos actualizados.\n";

} catch (\Throwable $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    echo "ERROR CRITICO: " . $e->getMessage() . "\n";
    exit(1);
}
