<?php
// includes/views/canvases/components/reset-manager.php
if (session_status() === PHP_SESSION_NONE) session_start();

$canvasId = isset($_GET['id']) ? (int)$_GET['id'] : null;
if (!$canvasId) {
    echo "<div class='view-content'><p>ID de lienzo no válido.</p></div>";
    return;
}
$appUrl = defined('APP_URL') ? APP_URL : '';
?>
<div class="view-content" data-ref="canvas-resets-wrapper">
    
    <div class="component-top">
        <div class="component-top-left" style="display: flex; align-items: center; gap: 16px;">
            <a href="<?php echo $appUrl; ?>/canvases/manage" class="component-button component-button--icon component-button--h40" data-nav>
                <span class="material-symbols-rounded">arrow_back</span>
            </a>
            <div>
                <h1 class="component-top-title"><?php echo __('canvas_resets_title') ?: 'Configuración de Reinicios'; ?></h1>
            </div>
        </div>
        <div class="component-top-right">
            <button type="button" class="component-button component-button--icon component-button--h40" id="btn_save_resets" data-tooltip="<?php echo __('btn_save_changes') ?: 'Guardar configuración'; ?>" data-position="bottom">
                <span class="material-symbols-rounded">save</span>
            </button>
        </div>
    </div>

    <div class="component-viewport">
        <div class="component-wrapper">
            <div class="component-bottom">
                
                <form id="form-canvas-resets" data-canvas-id="<?php echo $canvasId; ?>">
                    <div class="component-card--grouped">

                        <div class="component-group-item component-group-item--stacked">
                            <div class="component-card__content">
                                <div class="component-card__text">
                                    <h2 class="component-card__title">Activar Reinicios Automáticos</h2>
                                    <p class="component-card__description">Al activarlo, el sistema limpiará el lienzo y restablecerá la cuadrícula en la fecha especificada.</p>
                                </div>
                            </div>
                            <div class="component-card__actions component-card__actions--start">
                                <label class="component-toggle">
                                    <input type="checkbox" id="reset_is_active" name="is_active">
                                    <span class="component-toggle-slider"></span>
                                </label>
                            </div>
                        </div>

                        <div id="reset_options_container" style="transition: opacity 0.3s ease;">
                            
                            <hr class="component-divider">

                            <div class="component-group-item component-group-item--stacked">
                                <div class="component-card__content">
                                    <div class="component-card__text">
                                        <h2 class="component-card__title">Fecha y Hora de Reinicio</h2>
                                        <p class="component-card__description">Selecciona cuándo ocurrirá la limpieza (Tu hora local). Los usuarios verán una cuenta regresiva.</p>
                                    </div>
                                </div>
                                <div class="component-card__actions component-card__actions--start">
                                    <div class="component-input-group component-input-group--h34">
                                        <span class="material-symbols-rounded" style="position: absolute; left: 10px; top: 50%; transform: translateY(-50%); font-size: 18px; color: var(--text-secondary); pointer-events: none;">calendar_clock</span>
                                        <input type="datetime-local" id="next_reset_at" name="next_reset_at" class="component-input-field component-input-field--simple" style="padding-left: 36px; min-width: 200px;">
                                    </div>
                                </div>
                            </div>

                            <hr class="component-divider">

                            <div class="component-group-item component-group-item--stacked">
                                <div class="component-card__content">
                                    <div class="component-card__text">
                                        <h2 class="component-card__title">Tomar fotografía antes de borrar</h2>
                                        <p class="component-card__description">El sistema esperará a generar una imagen final en alta calidad (Snapshot HQ) antes de vaciar la sala.</p>
                                    </div>
                                </div>
                                <div class="component-card__actions component-card__actions--start">
                                    <label class="component-toggle">
                                        <input type="checkbox" id="take_snapshot" name="take_snapshot" value="1" checked>
                                        <span class="component-toggle-slider"></span>
                                    </label>
                                </div>
                            </div>

                            <hr class="component-divider">

                            <div class="component-group-item component-group-item--stacked">
                                <div class="component-card__content">
                                    <div class="component-card__text">
                                        <h2 class="component-card__title">Comportamiento del Cronómetro</h2>
                                        <p class="component-card__description">¿Qué hacer con el reloj visible una vez que el reinicio haya finalizado exitosamente?</p>
                                    </div>
                                </div>
                                <div class="component-card__actions component-card__actions--start">
                                    <div class="component-dropdown-wrapper">
                                        <div class="component-dropdown-trigger" data-action="toggleDropdown" data-target="dropdownTimer">
                                            <span class="material-symbols-rounded" data-ref="icon-timer">timer</span>
                                            <span class="component-dropdown-text" data-ref="text-timer">Reiniciar desde cero</span>
                                            <span class="material-symbols-rounded">expand_more</span>
                                        </div>
                                        
                                        <input type="hidden" id="timer_action" name="timer_action" value="restart">

                                        <div class="component-module component-module--dropdown component-module--dropdown-left disabled" data-module="dropdownTimer">
                                            <div class="component-menu component-menu--w-full component-menu--h-auto component-menu--no-padding component-menu--limited">
                                                <div class="pill-container"><div class="drag-handle"></div></div>
                                                <div class="component-menu-list component-menu-list--scrollable">
                                                    <div class="component-menu-link active" data-action="selectTimerAction" data-value="restart" data-label="Reiniciar desde cero" data-icon="timer">
                                                        <div class="component-menu-link-icon"><span class="material-symbols-rounded">timer</span></div>
                                                        <div class="component-menu-link-text"><span>Reiniciar desde cero</span></div>
                                                    </div>
                                                    <div class="component-menu-link" data-action="selectTimerAction" data-value="stop" data-label="Detener en cero" data-icon="stop_circle">
                                                        <div class="component-menu-link-icon"><span class="material-symbols-rounded">stop_circle</span></div>
                                                        <div class="component-menu-link-text"><span>Detener en cero</span></div>
                                                    </div>
                                                    <div class="component-menu-link" data-action="selectTimerAction" data-value="none" data-label="Ocultar cronómetro" data-icon="visibility_off">
                                                        <div class="component-menu-link-icon"><span class="material-symbols-rounded">visibility_off</span></div>
                                                        <div class="component-menu-link-text"><span>Ocultar cronómetro</span></div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                        </div>
                    </div>
                </form>

            </div>
        </div>
    </div>
</div>