/**
 * BannerCropperSystem.js
 * YouTube-inspired Interactive Banner Customization & Cropper System for ProjectRosaura
 */
export class BannerCropperSystem {
    constructor(containerEl, options = {}) {
        this.container = containerEl;
        this.options = Object.assign({
            boxRatio: 16 / 9,           // Overall context ratio (TVs / big screen)
            bannerRatio: 3.75,          // Desktop banner ratio (1200x320)
            safeZoneRatio: 0.60,        // Central safe zone ratio for all devices
            minCropWidth: 120,
            outputWidth: 1200,
            outputHeight: 320,
            outputQuality: 0.92,
            outputMimeType: 'image/webp'
        }, options);

        this.image = null;
        this.imageLoaded = false;
        this.imageSrc = options.imageSrc || '';

        // Geometry state
        this.viewportWidth = 0;
        this.viewportHeight = 0;
        this.renderedImgX = 0;
        this.renderedImgY = 0;
        this.renderedImgW = 0;
        this.renderedImgH = 0;
        this.scaleFactor = 1;

        // Crop box state (viewport coordinates)
        this.cropX = 0;
        this.cropY = 0;
        this.cropW = 0;
        this.cropH = 0;

        // Interaction state
        this.dragMode = null; // 'move' | 'nw' | 'ne' | 'se' | 'sw'
        this.dragStartX = 0;
        this.dragStartY = 0;
        this.initialCropX = 0;
        this.initialCropY = 0;
        this.initialCropW = 0;
        this.initialCropH = 0;
        this.activePointerId = null;

        this.boundPointerDown = this.handlePointerDown.bind(this);
        this.boundPointerMove = this.handlePointerMove.bind(this);
        this.boundPointerUp = this.handlePointerUp.bind(this);
        this.boundWheel = this.handleWheel.bind(this);
        this.boundResize = this.handleResize.bind(this);

        this.init();
    }

    init() {
        this.buildDom();
        this.bindEvents();
        if (this.imageSrc) {
            this.loadImage(this.imageSrc);
        }
    }

    buildDom() {
        const __ = (typeof window.__ === 'function') ? window.__ : (k => k);

        this.container.innerHTML = `
            <div class="component-banner-cropper-stage" data-ref="cropper-stage">
                <div class="component-banner-cropper-viewport" data-ref="cropper-viewport">
                    <img class="component-banner-cropper-img disabled" data-ref="cropper-img" alt="Banner Source" draggable="false">
                    
                    <!-- SVG Mask Overlay for non-selected areas -->
                    <svg class="component-banner-cropper-svg-mask" data-ref="cropper-mask" preserveAspectRatio="none">
                        <defs>
                            <mask id="bannerCropMask">
                                <rect width="100%" height="100%" fill="white" />
                                <rect data-ref="mask-hole" x="0" y="0" width="0" height="0" fill="black" />
                            </mask>
                        </defs>
                        <rect width="100%" height="100%" fill="rgba(0,0,0,0.65)" mask="url(#bannerCropMask)" />
                    </svg>

                    <!-- Interactive Crop Box Overlay -->
                    <div class="component-banner-crop-box" data-ref="crop-box">
                        <!-- Top-left TV Badge -->
                        <div class="component-banner-crop-badge component-banner-crop-badge--tv">
                            <span>${__('banner_device_tvs') || 'TVs'}</span>
                        </div>

                        <!-- Desktop Banner Band -->
                        <div class="component-banner-desktop-band" data-ref="desktop-band">
                            <div class="component-banner-crop-badge component-banner-crop-badge--desktop">
                                <span>${__('banner_device_desktop') || 'Computadoras'}</span>
                            </div>

                            <!-- All Devices Safe Zone Box -->
                            <div class="component-banner-safe-zone" data-ref="safe-zone">
                                <div class="component-banner-crop-badge component-banner-crop-badge--all">
                                    <span>${__('banner_device_all') || 'Todos los dispositivos'}</span>
                                </div>
                            </div>
                        </div>

                        <!-- Corner Handles (YouTube-style white squares with black border) -->
                        <div class="component-banner-crop-handle handle-nw" data-handle="nw"></div>
                        <div class="component-banner-crop-handle handle-ne" data-handle="ne"></div>
                        <div class="component-banner-crop-handle handle-se" data-handle="se"></div>
                        <div class="component-banner-crop-handle handle-sw" data-handle="sw"></div>
                    </div>
                </div>
            </div>
        `;

        this.stageEl = this.container.querySelector('[data-ref="cropper-stage"]');
        this.viewportEl = this.container.querySelector('[data-ref="cropper-viewport"]');
        this.imgEl = this.container.querySelector('[data-ref="cropper-img"]');
        this.maskHoleEl = this.container.querySelector('[data-ref="mask-hole"]');
        this.cropBoxEl = this.container.querySelector('[data-ref="crop-box"]');
    }

