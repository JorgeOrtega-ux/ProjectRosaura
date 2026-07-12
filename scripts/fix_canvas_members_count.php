<?php
require_once dirname(__DIR__) . '/vendor/autoload.php';

$dotenv = Dotenv\Dotenv::createImmutable(dirname(__DIR__));
$dotenv->load();

try {
    $dsn = "mysql:host=" . $_ENV['DB_HOST'] . ";dbname=" . $_ENV['DB_APP_NAME'] . ";charset=utf8mb4";
    $pdo = new PDO($dsn, $_ENV['DB_USER'], $_ENV['DB_PASS']);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    echo "Adding members_count column...\n";
    try {
        $pdo->exec("ALTER TABLE canvases ADD COLUMN members_count INT DEFAULT 0 AFTER max_participants");
        echo "Column members_count added successfully.\n";
    } catch (PDOException $e) {
        if ($e->getCode() == '42S21') { // Duplicate column
            echo "Column members_count already exists. Proceeding to update values.\n";
        } else {
            throw $e;
        }
    }

    echo "Updating members_count for all canvases (this might take a while)...\n";
    
    // Update using a joined subquery to ensure accuracy
    $sql = "UPDATE canvases c
            LEFT JOIN (
                SELECT canvas_id, COUNT(DISTINCT user_id) as m_count
                FROM canvas_user_roles
                GROUP BY canvas_id
            ) cur ON c.id = cur.canvas_id
            SET c.members_count = COALESCE(cur.m_count, 0)";
            
    $stmt = $pdo->prepare($sql);
    $stmt->execute();
    
    $affected = $stmt->rowCount();
    echo "Successfully updated members_count for {$affected} canvases.\n";

} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
