// public/assets/js/modules/app/DesignController.js

export class DesignController {
    constructor() {
        // Elementos del DOM
        this.wrapper = document.getElementById('whiteboard-wrapper');
        this.canvas = document.getElementById('infinite-whiteboard');
        this.zoomIndicator = document.getElementById('zoom-level-indicator');
        
        // Elementos UI de coordenadas
        this.camXIndicator = document.getElementById('cam-x');
        this.camYIndicator = document.getElementById('cam-y');
        this.mouseXIndicator = document.getElementById('mouse-x');
        this.mouseYIndicator = document.getElementById('mouse-y');
        
        if (!this.canvas || !this.wrapper) return;
        
        this.ctx = this.canvas.getContext('2d');

        // Estado de la cámara (Mundo Virtual)
        this.zoom = 1;
        this.offsetX = 0;
        this.offsetY = 0;

        // Estado de interacción
        this.isDragging = false;
        this.lastMouseX = 0;
        this.lastMouseY = 0;
        
        // Memoria de la posición del ratón en pantalla
        this.currentMouseScreenX = 0;
        this.currentMouseScreenY = 0;

        // Limites de Zoom
        this.MAX_ZOOM = 5;
        this.MIN_ZOOM = 0.1;

        // Bindings para preservar el scope de "this" en los eventos
        this.handleResize = this.handleResize.bind(this);
        this.handleWheel = this.handleWheel.bind(this);
        this.handleMouseDown = this.handleMouseDown.bind(this);
        this.handleMouseMove = this.handleMouseMove.bind(this);
        this.handleMouseUp = this.handleMouseUp.bind(this);
        this.handleKeyDown = this.handleKeyDown.bind(this);
        this.handleKeyUp = this.handleKeyUp.bind(this);
    }

    init() {
        if (!this.canvas) return;
        this.bindEvents();
        this.handleResize(); 
        
        // Centrar la cámara inicialmente
        this.offsetX = this.canvas.width / 2;
        this.offsetY = this.canvas.height / 2;
        
        this.updateCoordinatesUI();
        this.draw();
    }

    destroy() {
        if (!this.canvas) return;
        window.removeEventListener('resize', this.handleResize);
        window.removeEventListener('keydown', this.handleKeyDown);
        window.removeEventListener('keyup', this.handleKeyUp);
        
        this.canvas.removeEventListener('wheel', this.handleWheel);
        this.canvas.removeEventListener('mousedown', this.handleMouseDown);
        window.removeEventListener('mousemove', this.handleMouseMove);
        window.removeEventListener('mouseup', this.handleMouseUp);
    }

    bindEvents() {
        window.addEventListener('resize', this.handleResize);
        window.addEventListener('keydown', this.handleKeyDown);
        window.addEventListener('keyup', this.handleKeyUp);

        this.canvas.addEventListener('wheel', this.handleWheel, { passive: false });
        this.canvas.addEventListener('mousedown', this.handleMouseDown);
        window.addEventListener('mousemove', this.handleMouseMove);
        window.addEventListener('mouseup', this.handleMouseUp);
        
        this.canvas.addEventListener('contextmenu', e => e.preventDefault());
    }

    handleResize() {
        const rect = this.wrapper.getBoundingClientRect();
        this.canvas.width = rect.width;
        this.canvas.height = rect.height;
        this.draw();
    }

    handleKeyDown(e) {
        if (e.key === 'Shift' && !this.isDragging) {
            this.canvas.style.cursor = 'grab';
        }
    }

    handleKeyUp(e) {
        if (e.key === 'Shift') {
            this.canvas.style.cursor = 'default';
        }
    }

