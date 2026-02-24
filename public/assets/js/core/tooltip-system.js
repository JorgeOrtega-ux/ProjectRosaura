// public/assets/js/core/tooltip-system.js

export class TooltipSystem {
    constructor() {
        this.tooltips = new Map();
    }

    init() {
        this.destroyAll(); // Limpiar instancias previas si recarga por SPA
        const elements = document.querySelectorAll('[data-tooltip]');
        elements.forEach(el => this.createTooltip(el));
    }

    createTooltip(element) {
        const text = element.getAttribute('data-tooltip');
        if (!text) return;

        // Crear contenedor del Tooltip
        const tooltip = document.createElement('div');
        tooltip.className = 'aurora-tooltip';
        
        // Contenedor interno para el texto
        const innerText = document.createElement('span');
        innerText.textContent = text;
        tooltip.appendChild(innerText);
        
        // Crear flecha para Popper.js
        const arrow = document.createElement('div');
        arrow.className = 'aurora-tooltip-arrow';
        arrow.setAttribute('data-popper-arrow', '');
        tooltip.appendChild(arrow);

        // Se anexa al body para evitar problemas de overflow
        document.body.appendChild(tooltip);

        // Si no hay atributo data-position, será 'auto' por defecto.
        const preferredPosition = element.getAttribute('data-position') || 'auto';

        // Instanciar Popper con soporte inteligente de espacios
        const popperInstance = Popper.createPopper(element, tooltip, {
            placement: preferredPosition,
            modifiers: [
                {
                    name: 'offset',
                    options: {
                        offset: [0, 8],
                    },
                },
                {
                    // Voltea el tooltip automáticamente si no cabe en su posición original
                    name: 'flip',
                    enabled: true,
                    options: {
                        fallbackPlacements: ['bottom', 'top', 'left', 'right'],
                    },
                },
                {
                    // Previene que se salga de los bordes de la pantalla
                    name: 'preventOverflow',
                    enabled: true,
                    options: {
                        boundary: 'viewport',
                    },
                }
            ],
        });

        const show = () => {
            tooltip.classList.add('show');
            popperInstance.update(); // Obliga a Popper a recalcular el espacio justo antes de mostrarse
        };

        const hide = () => {
            tooltip.classList.remove('show');
        };

        // Eventos
        element.addEventListener('mouseenter', show);
        element.addEventListener('focus', show);
        element.addEventListener('mouseleave', hide);
        element.addEventListener('blur', hide);

        this.tooltips.set(element, { tooltip, popperInstance, show, hide });
    }

    destroyAll() {
        this.tooltips.forEach((data, element) => {
            element.removeEventListener('mouseenter', data.show);
            element.removeEventListener('focus', data.show);
            element.removeEventListener('mouseleave', data.hide);
            element.removeEventListener('blur', data.hide);
            data.popperInstance.destroy();
            if (data.tooltip && data.tooltip.parentNode) {
                data.tooltip.parentNode.removeChild(data.tooltip);
            }
        });
        this.tooltips.clear();
    }
}