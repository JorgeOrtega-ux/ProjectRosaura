<?php
// includes/views/admin/tags.php
if (session_status() === PHP_SESSION_NONE) session_start();
?>
<div class="view-content">
    <div class="component-wrapper">
        
        <div class="component-sticky-toolbar">
            <div class="component-toolbar-primary">
                <div class="component-toolbar-mode active">
                    <div class="component-toolbar-left">
                    </div>
                    <div class="component-toolbar-right">
                        <button class="component-button component-button--dark component-button--h40" data-action="openAddTagModal">
                            <span class="material-symbols-rounded">add</span>
                            <span data-i18n="btn_add_tag">Añadir Etiqueta</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>

        <div class="component-header-card">
            <h1 class="component-page-title" data-i18n="admin_tags_title">Etiquetas y Categorías</h1>
            <p class="component-page-description" data-i18n="admin_tags_desc">Administra las etiquetas de actores, actrices y categorías para clasificar el contenido de los videos.</p>
        </div>
        
        <div class="component-card--grouped">
            <div class="component-group-item component-group-item--stacked">
                <div class="component-card__content component-card__content--full component-card__content--start">
                    <table class="component-table" id="tagsTable">
                        <thead>
                            <tr>
                                <th data-i18n="table_header_tag_name">Nombre</th>
                                <th data-i18n="table_header_tag_type">Tipo</th>
                                <th data-i18n="table_header_tag_actions">Acciones</th>
                            </tr>
                        </thead>
                        <tbody id="tagsTableBody">
                            </tbody>
                    </table>
                    <div id="tagsEmptyState" style="display: none; padding: 20px; text-align: center; color: var(--text-color-secondary);">
                        <p data-i18n="empty_tags_system">No hay etiquetas registradas.</p>
                    </div>
                </div>
            </div>
        </div>

    </div>
</div>

<div class="component-dialog-overlay" id="tagModalOverlay">
    <div class="component-dialog-wrapper">
        <div class="component-dialog-box">
            <div class="pill-container"></div> <div class="component-dialog-header">
                <h2 class="component-dialog-title" id="tagModalTitle" data-i18n="modal_add_tag_title">Nueva Etiqueta</h2>
            </div>
            
            <div class="component-dialog-content">
                <form id="tagForm">
                    <input type="hidden" id="tagId" name="id" value="">
                    
                    <div class="component-input-group">
                        <label class="component-label" for="tagName" data-i18n="lbl_tag_name">Nombre</label>
                        <input type="text" class="component-input" id="tagName" name="name" placeholder="Ej. Drama, John Doe..." required>
                    </div>

                    <div class="component-input-group">
                        <label class="component-label" for="tagType" data-i18n="lbl_tag_type">Tipo</label>
                        <select class="component-input" id="tagType" name="type" required>
                            <option value="category" data-i18n="tag_type_category">Categoría</option>
                            <option value="actor" data-i18n="tag_type_actor">Actor / Actriz</option>
                        </select>
                    </div>
                </form>
            </div>
            
            <div class="component-dialog-actions" style="margin-top: 24px; display: flex; justify-content: flex-end; gap: 12px;">
                <button class="component-button component-button--light" data-action="closeTagModal" data-i18n="btn_cancel">Cancelar</button>
                <button class="component-button component-button--dark" data-action="submitTagForm" data-i18n="btn_save_tag">Guardar</button>
            </div>
        </div>
        
        <button class="component-dialog-close-btn" data-action="closeTagModal">
            <span class="material-symbols-rounded">close</span>
        </button>
    </div>
</div>