    handleWheel(e) {
        e.preventDefault();

        const rect = this.canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        
        this.currentMouseScreenX = mouseX;
        this.currentMouseScreenY = mouseY;

        // Calcular posición en el mundo virtual ANTES del zoom
        const worldX = mouseX / this.zoom - this.offsetX;
        const worldY = mouseY / this.zoom - this.offsetY;

        const zoomIntensity = 0.1;
        const wheel = e.deltaY < 0 ? 1 : -1;
        let zoomFactor = Math.exp(wheel * zoomIntensity);
        
        // Aplicar límites
        let newZoom = this.zoom * zoomFactor;
        if (newZoom > this.MAX_ZOOM) newZoom = this.MAX_ZOOM;
        if (newZoom < this.MIN_ZOOM) newZoom = this.MIN_ZOOM;
        
        this.zoom = newZoom;

        // Ajustar offset para hacer zoom hacia el puntero
        this.offsetX = mouseX / this.zoom - worldX;
        this.offsetY = mouseY / this.zoom - worldY;

        if (this.zoomIndicator) {
            this.zoomIndicator.innerText = Math.round(this.zoom * 100);
        }

        this.updateCoordinatesUI();
        this.draw();
    }

    handleMouseDown(e) {
        if (e.shiftKey || e.button === 1) { 
            this.isDragging = true;
            this.canvas.style.cursor = 'grabbing';
            
            const rect = this.canvas.getBoundingClientRect();
            this.lastMouseX = e.clientX - rect.left;
            this.lastMouseY = e.clientY - rect.top;
        }
    }

    handleMouseMove(e) {
        const rect = this.canvas.getBoundingClientRect();
        this.currentMouseScreenX = e.clientX - rect.left;
        this.currentMouseScreenY = e.clientY - rect.top;

        if (this.isDragging) {
            const dx = this.currentMouseScreenX - this.lastMouseX;
            const dy = this.currentMouseScreenY - this.lastMouseY;

            this.offsetX += dx / this.zoom;
            this.offsetY += dy / this.zoom;

            this.lastMouseX = this.currentMouseScreenX;
            this.lastMouseY = this.currentMouseScreenY;

            this.draw();
        }
        
        this.updateCoordinatesUI();
    }

    handleMouseUp(e) {
        if (this.isDragging) {
            this.isDragging = false;
            this.canvas.style.cursor = e.shiftKey ? 'grab' : 'default';
        }
    }

    updateCoordinatesUI() {
        // Coordenadas de la cámara
        if (this.camXIndicator && this.camYIndicator) {
            this.camXIndicator.innerText = Math.round(-this.offsetX);
            this.camYIndicator.innerText = Math.round(-this.offsetY);
        }

        // Coordenadas exactas del mundo virtual bajo el ratón
        if (this.mouseXIndicator && this.mouseYIndicator) {
            const worldX = this.currentMouseScreenX / this.zoom - this.offsetX;
            const worldY = this.currentMouseScreenY / this.zoom - this.offsetY;
            this.mouseXIndicator.innerText = Math.round(worldX);
            this.mouseYIndicator.innerText = Math.round(worldY);
        }
    }

    draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.save();
        
        this.ctx.scale(this.zoom, this.zoom);
        this.ctx.translate(this.offsetX, this.offsetY);

        this.drawInfiniteDotGrid();

        this.ctx.restore();
    }

    drawInfiniteDotGrid() {
        const baseGridSize = 40; 
        
        // Optimización de renderizado según nivel de escala (Zoom)
        let dynamicGridSize = baseGridSize;
        if (this.zoom < 0.4) dynamicGridSize = baseGridSize * 2;
        if (this.zoom < 0.15) dynamicGridSize = baseGridSize * 4;

        const left = -this.offsetX;
        const top = -this.offsetY;
        const right = left + this.canvas.width / this.zoom;
        const bottom = top + this.canvas.height / this.zoom;

        const startX = Math.floor(left / dynamicGridSize) * dynamicGridSize;
        const startY = Math.floor(top / dynamicGridSize) * dynamicGridSize;

        this.ctx.fillStyle = '#cbd5e1'; 

        const dotSize = Math.max(2 / this.zoom, 3 / this.zoom); 

        this.ctx.beginPath();
        for (let x = startX; x < right; x += dynamicGridSize) {
            for (let y = startY; y < bottom; y += dynamicGridSize) {
                this.ctx.rect(x - dotSize/2, y - dotSize/2, dotSize, dotSize);
            }
        }
        this.ctx.fill();

        // Punto de referencia origen (0,0)
        this.ctx.beginPath();
        this.ctx.arc(0, 0, 5 / this.zoom, 0, Math.PI * 2);
        this.ctx.fillStyle = '#ef4444'; 
        this.ctx.fill();
    }
}