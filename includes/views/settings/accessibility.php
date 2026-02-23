<div class="view-content">
    <div class="component-wrapper">
        
        <div class="component-header-card">
            <h1 class="component-page-title">Accesibilidad</h1>
            <p class="component-page-description">Ajusta la interfaz según tus preferencias para una mejor experiencia.</p>
        </div>

        <div class="component-card--grouped">
            <div class="component-group-item component-group-item--stacked">
                <div class="component-card__content">
                    <div class="component-card__text">
                        <h2 class="component-card__title">Tema de la interfaz</h2>
                        <p class="component-card__description">Elige el tema de colores para la plataforma.</p>
                    </div>
                </div>
                <div class="component-card__actions component-card__actions--start">
                    
                    <div class="component-dropdown-wrapper">
                        <div class="component-dropdown-trigger" data-action="toggleModuleTheme">
                            <span class="material-symbols-rounded">brightness_auto</span>
                            <span class="component-dropdown-text">Sincronizar con el sistema</span>
                            <span class="material-symbols-rounded">expand_more</span>
                        </div>
                        <?php include __DIR__ . '/../../modules/moduleTheme.php'; ?>
                    </div>

                </div>
            </div>
        </div>

        <div class="component-card--grouped">
            <div class="component-group-item component-group-item--wrap">
                <div class="component-card__content">
                    <div class="component-card__text">
                        <h2 class="component-card__title">Aumentar el tiempo de las alertas</h2>
                        <p class="component-card__description">Las notificaciones y mensajes durarán más tiempo en la pantalla antes de desaparecer.</p>
                    </div>
                </div>
                <div class="component-card__actions component-card__actions--end">
                    <label class="component-toggle-switch">
                        <input type="checkbox" data-action="togglePreference" data-key="extended_alerts">
                        <span class="component-toggle-slider"></span>
                    </label>
                </div>
            </div>
        </div>

    </div>
</div>