<?php
// includes/views/admin/backups/backups-automation.php
if (session_status() === PHP_SESSION_NONE) session_start();

use App\Config\DatabaseManager;
use PDO;

// 1. Obtener Configuración del Servidor
$dbManager = new DatabaseManager();
$pdoIdentity = $dbManager->getConnection('identity');

$stmtConfig = $pdoIdentity->query("SELECT * FROM server_config LIMIT 1");
$config = $stmtConfig->fetch(PDO::FETCH_ASSOC) ?: [];

// Valores por defecto si no existen
$autoEnabled = (int)($config['auto_backup_enabled'] ?? 0);
$autoFreq = (int)($config['auto_backup_frequency_hours'] ?? 24);
$autoRetention = (int)($config['auto_backup_retention_count'] ?? 5);
$schemaConfigJson = $config['backup_schema_config'] ?? '{}';
$schemaConfig = json_decode($schemaConfigJson, true) ?: [];

// 2. Traducir el valor de frecuencia para el primer renderizado (SSR)
$freqTextMap = [
    0 => __('freq_test_mode'),
    1 => __('freq_1_hour'),
    3 => __('freq_3_hours'),
    6 => __('freq_6_hours'),
    12 => __('freq_12_hours'),
    24 => __('freq_1_day'),
    48 => __('freq_2_days'),
    168 => __('freq_1_week')
];
$currentFreqText = $freqTextMap[$autoFreq] ?? str_replace(':hours', $autoFreq, __('freq_every_x_hours'));

// 3. Obtener Esquema de Base de Datos (Tablas)
$databases = ['identity']; 
$availableSchema = [];

foreach ($databases as $dbName) {
    try {
        $pdo = $dbManager->getConnection($dbName);
        $stmt = $pdo->query("SHOW TABLES");
        $availableSchema[$dbName] = $stmt->fetchAll(PDO::FETCH_COLUMN);
    } catch (\Exception $e) {
        $availableSchema[$dbName] = [];
    }
}

// Extraer módulos físicos del JSON guardado
$selectedModules = $schemaConfig['_modules'] ?? [
    'db' => true,
    'avatars_uploaded' => false,
    'avatars_default' => false
];
?>

