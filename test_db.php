<?php
$host = getenv('DB_HOST') ?: 'db';
$user = getenv('DB_USER') ?: 'rosaura';
$pass = getenv('DB_PASS') ?: 'password'; 
$pdo = new PDO("mysql:host=$host;dbname=db_canvases;charset=utf8mb4", $user, $pass);
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
$pdo->exec("ALTER TABLE canvases ADD COLUMN members_count INT(11) NOT NULL DEFAULT 0 AFTER favorites_count;");
echo "Success\n";
