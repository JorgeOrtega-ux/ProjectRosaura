<?php
// includes/views/settings/devices.php
if (session_status() === PHP_SESSION_NONE) session_start();
?>
<div class="view-content">
    <div class="component-wrapper">
        
        <div class="component-header-card">
            <h1 class="component-page-title"><?php echo __('devices_title'); ?></h1>
            <p class="component-page-description"><?php echo __('devices_desc'); ?></p>
        </div>

        <div class="component-card--grouped active" id="devices-container">
            <div class="component-group-item component-group-item--stacked">
                <div class="component-card__content component-card__content--full component-card__content--start">
                    <div class="component-card__text">
                        <h2 class="component-card__title">Sesiones Activas</h2>
                        <p class="component-card__description">A continuación, se muestran los dispositivos y navegadores donde has iniciado sesión. Si no reconoces alguno, ciérralo inmediatamente.</p>
                        
                        <div>
                            <button class="component-button component-button--danger component-button--h36" data-action="revokeAllDevices">
                                <span class="material-symbols-rounded">logout</span> Cerrar todas las demás sesiones
                            </button>
                        </div>

                        <div id="devices-list">
                            <div class="component-spinner"></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

    </div>
</div>