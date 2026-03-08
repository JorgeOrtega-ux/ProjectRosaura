// public/assets/js/modules/app/ChannelController.js

import { ApiService } from '../../core/api/ApiServices.js';
import { ApiRoutes } from '../../core/api/ApiRoutes.js';
import { DialogSystem } from '../../core/components/DialogSystem.js';

export class ChannelController {
    constructor() {
        this.api = new ApiService();
        this.dialog = new DialogSystem(); 
        this.currentCropData = null; 
        this.channelIdentifier = null; // Almacena el identificador del canal actual
    }

    // El método init ahora debe aceptar el identificador capturado de la URL
    async init(params = {}) {
        console.log("Channel view loaded successfully.");
        
        // Asumiendo que el SpaRouter pasa los parámetros de la URL
        // Si el identificador viene en los parámetros, lo guardamos
        if (params.identifier) {
            this.channelIdentifier = params.identifier;
        } else {
            // Intento de fallback: extraerlo directamente de la URL actual
            const pathParts = window.location.pathname.split('/');
            const atPart = pathParts.find(part => part.startsWith('@'));
            if(atPart) {
                this.channelIdentifier = atPart.substring(1); // Quitar el '@'
            }
        }

        // Si hay un identificador, podríamos querer cargar datos adicionales vía API
        if (this.channelIdentifier) {
           await this.loadChannelData(this.channelIdentifier);
        }

        this.setupTabsNavigation();
        this.setupSubscriptionButton();
        this.setupBannerUpload();
        this.setupLocalEditToggles(); 
        this.setupProfilePublishing(); 
    }
    
