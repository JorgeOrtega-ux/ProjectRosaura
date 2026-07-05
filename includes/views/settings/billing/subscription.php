<?php
// includes/views/settings/billing/subscription.php
if (session_status() === PHP_SESSION_NONE) session_start();
?>

<div class="view-content">
    <div class="component-wrapper">
        <div class="component-bottom">
            <div class="component-header-card">
                <h1 class="component-page-title"><?php echo __('menu_subscription'); ?></h1>
                <p class="component-page-description">Gestiona tu plan actual, límites y ciclo de facturación.</p>
            </div>

            <!-- Contenedor para la Suscripción -->
            <div class="component-card--grouped" data-ref="subscription-content-area">
                <!-- JS inyectará la tarjeta de suscripción aquí -->
            </div>
        </div>
    </div>
</div>
