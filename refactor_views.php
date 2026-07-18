<?php

$create_path = "/var/www/html/includes/views/canvases/create.php";
$edit_path = "/var/www/html/includes/views/canvases/edit.php";

function build_accordion($title_icon, $title_text, $desc_text, $inner_html, $is_open = false) {
    $active = $is_open ? "active" : "";
    return "
                <div class=\"component-card--grouped component-accordion {$active}\">
                    <div class=\"component-group-item component-group-item--wrap component-accordion-header\" data-action=\"toggleAccordion\">
                        <div class=\"component-card__content\">
                            <div class=\"component-card__icon-container component-card__icon-container--bordered\">
                                <span class=\"material-symbols-rounded\">{$title_icon}</span>
                            </div>
                            <div class=\"component-card__text\">
                                <h2 class=\"component-card__title\">{$title_text}</h2>
                                <p class=\"component-card__description\">{$desc_text}</p>
                            </div>
                        </div>
                        <div class=\"component-card__actions component-card__actions--end\">
                            <span class=\"material-symbols-rounded component-accordion-icon\">expand_more</span>
                        </div>
                    </div>
                    <div class=\"component-accordion-body\">
                        <div class=\"component-accordion-content\">
                            {$inner_html}
                        </div>
                    </div>
                </div>
";
}

function process_file($path, $is_create = true) {
    $content = file_get_contents($path);

    // Find component-bottom
    $start_marker = '<div class="component-bottom">';
    $start_idx = strpos($content, $start_marker);
    if ($start_idx === false) return;
    $start_idx += strlen($start_marker);

    $end_marker = "            </div>\n        </div>\n    </div>\n</div>";
    $end_idx = strpos($content, $end_marker, $start_idx);
    if ($end_idx === false) {
        $end_idx = strrpos($content, '            </div>');
    }

    $inner = substr($content, $start_idx, $end_idx - $start_idx);

    $extract_item = function($identifier_string) use ($inner) {
        $idx = strpos($inner, $identifier_string);
        if ($idx === false) return "";
        $start = strrpos(substr($inner, 0, $idx), '<div class="component-group-item');
        if ($start === false) return "";

        $div_count = 0;
        $i = $start;
        $end = false;
        while ($i < strlen($inner)) {
            if (substr($inner, $i, 4) === '<div') {
                $div_count++;
                $i += 4;
            } elseif (substr($inner, $i, 5) === '</div') {
                $div_count--;
                $i += 5;
                if ($div_count === 0) {
                    $end = strpos($inner, '>', $i) + 1;
                    break;
                }
            } else {
                $i++;
            }
        }
        
        if ($end === false) return "";

        return trim(substr($inner, $start, $end - $start));
    };

    $sections = [];
    $sections['name'] = $extract_item('data-state="canvasname-view"');
    $sections['desc'] = $extract_item('data-ref="input-canvas-desc"');
    $sections['tags'] = $extract_item('dropdownTags');
    
    $sections['size'] = $extract_item('dropdownSize');
    if (!$sections['size']) $sections['size'] = $extract_item('canvas_size_locked_tooltip');
    
    $sections['privacy'] = $extract_item('dropdownPrivacy');
    $sections['approval'] = $extract_item('dropdownApproval');
    $sections['batch'] = $extract_item('val_cooldown_batch');
    $sections['cooldown'] = $extract_item('val_cooldown_seconds');
    $sections['limit'] = $extract_item('val_limit');
    
    $sections['palette'] = $extract_item('dropdownPalette');
    $sections['purchases'] = $extract_item('val_allow_purchases');
    $sections['chat'] = $extract_item('val_allow_chat');

    $is_checked = $is_create ? '""' : '"<?php echo ($cOfficial ?? false) ? \'checked\' : \'\'; ?>"';
    
    $official_php = "
                            <?php if (\$canCreateOfficial): ?>
                            <div class=\"component-group-item component-group-item--wrap\">
                                <div class=\"component-card__content\">
                                    <div class=\"component-card__text\">
                                        <h2 class=\"component-card__title\"><?php echo __('canvas_is_official_title'); ?></h2>
                                        <p class=\"component-card__description\"><?php echo __('canvas_is_official_desc'); ?></p>
                                    </div>
                                </div>
                                <div class=\"component-card__actions component-card__actions--end\">
                                    <label class=\"component-toggle-switch\">
                                        <input type=\"checkbox\" data-ref=\"val_is_official\" {$is_checked}>
                                        <span class=\"component-toggle-slider\"></span>
                                    </label>
                                </div>
                            </div>
                            <hr class=\"component-divider\">
                            <?php endif; ?>
";

    $acc1_inner = $official_php . "
                            {$sections['name']}
                            <hr class=\"component-divider\">
                            {$sections['desc']}
                            <hr class=\"component-divider\">
                            {$sections['tags']}
";
    $acc1 = build_accordion("info", "<?php echo __('canvas_accordion_general_title'); ?>", "<?php echo __('canvas_accordion_general_desc'); ?>", trim($acc1_inner), true);

    $acc2_inner = "
                            {$sections['size']}
                            <hr class=\"component-divider\">
                            {$sections['privacy']}
                            <hr class=\"component-divider\">
                            {$sections['approval']}
                            <hr class=\"component-divider\">
                            {$sections['batch']}
                            <hr class=\"component-divider\">
                            {$sections['cooldown']}
                            <hr class=\"component-divider\">
                            {$sections['limit']}
";
    $acc2 = build_accordion("settings", "<?php echo __('canvas_accordion_config_title'); ?>", "<?php echo __('canvas_accordion_config_desc'); ?>", trim($acc2_inner));

    $acc3_inner = "
                            {$sections['palette']}
                            <hr class=\"component-divider\">
                            {$sections['purchases']}
                            <hr class=\"component-divider\">
                            {$sections['chat']}
";
    $acc3 = build_accordion("extension", "<?php echo __('canvas_accordion_features_title'); ?>", "<?php echo __('canvas_accordion_features_desc'); ?>", trim($acc3_inner));

    $new_bottom = "\n{$acc1}\n{$acc2}\n{$acc3}\n                ";
    
    $new_content = substr($content, 0, $start_idx) . $new_bottom . substr($content, $end_idx);
    
    if (!$is_create && strpos($new_content, '$userPerms = $_SESSION[\'user_permissions\'] ?? [];') === false) {
        $php_insert = "
\$userPerms = \$_SESSION['user_permissions'] ?? [];
\$canCreateOfficial = in_array(\\App\\Core\\System\\PermissionsConstants::ACCESS_ADMIN_PANEL, \$userPerms) || in_array(\\App\\Core\\System\\PermissionsConstants::CANVASES_CREATE_OFFICIAL, \$userPerms);
\$cOfficial = (bool)(\$canvasData['is_official'] ?? 0);
";
        $new_content = str_replace("\$cTags = [];", "{$php_insert}\n            \$cTags = [];", $new_content);
    }

    file_put_contents($path, $new_content);
    echo "Refactored $path\n";
}

process_file($create_path, true);
process_file($edit_path, false);

?>
