<?php
// includes/views/app/channel.php

// 1. Recibimos el parámetro inyectado por el Router.php
$targetUsername = $_GET['username'] ?? '';

// 2. Información del usuario actual que navega
$currentUsername = $_SESSION['username'] ?? null;
$isLoggedIn = isset($_SESSION['user_id']);

// 3. Conexión a la base de datos de manera segura para la vista
global $pdo; 
if (!isset($pdo)) {
    // Si $pdo no está inyectado directamente por el cargador principal, creamos la conexión
    $config = require __DIR__ . '/../../config/database.php';
    $dsn = "mysql:host={$config['host']};dbname={$config['dbname']};charset={$config['charset']}";
    $pdo = new PDO($dsn, $config['username'], $config['password'], $config['options']);
}

// 4. Verificamos si el canal buscado existe
$stmt = $pdo->prepare("SELECT id, username FROM users WHERE username = ? LIMIT 1");
$stmt->execute([$targetUsername]);
$channelUser = $stmt->fetch(PDO::FETCH_ASSOC);

$channelExists = $channelUser ? true : false;
$isOwner = $isLoggedIn && $channelExists && ($currentUsername === $channelUser['username']);
?>

<div class="component-layout-centered" style="margin-top: 50px; text-align: center;">
    <div class="component-message-box">
        
        <?php if (!$channelExists): ?>
            <div class="component-message-icon-wrapper">
                <span class="material-symbols-rounded component-message-icon">error</span>
            </div>
            <h1 class="component-message-title">Este canal no existe</h1>
            <p class="component-message-desc">El usuario @<?php echo htmlspecialchars($targetUsername); ?> no se encuentra en nuestra base de datos.</p>
        
        <?php else: ?>
            
            <?php if ($isOwner): ?>
                <div class="component-message-icon-wrapper">
                    <span class="material-symbols-rounded component-message-icon" style="color: #4CAF50;">check_circle</span>
                </div>
                <h1 class="component-message-title">Tu eres el dueño de este canal</h1>
                <p class="component-message-desc">Bienvenido a tu espacio personal, @<?php echo htmlspecialchars($currentUsername); ?>.</p>
            
            <?php else: ?>
                <div class="component-message-icon-wrapper">
                    <span class="material-symbols-rounded component-message-icon" style="color: #2196F3;">account_circle</span>
                </div>
                <h1 class="component-message-title">Explorando canal</h1>
                <p class="component-message-desc">
                    <?php if ($isLoggedIn): ?>
                        Tu eres <strong><?php echo htmlspecialchars($currentUsername); ?></strong> entrando al canal de <strong><?php echo htmlspecialchars($channelUser['username']); ?></strong>. No eres el dueño.
                    <?php else: ?>
                        Estás entrando al canal de <strong><?php echo htmlspecialchars($channelUser['username']); ?></strong> como invitado. No eres el dueño.
                    <?php endif; ?>
                </p>
            <?php endif; ?>

        <?php endif; ?>
        
    </div>
</div>