    bindEvents() {
        this.viewportEl.addEventListener('pointerdown', this.boundPointerDown);
        window.addEventListener('pointermove', this.boundPointerMove);
        window.addEventListener('pointerup', this.boundPointerUp);
        window.addEventListener('pointercancel', this.boundPointerUp);
        this.viewportEl.addEventListener('wheel', this.boundWheel, { passive: false });
        window.addEventListener('resize', this.boundResize);
    }

    loadImage(src) {
        this.imageSrc = src;
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            this.image = img;
            this.imageLoaded = true;
            this.imgEl.src = src;
            this.imgEl.classList.remove('disabled');
            this.computeLayout();
        };
        img.onerror = (err) => {
            console.error('[BannerCropperSystem] Failed to load image:', err);
        };
        img.src = src;
    }

    handleResize() {
        if (!this.imageLoaded) return;
        this.computeLayout();
    }

    computeLayout() {
        if (!this.image || !this.viewportEl) return;

        const rect = this.viewportEl.getBoundingClientRect();
        this.viewportWidth = rect.width || this.viewportEl.offsetWidth || 760;
        this.viewportHeight = rect.height || this.viewportEl.offsetHeight || 380;

        const natW = this.image.naturalWidth || 1200;
        const natH = this.image.naturalHeight || 800;

        // Scale image to fit neatly within viewport
        const pad = 12;
        const availW = this.viewportWidth - pad * 2;
        const availH = this.viewportHeight - pad * 2;

        const scale = Math.min(availW / natW, availH / natH);
        this.renderedImgW = natW * scale;
        this.renderedImgH = natH * scale;
        this.renderedImgX = (this.viewportWidth - this.renderedImgW) / 2;
        this.renderedImgY = (this.viewportHeight - this.renderedImgH) / 2;
        this.scaleFactor = natW / this.renderedImgW;

        // Position Image Element
        this.imgEl.style.width = `${this.renderedImgW}px`;
        this.imgEl.style.height = `${this.renderedImgH}px`;
        this.imgEl.style.left = `${this.renderedImgX}px`;
        this.imgEl.style.top = `${this.renderedImgY}px`;

        // Initialize Crop Box (16:9) fitted inside rendered image
        const targetRatio = this.options.boxRatio;
        let cropW = this.renderedImgW * 0.92;
        let cropH = cropW / targetRatio;

        if (cropH > this.renderedImgH * 0.95) {
            cropH = this.renderedImgH * 0.95;
            cropW = cropH * targetRatio;
        }

        this.cropW = Math.max(cropW, this.options.minCropWidth);
        this.cropH = this.cropW / targetRatio;
        this.cropX = this.renderedImgX + (this.renderedImgW - this.cropW) / 2;
        this.cropY = this.renderedImgY + (this.renderedImgH - this.cropH) / 2;

        this.updateCropDisplay();
    }

    updateCropDisplay() {
        if (!this.cropBoxEl || !this.maskHoleEl) return;

        // Clamp Crop Box to rendered image bounds
        const minX = this.renderedImgX;
        const minY = this.renderedImgY;
        const maxX = this.renderedImgX + this.renderedImgW - this.cropW;
        const maxY = this.renderedImgY + this.renderedImgH - this.cropH;

        this.cropX = Math.max(minX, Math.min(this.cropX, maxX));
        this.cropY = Math.max(minY, Math.min(this.cropY, maxY));

        // Update Crop Box DOM element
        this.cropBoxEl.style.transform = `translate3d(${this.cropX}px, ${this.cropY}px, 0)`;
        this.cropBoxEl.style.width = `${this.cropW}px`;
        this.cropBoxEl.style.height = `${this.cropH}px`;

        // Update SVG Mask Hole
        this.maskHoleEl.setAttribute('x', this.cropX);
        this.maskHoleEl.setAttribute('y', this.cropY);
        this.maskHoleEl.setAttribute('width', this.cropW);
        this.maskHoleEl.setAttribute('height', this.cropH);
    }

    handlePointerDown(e) {
        if (!this.imageLoaded) return;
        e.preventDefault();

        const handleEl = e.target.closest('[data-handle]');
        const cropBoxHit = e.target.closest('[data-ref="crop-box"]');

        if (handleEl) {
            this.dragMode = handleEl.getAttribute('data-handle'); // 'nw', 'ne', 'se', 'sw'
        } else if (cropBoxHit) {
            this.dragMode = 'move';
        } else {
            // Click outside moves center of crop box to clicked position
            const rect = this.viewportEl.getBoundingClientRect();
            const clickX = e.clientX - rect.left;
            const clickY = e.clientY - rect.top;
            this.cropX = clickX - this.cropW / 2;
            this.cropY = clickY - this.cropH / 2;
            this.updateCropDisplay();
            this.dragMode = 'move';
        }

        this.dragStartX = e.clientX;
        this.dragStartY = e.clientY;
        this.initialCropX = this.cropX;
        this.initialCropY = this.cropY;
        this.initialCropW = this.cropW;
        this.initialCropH = this.cropH;
        this.activePointerId = e.pointerId;

        if (this.viewportEl.setPointerCapture) {
            try { this.viewportEl.setPointerCapture(e.pointerId); } catch (_) {}
        }
    }

    handlePointerMove(e) {
        if (!this.dragMode || !this.imageLoaded) return;
        e.preventDefault();

        const dx = e.clientX - this.dragStartX;
        const dy = e.clientY - this.dragStartY;
        const ratio = this.options.boxRatio;

        if (this.dragMode === 'move') {
            this.cropX = this.initialCropX + dx;
            this.cropY = this.initialCropY + dy;
        } else if (this.dragMode === 'se') {
            let newW = this.initialCropW + dx;
            let maxW = (this.renderedImgX + this.renderedImgW) - this.initialCropX;
            let maxH = (this.renderedImgY + this.renderedImgH) - this.initialCropY;
            maxW = Math.min(maxW, maxH * ratio);
            newW = Math.max(this.options.minCropWidth, Math.min(newW, maxW));
            this.cropW = newW;
            this.cropH = newW / ratio;
        } else if (this.dragMode === 'sw') {
            let newW = this.initialCropW - dx;
            let maxW = (this.initialCropX + this.initialCropW) - this.renderedImgX;
            let maxH = (this.renderedImgY + this.renderedImgH) - this.initialCropY;
            maxW = Math.min(maxW, maxH * ratio);
            newW = Math.max(this.options.minCropWidth, Math.min(newW, maxW));
            this.cropX = this.initialCropX + (this.initialCropW - newW);
            this.cropW = newW;
            this.cropH = newW / ratio;
        } else if (this.dragMode === 'ne') {
            let newW = this.initialCropW + dx;
            let maxW = (this.renderedImgX + this.renderedImgW) - this.initialCropX;
            let maxH = (this.initialCropY + this.initialCropH) - this.renderedImgY;
            maxW = Math.min(maxW, maxH * ratio);
            newW = Math.max(this.options.minCropWidth, Math.min(newW, maxW));
            const newH = newW / ratio;
            this.cropY = this.initialCropY + (this.initialCropH - newH);
            this.cropW = newW;
            this.cropH = newH;
        } else if (this.dragMode === 'nw') {
            let newW = this.initialCropW - dx;
            let maxW = (this.initialCropX + this.initialCropW) - this.renderedImgX;
            let maxH = (this.initialCropY + this.initialCropH) - this.renderedImgY;
            maxW = Math.min(maxW, maxH * ratio);
            newW = Math.max(this.options.minCropWidth, Math.min(newW, maxW));
            const newH = newW / ratio;
            this.cropX = this.initialCropX + (this.initialCropW - newW);
            this.cropY = this.initialCropY + (this.initialCropH - newH);
            this.cropW = newW;
            this.cropH = newH;
        }

        this.updateCropDisplay();
    }

    handlePointerUp(e) {
        if (!this.dragMode) return;
        this.dragMode = null;
        if (this.activePointerId !== null && this.viewportEl.releasePointerCapture) {
            try { this.viewportEl.releasePointerCapture(this.activePointerId); } catch (_) {}
            this.activePointerId = null;
        }
    }

    handleWheel(e) {
        if (!this.imageLoaded) return;
        e.preventDefault();

        const zoomDelta = e.deltaY < 0 ? 1.05 : 0.95;
        const ratio = this.options.boxRatio;
        let newW = this.cropW * zoomDelta;

        const maxW = Math.min(this.renderedImgW, this.renderedImgH * ratio);
        newW = Math.max(this.options.minCropWidth, Math.min(newW, maxW));
        const newH = newW / ratio;

        // Center zoom relative to previous crop box center
        const centerX = this.cropX + this.cropW / 2;
        const centerY = this.cropY + this.cropH / 2;

        this.cropX = centerX - newW / 2;
        this.cropY = centerY - newH / 2;
        this.cropW = newW;
        this.cropH = newH;

        this.updateCropDisplay();
    }

    /**
     * Extracts and renders the desktop banner band at target resolution
     * @returns {Promise<{blob: Blob, dataUrl: string, width: number, height: number}>}
     */
    async getCroppedBlob(targetW = 1200, targetH = 320, mimeType = 'image/webp', quality = 0.92) {
        if (!this.image || !this.imageLoaded) {
            throw new Error('Image not loaded in cropper');
        }

        // Calculate Desktop Band geometry in viewport coordinates
        // Banner ratio: 3.75 (1200x320)
        const bannerStripH = this.cropW / this.options.bannerRatio;
        const bannerStripY = this.cropY + (this.cropH - bannerStripH) / 2;
        const bannerStripX = this.cropX;
        const bannerStripW = this.cropW;

        // Convert to native image pixel coordinates
        const scale = this.scaleFactor; // nativeWidth / renderedImgW
        const sourceX = (bannerStripX - this.renderedImgX) * scale;
        const sourceY = (bannerStripY - this.renderedImgY) * scale;
        const sourceW = bannerStripW * scale;
        const sourceH = bannerStripH * scale;

        // Clamp to image dimensions
        const natW = this.image.naturalWidth;
        const natH = this.image.naturalHeight;
        const clampedX = Math.max(0, Math.min(sourceX, natW));
        const clampedY = Math.max(0, Math.min(sourceY, natH));
        const clampedW = Math.max(1, Math.min(sourceW, natW - clampedX));
        const clampedH = Math.max(1, Math.min(sourceH, natH - clampedY));

        // Create offscreen canvas at high resolution
        const canvas = document.createElement('canvas');
        canvas.width = targetW;
        canvas.height = targetH;
        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        // Draw cropped section
        ctx.drawImage(this.image, clampedX, clampedY, clampedW, clampedH, 0, 0, targetW, targetH);

        const dataUrl = canvas.toDataURL(mimeType, quality);
        const blob = await new Promise((resolve) => canvas.toBlob(resolve, mimeType, quality));

        return {
            blob,
            dataUrl,
            width: targetW,
            height: targetH,
            cropBounds: { sourceX: clampedX, sourceY: clampedY, sourceW: clampedW, sourceH: clampedH }
        };
    }

    destroy() {
        if (this.viewportEl) {
            this.viewportEl.removeEventListener('pointerdown', this.boundPointerDown);
            this.viewportEl.removeEventListener('wheel', this.boundWheel);
        }
        window.removeEventListener('pointermove', this.boundPointerMove);
        window.removeEventListener('pointerup', this.boundPointerUp);
        window.removeEventListener('pointercancel', this.boundPointerUp);
        window.removeEventListener('resize', this.boundResize);
        this.container.innerHTML = '';
        this.image = null;
        this.imageLoaded = false;
    }
}
