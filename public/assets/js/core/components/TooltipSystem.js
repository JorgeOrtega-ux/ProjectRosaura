// public/assets/js/core/tooltip-system.js

export class TooltipSystem {
    constructor() {
        this.activeTooltip = null;
        this.activePopper = null;
        this.activeTarget = null;
        this.initialized = false;
    }

    init() {
        if (this.initialized) return;
        this.initialized = true;

        document.addEventListener('mouseover', (e) => this.handleShow(e));
        document.addEventListener('focusin', (e) => this.handleShow(e));
        document.addEventListener('mouseout', (e) => this.handleHide(e));
        document.addEventListener('focusout', (e) => this.handleHide(e));
        
        document.addEventListener('click', (e) => {
            if (this.activeTarget && this.activeTarget.contains(e.target)) {
                this.destroyCurrent();
            }
        });
    }

    handleShow(e) {
        const target = e.target.closest('[data-tooltip]');
        if (!target) return;
        
        if (this.activeTarget === target) return;

        if (this.activeTarget) this.destroyCurrent();

        this.activeTarget = target;
        const text = target.getAttribute('data-tooltip');
        if (!text) return;

        this.activeTooltip = document.createElement('div');
        this.activeTooltip.className = 'aurora-tooltip';
        
        // Desactivamos la transición temporalmente para evitar el "viaje" desde 0,0
        this.activeTooltip.style.transition = 'none';
        
        const innerText = document.createElement('span');
        innerText.textContent = text;
        this.activeTooltip.appendChild(innerText);
        
        const arrow = document.createElement('div');
        arrow.className = 'aurora-tooltip-arrow';
        arrow.setAttribute('data-popper-arrow', '');
        this.activeTooltip.appendChild(arrow);

        document.body.appendChild(this.activeTooltip);

        const preferredPosition = target.getAttribute('data-position') || 'auto';

        this.activePopper = Popper.createPopper(target, this.activeTooltip, {
            placement: preferredPosition,
            modifiers: [
                { name: 'offset', options: { offset: [0, 8] } },
                { name: 'flip', enabled: true, options: { fallbackPlacements: ['bottom', 'top', 'left', 'right'] } },
                { name: 'preventOverflow', enabled: true, options: { boundary: 'viewport' } }
            ],
        });

        this.activePopper.update().then(() => {
            requestAnimationFrame(() => {
                if (this.activeTooltip) {
                    // Limpiamos la propiedad de forma nativa sin dejar rastros vacíos
                    this.activeTooltip.style.removeProperty('transition'); 
                    
                    requestAnimationFrame(() => {
                        if (this.activeTooltip) {
                            this.activeTooltip.classList.add('show');
                        }
                    });
                }
            });
        });
    }

    handleHide(e) {
        if (!this.activeTarget) return;

        const target = e.target.closest('[data-tooltip]');
        if (!target && e.type !== 'focusout') return; 

        if (e.type === 'mouseout' && e.relatedTarget && this.activeTarget.contains(e.relatedTarget)) {
            return;
        }

        this.destroyCurrent();
    }

    destroyCurrent() {
        if (this.activeTooltip) {
            // Guardamos referencias locales para no perderlas en el setTimeout
            const tooltipToRemove = this.activeTooltip;
            const popperToRemove = this.activePopper;

            // Iniciamos la animación de salida
            tooltipToRemove.classList.remove('show');
            
            // ¡CLAVE!: Destruimos Popper y el DOM SOLO CUANDO termine la animación.
            // Si lo destruimos antes, pierde su "position: absolute" y genera Overflow
            setTimeout(() => {
                if (popperToRemove) {
                    popperToRemove.destroy();
                }
                if (tooltipToRemove.parentNode) {
                    tooltipToRemove.parentNode.removeChild(tooltipToRemove);
                }
            }, 200); 
        }

        this.activeTooltip = null;
        this.activePopper = null;
        this.activeTarget = null;
    }
}