<div class="view-content">
    
    <div class="component-top">
        <div class="component-top-left">
            <h1 class="component-top-title"><?php echo __('admin_backups_auto_title'); ?></h1>
        </div>
        <div class="component-top-right">
            <button class="component-button component-button--icon component-button--h40 disabled-interaction" data-action="submitAutoBackupConfig" data-ref="btn-save-auto-backup" data-tooltip="<?php echo __('btn_save_config'); ?>" data-position="bottom">
                <span class="material-symbols-rounded">save</span>
            </button>
        </div>
    </div>

    <div class="component-viewport">
        <div class="component-wrapper">
            <div class="component-bottom">
                
                <script type="application/json" data-ref="admin-auto-available-schema">
                    <?php echo json_encode($availableSchema); ?>
                </script>

                <div class="component-card--grouped" data-form-group="admin-auto-form">
                    <div class="component-group-item component-group-item--wrap">
                        <div class="component-card__content">
                            <div class="component-card__icon-container component-card__icon-container--bordered">
                                <span class="material-symbols-rounded">power_settings_new</span>
                            </div>
                            <div class="component-card__text">
                                <h2 class="component-card__title"><?php echo __('auto_backup_enabled_title'); ?></h2>
                                <p class="component-card__description"><?php echo __('auto_backup_enabled_desc'); ?></p>
                            </div>
                        </div>
                        <div class="component-card__actions component-card__actions--end">
                            <label class="component-toggle-switch">
                                <input type="checkbox" data-ref="toggle-auto-backup" data-action="toggleAutoBackup" <?php echo $autoEnabled ? 'checked' : ''; ?>>
                                <span class="component-toggle-slider"></span>
                            </label>
                        </div>
                    </div>
                </div>

                <div class="component-card--grouped <?php echo !$autoEnabled ? 'disabled' : ''; ?>" data-ref="wrapper-auto-options" data-form-group="admin-auto-form">
                    <div class="component-group-item component-group-item--stacked">
                        <div class="component-card__content">
                            <div class="component-card__text">
                                <h2 class="component-card__title"><?php echo __('auto_backup_freq_title'); ?></h2>
                                <p class="component-card__description"><?php echo __('auto_backup_freq_desc'); ?></p>
                            </div>
                        </div>
                        <div class="component-card__actions component-card__actions--start">
                            <div class="component-dropdown-wrapper">
                                <div class="component-dropdown-trigger" data-action="toggleModule" data-target="adminModuleAutoFreq">
                                    <span class="material-symbols-rounded">update</span>
                                    <span class="component-dropdown-text" data-ref="admin-autoFreq-text" data-val="<?php echo $autoFreq; ?>">
                                        <?php echo htmlspecialchars($currentFreqText); ?>
                                    </span>
                                    <span class="material-symbols-rounded">expand_more</span>
                                </div>
                                <div class="component-module component-module--dropdown component-module--dropdown-left disabled" data-module="adminModuleAutoFreq">
                                    <div class="component-menu component-menu--w-full component-menu--h-auto component-menu--no-padding">
                                        <div class="pill-container"><div class="drag-handle"></div></div>
                                        <div class="component-menu-list component-menu-list--scrollable">
                                            <?php 
                                            $freqs = [0 => 'test', 1 => '1h', 3 => '3h', 6 => '6h', 12 => '12h', 24 => '24h', 48 => '48h', 168 => '168h'];
                                            foreach($freqs as $val => $label): 
                                                $icon = $val == 0 ? 'bug_report' : ($val >= 24 ? ($val >= 168 ? 'date_range' : 'today') : 'schedule');
                                            ?>
                                            <div class="component-menu-link <?php echo $autoFreq === $val ? 'active' : ''; ?>" data-action="adminSetDropdown" data-key="auto_backup_frequency_hours" data-value="<?php echo $val; ?>">
                                                <div class="component-menu-link-icon"><span class="material-symbols-rounded"><?php echo $icon; ?></span></div>
                                                <div class="component-menu-link-text"><span><?php echo __("auto_freq_$label"); ?></span></div>
                                            </div>
                                            <?php if($val === 0) echo '<div class="component-menu-divider"></div>'; ?>
                                            <?php endforeach; ?>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <hr class="component-divider">

                    <div class="component-group-item component-group-item--stacked">
                        <div class="component-card__content">
                            <div class="component-card__text">
                                <h2 class="component-card__title"><?php echo __('auto_backup_retention_title'); ?></h2>
                                <p class="component-card__description"><?php echo __('auto_backup_retention_desc'); ?></p>
                            </div>
                        </div>
                        <div class="component-card__actions component-card__actions--start">
                            <div class="component-inline-control component-inline-control--fixed">
                                <div class="component-inline-control__group">
                                    <button type="button" class="component-inline-control__btn" data-action="adjustAutoConfig" data-field="auto_backup_retention_count" data-step="-5" data-min="1"><span class="material-symbols-rounded">keyboard_double_arrow_left</span></button>
                                    <button type="button" class="component-inline-control__btn" data-action="adjustAutoConfig" data-field="auto_backup_retention_count" data-step="-1" data-min="1"><span class="material-symbols-rounded">chevron_left</span></button>
                                </div>
                                <div class="component-inline-control__center" data-ref="val_auto_backup_retention_count" data-val="<?php echo $autoRetention; ?>"><?php echo $autoRetention; ?></div>
                                <div class="component-inline-control__group">
                                    <button type="button" class="component-inline-control__btn" data-action="adjustAutoConfig" data-field="auto_backup_retention_count" data-step="1" data-max="100"><span class="material-symbols-rounded">chevron_right</span></button>
                                    <button type="button" class="component-inline-control__btn" data-action="adjustAutoConfig" data-field="auto_backup_retention_count" data-step="5" data-max="100"><span class="material-symbols-rounded">keyboard_double_arrow_right</span></button>
                                </div>
                            </div>
                        </div>
                    </div>

                </div>

                <div class="component-card--grouped <?php echo !$autoEnabled ? 'disabled' : ''; ?>" data-ref="wrapper-auto-modules" data-form-group="admin-auto-form">
                    <div class="component-group-item component-group-item--stacked">
                        <div class="component-card__content">
                            <div class="component-card__text">
                                <h2 class="component-card__title"><?php echo __('auto_backup_modules_title'); ?></h2>
                                <p class="component-card__description"><?php echo __('auto_backup_modules_desc'); ?></p>
                            </div>
                        </div>
                    </div>
                    
                    <hr class="component-divider">
                    
                    <div class="component-group-item component-group-item--wrap">
                        <div class="component-card__content">
                            <div class="component-card__icon-container component-card__icon-container--bordered">
                                <span class="material-symbols-rounded">folder_shared</span>
                            </div>
                            <div class="component-card__text">
                                <h2 class="component-card__title"><?php echo __('auto_backup_uploaded_avatars_title'); ?></h2>
                                <p class="component-card__description"><?php echo __('auto_backup_uploaded_avatars_desc'); ?></p>
                            </div>
                        </div>
                        <div class="component-card__actions component-card__actions--end">
                            <label class="component-toggle-switch">
                                <input type="checkbox" data-ref="auto-module-uploaded" data-action="toggleAutoModule" <?php echo !empty($selectedModules['avatars_uploaded']) ? 'checked' : ''; ?>>
                                <span class="component-toggle-slider"></span>
                            </label>
                        </div>
                    </div>
                    
                    <hr class="component-divider">
                    
                    <div class="component-group-item component-group-item--wrap">
                        <div class="component-card__content">
                            <div class="component-card__icon-container component-card__icon-container--bordered">
                                <span class="material-symbols-rounded">folder_special</span>
                            </div>
                            <div class="component-card__text">
                                <h2 class="component-card__title"><?php echo __('auto_backup_default_avatars_title'); ?></h2>
                                <p class="component-card__description"><?php echo __('auto_backup_default_avatars_desc'); ?></p>
                            </div>
                        </div>
                        <div class="component-card__actions component-card__actions--end">
                            <label class="component-toggle-switch">
                                <input type="checkbox" data-ref="auto-module-default" data-action="toggleAutoModule" <?php echo !empty($selectedModules['avatars_default']) ? 'checked' : ''; ?>>
                                <span class="component-toggle-slider"></span>
                            </label>
                        </div>
                    </div>
                </div>

                <div class="component-card--grouped <?php echo !$autoEnabled ? 'disabled' : ''; ?>" data-ref="wrapper-auto-schema" data-form-group="admin-auto-form">
                    <div class="component-group-item component-group-item--stacked">
                        <div class="component-card__content">
                            <div class="component-card__text">
                                <h2 class="component-card__title"><?php echo __('auto_backup_schema_title'); ?></h2>
                                <p class="component-card__description"><?php echo __('auto_backup_schema_desc'); ?></p>
                            </div>
                        </div>
                    </div>
                    
                    <hr class="component-divider">

                    <div data-ref="admin-auto-schema-container">
                        <div class="component-list component-list--flush"> <?php foreach($availableSchema as $dbName => $tables): 
                                $selectedTables = $schemaConfig[$dbName] ?? [];
                                $countSelected = count($selectedTables);
                                $totalTables = count($tables);
                            ?>
                            <div class="component-card--grouped component-accordion component-card--flush"> <div class="component-group-item component-group-item--wrap component-accordion-header" data-action="toggleAccordion" data-db="<?php echo $dbName; ?>">
                                    <div class="component-card__content">
                                        <div class="component-card__text">
                                            <h2 class="component-card__title"><?php echo $dbName; ?></h2>
                                            <p class="component-card__description"><?php echo __('auto_backup_tables_available', ['count' => $totalTables]); ?></p>
                                        </div>
                                    </div>
                                    <div class="component-card__actions component-card__actions--end">
                                        <span class="component-badge component-badge--sm" data-badge="<?php echo $dbName; ?>" style="<?php echo $countSelected > 0 ? 'display: inline-flex;' : 'display: none;'; ?>">
                                            <?php echo __('auto_backup_tables_selected', ['selected' => $countSelected, 'total' => $totalTables]); ?>
                                        </span>
                                        <div data-action="preventAccordion">
                                            <label class="component-toggle-switch">
                                                <input type="checkbox" class="auto-schema-db-cb" value="<?php echo $dbName; ?>" <?php echo $countSelected > 0 ? 'checked' : ''; ?>>
                                                <span class="component-toggle-slider"></span>
                                            </label>
                                        </div>
                                        <span class="material-symbols-rounded component-accordion-icon">expand_more</span>
                                    </div>
                                </div>
                                <div class="component-accordion-body">
                                    <div class="component-accordion-content">
                                        <?php foreach($tables as $index => $table): ?>
                                        <div class="component-group-item component-group-item--wrap">
                                            <div class="component-card__content">
                                                <div class="component-card__icon-container component-card__icon-container--bordered">
                                                    <span class="material-symbols-rounded">table_rows</span>
                                                </div>
                                                <div class="component-card__text">
                                                    <h2 class="component-card__title"><?php echo $table; ?></h2>
                                                    <p class="component-card__description"><?php echo __('auto_backup_table_desc', ['table' => $table]); ?></p>
                                                </div>
                                            </div>
                                            <div class="component-card__actions component-card__actions--end">
                                                <label class="component-toggle-switch">
                                                    <input type="checkbox" class="auto-schema-table-cb" data-db="<?php echo $dbName; ?>" value="<?php echo $table; ?>" <?php echo in_array($table, $selectedTables) ? 'checked' : ''; ?>>
                                                    <span class="component-toggle-slider"></span>
                                                </label>
                                            </div>
                                        </div>
                                        <?php if($index < $totalTables - 1) echo '<hr class="component-divider">'; ?>
                                        <?php endforeach; ?>
                                    </div>
                                </div>
                            </div>
                            <?php endforeach; ?>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    </div>
</div>