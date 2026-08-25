<?php
// Catálogo y Playground de Modales (Herramienta de Desarrollo)
?>
<div class="view-content">
    <div class="component-wrapper">
        <div class="component-bottom">
            <div class="component-header-card">
                <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px;">
                    <div>
                        <h1 class="component-page-title">Catálogo de Modales</h1>
                        <p class="component-page-description">Playground de desarrollo para auditar y probar visualmente el layout, clases y diseño de todos los modales.</p>
                    </div>
                    <div class="component-badge component-badge--sm" data-ref="modal-count-badge" style="font-weight: 600;">
                        <span class="material-symbols-rounded">widgets</span>
                        <span data-ref="modal-total-count">Cargando...</span>
                    </div>
                </div>
            </div>

            <!-- Filter & Search Bar -->
            <div class="component-card--grouped" style="padding: 16px; display: flex; flex-direction: column; gap: 12px;">
                <div class="component-input-group" style="margin: 0;">
                    <input type="text" data-ref="modal-search-input" class="component-input-field component-input-field--with-icon" placeholder=" " autocomplete="off">
                    <label class="component-input-label">Buscar modal por nombre o categoría...</label>
                    <span class="material-symbols-rounded component-input-icon">search</span>
                </div>

                <div style="display: flex; gap: 8px; flex-wrap: wrap;" data-ref="modal-category-filters">
                    <button type="button" class="component-badge component-badge--interactive active" data-category="all">Todos</button>
                    <button type="button" class="component-badge component-badge--interactive" data-category="security">Seguridad & 2FA</button>
                    <button type="button" class="component-badge component-badge--interactive" data-category="canvas">Lienzos & Espacio</button>
                    <button type="button" class="component-badge component-badge--interactive" data-category="admin">Admin & Roles</button>
                    <button type="button" class="component-badge component-badge--interactive" data-category="billing">Facturación & Tienda</button>
                    <button type="button" class="component-badge component-badge--interactive" data-category="dialogs">Confirmaciones & Diálogos</button>
                    <button type="button" class="component-badge component-badge--interactive" data-category="general">General & Otros</button>
                </div>
            </div>

            <!-- Modals List Grid -->
            <div id="dev-modals-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 16px; margin-top: 8px;">
                <!-- Dynamically populated by DevModalsController -->
            </div>
        </div>
    </div>
</div>
