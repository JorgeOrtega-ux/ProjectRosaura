<?php
// includes/views/admin/manage-users.php
if (session_status() === PHP_SESSION_NONE) session_start();
?>
<div class="view-content">
    <div class="component-wrapper">
        <div class="component-header-card">
            <h1 class="component-page-title"><?php echo __('admin_users_title'); ?></h1>
            <p class="component-page-description"><?php echo __('admin_users_desc'); ?></p>
        </div>

        <div class="component-card--grouped">
            <div class="component-group-item component-group-item--stacked">
                <div class="component-card__content component-card__content--full component-card__content--start">
                    <div class="component-card__text">
                        <p class="component-card__description">Espacio reservado para la tabla y acciones de gestión de usuarios.</p>
                    </div>
                </div>
            </div>
        </div>

    </div>
</div>