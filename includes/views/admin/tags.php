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
                                            <div class="component-menu-link-icon"><span class="material-symbols-rounded">category</span></div>
                                            <div class="component-menu-link-text"><span>Tipo de etiqueta</span></div>
                                            <div class="component-menu-link-icon"><span class="material-symbols-rounded">chevron_right</span></div>
                                        </div>
                                        <div class="component-menu-link component-menu-link--bordered" data-action="openFilterSubMenu" data-target="menuFilterGender">
                                            <div class="component-menu-link-icon"><span class="material-symbols-rounded">wc</span></div>
                                            <div class="component-menu-link-text"><span>Género del Modelo</span></div>
                                            <div class="component-menu-link-icon"><span class="material-symbols-rounded">chevron_right</span></div>
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
                                            <div class="component-menu-link-text"><span>Categoría</span></div>
                                        </label>
                                        <label class="component-menu-link component-menu-link--bordered">
                                            <div class="component-menu-link-icon">
                                                <input type="checkbox" class="filter-checkbox" data-filter-type="type" value="modelo" checked>
                                            </div>
                                            <div class="component-menu-link-text"><span>Modelo</span></div>
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
                                            <div class="component-menu-link-icon"><input type="checkbox" class="filter-checkbox" data-filter-type="gender" value="female" checked></div>
                                            <div class="component-menu-link-text"><span>Femenino</span></div>
                                        </label>
                                        <label class="component-menu-link component-menu-link--bordered">
                                            <div class="component-menu-link-icon"><input type="checkbox" class="filter-checkbox" data-filter-type="gender" value="male" checked></div>
                                            <div class="component-menu-link-text"><span>Masculino</span></div>
                                        </label>
                                        <label class="component-menu-link component-menu-link--bordered">
                                            <div class="component-menu-link-icon"><input type="checkbox" class="filter-checkbox" data-filter-type="gender" value="trans" checked></div>
                                            <div class="component-menu-link-text"><span>Trans</span></div>
                                        </label>
                                        <label class="component-menu-link component-menu-link--bordered">
                                            <div class="component-menu-link-icon"><input type="checkbox" class="filter-checkbox" data-filter-type="gender" value="other" checked></div>
                                            <div class="component-menu-link-text"><span>Otro</span></div>
                                        </label>
                                    </div>
                                </div>
                            </div>
                        </div>

                    </div>
                    <div class="component-toolbar-right">
                        <button class="component-button component-button--dark component-button--h40" data-action="openTagEditor">
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
                    <div class="component-search-icon"><span class="material-symbols-rounded">search</span></div>
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


    <div class="component-wrapper disabled" data-ref="editor-tags-wrapper">
        
        <div class="component-sticky-toolbar">
            <div class="component-toolbar-primary">
                <div class="component-toolbar-left">
                    <button class="component-button component-button--icon component-button--h40" data-action="closeTagEditor" data-tooltip="Volver al listado" data-position="bottom">
                        <span class="material-symbols-rounded">arrow_back</span>
                    </button>
                    <div class="component-toolbar-title" id="tagEditorToolbarTitle">Nueva Etiqueta</div>
                </div>
                <div class="component-toolbar-right">
                    <button class="component-button component-button--dark component-button--h40" data-action="submitTagForm">
                        <span class="material-symbols-rounded">save</span>
                        <span class="hide-on-mobile">Guardar</span>
                    </button>
                </div>
            </div>
        </div>

        <div class="component-header-card">
            <h1 class="component-page-title" id="tagEditorHeaderTitle">Nueva Etiqueta</h1>
            <p class="component-page-description">Configura los detalles de la etiqueta o categoría.</p>
        </div>

        <div class="component-content-section">
            <form id="tagForm">
                <input type="hidden" id="tagId" name="id" value="">
                
                <div class="component-card component-card--grouped">
                    
                    <div class="component-group-item component-group-item--stacked">
                        <div class="component-card__content">
                            <div class="component-card__text">
                                <h2 class="component-card__title">Nombre de la etiqueta</h2>
                                <p class="component-card__description">El nombre principal que identificará a esta categoría o modelo.</p>
                            </div>
                        </div>
                        <div class="component-card__actions component-card__actions--stretch">
                            <div class="component-input-group component-input-group--h34">
                                <input type="text" class="component-input-field component-input-field--simple" id="tagName" name="name" placeholder="Ej. Amateur, Mia Khalifa..." required>
                            </div>
                        </div>
                    </div>

                    <div class="component-group-item component-group-item--stacked">
                        <div class="component-card__content">
                            <div class="component-card__text">
                                <h2 class="component-card__title">Tipo de etiqueta</h2>
                                <p class="component-card__description">Define si es una categoría general o un modelo específico.</p>
                            </div>
                        </div>
                        <div class="component-card__actions component-card__actions--start">
                            <input type="hidden" id="tagType" name="type" value="category">
                            
                            <div class="component-dropdown-wrapper">
                                <div class="component-dropdown-trigger" data-action="toggleCustomDropdown" data-target="moduleTagType">
                                    <span class="material-symbols-rounded" id="tagTypeIcon">category</span>
                                    <span class="component-dropdown-text" id="tagTypeText">Categoría</span>
                                    <span class="material-symbols-rounded">expand_more</span>
                                </div>
                                <div class="component-module component-module--dropdown component-module--dropdown-left disabled" id="moduleTagType">
                                    <div class="component-menu component-menu--w-full component-menu--h-auto component-menu--no-padding">
                                        <div class="component-menu-list component-menu-list--scrollable">
                                            
                                            <div class="component-menu-link active" data-action="setTagDropdownValue" data-field="Type" data-value="category" data-text="Categoría" data-icon="category">
                                                <div class="component-menu-link-icon">
                                                    <span class="material-symbols-rounded">category</span>
                                                </div>
                                                <div class="component-menu-link-text">
                                                    <span>Categoría</span>
                                                </div>
                                            </div>

                                            <div class="component-menu-link" data-action="setTagDropdownValue" data-field="Type" data-value="modelo" data-text="Modelo" data-icon="star">
                                                <div class="component-menu-link-icon">
                                                    <span class="material-symbols-rounded">star</span>
                                                </div>
                                                <div class="component-menu-link-text">
                                                    <span>Modelo</span>
                                                </div>
                                            </div>

                                        </div>
                                    </div>
                                </div>
                            </div>

                        </div>
                    </div>

                    <div class="component-group-item component-group-item--stacked" id="tagGenderGroup" style="display: none;">
                        <div class="component-card__content">
                            <div class="component-card__text">
                                <h2 class="component-card__title">Género del modelo</h2>
                                <p class="component-card__description">Aplicable solo si el tipo de etiqueta es "Modelo".</p>
                            </div>
                        </div>
                        <div class="component-card__actions component-card__actions--start">
                            <input type="hidden" id="tagGender" name="gender" value="female">
                            
                            <div class="component-dropdown-wrapper">
                                <div class="component-dropdown-trigger" data-action="toggleCustomDropdown" data-target="moduleTagGender">
                                    <span class="material-symbols-rounded" id="tagGenderIcon">female</span>
                                    <span class="component-dropdown-text" id="tagGenderText">Femenino</span>
                                    <span class="material-symbols-rounded">expand_more</span>
                                </div>
                                <div class="component-module component-module--dropdown component-module--dropdown-left disabled" id="moduleTagGender">
                                    <div class="component-menu component-menu--w-full component-menu--h-auto component-menu--no-padding">
                                        <div class="component-menu-list component-menu-list--scrollable">
                                            
                                            <div class="component-menu-link active" data-action="setTagDropdownValue" data-field="Gender" data-value="female" data-text="Femenino" data-icon="female">
                                                <div class="component-menu-link-icon"><span class="material-symbols-rounded">female</span></div>
                                                <div class="component-menu-link-text"><span>Femenino</span></div>
                                            </div>

                                            <div class="component-menu-link" data-action="setTagDropdownValue" data-field="Gender" data-value="male" data-text="Masculino" data-icon="male">
                                                <div class="component-menu-link-icon"><span class="material-symbols-rounded">male</span></div>
                                                <div class="component-menu-link-text"><span>Masculino</span></div>
                                            </div>

                                            <div class="component-menu-link" data-action="setTagDropdownValue" data-field="Gender" data-value="trans" data-text="Trans" data-icon="transgender">
                                                <div class="component-menu-link-icon"><span class="material-symbols-rounded">transgender</span></div>
                                                <div class="component-menu-link-text"><span>Trans</span></div>
                                            </div>

                                            <div class="component-menu-link" data-action="setTagDropdownValue" data-field="Gender" data-value="other" data-text="Otro" data-icon="person">
                                                <div class="component-menu-link-icon"><span class="material-symbols-rounded">person</span></div>
                                                <div class="component-menu-link-text"><span>Otro</span></div>
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