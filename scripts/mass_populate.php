<?php
ini_set('memory_limit', '1024M');
set_time_limit(0);

$usersCount = 500000;
$canvasesCount = 500000;

$adminHash = '$2y$10$D00BhdO6zjC2Mr5E4f.KDuXQCN9G4d0.TCvs.s2iZPXwf4Omc31Me';
$adminEmail = 'al20328051890088@gmail.com';
$adminUsername = 'ortegaaguilarjo';

$usersFile = '/tmp/users.csv';
$userRolesFile = '/tmp/user_roles.csv';
$canvasesFile = '/tmp/canvases.csv';

function generateUUID() {
    return sprintf('%04x%04x-%04x-%04x-%04x-%04x%04x%04x',
        mt_rand(0, 0xffff), mt_rand(0, 0xffff),
        mt_rand(0, 0xffff),
        mt_rand(0, 0x0fff) | 0x4000,
        mt_rand(0, 0x3fff) | 0x8000,
        mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0xffff)
    );
}

function randomDate() {
    $start = strtotime('-2 years');
    $end = time();
    return date('Y-m-d H:i:s', mt_rand($start, $end));
}

echo "Generando CSV de Usuarios...\n";
$fu = fopen($usersFile, 'w');
$fr = fopen($userRolesFile, 'w');

fputcsv($fu, [1, generateUUID(), $adminUsername, $adminEmail, $adminHash, 2, 997689000, date('Y-m-d H:i:s')]);
fputcsv($fr, [1, 1]); // superadministrator role

$dummyHash = password_hash('123456', PASSWORD_DEFAULT);

for ($i = 2; $i <= $usersCount; $i++) {
    $username = 'user' . $i;
    $email = 'user' . $i . '@example.com';
    $tier = mt_rand(0, 100) > 95 ? 1 : 0; 
    $coins = mt_rand(0, 1000);
    $created_at = randomDate();
    
    fwrite($fu, "$i," . generateUUID() . ",$username,$email,$dummyHash,$tier,$coins,$created_at\n");
    
    if ($i % 100000 === 0) echo "Generados $i usuarios...\n";
}
fclose($fu);
fclose($fr);

echo "Generando CSV de Lienzos...\n";
$fc = fopen($canvasesFile, 'w');
$sizes = ['64x64', '128x128', '256x256', '512x512', '1024x1024', '2048x2048', '4096x4096'];
for ($i = 1; $i <= $canvasesCount; $i++) {
    $owner = mt_rand(1, $usersCount);
    $name = 'Canvas ' . $i;
    $size = $sizes[array_rand($sizes)];
    $privacy = mt_rand(0, 10) > 8 ? 'private' : 'public';
    $created_at = randomDate();
    
    fwrite($fc, "$i," . generateUUID() . ",$owner,$name,$privacy,$size,$created_at\n");
    
    if ($i % 100000 === 0) echo "Generados $i lienzos...\n";
}
fclose($fc);

echo "Cargando datos a MySQL...\n";

$dbPass = 'c7a91e4d5b2f8a0c3d6e9f1b4a7c0d2e5f8b1c4a9d6e3f0b7c2a5d8e1f4b9c6a';
$dbHost = 'db';
$dbUser = 'root';

try {
    $pdoIdentity = new PDO("mysql:host=$dbHost;dbname=db_identity", $dbUser, $dbPass, [
        PDO::MYSQL_ATTR_LOCAL_INFILE => true,
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION
    ]);
    
    $pdoIdentity->exec("SET FOREIGN_KEY_CHECKS = 0;");
    
    echo "Ejecutando LOAD DATA para Usuarios...\n";
    $pdoIdentity->exec("LOAD DATA LOCAL INFILE '$usersFile' INTO TABLE users FIELDS TERMINATED BY ',' ENCLOSED BY '\"' (id, uuid, username, email, password, subscription_tier, coins, created_at)");
    
    echo "Ejecutando LOAD DATA para Roles...\n";
    $pdoIdentity->exec("LOAD DATA LOCAL INFILE '$userRolesFile' INTO TABLE user_roles FIELDS TERMINATED BY ',' ENCLOSED BY '\"' (user_id, role_id)");
    
    $pdoIdentity->exec("SET FOREIGN_KEY_CHECKS = 1;");
    
    $pdoCanvases = new PDO("mysql:host=$dbHost;dbname=db_canvases", $dbUser, $dbPass, [
        PDO::MYSQL_ATTR_LOCAL_INFILE => true,
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION
    ]);
    
    $pdoCanvases->exec("SET FOREIGN_KEY_CHECKS = 0;");
    
    echo "Ejecutando LOAD DATA para Lienzos...\n";
    $pdoCanvases->exec("LOAD DATA LOCAL INFILE '$canvasesFile' INTO TABLE canvases FIELDS TERMINATED BY ',' ENCLOSED BY '\"' (id, uuid, owner_id, name, privacy, size, created_at)");
    
    $pdoCanvases->exec("SET FOREIGN_KEY_CHECKS = 1;");
    
    echo "Creando índice para el feed...\n";
    $pdoCanvases->exec("CREATE INDEX idx_feed_sort ON canvases (is_official, created_at)");
    
    echo "Población masiva completada con éxito.\n";
    
} catch (PDOException $e) {
    echo "Error PDO: " . $e->getMessage() . "\n";
}
