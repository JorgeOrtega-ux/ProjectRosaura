// public/assets/js/modules/app/ChannelController.js

import { ApiService } from '../../core/api/ApiServices.js';
import { ApiRoutes } from '../../core/api/ApiRoutes.js';
import { DialogSystem } from '../../core/components/DialogSystem.js';

export class ChannelController {
    constructor() {
        this.api = new ApiService();
        this.dialog = new DialogSystem(); // Instanciamos tu sistema de diálogos
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
            console.log("Archivo detectado en el input.");
            const file = e.target.files[0];
            if (!file) return;

            const maxSize = 6 * 1024 * 1024;
            if (file.size > maxSize) {
                // Usamos la sintaxis correcta: show('template', {data})
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

    // Convertimos a async para poder usar 'await' en el dialog
    async showBannerPreviewDialog(file, imageDataUrl) {
        
        // Esperamos a que el usuario presione Confirmar o Cancelar en el modal
        const result = await this.dialog.show('bannerPreviewTemplate', {
            imageUrl: imageDataUrl
        });

        // Si presionó el botón de confirmar
        if (result.confirmed) {
            try {
                const formData = new FormData();
                formData.append('banner', file);

                const confirmBtn = document.querySelector('.component-dialog-actions [data-dialog-action="confirm"]');
                if (confirmBtn) {
                    confirmBtn.innerText = 'Subiendo...';
                    confirmBtn.disabled = true;
                }

                // AQUÍ ESTÁ LA SOLUCIÓN: Usamos this.api.postForm() que inyecta tu X-CSRF-Token automáticamente
                const apiResult = await this.api.postForm(ApiRoutes.Channel.UploadBanner, formData);
                
                if (apiResult.success) {
                    const bannerContainer = document.getElementById('channel-banner-container');
                    if (bannerContainer && apiResult.banner_url) {
                        // Actualiza el fondo en tiempo real
                        bannerContainer.style.backgroundImage = `url('${apiResult.banner_url}')`;
                    }
                    
                    // Notificación de éxito
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