<?php
// includes/views/admin/tags.php
if (session_status() === PHP_SESSION_NONE) session_start();
?>
<div class="view-content">
    <div class="component-wrapper" data-ref="manage-tags-wrapper">
        
        <div class="component-sticky-toolbar">
            
            <div class="component-toolbar-primary">
                <div class="component-toolbar-mode active" data-ref="toolbar-default-mode">
                    <div class="component-toolbar-left">
                        <div class="component-toolbar-title disabled" data-ref="toolbar-dynamic-title" data-i18n="admin_tags_title">
                            Etiquetas y Categorías
                        </div>
                        <button class="component-button component-button--icon component-button--h40" data-action="searchTag" data-ref="btn-toggle-search" data-tooltip="Buscar" data-position="bottom">
                            <span class="material-symbols-rounded">search</span>
                        </button>
                        
                        <div class="component-dropdown-wrapper component-dropdown-wrapper--fit">
                            <button class="component-button component-button--icon component-button--h40" data-action="toggleTagFilters" data-ref="btn-toggle-filters" data-tooltip="Filtros" data-position="bottom">
                                <span class="material-symbols-rounded">tune</span>
                            </button>
                            
                            <div class="component-module component-module--dropdown component-module--dropdown-left component-module--dropdown-fixed component-module--spaced disabled" data-module="moduleTagFilters">
                                
                                <div class="component-menu component-menu--w265 component-menu--h-auto component-menu--no-padding active" data-ref="menuMainFilters">
                                    <div class="pill-container"><div class="drag-handle"></div></div>
                                    
                                    <div class="component-menu-header">
                                        <div class="component-menu-header-box">
                                            <span class="component-menu-header-title">Filtrar resultados</span>
                                        </div>
                                    </div>
                                    
                                    <div class="component-menu-list component-menu-list--compact">
                                        <div class="component-menu-link component-menu-link--bordered" data-action="openFilterSubMenu" data-target="menuFilterType">
                                            <div class="component-menu-link-icon">
                                                <span class="material-symbols-rounded">category</span>
                                            </div>
                                            <div class="component-menu-link-text">
                                                <span>Tipo de etiqueta</span>
                                            </div>
                                            <div class="component-menu-link-icon">
                                                <span class="material-symbols-rounded">chevron_right</span>
                                            </div>
                                        </div>
                                        <div class="component-menu-link component-menu-link--bordered" data-action="openFilterSubMenu" data-target="menuFilterGender">
                                            <div class="component-menu-link-icon">
                                                <span class="material-symbols-rounded">wc</span>
                                            </div>
                                            <div class="component-menu-link-text">
                                                <span>Género del Modelo</span>
                                            </div>
                                            <div class="component-menu-link-icon">
                                                <span class="material-symbols-rounded">chevron_right</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div class="component-menu component-menu--w265 component-menu--h-auto component-menu--no-padding disabled" data-ref="menuFilterType">
                                    <div class="pill-container"><div class="drag-handle"></div></div>
                                    <div class="component-menu-header">
                                        <div class="component-menu-header-box">
                                            <button class="component-button component-button--icon component-button--h30 component-button--back" data-action="backToMainFilters">
                                                <span class="material-symbols-rounded">arrow_back</span>
                                            </button>
                                            <span class="component-menu-header-title">Filtrar por tipo</span>
                                        </div>
                                    </div>
                                    <div class="component-menu-list component-menu-list--scrollable component-menu-list--compact">
                                        <label class="component-menu-link component-menu-link--bordered">
                                            <div class="component-menu-link-icon">
                                                <input type="checkbox" class="filter-checkbox" data-filter-type="type" value="category" checked>
                                            </div>
                                            <div class="component-menu-link-text">
                                                <span data-i18n="tag_type_category">Categoría</span>
                                            </div>
                                        </label>
                                        <label class="component-menu-link component-menu-link--bordered">
                                            <div class="component-menu-link-icon">
                                                <input type="checkbox" class="filter-checkbox" data-filter-type="type" value="modelo" checked>
                                            </div>
                                            <div class="component-menu-link-text">
                                                <span data-i18n="tag_type_modelo">Modelo</span>
                                            </div>
                                        </label>
                                    </div>
                                </div>

                                <div class="component-menu component-menu--w265 component-menu--h-auto component-menu--no-padding disabled" data-ref="menuFilterGender">
                                    <div class="pill-container"><div class="drag-handle"></div></div>
                                    <div class="component-menu-header">
                                        <div class="component-menu-header-box">
                                            <button class="component-button component-button--icon component-button--h30 component-button--back" data-action="backToMainFilters">
                                                <span class="material-symbols-rounded">arrow_back</span>
                                            </button>
                                            <span class="component-menu-header-title">Filtrar por género</span>
                                        </div>
                                    </div>
                                    <div class="component-menu-list component-menu-list--scrollable component-menu-list--compact">
                                        <label class="component-menu-link component-menu-link--bordered">
                                            <div class="component-menu-link-icon">
                                                <input type="checkbox" class="filter-checkbox" data-filter-type="gender" value="female" checked>
                                            </div>
                                            <div class="component-menu-link-text">
                                                <span data-i18n="tag_gender_female">Femenino</span>
                                            </div>
                                        </label>
                                        <label class="component-menu-link component-menu-link--bordered">
                                            <div class="component-menu-link-icon">
                                                <input type="checkbox" class="filter-checkbox" data-filter-type="gender" value="male" checked>
                                            </div>
                                            <div class="component-menu-link-text">
                                                <span data-i18n="tag_gender_male">Masculino</span>
                                            </div>
                                        </label>
                                        <label class="component-menu-link component-menu-link--bordered">
                                            <div class="component-menu-link-icon">
                                                <input type="checkbox" class="filter-checkbox" data-filter-type="gender" value="trans" checked>
                                            </div>
                                            <div class="component-menu-link-text">
                                                <span data-i18n="tag_gender_trans">Trans</span>
                                            </div>
                                        </label>
                                        <label class="component-menu-link component-menu-link--bordered">
                                            <div class="component-menu-link-icon">
                                                <input type="checkbox" class="filter-checkbox" data-filter-type="gender" value="other" checked>
                                            </div>
                                            <div class="component-menu-link-text">
                                                <span data-i18n="tag_gender_other">Otro</span>
                                            </div>
                                        </label>
                                    </div>
                                </div>

                            </div>
                        </div>

                    </div>
                    <div class="component-toolbar-right">
                        <button class="component-button component-button--dark component-button--h40" data-action="openAddTagModal">
                            <span class="material-symbols-rounded">add</span>
                            <span class="hide-on-mobile" data-i18n="btn_add_tag">Añadir Etiqueta</span>
                        </button>
                        <button class="component-button component-button--icon component-button--h40" data-action="toggleViewMode" data-tooltip="Cambiar vista" data-position="bottom">
                            <span class="material-symbols-rounded">table_rows</span>
                        </button>
                    </div>
                </div>

                <div class="component-toolbar-mode disabled" data-ref="toolbar-selection-mode">
                    <div class="component-toolbar-left">
                        <button class="component-button component-button--icon component-button--h40" data-action="editSelectedTag" data-tooltip="Editar" data-position="bottom">
                            <span class="material-symbols-rounded">edit</span>
                        </button>
                        <button class="component-button component-button--icon component-button--h40" style="color: var(--status-danger);" data-action="deleteSelectedTag" data-tooltip="Eliminar" data-position="bottom">
                            <span class="material-symbols-rounded">delete</span>
                        </button>
                    </div>
                    <div class="component-toolbar-right">
                        <button class="component-button component-button--icon component-button--h40" data-action="deselectTag" data-tooltip="Cancelar selección" data-position="bottom">
                            <span class="material-symbols-rounded">close</span>
                        </button>
                    </div>
                </div>

            </div>

            <div class="component-toolbar-secondary" data-ref="secondary-toolbar">
                <div class="component-search">
                    <div class="component-search-icon">
                        <span class="material-symbols-rounded">search</span>
                    </div>
                    <div class="component-search-input">
                        <input type="text" data-ref="tag-search-input" placeholder="Buscar etiqueta...">
                    </div>
                </div>
            </div>
        </div>

        <div class="component-header-card" data-ref="manage-tags-header">
            <h1 class="component-page-title" data-i18n="admin_tags_title">Etiquetas y Categorías</h1>
            <p class="component-page-description" data-i18n="admin_tags_desc">Administra las categorías y los modelos (pornstars) para clasificar el contenido de los videos.</p>
        </div>
        
        <div class="component-list active" data-ref="view-cards" id="tagsCardsContainer">
            <div id="tagsCardsBody" style="display: contents;"></div>
            
            <div class="component-empty-state disabled" data-ref="empty-search-cards">
                <span class="material-symbols-rounded component-empty-state-icon">search_off</span>
                <p class="component-empty-state-text">No se encontraron etiquetas con esos filtros.</p>
            </div>

            <div class="component-empty-state" id="tagsSystemEmptyCards" style="display: none;">
                <span class="material-symbols-rounded component-empty-state-icon">label_off</span>
                <p class="component-empty-state-text" data-i18n="empty_tags_system">No hay etiquetas registradas.</p>
            </div>
        </div>

        <div class="component-table-wrapper disabled" data-ref="view-table">
            <table class="component-table" id="tagsTable">
                <thead>
                    <tr>
                        <th data-i18n="table_header_tag_name">Nombre</th>
                        <th data-i18n="table_header_tag_type">Tipo</th>
                        <th data-i18n="table_header_tag_gender">Género</th>
                    </tr>
                </thead>
                <tbody id="tagsTableBody"></tbody>
            </table>

            <div class="component-empty-table-cell disabled" data-ref="empty-search-table" style="border-bottom: none;">
                <div class="component-empty-state component-empty-state--table">
                    <span class="material-symbols-rounded component-empty-state-icon">search_off</span>
                    <p class="component-empty-state-text">No se encontraron etiquetas con esos filtros.</p>
                </div>
            </div>

            <div class="component-empty-table-cell" id="tagsSystemEmptyTable" style="display: none; border-bottom: none;">
                <div class="component-empty-state component-empty-state--table">
                    <span class="material-symbols-rounded component-empty-state-icon">label_off</span>
                    <p class="component-empty-state-text" data-i18n="empty_tags_system">No hay etiquetas registradas.</p>
                </div>
            </div>
        </div>

    </div>