    // NUEVO: Método para cargar datos del canal asíncronamente (opcional, dependiendo de cómo manejes el SSR vs CSR)
    async loadChannelData(identifier) {
        // En este ejemplo, el controlador PHP ChannelController tiene un método get_channel_by_identifier
        // Construimos la URL de la API (Asegúrate de que ApiRoutes tenga esta ruta definida o constrúyela)
        const apiUrl = `/api/channel/get_by_identifier?identifier=${identifier}`;
        
        try {
             // Si implementas la ruta GET en la API
             // const response = await this.api.get(apiUrl);
             console.log(`Cargando datos del canal para el identificador: ${identifier}`);
             // Aquí actualizarías el DOM con los datos recibidos (videos, descripciones, etc.) si no lo hace ya PHP
        } catch (e) {
             console.error("Error al cargar datos del canal:", e);
        }
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
            // Cambiado para usar identifier en lugar de username
            const identifier = newBtn.getAttribute('data-identifier');
            if (!identifier) return;

            const originalText = newBtn.innerText;
            newBtn.innerText = 'Cargando...';
            newBtn.disabled = true;

            // Suponiendo que toggleSubscription se actualizó para enviar el identifier
            const response = await this.api.post(ApiRoutes.Channel.ToggleSubscription, { identifier: identifier });
            
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

    setupLocalEditToggles() {
        const wrapper = document.querySelector('.component-wrapper');
        if (!wrapper) return;

        wrapper.addEventListener('click', (e) => {
            const action = e.target.getAttribute('data-action');
            if (!action) return;

            const target = e.target.getAttribute('data-target');

            if (action === 'toggleLocalEdit') {
                this.switchState(target, 'edit');
            } 
            else if (action === 'cancelLocalEdit') {
                const displayEl = document.querySelector(`[data-ref="display-${target}"]`);
                const inputEl = document.querySelector(`[data-ref="input-${target}"]`);
                if (displayEl && inputEl) {
                    let text = displayEl.innerText.trim();
                    if (target === 'identifier' && text.startsWith('@')) {
                        text = text.substring(1);
                    }
                    inputEl.value = text;
                }
                this.switchState(target, 'view');
            }
            else if (action === 'saveLocalEdit') {
                const displayEl = document.querySelector(`[data-ref="display-${target}"]`);
                const inputEl = document.querySelector(`[data-ref="input-${target}"]`);
                if (displayEl && inputEl) {
                    let val = inputEl.value.trim();
                    // Validación simple en cliente antes de mostrar
                    if (target === 'identifier') {
                         val = val.replace(/[^a-z0-9_]/gi, '').toLowerCase();
                         inputEl.value = val;
                         displayEl.innerText = val ? '@' + val : '';
                    } else {
                        displayEl.innerText = val;
                    }
                }
                this.switchState(target, 'view');
            }
        });
    }

    switchState(target, state) {
        const viewBox = document.querySelector(`[data-state="${target}-view"]`);
        const editBox = document.querySelector(`[data-state="${target}-edit"]`);

        if (!viewBox || !editBox) return;

        if (state === 'edit') {
            viewBox.classList.remove('active');
            viewBox.classList.add('disabled');
            editBox.classList.remove('disabled');
            editBox.classList.add('active');
        } else {
            editBox.classList.remove('active');
            editBox.classList.add('disabled');
            viewBox.classList.remove('disabled');
            viewBox.classList.add('active');
        }
    }

    setupProfilePublishing() {
        const publishBtn = document.getElementById('btn-publish-profile-changes');
        if (!publishBtn) return;

        const newBtn = publishBtn.cloneNode(true);
        publishBtn.parentNode.replaceChild(newBtn, publishBtn);

        newBtn.addEventListener('click', async () => {
            const description = document.getElementById('channelDescriptionInput')?.value || '';
            let identifier = document.getElementById('channelIdentifierInput')?.value || '';
            const contactEmail = document.getElementById('channelContactInput')?.value || '';
            
            // Limpieza básica
            identifier = identifier.replace(/@/g, '').toLowerCase().trim();

            const originalText = newBtn.innerText;
            newBtn.innerText = 'Publicando...';
            newBtn.disabled = true;

            try {
                // Se asume que la ruta UpdateProfile en ApiRoutes es la correcta
                const response = await this.api.post(ApiRoutes.Channel.UpdateProfile, {
                    description: description,
                    identifier: identifier,
                    contact_email: contactEmail
                });

                if (response.success) {
                    this.dialog.show('success', { title: '¡Publicado!', message: response.message });
                    // Opcional: actualizar la URL si el identificador cambió
                    if (identifier && window.history && this.channelIdentifier && identifier !== this.channelIdentifier) {
                        const currentUrl = window.location.href;
                        const newUrl = currentUrl.replace(`/@${this.channelIdentifier}`, `/@${identifier}`);
                        window.history.pushState({}, '', newUrl);
                        this.channelIdentifier = identifier;
                    }
                } else {
                    this.dialog.show('error', { title: 'Error', message: response.message });
                }
            } catch (error) {
                console.error("Error al publicar perfil:", error);
                this.dialog.show('error', { title: 'Error', message: 'Ha ocurrido un error de conexión.' });
            } finally {
                newBtn.innerText = originalText;
                newBtn.disabled = false;
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

    initCropTool(dialogBox) {
        const wrapper = dialogBox.querySelector('.banner-crop-wrapper');
        const cropBox = dialogBox.querySelector('#bannerCropBox');
        const img = dialogBox.querySelector('#bannerCropImage');
        
        const maskTop = dialogBox.querySelector('.crop-mask-top');
        const maskBottom = dialogBox.querySelector('.crop-mask-bottom');
        const maskLeft = dialogBox.querySelector('.crop-mask-left');
        const maskRight = dialogBox.querySelector('.crop-mask-right');

        if (!wrapper || !cropBox || !img) return;

        this.currentCropData = { x: 0, y: 0, w: 1, h: 1 };

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

            if (containerRect && containerRect.width > 0 && containerRect.height > 0) {
                cropBox.dataset.cropX = left / containerRect.width;
                cropBox.dataset.cropY = top / containerRect.height;
                cropBox.dataset.cropW = width / containerRect.width;
                cropBox.dataset.cropH = height / containerRect.height;

                this.currentCropData.x = left / containerRect.width;
                this.currentCropData.y = top / containerRect.height;
                this.currentCropData.w = width / containerRect.width;
                this.currentCropData.h = height / containerRect.height;
            }
        };

        const initializeCropBox = () => {
            containerRect = wrapper.getBoundingClientRect();
            if (containerRect.width === 0) {
                setTimeout(initializeCropBox, 50); 
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
                let deltaW_fromX = currentHandle.includes('e') ? dx : -dx;
                let deltaH_fromY = currentHandle.includes('s') ? dy : -dy;
                let deltaW_fromY = deltaH_fromY * ASPECT_RATIO;
                
                let deltaW = Math.abs(deltaW_fromX) > Math.abs(deltaW_fromY) ? deltaW_fromX : deltaW_fromY;
                
                let newWidth = initialWidth + deltaW;
                if (newWidth < 150) newWidth = 150;

                let newHeight = newWidth / ASPECT_RATIO;
                let newLeft = currentHandle.includes('w') ? initialLeft + (initialWidth - newWidth) : initialLeft;
                let newTop = currentHandle.includes('n') ? initialTop + (initialHeight - newHeight) : initialTop;
                
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
        this.currentCropData = null;

        const result = await this.dialog.show('bannerPreviewTemplate', {
            imageUrl: imageDataUrl,
            dialogClass: 'component-dialog-box--banner',
            onRender: (box) => this.initCropTool(box)
        });

        if (result.confirmed) {
            try {
                this.dialog.show('success', { title: 'Procesando...', message: 'Subiendo y recortando tu banner, por favor espera.' });

                const formData = new FormData();
                formData.append('banner', file);

                if (this.currentCropData) {
                    formData.append('crop_x', this.currentCropData.x);
                    formData.append('crop_y', this.currentCropData.y);
                    formData.append('crop_w', this.currentCropData.w);
                    formData.append('crop_h', this.currentCropData.h);
                } else {
                    formData.append('crop_x', 0);
                    formData.append('crop_y', 0);
                    formData.append('crop_w', 1);
                    formData.append('crop_h', 1);
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