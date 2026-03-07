// public/assets/js/modules/app/ChannelController.js

import { ApiService } from '../../core/api/ApiServices.js';
import { ApiRoutes } from '../../core/api/ApiRoutes.js';
import { DialogSystem } from '../../core/components/DialogSystem.js';

export class ChannelController {
    constructor() {
        this.api = new ApiService();
        this.dialog = new DialogSystem(); 
        this.init();
    }

    init() {
        console.log("Channel view loaded successfully.");
        this.setupTabsNavigation();
        this.setupSubscriptionButton();
        this.setupBannerUpload();
    }

    setupTabsNavigation() {
        const container = document.getElementById('channel-tabs-container');
        if (!container) return;

        const newContainer = container.cloneNode(true);
        container.parentNode.replaceChild(newContainer, container);

        newContainer.addEventListener('click', (e) => {
            const tab = e.target.closest('.component-channel-tab');
            if (!tab) return;

            const allTabs = newContainer.querySelectorAll('.component-channel-tab');
            const sections = document.querySelectorAll('.component-channel-content-section');

            allTabs.forEach(t => t.classList.remove('is-active'));
            sections.forEach(s => s.classList.remove('is-active'));

            tab.classList.add('is-active');

            const targetId = tab.getAttribute('data-target');
            const targetSection = document.getElementById(targetId);
            
            if (targetSection) targetSection.classList.add('is-active');
        });
    }

    setupSubscriptionButton() {
        const subBtn = document.getElementById('btn-channel-subscribe');
        if (!subBtn) return;

        const newBtn = subBtn.cloneNode(true);
        subBtn.parentNode.replaceChild(newBtn, subBtn);

        newBtn.addEventListener('click', async () => {
            const username = newBtn.getAttribute('data-username');
            if (!username) return;

            const originalText = newBtn.innerText;
            newBtn.innerText = 'Cargando...';
            newBtn.disabled = true;

            const response = await this.api.toggleSubscription(username);
            
            newBtn.disabled = false;

            if (response.success) {
                if (response.is_subscribed) {
                    newBtn.innerText = 'Suscrito';
                    newBtn.classList.remove('component-btn-primary');
                    newBtn.classList.add('component-btn-secondary');
                } else {
                    newBtn.innerText = 'Suscribirse';
                    newBtn.classList.remove('component-btn-secondary');
                    newBtn.classList.add('component-btn-primary');
                }

                const countDisplay = document.getElementById('channel-subscriber-count');
                if (countDisplay) {
                    let formatted = response.subscriber_count;
                    if (formatted >= 1000000) formatted = (formatted / 1000000).toFixed(1) + 'M';
                    else if (formatted >= 1000) formatted = (formatted / 1000).toFixed(1) + 'K';
                    
                    countDisplay.innerText = `${formatted} suscriptores`;
                }
            } else {
                newBtn.innerText = originalText;
                if (response.message === 'Debes iniciar sesión para suscribirte.') {
                    if (window.router) window.router.navigate('/login');
                    else window.location.href = (window.AppBasePath || '') + '/login';
                } else {
                    alert(response.message || 'Error al procesar la solicitud.');
                }
            }
        });
    }

