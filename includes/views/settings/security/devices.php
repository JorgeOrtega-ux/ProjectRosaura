<?php
// includes/views/settings/security/devices.php
if (session_status() === PHP_SESSION_NONE) session_start();

// 1. Instanciar u obtener el servicio usando tu Contenedor de Dependencias
// (Ajusta la forma de llamar a $container según cómo esté definido en bootstrap.php)
global $container;
$settingsServices = $container->get(\App\Api\Services\SettingsServices::class);
$response = $settingsServices->getDevices();
$devices = $response['success'] ? $response['devices'] : [];

// 2. Helper local para parsear el User Agent (similar al que tenías en JS)
function parseUserAgentPHP($ua) {
    $browser = "Browser"; $os = "OS"; $icon = "devices";
    if (!$ua) return ['browser' => $browser, 'os' => $os, 'icon' => $icon];
    
    if (stripos($ua, "Firefox") !== false) $browser = "Firefox";
    elseif (stripos($ua, "Edg") !== false) $browser = "Edge";
    elseif (stripos($ua, "Chrome") !== false) $browser = "Chrome";
    elseif (stripos($ua, "Safari") !== false) $browser = "Safari";
    
    if (stripos($ua, "Win") !== false) { $os = "Windows"; $icon = "computer"; }
    elseif (stripos($ua, "Mac") !== false) { $os = "MacOS"; $icon = "computer"; }
    elseif (stripos($ua, "Linux") !== false) { $os = "Linux"; $icon = "computer"; }
    elseif (stripos($ua, "Android") !== false) { $os = "Android"; $icon = "smartphone"; }
    elseif (stripos($ua, "iPhone") !== false || stripos($ua, "iPad") !== false) { $os = "iOS"; $icon = "smartphone"; }
    
    return ['browser' => $browser, 'os' => $os, 'icon' => $icon];
}
?>
<div class="view-content">
    <div class="component-wrapper">
        <div class="component-bottom">

            <div class="component-header-card">
                <h1 class="component-page-title"><?php echo __('devices_title'); ?></h1>
                <p class="component-page-description"><?php echo __('devices_desc'); ?></p>
            </div>

            <div class="component-card--grouped component-card--elevated component-spacing--top-lg active" data-ref="devices-container">
                
                <?php if (empty($devices)): ?>
                    <div class="component-group-item empty-row">
                        <p class="component-text--danger">No se pudieron cargar los dispositivos.</p>
                    </div>
                <?php else: ?>
                    
                    <?php foreach ($devices as $device): ?>
                        <?php 
                        $parsedUA = parseUserAgentPHP($device['user_agent']); 
                        $isCurrent = !empty($device['is_current']);
                        ?>
                        <div class="component-group-item device-item-row" id="device-row-<?php echo $device['id']; ?>">
                            <div class="component-card__content">
                                <div class="component-card__icon-container component-card__icon-container--bordered">
                                    <span class="material-symbols-rounded"><?php echo $parsedUA['icon']; ?></span>
                                </div>
                                <div class="component-card__text">
                                    <h2 class="component-card__title <?php echo $isCurrent ? 'component-text--bold' : ''; ?>">
                                        <?php echo $parsedUA['os'] . ' - ' . $parsedUA['browser']; ?>
                                    </h2>
                                    <div class="component-badge-list component-badge-list--spaced">
                                        <?php if (!empty($device['location']) && $device['location'] !== 'Unknown' && $device['location'] !== 'Local Network'): ?>
                                            <?php $asnText = !empty($device['asn']) ? " ({$device['asn']})" : ''; ?>
                                            <div class="component-badge component-badge--sm" title="<?php echo htmlspecialchars($device['location'] . $asnText); ?>">
                                                <span class="material-symbols-rounded">location_on</span>
                                                <span style="max-width: 180px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: inline-block;">
                                                    <?php echo htmlspecialchars($device['location'] . $asnText); ?>
                                                </span>
                                            </div>
                                        <?php endif; ?>
                                        <div class="component-badge component-badge--sm">
                                            <span class="material-symbols-rounded">wifi</span>
                                            <span><?php echo htmlspecialchars($device['ip_address'] ?? __('device_unknown_ip')); ?></span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="component-card__actions component-card__actions--end">
                                <?php if ($isCurrent): ?>
                                    <div class="component-badge component-badge--sm component-badge--success">
                                        <span class="material-symbols-rounded component-icon--sm">verified</span>
                                        <?php echo __('device_current') ?: 'Sesión Actual'; ?>
                                    </div>
                                <?php else: ?>
                                    <button class="component-button component-button--danger component-button--h36" data-action="revokeDevice" data-id="<?php echo $device['id']; ?>">
                                        <?php echo __('btn_logout'); ?>
                                    </button>
                                <?php endif; ?>
                            </div>
                        </div>
                        
                        <?php if ($isCurrent || $device !== end($devices)): ?>
                            <hr class="component-divider">
                        <?php endif; ?>
                        
                    <?php endforeach; ?>
                    
                    <hr class="component-divider">
                    <div class="component-group-item component-group-item--wrap">
                        <div class="component-card__content">
                            <div class="component-card__icon-container component-card__icon-container--bordered">
                                <span class="material-symbols-rounded">logout</span>
                            </div>
                            <div class="component-card__text">
                                <h2 class="component-card__title"><?php echo __('btn_revoke_all'); ?></h2>
                                <p class="component-card__description"><?php echo __('devices_revoke_all_desc') ?: 'Cierra todas tus sesiones activas en otros dispositivos para mantener tu cuenta segura.'; ?></p>
                            </div>
                        </div>
                        <div class="component-card__actions component-card__actions--end">
                            <button class="component-button component-button--danger component-button--h36" data-action="revokeAllDevices">
                                <?php echo __('btn_revoke_all'); ?>
                            </button>
                        </div>
                    </div>
                <?php endif; ?>

            </div>
        </div>
    </div>
</div>