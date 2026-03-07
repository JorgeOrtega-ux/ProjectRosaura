<?php
// includes/views/app/channel.php

$targetUsername = $_GET['username'] ?? '';
$isLoggedIn = isset($_SESSION['user_id']);

global $container;
if (isset($container)) {
    $userRepo = $container->get(\App\Core\Interfaces\UserRepositoryInterface::class);
    
    // 1. Obtener los datos del canal visitado
    $channelUser = $userRepo->findByUsername($targetUsername);
    $channelExists = $channelUser ? true : false;
    
    // 2. Obtener el nombre de usuario del visitante actual hidratado de la BD
    $currentUsername = null;
    if ($isLoggedIn) {
        $currentUserData = $userRepo->findById($_SESSION['user_id']);
        $currentUsername = $currentUserData['username'] ?? null;
    }
} else {
    $channelExists = false;
    $currentUsername = null;
}

// 3. Validar de forma estricta si es el dueño
// Comparamos el visitante vs el objetivo en la URL (ignorando mayúsculas/minúsculas)
$isOwner = false;
if ($isLoggedIn && $channelExists && $currentUsername) {
    $isOwner = (strtolower($currentUsername) === strtolower($targetUsername));
}
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
                        Tu eres <strong><?php echo htmlspecialchars($currentUsername); ?></strong> entrando al canal de <strong><?php echo htmlspecialchars($targetUsername); ?></strong>. No eres el dueño.
                    <?php else: ?>
                        Estás entrando al canal de <strong><?php echo htmlspecialchars($targetUsername); ?></strong> como invitado. No eres el dueño.
                    <?php endif; ?>
                </p>
            <?php endif; ?>

        <?php endif; ?>
        
    </div>
</div>