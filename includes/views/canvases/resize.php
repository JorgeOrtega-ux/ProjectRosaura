<?php
// includes/views/canvases/resize.php
if (session_status() === PHP_SESSION_NONE) session_start();

use App\Config\DatabaseManager;
use PDO;

// Obtenemos el ID del usuario en sesión
$userId = $_SESSION['active_account_id'] ?? $_SESSION['user_id'] ?? null;

if (!$userId) {
    echo "<div class='view-content'><p>".__('err_unauthorized')."</p></div>";
    return;
}

// Extraer el UUID de la URL. Asumiendo formato /canvases/resize/:uuid
$uriParts = explode('/', parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH));
$uuid = end($uriParts);

if (empty($uuid) || $uuid === 'resize') {
    echo "<div class='view-content'><p>Lienzo no especificado.</p></div>";
    return;
}

$db = new DatabaseManager();
$connName = defined('App\Core\System\DatabaseConstants::CONN_CANVASES') ? App\Core\System\DatabaseConstants::CONN_CANVASES : 'canvases';
$pdo = $db->getConnection($connName); 
$tblCanvases = defined('App\Core\System\DatabaseConstants::TBL_CANVASES') ? App\Core\System\DatabaseConstants::TBL_CANVASES : 'canvases';

// Validar permisos
$userPermissions = $_SESSION['user_permissions'] ?? [];
$isAdmin = in_array('manage_canvases', $userPermissions) || 
           in_array('access_admin_panel', $userPermissions) || 
           in_array('canvases.manage_official', $userPermissions);

if ($isAdmin) {
    $sql = "SELECT id, uuid, name, size FROM {$tblCanvases} WHERE uuid = :uuid LIMIT 1";
    $stmt = $pdo->prepare($sql);
    $stmt->execute(['uuid' => $uuid]);
} else {
    $sql = "SELECT id, uuid, name, size FROM {$tblCanvases} WHERE uuid = :uuid AND owner_id = :uid LIMIT 1";
    $stmt = $pdo->prepare($sql);
    $stmt->execute(['uuid' => $uuid, 'uid' => $userId]);
}

$canvas = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$canvas) {
    echo "<div class='view-content'><p>Lienzo no encontrado o sin permisos suficientes.</p></div>";
    return;
}

// -------------------------------------------------------------
// CORRECCIÓN DEL BUG DE RESOLUCIONES "2048x1024x2048x1024"
// -------------------------------------------------------------
$currentSizeRaw = $canvas['size'];
$isCustomFormat = strpos((string)$currentSizeRaw, 'x') !== false;
$displaySize = $isCustomFormat ? $currentSizeRaw : $currentSizeRaw . 'x' . $currentSizeRaw;

// Determinamos el icono dependiendo del tamaño base
$icon = 'crop_square';
if (intval($currentSizeRaw) == 128) $icon = 'aspect_ratio';
if (intval($currentSizeRaw) == 256 || intval($currentSizeRaw) == 264) $icon = 'grid_4x4';
if (intval($currentSizeRaw) >= 512) $icon = 'grid_on';

// Generar una lista estandarizada y dinámica (Cubriendo hasta 4096)
$sizesList = [
    "16"   => ['label' => '16x16',     'icon' => 'crop_square'],
    "32"   => ['label' => '32x32',     'icon' => 'crop_square'],
    "64"   => ['label' => '64x64',     'icon' => 'crop_square'],
    "128"  => ['label' => '128x128',   'icon' => 'aspect_ratio'],
    "256"  => ['label' => '256x256',   'icon' => 'grid_4x4'],
    "512"  => ['label' => '512x512',   'icon' => 'grid_on'],
    "1024" => ['label' => '1024x1024', 'icon' => 'grid_on'],
    "2048" => ['label' => '2048x2048', 'icon' => 'grid_on'],
    "4096" => ['label' => '4096x4096', 'icon' => 'grid_on']
];

// Si la base de datos trae un tamaño raro que no está en la lista, lo inyectamos temporalmente
if (!isset($sizesList[(string)$currentSizeRaw])) {
    $sizesList[(string)$currentSizeRaw] = ['label' => $displaySize, 'icon' => $icon];
}