    setupBannerUpload() {
        const btnEditBanner = document.getElementById('btn-edit-banner');
        const fileInput = document.getElementById('bannerUploadInput');
        
        if (!btnEditBanner || !fileInput) return;

        const newBtn = btnEditBanner.cloneNode(true);
        btnEditBanner.parentNode.replaceChild(newBtn, btnEditBanner);

        newBtn.addEventListener('click', () => {
            fileInput.value = ''; 
            fileInput.click();
        });

        fileInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const maxSize = 6 * 1024 * 1024;
            if (file.size > maxSize) {
                this.dialog.show('error', {
                    title: 'Archivo muy grande',
                    message: 'Para obtener los mejores resultados en todos los dispositivos, usa una imagen de 2048 × 1152 píxeles como mínimo y 6 MB como máximo.'
                });
                fileInput.value = '';
                return;
            }

            const img = new Image();
            const objectUrl = URL.createObjectURL(file);

            img.onload = () => {
                URL.revokeObjectURL(objectUrl);
                
                if (img.width < 1024 || img.height < 576) {
                    this.dialog.show('error', {
                        title: 'Dimensiones insuficientes',
                        message: 'Las imágenes deben ser de 1024 × 576 píxeles como mínimo. Para obtener los mejores resultados en todos los dispositivos, usa una imagen de 2048 × 1152 píxeles como mínimo y 6 MB como máximo.'
                    });
                    fileInput.value = '';
                    return;
                }

                const reader = new FileReader();
                reader.onload = (readerEvent) => {
                    const base64Data = readerEvent.target.result;
                    this.showBannerPreviewDialog(file, base64Data);
                };
                reader.readAsDataURL(file);
            };

            img.onerror = () => {
                URL.revokeObjectURL(objectUrl);
                alert("El archivo seleccionado no es una imagen válida.");
            };

            img.src = objectUrl;
        });
    }

    // Inicializa el sistema de redimensionado manual
    initCropTool(dialogBox) {
        const wrapper = dialogBox.querySelector('.banner-crop-wrapper');
        const cropBox = dialogBox.querySelector('#bannerCropBox');
        const img = dialogBox.querySelector('#bannerCropImage');
        
        const maskTop = dialogBox.querySelector('.crop-mask-top');
        const maskBottom = dialogBox.querySelector('.crop-mask-bottom');
        const maskLeft = dialogBox.querySelector('.crop-mask-left');
        const maskRight = dialogBox.querySelector('.crop-mask-right');

        if (!wrapper || !cropBox || !img) return;

        let isDragging = false;
        let isResizing = false;
        let currentHandle = null;
        let startX, startY;
        let initialLeft, initialTop, initialWidth, initialHeight;
        let containerRect;

        const ASPECT_RATIO = 16 / 9;

        const updateUI = (left, top, width, height) => {
            cropBox.style.left = `${left}px`;
            cropBox.style.top = `${top}px`;
            cropBox.style.width = `${width}px`;
            cropBox.style.height = `${height}px`;

            // Actualizar máscaras
            maskTop.style.height = `${top}px`;
            maskTop.style.width = '100%';
            maskTop.style.left = '0';
            maskTop.style.top = '0';

            maskBottom.style.top = `${top + height}px`;
            maskBottom.style.height = `calc(100% - ${top + height}px)`;
            maskBottom.style.width = '100%';
            maskBottom.style.left = '0';
            
            maskLeft.style.top = `${top}px`;
            maskLeft.style.height = `${height}px`;
            maskLeft.style.width = `${left}px`;
            maskLeft.style.left = '0';
            
            maskRight.style.top = `${top}px`;
            maskRight.style.height = `${height}px`;
            maskRight.style.left = `${left + width}px`;
            maskRight.style.width = `calc(100% - ${left + width}px)`;

            // Guardar porcentajes en la data del DOM para leerlos luego en el guardado
            if (containerRect && containerRect.width > 0 && containerRect.height > 0) {
                cropBox.dataset.cropX = left / containerRect.width;
                cropBox.dataset.cropY = top / containerRect.height;
                cropBox.dataset.cropW = width / containerRect.width;
                cropBox.dataset.cropH = height / containerRect.height;
            }
        };

        const initializeCropBox = () => {
            containerRect = wrapper.getBoundingClientRect();
            if (containerRect.width === 0) {
                setTimeout(initializeCropBox, 50); // Reintentar si aún no carga el DOM
                return;
            }

            let width = containerRect.width;
            let height = width / ASPECT_RATIO;

            if (height > containerRect.height) {
                height = containerRect.height;
                width = height * ASPECT_RATIO;
            }

            let left = (containerRect.width - width) / 2;
            let top = (containerRect.height - height) / 2;

            updateUI(left, top, width, height);
        };

        if (img.complete) initializeCropBox();
        else img.onload = initializeCropBox;

        // Eventos de puntero para arrastrar y soltar
        cropBox.addEventListener('pointerdown', (e) => {
            e.preventDefault();
            containerRect = wrapper.getBoundingClientRect();
            initialLeft = parseFloat(cropBox.style.left);
            initialTop = parseFloat(cropBox.style.top);
            initialWidth = parseFloat(cropBox.style.width);
            initialHeight = parseFloat(cropBox.style.height);
            startX = e.clientX;
            startY = e.clientY;

            if (e.target.classList.contains('crop-handle')) {
                isResizing = true;
                currentHandle = e.target.getAttribute('data-handle');
            } else {
                isDragging = true;
                document.body.style.cursor = 'move';
            }
            cropBox.setPointerCapture(e.pointerId);
        });

        cropBox.addEventListener('pointermove', (e) => {
            if (!isDragging && !isResizing) return;

            let dx = e.clientX - startX;
            let dy = e.clientY - startY;

            if (isDragging) {
                let newLeft = initialLeft + dx;
                let newTop = initialTop + dy;
                
                if (newLeft < 0) newLeft = 0;
                if (newTop < 0) newTop = 0;
                if (newLeft + initialWidth > containerRect.width) newLeft = containerRect.width - initialWidth;
                if (newTop + initialHeight > containerRect.height) newTop = containerRect.height - initialHeight;
                
                updateUI(newLeft, newTop, initialWidth, initialHeight);

            } else if (isResizing) {
                // Lógica avanzada de redimensionamiento proporcional 16:9 con límites
                let deltaW_fromX = currentHandle.includes('e') ? dx : -dx;
                let deltaH_fromY = currentHandle.includes('s') ? dy : -dy;
                let deltaW_fromY = deltaH_fromY * ASPECT_RATIO;
                
                // Usar el mayor movimiento como eje dominante
                let deltaW = Math.abs(deltaW_fromX) > Math.abs(deltaW_fromY) ? deltaW_fromX : deltaW_fromY;
                
                let newWidth = initialWidth + deltaW;
                if (newWidth < 150) newWidth = 150; // tamaño mínimo

                let newHeight = newWidth / ASPECT_RATIO;
                let newLeft = currentHandle.includes('w') ? initialLeft + (initialWidth - newWidth) : initialLeft;
                let newTop = currentHandle.includes('n') ? initialTop + (initialHeight - newHeight) : initialTop;
                
                // Restricciones con los bordes
                if (newLeft < 0) {
                    newLeft = 0;
                    newWidth = initialLeft + initialWidth;
                    newHeight = newWidth / ASPECT_RATIO;
                    newTop = currentHandle.includes('n') ? initialTop + (initialHeight - newHeight) : initialTop;
                }
                if (newTop < 0) {
                    newTop = 0;
                    newHeight = initialTop + initialHeight;
                    newWidth = newHeight * ASPECT_RATIO;
                    newLeft = currentHandle.includes('w') ? initialLeft + (initialWidth - newWidth) : initialLeft;
                }
                if (newLeft + newWidth > containerRect.width) {
                    newWidth = containerRect.width - newLeft;
                    newHeight = newWidth / ASPECT_RATIO;
                    newTop = currentHandle.includes('n') ? initialTop + (initialHeight - newHeight) : initialTop;
                }
                if (newTop + newHeight > containerRect.height) {
                    newHeight = containerRect.height - newTop;
                    newWidth = newHeight * ASPECT_RATIO;
                    newLeft = currentHandle.includes('w') ? initialLeft + (initialWidth - newWidth) : initialLeft;
                }

                updateUI(newLeft, newTop, newWidth, newHeight);
            }
        });

        const endPointer = (e) => {
            isDragging = false;
            isResizing = false;
            currentHandle = null;
            document.body.style.cursor = '';
            if (cropBox.hasPointerCapture(e.pointerId)) cropBox.releasePointerCapture(e.pointerId);
        };

        cropBox.addEventListener('pointerup', endPointer);
        cropBox.addEventListener('pointercancel', endPointer);
    }

    async showBannerPreviewDialog(file, imageDataUrl) {
        
        // Pasamos el evento onRender y la clase custom de 960px
        const result = await this.dialog.show('bannerPreviewTemplate', {
            imageUrl: imageDataUrl,
            dialogClass: 'component-dialog-box--banner',
            onRender: (box) => this.initCropTool(box)
        });

        if (result.confirmed) {
            try {
                const formData = new FormData();
                formData.append('banner', file);

                // Recolectar datos del crop en porcentajes (0 a 1)
                const cropBox = document.getElementById('bannerCropBox');
                if (cropBox) {
                    formData.append('crop_x', cropBox.dataset.cropX || 0);
                    formData.append('crop_y', cropBox.dataset.cropY || 0);
                    formData.append('crop_w', cropBox.dataset.cropW || 1);
                    formData.append('crop_h', cropBox.dataset.cropH || 1);
                }

                const confirmBtn = document.querySelector('.component-dialog-actions [data-dialog-action="confirm"]');
                if (confirmBtn) {
                    confirmBtn.innerText = 'Subiendo...';
                    confirmBtn.disabled = true;
                }

                const apiResult = await this.api.postForm(ApiRoutes.Channel.UploadBanner, formData);
                
                if (apiResult.success) {
                    const bannerContainer = document.getElementById('channel-banner-container');
                    if (bannerContainer && apiResult.banner_url) {
                        bannerContainer.style.backgroundImage = `url('${apiResult.banner_url}')`;
                    }
                    
                    this.dialog.show('success', { title: '¡Listo!', message: 'Tu banner ha sido actualizado correctamente.' });
                } else {
                    this.dialog.show('error', { title: 'Error', message: apiResult.message || 'No se pudo subir el banner.' });
                }
            } catch (error) {
                console.error("Error al subir el banner:", error);
                this.dialog.show('error', { title: 'Error', message: 'Ha ocurrido un error inesperado al contactar con el servidor.' });
            }
        }
    }
}