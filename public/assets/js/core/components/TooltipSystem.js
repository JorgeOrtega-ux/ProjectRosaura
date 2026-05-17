// public/assets/js/core/components/TooltipSystem.js

export class TooltipSystem {
    constructor() {
        this.activeTooltip = null;
        this.activePopper = null;
        this.activeTarget = null;
        this.initialized = false;

        // Bindings obligatorios para ciclo de vida controlado
        this.handleShowBound = this.handleShow.bind(this);
        this.handleHideBound = this.handleHide.bind(this);
        this.handleClickBound = this.handleClick.bind(this);
    }

    init() {
        if (this.initialized) return;
        this.initialized = true;

        document.addEventListener('mouseover', this.handleShowBound);
        document.addEventListener('focusin', this.handleShowBound);
        document.addEventListener('mouseout', this.handleHideBound);
        document.addEventListener('focusout', this.handleHideBound);
        document.addEventListener('click', this.handleClickBound);
    }

    destroy() {
        document.removeEventListener('mouseover', this.handleShowBound);
        document.removeEventListener('focusin', this.handleShowBound);
        document.removeEventListener('mouseout', this.handleHideBound);
        document.removeEventListener('focusout', this.handleHideBound);
        document.removeEventListener('click', this.handleClickBound);
        
        this.destroyCurrent();
        this.initialized = false;
    }

    handleClick(e) {
        if (this.activeTarget && this.activeTarget.contains(e.target)) {
            this.destroyCurrent();
        }
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
        this.activeTooltip.className = 'component-tooltip';
        
        const innerText = document.createElement('span');
        innerText.textContent = text;
        this.activeTooltip.appendChild(innerText);
        
        const arrow = document.createElement('div');
        arrow.className = 'component-tooltip-arrow';
        arrow.setAttribute('data-popper-arrow', '');
        this.activeTooltip.appendChild(arrow);

        document.body.appendChild(this.activeTooltip);

        const preferredPosition = target.getAttribute('data-position') || 'auto';

        this.activePopper = Popper.createPopper(target, this.activeTooltip, {
            placement: preferredPosition,
            modifiers: [
                { name: 'offset', options: { offset: [0, 8] } },
                { name: 'flip', enabled: true, options: { fallbackPlacements: ['bottom', 'top', 'left', 'right'] } },
                { name: 'preventOverflow', enabled: true, options: { boundary: 'viewport' } },
                // LA MAGIA ESTÁ AQUÍ: Evitamos que Popper use transform (translate3d)
                // Esto hace que el salto inicial sea instantáneo mediante top/left
                { name: 'computeStyles', options: { gpuAcceleration: false } }
            ],
        });

        this.activePopper.update().then(() => {
            requestAnimationFrame(() => {
                if (this.activeTooltip) {
                    this.activeTooltip.classList.add('show');
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
            const tooltipToRemove = this.activeTooltip;
            const popperToRemove = this.activePopper;

            tooltipToRemove.classList.remove('show');
            
            setTimeout(() => {
                if (popperToRemove) {
                    popperToRemove.destroy();
                }
                if (tooltipToRemove.parentNode) {
                    tooltipToRemove.parentNode.removeChild(tooltipToRemove);
                }
            }, 150); // Sincronizado con la duración del CSS (0.15s)
        }

        this.activeTooltip = null;
        this.activePopper = null;
        this.activeTarget = null;
    }
}