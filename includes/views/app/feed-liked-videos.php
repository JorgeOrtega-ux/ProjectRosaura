<?php
// includes/views/app/feed-liked-videos.php

$isLoggedIn = isset($_SESSION['user_id']);
if (!$isLoggedIn) {
    header('Location: ' . APP_URL . '/login');
    exit;
}
?>
<div class="view-content view-content--playlist" id="view-liked-videos">
    <div class="component-page-header" style="margin-bottom: 24px;">
        <h1 class="component-page-title" style="font-size: 24px; font-weight: 600; display: flex; align-items: center; gap: 8px;">
            <span class="material-symbols-rounded">thumb_up</span>
            Videos que me gustan
        </h1>
        <p class="component-page-description" style="color: var(--text-secondary); margin-top: 8px;">Tus videos favoritos que has marcado con me gusta.</p>
    </div>
    
    <div id="liked-videos-loader" class="component-spinner component-spinner--centered" style="margin-top: 50px;"></div>
    
    <div id="liked-videos-container" class="component-video-grid component-video-grid--list hidden" style="display: flex; flex-direction: column; max-width: 800px;">
        </div>
    
    <div id="liked-videos-empty" class="component-empty-state hidden" style="text-align: center; margin-top: 60px; padding: 40px;">
        <span class="material-symbols-rounded component-empty-state__icon" style="font-size: 64px; color: var(--border-color); margin-bottom: 16px;">thumb_up</span>
        <h3 class="component-empty-state__title" style="font-size: 20px; font-weight: 500; margin-bottom: 8px;">Aún no te gusta ningún video</h3>
        <p class="component-empty-state__text" style="color: var(--text-secondary);">Dale "Me gusta" a los videos para verlos aquí y tenerlos siempre a mano.</p>
    </div>
</div>