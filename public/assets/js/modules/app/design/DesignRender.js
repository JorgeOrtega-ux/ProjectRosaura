// public/assets/js/modules/app/DesignRender.js
import { getPaletteById } from './utils/DesignPaletteUtils.js';

export const DesignRender = {
    renderColorPalette(paletteId) {
        const palette = getPaletteById(paletteId);
        if (!palette || !palette.colors) return;

        let container = document.querySelector('[data-ref="color-palette-grid"]');
        if (!container) return; 

        container.innerHTML = '';

        this.currentColor = palette.colors[0].hex;
        if (this.btnColorPalette) {
            this.btnColorPalette.style.setProperty('--active-color', this.currentColor);
        }

        palette.colors.forEach((colorObj, index) => {
            const hex = colorObj.hex;
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = `component-color-btn ${index === 0 ? 'active' : ''}`;
            btn.setAttribute('data-action', 'selectColor');
            btn.setAttribute('data-color', hex);
            
            // Asignación de tooltip utilizando tu sistema de internacionalización
            const colorName = typeof __ === 'function' ? __(colorObj.name_key) : colorObj.name_key;
            btn.setAttribute('data-tooltip', `${colorName} - ${hex.toUpperCase()}`);
            
            btn.style.backgroundColor = hex;
            btn.style.setProperty('--color-val', hex); 

            container.appendChild(btn);
        });

        this.requestRender();
    },

    isDarkMode() {
        const html = document.documentElement;
        const body = document.body;
        return html.classList.contains('dark-theme') || 
               html.classList.contains('dark') || 
               html.getAttribute('data-theme') === 'dark' ||
               body.classList.contains('dark-theme') || 
               body.classList.contains('dark') || 
               body.getAttribute('data-theme') === 'dark';
    },

    requestRender() {
        if (!this.needsRender) {
            this.needsRender = true;
            this.animationFrameId = requestAnimationFrame(this.renderBound);
        }
    },

    render() {
        this.needsRender = false;
        if (!this.ctx || !this.canvas) return;

        const isDark = this.isDarkMode();
        const bgColor = isDark ? '#0e0e11' : '#f5f5fa'; 
        const gridColor = 'rgba(0, 0, 0, 0.15)'; 
        const activeColor = this.currentColor; 

        this.ctx.fillStyle = bgColor; 
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        this.ctx.save();
        
        const dpr = window.devicePixelRatio || 1;
        this.ctx.scale(dpr, dpr);
        
        this.ctx.translate(this.transform.x, this.transform.y);
        this.ctx.scale(this.transform.scale, this.transform.scale);
        
        this.ctx.imageSmoothingEnabled = false;
        
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.fillRect(0, 0, this.boardWidth, this.boardHeight);

        if (this.activeTemplateId && !this.isSpectator && !this.timelapseActive && !this.isResetLocked) {
            const tpl = this.templates.find(t => t.id === this.activeTemplateId);
            if (tpl) {
                this.ctx.save();
                this.ctx.globalAlpha = tpl.opacity;
                this.ctx.drawImage(tpl.img, tpl.x, tpl.y, tpl.w, tpl.h);
                this.ctx.restore();

                if (!tpl.locked) {
                    this.ctx.save();
                    this.ctx.strokeStyle = '#2196F3';
                    this.ctx.lineWidth = 2 / this.transform.scale;
                    this.ctx.strokeRect(tpl.x, tpl.y, tpl.w, tpl.h);

                    const hs = 10 / this.transform.scale;
                    this.ctx.fillStyle = '#FFFFFF';
                    this.ctx.strokeStyle = '#2196F3';
                    this.ctx.lineWidth = 1.5 / this.transform.scale;

                    const drawHandle = (hx, hy) => {
                        this.ctx.fillRect(hx - hs/2, hy - hs/2, hs, hs);
                        this.ctx.strokeRect(hx - hs/2, hy - hs/2, hs, hs);
                    };

                    drawHandle(tpl.x, tpl.y);
                    drawHandle(tpl.x + tpl.w, tpl.y);
                    drawHandle(tpl.x, tpl.y + tpl.h);
                    drawHandle(tpl.x + tpl.w, tpl.y + tpl.h);

                    this.ctx.restore();
                }
            }
        }

        if (this.transform.scale > 4) {
            this.ctx.lineWidth = 1 / this.transform.scale;
            this.ctx.strokeStyle = gridColor; 
            this.ctx.beginPath();
            
            const rect = this.canvas.getBoundingClientRect();
            
            const startX = Math.max(0, Math.floor(-this.transform.x / this.transform.scale));
            const startY = Math.max(0, Math.floor(-this.transform.y / this.transform.scale));
            const endX = Math.min(this.boardWidth, Math.ceil((rect.width - this.transform.x) / this.transform.scale));
            const endY = Math.min(this.boardHeight, Math.ceil((rect.height - this.transform.y) / this.transform.scale));

            for (let x = startX; x <= endX; x++) {
                this.ctx.moveTo(x, startY);
                this.ctx.lineTo(x, endY);
            }
            for (let y = startY; y <= endY; y++) {
                this.ctx.moveTo(startX, y);
                this.ctx.lineTo(endX, y);
            }
            this.ctx.stroke();
        }

        this.ctx.drawImage(this.offscreenCanvas, 0, 0);

        const renderSet = new Set(this.selectedPixels);

        if (this.hoveredPixel && !this.isSpectator && !this.timelapseActive && !this.isResetLocked) {
            const hoverKey = `${this.hoveredPixel.x},${this.hoveredPixel.y}`;
            if (!renderSet.has(hoverKey)) {
                renderSet.add(hoverKey);
            }
        }

        if (renderSet.size > 0 && !this.isSpectator && !this.timelapseActive && !this.isResetLocked) {
            this.ctx.strokeStyle = activeColor; 
            this.ctx.lineWidth = 1 / this.transform.scale;
            this.ctx.beginPath();
            
            renderSet.forEach(key => {
                const [x, y] = key.split(',').map(Number);
                
                const hasTop = renderSet.has(`${x},${y-1}`);
                const hasBottom = renderSet.has(`${x},${y+1}`);
                const hasLeft = renderSet.has(`${x-1},${y}`);
                const hasRight = renderSet.has(`${x+1},${y}`);
                
                if (!hasTop) { this.ctx.moveTo(x, y); this.ctx.lineTo(x + 1, y); }
                if (!hasBottom) { this.ctx.moveTo(x, y + 1); this.ctx.lineTo(x + 1, y + 1); }
                if (!hasLeft) { this.ctx.moveTo(x, y); this.ctx.lineTo(x, y + 1); }
                if (!hasRight) { this.ctx.moveTo(x + 1, y); this.ctx.lineTo(x + 1, y + 1); }
            });
            this.ctx.stroke();
        }

        this.ctx.restore();
    }
};