</div>

<div class="component-dialog-overlay" id="tagModalOverlay">
    <div class="component-dialog-wrapper">
        <div class="component-dialog-box">
            <div class="pill-container"></div> 
            <div class="component-dialog-header">
                <h2 class="component-dialog-title" id="tagModalTitle" data-i18n="modal_add_tag_title">Nueva Etiqueta</h2>
            </div>
            
            <div class="component-dialog-content">
                <form id="tagForm">
                    <input type="hidden" id="tagId" name="id" value="">
                    
                    <div class="component-input-group">
                        <label class="component-label" for="tagName" data-i18n="lbl_tag_name">Nombre</label>
                        <input type="text" class="component-input" id="tagName" name="name" placeholder="Ej. Amateur, Mia Khalifa..." required>
                    </div>

                    <div class="component-input-group">
                        <label class="component-label" for="tagType" data-i18n="lbl_tag_type">Tipo de etiqueta</label>
                        <select class="component-input" id="tagType" name="type" required>
                            <option value="category" data-i18n="tag_type_category">Categoría</option>
                            <option value="modelo" data-i18n="tag_type_modelo">Modelo</option>
                        </select>
                    </div>

                    <div class="component-input-group" id="tagGenderGroup" style="display: none;">
                        <label class="component-label" for="tagGender" data-i18n="lbl_tag_gender">Género del modelo</label>
                        <select class="component-input" id="tagGender" name="gender">
                            <option value="female" data-i18n="tag_gender_female">Femenino</option>
                            <option value="male" data-i18n="tag_gender_male">Masculino</option>
                            <option value="trans" data-i18n="tag_gender_trans">Trans</option>
                            <option value="other" data-i18n="tag_gender_other">Otro</option>
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