$appUrl = defined('APP_URL') ? APP_URL : '';
?>

<div class="view-content" data-ref="canvas-resize-wrapper">
    
    <div class="component-top">
        <div class="component-top-left" style="display: flex; align-items: center; gap: 16px;">
            <button class="component-button component-button--icon component-button--transparent" data-nav="<?php echo $appUrl; ?>/canvases/manage">
                <span class="material-symbols-rounded">arrow_back</span>
            </button>
            <div>
                <h1 class="component-top-title">Expansión de Lienzo</h1>
            </div>
        </div>
        <div class="component-top-right" style="display: flex; gap: 8px;">
            <button type="button" class="component-button component-button--secondary component-button--h40" data-action="applyResizeNow" data-tooltip="Aplica el tamaño seleccionado instantáneamente">
                <span class="material-symbols-rounded">flash_on</span>
                Aplicar ahora
            </button>
            <button type="button" class="component-button component-button--primary component-button--h40" data-action="saveScheduledResize">
                <span class="material-symbols-rounded">save</span>
                Guardar programación
            </button>
        </div>
    </div>

    <div class="component-wrapper">
        <div class="component-bottom">
            
            <div class="component-header-card">
                <h1 class="component-page-title">Configuración de Resolución</h1>
                <p class="component-page-description">Modifica el tamaño en vivo del lienzo <strong><?php echo htmlspecialchars($canvas['name']); ?></strong> o programa una expansión automática.</p>
            </div>

            <div class="component-card--grouped" id="resizeCanvasContainer" data-canvas-id="<?php echo htmlspecialchars($canvas['id']); ?>" data-current-size="<?php echo htmlspecialchars($currentSizeRaw); ?>">
                
                <div class="component-group-item component-group-item--wrap">
                    <div class="component-card__content">
                        <div class="component-card__text">
                            <h2 class="component-card__title">Programar Expansión Automática</h2>
                            <p class="component-card__description">Activa esta opción para que el lienzo cambie de tamaño automáticamente en una fecha y hora específicas.</p>
                        </div>
                    </div>
                    <div class="component-card__actions component-card__actions--end">
                        <label class="component-toggle-switch">
                            <input type="checkbox" id="toggleScheduledResize">
                            <span class="component-toggle-slider"></span>
                        </label>
                    </div>
                </div>

                <div class="component-group-item component-group-item--stacked">
                    <div class="component-card__content">
                        <div class="component-card__text">
                            <h2 class="component-card__title">Tamaño Objetivo</h2>
                            <p class="component-card__description">Selecciona la resolución que deseas aplicar (ya sea instantáneamente o de forma programada).</p>
                        </div>
                    </div>
                    <div class="component-card__actions component-card__actions--start">
                        
                        <div class="component-dropdown-wrapper">
                            <div class="component-dropdown-trigger" data-action="toggleDropdown" data-target="dropdownSizeResize">
                                <span class="material-symbols-rounded" data-ref="resize-icon"><?php echo htmlspecialchars($icon); ?></span>
                                <span class="component-dropdown-text" data-ref="text-size-resize"><?php echo htmlspecialchars($displaySize); ?></span>
                                <span class="material-symbols-rounded">expand_more</span>
                            </div>
                            
                            <div class="component-module component-module--dropdown component-module--dropdown-left disabled" data-module="dropdownSizeResize">
                                <div class="component-menu component-menu--w-full component-menu--h-auto component-menu--no-padding component-menu--limited">
                                    <div class="pill-container"><div class="drag-handle"></div></div>
                                    <div class="component-menu-list component-menu-list--scrollable">
                                        <?php foreach ($sizesList as $val => $data): ?>
                                        <div class="component-menu-link <?php echo (string)$currentSizeRaw === (string)$val ? 'active' : ''; ?>" 
                                             data-action="selectValue" 
                                             data-type="size" 
                                             data-value="<?php echo htmlspecialchars($val); ?>" 
                                             data-label="<?php echo htmlspecialchars($data['label']); ?>" 
                                             data-icon="<?php echo htmlspecialchars($data['icon']); ?>">
                                            <div class="component-menu-link-icon"><span class="material-symbols-rounded"><?php echo htmlspecialchars($data['icon']); ?></span></div>
                                            <div class="component-menu-link-text"><span><?php echo htmlspecialchars($data['label']); ?></span></div>
                                        </div>
                                        <?php endforeach; ?>
                                    </div>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>

                <div class="component-group-item component-group-item--wrap" data-ref="resize-warning" style="display: none; background-color: rgba(239, 68, 68, 0.05); border-top: 1px solid rgba(239, 68, 68, 0.2);">
                    <div class="component-card__content">
                        <div class="component-card__text">
                            <h2 class="component-card__title" style="color: var(--color-danger, #ef4444); display: flex; align-items: center; gap: 8px;">
                                <span class="material-symbols-rounded" style="font-size: 20px;">warning</span> Atención
                            </h2>
                            <p class="component-card__description" style="color: var(--color-danger, #ef4444); margin-top: 4px;">Estás seleccionando un tamaño menor al actual. Al reducir, se perderá de forma permanente el arte que esté pintado fuera del nuevo límite.</p>
                        </div>
                    </div>
                </div>

                <div class="component-group-item component-group-item--stacked disabled-interactive" id="scheduledResizeDateBlock" style="opacity: 0.4; transition: opacity 0.3s ease;">
                    <div class="component-card__content">
                        <div class="component-card__text">
                            <h2 class="component-card__title">Fecha y Hora (Tu Zona Horaria)</h2>
                            <p class="component-card__description">
                                Establece el momento exacto de la expansión.
                                <span id="localTimezoneIndicatorResize" style="display: block; margin-top: 4px; font-weight: 500; color: var(--text-primary);">Detectando zona horaria...</span>
                            </p>
                        </div>
                    </div>
                    <div class="component-card__actions component-card__actions--start">
                        
                        <div class="component-dropdown-wrapper">
                            <div class="component-dropdown-trigger" data-action="toggleDropdown" data-target="moduleCalendarDateResize">
                                <span class="material-symbols-rounded">calendar_month</span>
                                <span class="component-dropdown-text" data-ref="resize-date-text">Seleccionar fecha</span>
                                <span class="material-symbols-rounded">expand_more</span>
                            </div>
                            
                            <input type="hidden" data-ref="next_resize_at" value="">

                            <div class="component-module component-module--dropdown component-module--dropdown-left disabled" data-module="moduleCalendarDateResize">
                                <div class="component-menu component-menu--w265 component-menu--h-auto component-menu--no-padding">
                                    <div class="pill-container"><div class="drag-handle"></div></div>
                                    
                                    <div id="resizeCalendarWrapper" class="component-calendar">
                                        <div class="component-calendar-header">
                                            <button type="button" class="component-button component-button--icon component-button--h30" data-action="calendarPrevMonth">
                                                <span class="material-symbols-rounded">chevron_left</span>
                                            </button>
                                            <div class="component-calendar-title" data-ref="calendar-title">Mes Año</div>
                                            <button type="button" class="component-button component-button--icon component-button--h30" data-action="calendarNextMonth">
                                                <span class="material-symbols-rounded">chevron_right</span>
                                            </button>
                                        </div>

                                        <div class="component-calendar-weekdays">
                                            <span><?php echo __('cal_su') ?? 'DO'; ?></span>
                                            <span><?php echo __('cal_mo') ?? 'LU'; ?></span>
                                            <span><?php echo __('cal_tu') ?? 'MA'; ?></span>
                                            <span><?php echo __('cal_we') ?? 'MI'; ?></span>
                                            <span><?php echo __('cal_th') ?? 'JU'; ?></span>
                                            <span><?php echo __('cal_fr') ?? 'VI'; ?></span>
                                            <span><?php echo __('cal_sa') ?? 'SA'; ?></span>
                                        </div>

                                        <div class="component-calendar-days" data-ref="calendar-days"></div>

                                        <div class="component-calendar-time">
                                            <div class="component-input-group component-input-group--h34">
                                                <input type="number" data-ref="calendar-hours" class="component-input-field component-input-field--simple" placeholder="<?php echo __('cal_placeholder_hh') ?? 'HH'; ?>" min="0" max="23" value="00">
                                            </div>
                                            <span>:</span>
                                            <div class="component-input-group component-input-group--h34">
                                                <input type="number" data-ref="calendar-minutes" class="component-input-field component-input-field--simple" placeholder="<?php echo __('cal_placeholder_mm') ?? 'MM'; ?>" min="0" max="59" value="00">
                                            </div>
                                        </div>

                                        <div class="component-calendar-actions">
                                            <button type="button" class="component-button component-button--h30" data-action="calendarClear"><?php echo __('btn_clear') ?? 'Limpiar'; ?></button>
                                            <div>
                                                <button type="button" class="component-button component-button--h30" data-action="calendarCancel"><?php echo __('btn_cancel') ?? 'Cancelar'; ?></button>
                                                <button type="button" class="component-button component-button--h30 component-button--dark" data-action="calendarConfirm"><?php echo __('btn_accept') ?? 'Aceptar'; ?></button>
                                            </div>
                                        </div>
                                    </div>
                                    </div>
                            </div>
                        </div>

                    </div>
                </div>

                <div class="component-group-item component-group-item--stacked disabled-interactive" id="scheduledResizeTimerBlock" style="opacity: 0.4; transition: opacity 0.3s ease;">
                    <div class="component-card__content">
                        <div class="component-card__text">
                            <h2 class="component-card__title">Temporizador Público</h2>
                            <p class="component-card__description">Elige si los usuarios podrán ver una cuenta regresiva para la expansión en el lienzo.</p>
                        </div>
                    </div>
                    <div class="component-card__actions component-card__actions--start">
                        <div class="component-dropdown-wrapper">
                            <div class="component-dropdown-trigger" data-action="toggleDropdown" data-target="dropdownResizeTimerAction">
                                <span class="material-symbols-rounded" data-ref="resize-timer-icon">timer</span>
                                <span class="component-dropdown-text" data-ref="text-resize-timer-action">Mostrar y Reiniciar</span>
                                <span class="material-symbols-rounded">expand_more</span>
                            </div>
                            
                            <div class="component-module component-module--dropdown component-module--dropdown-left disabled" data-module="dropdownResizeTimerAction">
                                <div class="component-menu component-menu--w-full component-menu--h-auto component-menu--no-padding component-menu--limited">
                                    <div class="pill-container"><div class="drag-handle"></div></div>
                                    <div class="component-menu-list component-menu-list--scrollable">
                                        <div class="component-menu-link active" data-action="selectValue" data-type="timer_action" data-value="restart" data-label="Mostrar y Reiniciar" data-icon="timer">
                                            <div class="component-menu-link-icon"><span class="material-symbols-rounded">timer</span></div>
                                            <div class="component-menu-link-text">
                                                <span>Mostrar y Reiniciar</span>
                                                <small style="display: block; opacity: 0.6; font-size: 11px;">Muestra el contador. Al llegar a cero, se reinicia para el siguiente evento.</small>
                                            </div>
                                        </div>
                                        <div class="component-menu-link" data-action="selectValue" data-type="timer_action" data-value="stop" data-label="Mostrar y Detener" data-icon="timer_off">
                                            <div class="component-menu-link-icon"><span class="material-symbols-rounded">timer_off</span></div>
                                            <div class="component-menu-link-text">
                                                <span>Mostrar y Detener</span>
                                                <small style="display: block; opacity: 0.6; font-size: 11px;">Muestra el contador. Al llegar a cero, desaparece del lienzo.</small>
                                            </div>
                                        </div>
                                        <div class="component-menu-link" data-action="selectValue" data-type="timer_action" data-value="none" data-label="Oculto" data-icon="visibility_off">
                                            <div class="component-menu-link-icon"><span class="material-symbols-rounded">visibility_off</span></div>
                                            <div class="component-menu-link-text">
                                                <span>Oculto (Sorpresa)</span>
                                                <small style="display: block; opacity: 0.6; font-size: 11px;">No muestra el contador en el lienzo.</small>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

            </div>

        </div>
    </div>
</div>