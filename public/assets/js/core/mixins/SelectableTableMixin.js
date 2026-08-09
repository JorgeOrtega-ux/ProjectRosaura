/**
 * SelectableTableMixin
 *
 * Centraliza el comportamiento de selección de fila única en controladores de tabla.
 * Elimina la duplicación de deselectAll / selectTableRow / _toggleSelectionBar
 * que existía en AdminPackagesController, AdminPerksController,
 * AdminSubscriptionsController y AdminRolesController.
 *
 * Uso:
 *   applySelectableTable(MiController, {
 *       idProp:       'selectedPackageId',           // propiedad donde se guarda el ID
 *       selectionRef: 'package-selection-actions',   // data-ref de la barra de selección
 *       rowSelector:  '[data-ref="packages-table-body"] tr.selected', // selector para limpiar
 *   });
 *
 * Hook opcional en el controlador:
 *   _onDeselect() { this.selectedExtraId = null; }  // se llama al inicio de deselectAll
 */
export function applySelectableTable(ControllerClass, { idProp, selectionRef, rowSelector }) {

    /**
     * Alterna la visibilidad entre la barra de acciones por defecto
     * y la barra de acciones de selección.
     * @param {boolean} active - true = mostrar selección, false = mostrar default
     */
    ControllerClass.prototype._toggleSelectionBar = function(active) {
        const selectionActions = document.querySelector(`[data-ref="${selectionRef}"]`);
        const defaultActions   = document.querySelector('[data-ref="header-default-actions"]');
        if (!selectionActions || !defaultActions) return;
        selectionActions.classList.toggle('active',  active);
        selectionActions.classList.toggle('disabled', !active);
        defaultActions.classList.toggle('disabled',  active);
        defaultActions.classList.toggle('active',    !active);
    };

    /**
     * Selecciona una fila: cancela la selección anterior, marca la fila
     * y activa la barra de selección.
     * @param {string|number} id         - Identificador del ítem seleccionado
     * @param {HTMLElement}   trElement  - Elemento de fila a marcar
     */
    ControllerClass.prototype.selectTableRow = function(id, trElement) {
        this.deselectAll();
        this[idProp] = id;
        trElement.classList.add('selected');
        this._toggleSelectionBar(true);
    };

    /**
     * Limpia toda la selección activa: resetea el ID, quita clases
     * de las filas y oculta la barra de selección.
     */
    ControllerClass.prototype.deselectAll = function() {
        this[idProp] = null;
        // Hook para que el controlador limpie IDs adicionales (p.ej. selectedRoleUuid)
        if (typeof this._onDeselect === 'function') this._onDeselect();
        if (rowSelector) {
            document.querySelectorAll(rowSelector).forEach(tr => tr.classList.remove('selected'));
        }
        this._toggleSelectionBar(false);
    };
}
