import { getPaletteById } from './utils/DesignPaletteUtils.js';
import { PerksRegistry } from './PerksRegistry.js';

export const DesignRender = {
    renderColorPalette(paletteId) {
        const palette = getPaletteById(paletteId);
        let container = document.querySelector('[data-ref="color-palette-grid"]');
        if (!container) return; 

        const emptyState = container.parentNode.querySelector('[data-ref="empty-state-rendered"]');
        container.innerHTML = '';

        if (!palette || !palette.colors || palette.colors.length === 0) {
            container.classList.remove('active'); container.classList.add('disabled');
            if (emptyState) {
                emptyState.classList.remove('disabled'); emptyState.classList.add('active');
                const emptyText = emptyState.querySelector('.component-empty-state-text');
                if (emptyText) emptyText.innerText = window.__('no_colors_available');
            }
            return;
        }

        container.classList.remove('disabled'); container.classList.add('active');
        if (emptyState) emptyState.classList.remove('active'); emptyState.classList.add('disabled');

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
        if (this.renderWorker) {
            const selArray = this.selectedPixels ? Array.from(this.selectedPixels) : [];
            const hoverKey = this.hoveredPixel ? ((this.hoveredPixel.y << 16) | this.hoveredPixel.x) : -1;
            
            this.renderWorker.postMessage({
                type: 'UPDATE_TRANSFORM',
                payload: {
                    transform: this.transform,
                    isDarkMode: this.isDarkMode(),
                    currentColor: this.currentColor,
                    isSpectator: this.isSpectator,
                    isResetLocked: this.isResetLocked
                }
            });

            this.renderWorker.postMessage({
                type: 'UPDATE_SELECTION',
                payload: {
                    selectedPixels: selArray,
                    hoveredPixelKey: hoverKey
                }
            });
            return;
        }

        if (!this.needsRender) {
            this.needsRender = true;
            this.animationFrameId = requestAnimationFrame(this.renderBound);
        }
    },

    render() {
        this.needsRender = false;
        if (!this.ctx || !this.canvas) return;

        if (this.pixelQueue && this.pixelQueue.length > 0 && this.offscreenCtx && this.boardWidth > 0 && this.boardHeight > 0) {
            try {
                while (this.pixelQueue.length > 0) {
                    const p = this.pixelQueue.pop();
                    const x = p.x;
                    const y = p.y;
                    if (isNaN(x) || isNaN(y) || x < 0 || x >= this.boardWidth || y < 0 || y >= this.boardHeight) {
                        continue;
                    }
                    const color = p.color;

                    if (color === 'transparent' || color === 255) {
                        this.offscreenCtx.clearRect(x, y, 1, 1);
                    } else if (typeof color === 'string') {
                        this.offscreenCtx.fillStyle = color;
                        this.offscreenCtx.clearRect(x, y, 1, 1);
                        this.offscreenCtx.fillRect(x, y, 1, 1);
                    }
                }
            } catch (e) {
                this.pixelQueue.length = 0;
            }
        }

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

        if (this.offscreenCanvas && this.offscreenCanvas.width > 0 && this.offscreenCanvas.height > 0) {
            this.ctx.drawImage(this.offscreenCanvas, 0, 0);
        }

        if (this.activeTemplateId && !this.isSpectator && !this.isResetLocked) {
            const tpl = this.templates.find(t => t.id === this.activeTemplateId);
            if (tpl) {
                this.ctx.save();
                this.ctx.globalAlpha = tpl.opacity;
                
                const cx = Math.round(tpl.x + tpl.w / 2);
                const cy = Math.round(tpl.y + tpl.h / 2);
                this.ctx.translate(cx, cy);
                if (tpl.angle) {
                    this.ctx.rotate((tpl.angle * Math.PI) / 180);
                }
                const hw = Math.round(tpl.w / 2);
                const hh = Math.round(tpl.h / 2);
                
                this.ctx.drawImage(tpl.img, -hw, -hh, tpl.w, tpl.h);
                if (!tpl.locked) {
                    this.ctx.strokeStyle = '#2196F3';
                    this.ctx.lineWidth = 2 / this.transform.scale;
                    this.ctx.strokeRect(-hw, -hh, tpl.w, tpl.h);
                    
                    const handleSize = 8 / this.transform.scale;
                    this.ctx.fillStyle = '#FFFFFF';
                    const handles = [
                        [-hw, -hh],
                        [hw, -hh],
                        [-hw, hh],
                        [hw, hh]
                    ];
                    handles.forEach(([hx, hy]) => {
                        this.ctx.fillRect(hx - handleSize/2, hy - handleSize/2, handleSize, handleSize);
                        this.ctx.strokeRect(hx - handleSize/2, hy - handleSize/2, handleSize, handleSize);
                    });
                }
                
                this.ctx.restore();
            }
        }

        const renderSet = new Set(this.selectedPixels);

        if (this.hoveredPixel && !this.isSpectator && !this.isResetLocked) {
            const hoverKey = (this.hoveredPixel.y << 16) | this.hoveredPixel.x;
            if (!renderSet.has(hoverKey)) {
                renderSet.add(hoverKey);
            }
        }

        if (renderSet.size > 0 && !this.isSpectator && !this.isResetLocked) {
            this.ctx.strokeStyle = activeColor; 
            this.ctx.lineWidth = 1 / this.transform.scale;
            this.ctx.beginPath();
            
            renderSet.forEach(key => {
                const x = key & 0xFFFF;
                const y = key >> 16;
                
                const hasTop = renderSet.has(((y - 1) << 16) | x);
                const hasBottom = renderSet.has(((y + 1) << 16) | x);
                const hasLeft = renderSet.has((y << 16) | (x - 1));
                const hasRight = renderSet.has((y << 16) | (x + 1));
                
                if (!hasTop) { this.ctx.moveTo(x, y); this.ctx.lineTo(x + 1, y); }
                if (!hasBottom) { this.ctx.moveTo(x, y + 1); this.ctx.lineTo(x + 1, y + 1); }
                if (!hasLeft) { this.ctx.moveTo(x, y); this.ctx.lineTo(x, y + 1); }
                if (!hasRight) { this.ctx.moveTo(x + 1, y); this.ctx.lineTo(x + 1, y + 1); }
            });
            this.ctx.stroke();
        }

        if (this.nuclearWarnings && this.nuclearWarnings.length > 0) {
            this.nuclearWarnings.forEach(warning => {
                this.ctx.beginPath();
                this.ctx.arc(warning.x + 0.5, warning.y + 0.5, warning.radius, 0, 2 * Math.PI);
                this.ctx.fillStyle = 'rgba(239, 68, 68, 0.4)';
                this.ctx.fill();
                this.ctx.lineWidth = 2 / this.transform.scale;
                this.ctx.strokeStyle = '#ef4444';
                this.ctx.stroke();

                const timeRatio = (Date.now() - warning.startTime) / (warning.endTime - warning.startTime);
                if (timeRatio >= 0 && timeRatio <= 1) {
                    this.ctx.beginPath();
                    this.ctx.arc(warning.x + 0.5, warning.y + 0.5, warning.radius * (1 - timeRatio), 0, 2 * Math.PI);
                    this.ctx.fillStyle = 'rgba(239, 68, 68, 0.6)';
                    this.ctx.fill();
                }
            });
        }
        
        if (this.explosions && this.explosions.length > 0) {
            this.explosions.forEach(exp => {
                const elapsed = Date.now() - exp.startTime;
                const progress = Math.min(1, elapsed / exp.duration);
                const opacity = 1 - progress;
                
                const style = PerksRegistry.getExplosionStyle(exp.perkId);
                
                if (style === 'nuclear') {
                    // Nuclear Bomb (r=24)
                    const currentRadius = exp.maxRadius * (1 + 2 * progress); 
                    this.ctx.beginPath();
                    this.ctx.arc(exp.x + 0.5, exp.y + 0.5, currentRadius, 0, 2 * Math.PI);
                    this.ctx.lineWidth = 10 / this.transform.scale;
                    this.ctx.strokeStyle = `rgba(239, 68, 68, ${opacity})`; 
                    this.ctx.fillStyle = `rgba(255, 255, 255, ${opacity * 0.5})`; 
                    this.ctx.fill();
                    this.ctx.stroke();
                } else if (style === 'medium') {
                    // Bomba Pixel (r=4) - Double Ring + Red puff
                    const radius1 = exp.maxRadius * (1 + 1.5 * progress);
                    const radius2 = exp.maxRadius * (0.5 + 1 * progress);
                    
                    this.ctx.beginPath();
                    this.ctx.arc(exp.x + 0.5, exp.y + 0.5, radius1, 0, 2 * Math.PI);
                    this.ctx.lineWidth = 3 / this.transform.scale;
                    this.ctx.strokeStyle = `rgba(249, 115, 22, ${opacity})`; // Orange
                    this.ctx.stroke();

                    this.ctx.beginPath();
                    this.ctx.arc(exp.x + 0.5, exp.y + 0.5, radius2, 0, 2 * Math.PI);
                    this.ctx.lineWidth = 4 / this.transform.scale;
                    this.ctx.strokeStyle = `rgba(239, 68, 68, ${opacity})`; // Red
                    this.ctx.fillStyle = `rgba(220, 38, 38, ${opacity * 0.6})`; // Darker red puff
                    this.ctx.fill();
                    this.ctx.stroke();
                } else {
                    // Pixel Misil (r=2) - Quick expanding cross + white flash
                    const size = exp.maxRadius * (1 + 3 * progress);
                    
                    this.ctx.beginPath();
                    // Horizontal line
                    this.ctx.moveTo(exp.x + 0.5 - size, exp.y + 0.5);
                    this.ctx.lineTo(exp.x + 0.5 + size, exp.y + 0.5);
                    // Vertical line
                    this.ctx.moveTo(exp.x + 0.5, exp.y + 0.5 - size);
                    this.ctx.lineTo(exp.x + 0.5, exp.y + 0.5 + size);
                    
                    this.ctx.lineWidth = 3 / this.transform.scale;
                    this.ctx.strokeStyle = `rgba(6, 182, 212, ${opacity})`; // Sci-fi Cyan
                    this.ctx.stroke();

                    this.ctx.beginPath();
                    this.ctx.arc(exp.x + 0.5, exp.y + 0.5, size * 0.8, 0, 2 * Math.PI);
                    this.ctx.fillStyle = `rgba(255, 255, 255, ${opacity * 0.8})`; // White inner flash
                    this.ctx.fill();
                }
            });
        }

        this.ctx.restore();
    }
};