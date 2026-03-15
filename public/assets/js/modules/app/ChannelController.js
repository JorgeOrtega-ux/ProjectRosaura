// public/assets/js/modules/app/ChannelController.js

import { ApiService } from '../../core/api/ApiServices.js';
import { ApiRoutes } from '../../core/api/ApiRoutes.js';
import { DialogSystem } from '../../core/components/DialogSystem.js';

export class ChannelController {
    constructor() {
        this.api = new ApiService();
        this.dialog = new DialogSystem(); 
        this.currentCropData = null; 
        this.channelIdentifier = null;
    }

    async init(params = {}) {
        console.log("Channel view loaded successfully.");
        
        this.channelIdentifier = null;

        if (params.identifier) {
            this.channelIdentifier = params.identifier;
        } else {
            const pathParts = window.location.pathname.split('/');
            const atPart = pathParts.find(part => part.startsWith('@'));
            if(atPart) {
                this.channelIdentifier = atPart.substring(1);
            }
        }

        if (this.channelIdentifier) {
           await this.loadChannelData(this.channelIdentifier);
        }

        this.setupTabsNavigation();
        this.setupSubscriptionButton();
        this.setupBannerUpload();
        this.setupLocalEditToggles(); 
        this.setupCustomFormControls();
        this.setupProfilePublishing(); 
    }
    
    async loadChannelData(identifier) {
        const apiUrl = `/api/channel/get_by_identifier?identifier=${identifier}`;
        try {
             console.log(`[DEBUG RANKING] Iniciando carga de datos para identificador: ${identifier}`);
             
             const rankContainer = document.getElementById('channel-ranking-container');
             console.log(`[DEBUG RANKING] ¿Se encontró el li 'channel-ranking-container'?:`, !!rankContainer);
             
             const targetUserId = rankContainer ? rankContainer.getAttribute('data-user-id') : null;
             console.log(`[DEBUG RANKING] Valor extraído de data-user-id:`, targetUserId);

             if (targetUserId && targetUserId !== '') {
                 console.log(`[DEBUG RANKING] Llamando a loadChannelRanking con ID: ${targetUserId}`);
                 await this.loadChannelRanking(targetUserId);
             } else {
                 console.warn("[DEBUG RANKING] No se encontró un data-user-id válido.");
             }

        } catch (e) {
             console.error("Error al cargar datos del canal:", e);
        }
    }

    async loadChannelRanking(userId) {
        console.log(`[DEBUG RANKING] Ejecutando loadChannelRanking para el usuario: ${userId}`);
        try {
            const response = await this.api.getChannelRanking(userId);
            console.log(`[DEBUG RANKING] Respuesta completa de la API:`, response);
            
            const rankContainer = document.getElementById('channel-ranking-container');
            const rankText = document.getElementById('channel-ranking-text');
            
            if (response.success && response.data && response.data.current && response.data.current.current_rank) {
                console.log(`[DEBUG RANKING] El usuario SÍ tiene ranking. Rank actual:`, response.data.current.current_rank);
                const currentData = response.data.current;
                
                if (rankContainer) rankContainer.style.display = 'flex';
                
                let trendIcon = '⬜';
                if (currentData.trend === 'up') trendIcon = '🟩';
                else if (currentData.trend === 'down') trendIcon = '🟥';

                if (rankText) {
                    rankText.innerText = `Posición #${currentData.current_rank} en el ranking ${trendIcon}`;
                }
            } else {
                console.log(`[DEBUG RANKING] El usuario NO tiene ranking.`);
                if (rankContainer) rankContainer.style.display = 'none';
            }
        } catch (error) {
            console.error("[DEBUG RANKING] Excepción capturada al solicitar el ranking:", error);
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

            allTabs.forEach(t => t.classList.remove('active'));
            sections.forEach(s => s.classList.remove('active'));

            tab.classList.add('active');

            const targetId = tab.getAttribute('data-target');
            const targetSection = document.getElementById(targetId);
            
            if (targetSection) targetSection.classList.add('active');

            const tabName = tab.getAttribute('data-tab');
            if (this.channelIdentifier && window.history) {
                let basePath = window.AppBasePath || '';
                let newUrl = `${basePath}/@${this.channelIdentifier}`;
                if (tabName && tabName !== 'main') {
                    newUrl += `/${tabName}`;
                }
                window.history.pushState({ path: newUrl }, '', newUrl);
            }
        });
    }

    setupSubscriptionButton() {
        const subBtn = document.getElementById('btn-channel-subscribe');
        if (!subBtn) return;

        const newBtn = subBtn.cloneNode(true);
        subBtn.parentNode.replaceChild(newBtn, subBtn);

        newBtn.addEventListener('click', async () => {
            const identifier = newBtn.getAttribute('data-identifier');
            if (!identifier) return;

            const originalText = newBtn.innerText;
            const isSubscribed = originalText.trim().toLowerCase() === 'suscrito';

            if (isSubscribed) {
                newBtn.innerText = 'Suscribirse';
                newBtn.classList.remove('component-btn-secondary');
                newBtn.classList.add('component-btn-primary');
            } else {
                newBtn.innerText = 'Suscrito';
                newBtn.classList.remove('component-btn-primary');
                newBtn.classList.add('component-btn-secondary');
            }

            const response = await this.api.postSubscribe(identifier);

            if (!response.success) {
                newBtn.innerText = originalText;
                if (isSubscribed) {
                    newBtn.classList.remove('component-btn-primary');
                    newBtn.classList.add('component-btn-secondary');
                } else {
                    newBtn.classList.remove('component-btn-secondary');
                    newBtn.classList.add('component-btn-primary');
                }

                if (response.message === 'Debes iniciar sesión para suscribirte.') {
                    if (window.router) window.router.navigate('/login');
                    else window.location.href = (window.AppBasePath || '') + '/login';
                } else {
                    // MEJORA: Usar Toast en lugar de Dialog para rate limits u otros errores de suscripción
                    if (window.appInstance && typeof window.appInstance.showToast === 'function') {
                        window.appInstance.showToast(response.message || 'Error al procesar la solicitud.', 'error');
                    } else {
                        this.dialog.show('error', { title: 'Aviso', message: response.message || 'Error al procesar la solicitud.' });
                    }
                }
            } else {
                newBtn.innerText = response.is_subscribed ? 'Suscrito' : 'Suscribirse';
                if (response.is_subscribed) {
                    newBtn.classList.remove('component-btn-primary');
                    newBtn.classList.add('component-btn-secondary');
                } else {
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
            }
        });
    }

    setupLocalEditToggles() {
        const wrapper = document.querySelector('.component-channel-layout') || document.querySelector('.component-wrapper');
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

    setupCustomFormControls() {
        const wrapper = document.querySelector('.component-channel-layout') || document.querySelector('.component-wrapper');
        if (!wrapper) return;

        // Toggle para cambiar visualmente el sistema de medidas
        wrapper.querySelectorAll('[data-action="switchMeasure"]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const sys = e.target.getAttribute('data-sys');
                document.querySelectorAll('[data-action="switchMeasure"]').forEach(b => b.classList.remove('component-button--dark'));
                e.target.classList.add('component-button--dark');
                
                const metricInputs = document.getElementById('metric-inputs');
                const imperialInputs = document.getElementById('imperial-inputs');
                
                if (sys === 'metric') {
                    if(metricInputs) metricInputs.style.display = 'flex';
                    if(imperialInputs) imperialInputs.style.display = 'none';
                } else {
                    if(metricInputs) metricInputs.style.display = 'none';
                    if(imperialInputs) imperialInputs.style.display = 'flex';
                }
            });
        });

        wrapper.querySelectorAll('[data-action="selectOption"]').forEach(option => {
            option.addEventListener('click', (e) => {
                e.stopPropagation();
                const inputTarget = option.getAttribute('data-target');
                const textTarget = option.getAttribute('data-text');
                const value = option.getAttribute('data-value');
                const label = option.getAttribute('data-label');

                if (inputTarget) document.getElementById(inputTarget).value = value;
                if (textTarget) document.getElementById(textTarget).innerText = label;

                const siblings = option.closest('.component-menu-list').querySelectorAll('.component-menu-link');
                siblings.forEach(sib => sib.classList.remove('active'));
                option.classList.add('active');

                const currentModule = option.closest('.component-module');
                if (window.appInstance && currentModule) {
                    window.appInstance.closeModule(currentModule);
                } else if (currentModule) {
                    currentModule.classList.add('disabled');
                    currentModule.classList.remove('active');
                }
            });
        });

        wrapper.querySelectorAll('[data-action="adjustNumber"]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const targetId = btn.getAttribute('data-target');
                const step = parseFloat(btn.getAttribute('data-step'));
                const min = btn.getAttribute('data-min') !== null ? parseFloat(btn.getAttribute('data-min')) : null;
                const max = btn.getAttribute('data-max') !== null ? parseFloat(btn.getAttribute('data-max')) : null;
                
                const hiddenInput = document.getElementById(targetId);
                const displayEl = document.getElementById('display-' + targetId);
                
                if (hiddenInput && displayEl) {
                    let currentVal = parseFloat(hiddenInput.value) || 0;
                    let newVal = currentVal + step;
                    
                    if (min !== null && newVal < min) newVal = min;
                    if (max !== null && newVal > max) newVal = max;
                    
                    if (step % 1 !== 0) {
                        let decimals = step.toString().split('.')[1].length;
                        if (decimals === 1) newVal = newVal.toFixed(1);
                        else newVal = newVal.toFixed(2);
                    } else {
                        newVal = Math.round(newVal);
                    }

                    hiddenInput.value = newVal;
                    displayEl.innerText = newVal;
                }
            });
        });

        wrapper.querySelectorAll('[data-action="toggleSocial"]').forEach(toggle => {
            toggle.addEventListener('change', (e) => {
                const targetId = toggle.getAttribute('data-target');
                const area = document.getElementById('area-' + targetId);
                const input = document.getElementById(targetId);
                
                if (toggle.checked) {
                    if (area) area.style.display = 'flex'; 
                    if (input) input.focus();
                } else {
                    if (area) area.style.display = 'none';
                }
            });
        });
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
            
            identifier = identifier.replace(/@/g, '').toLowerCase().trim();

            const relStatus = document.getElementById('channelRelStatusInput')?.value || '';
            const interestedIn = document.getElementById('channelInterestedInInput')?.value || '';
            const gender = document.getElementById('channelGenderInput')?.value || '';
            const hairColor = document.getElementById('channelHairColorInput')?.value || '';
            const boobs = document.getElementById('channelBoobsInput')?.value || '';
            const ethnicity = document.getElementById('channelEthnicityInput')?.value || '';
            const eyeColor = document.getElementById('channelEyeColorInput')?.value || '';
            const country = document.getElementById('channelCountryInput')?.value || '';
            
            // Calculo de altura y peso (Forzando la conversión a Métrico antes de mandar)
            let finalHeight = '';
            let finalWeight = '';
            
            const activeSysBtn = document.querySelector('.measurement-toggle-wrap .component-button--dark');
            const activeSys = activeSysBtn ? activeSysBtn.getAttribute('data-sys') : 'metric';
            
            if (activeSys === 'imperial') {
                let ft = parseFloat(document.getElementById('channelHeightFtInput')?.value) || 0;
                let inc = parseFloat(document.getElementById('channelHeightInInput')?.value) || 0;
                let lbs = parseFloat(document.getElementById('channelWeightLbsInput')?.value) || 0;
                
                let totalInches = (ft * 12) + inc;
                let heightMeters = (totalInches * 2.54) / 100; 
                let weightKg = lbs / 2.20462; 
                
                if (totalInches > 0) finalHeight = heightMeters.toFixed(2);
                if (lbs > 0) finalWeight = weightKg.toFixed(2);
            } else {
                finalHeight = document.getElementById('channelHeightInput')?.value || '';
                finalWeight = document.getElementById('channelWeightInput')?.value || '';
            }

            const tattoos = document.getElementById('channelTattoosInput')?.checked ? 1 : 0;
            const piercings = document.getElementById('channelPiercingsInput')?.checked ? 1 : 0;
            const interests = document.getElementById('channelInterestsInput')?.value || '';

            const socialFb = document.getElementById('toggleFbInput')?.checked ? (document.getElementById('channelFbInput')?.value || '') : '';
            const socialYt = document.getElementById('toggleYtInput')?.checked ? (document.getElementById('channelYtInput')?.value || '') : '';
            const socialIg = document.getElementById('toggleIgInput')?.checked ? (document.getElementById('channelIgInput')?.value || '') : '';
            const socialX = document.getElementById('toggleXInput')?.checked ? (document.getElementById('channelXInput')?.value || '') : '';
            const socialOf = document.getElementById('toggleOfInput')?.checked ? (document.getElementById('channelOfInput')?.value || '') : '';
            const socialSc = document.getElementById('toggleScInput')?.checked ? (document.getElementById('channelScInput')?.value || '') : '';

            const originalText = newBtn.innerText;
            newBtn.innerText = 'Publicando...';
            newBtn.disabled = true;

            try {
                const response = await this.api.post(ApiRoutes.Channel.UpdateProfile, {
                    description: description,
                    identifier: identifier,
                    contact_email: contactEmail,
                    relationship_status: relStatus,
                    interested_in: interestedIn,
                    gender: gender,
                    hair_color: hairColor,
                    boobs: boobs,
                    ethnicity: ethnicity,
                    eye_color: eyeColor,
                    country: country,
                    height: finalHeight,
                    weight: finalWeight,
                    measurement_system: 'metric', // Enviamos flag 'metric' para que el backend no duplique la conversión
                    tattoos: tattoos,
                    piercings: piercings,
                    interests: interests,
                    social_facebook: socialFb,
                    social_youtube: socialYt,
                    social_instagram: socialIg,
                    social_x: socialX,
                    social_onlyfans: socialOf,
                    social_snapchat: socialSc
                });

                if (response.success) {
                    if (window.appInstance && typeof window.appInstance.showToast === 'function') {
                        window.appInstance.showToast(response.message, 'success');
                    } else {
                        this.dialog.show('success', { title: '¡Publicado!', message: response.message });
                    }
                    if (identifier && window.history && this.channelIdentifier && identifier !== this.channelIdentifier) {
                        const currentUrl = window.location.href;
                        const newUrl = currentUrl.replace(`/@${this.channelIdentifier}`, `/@${identifier}`);
                        window.history.pushState({}, '', newUrl);
                        this.channelIdentifier = identifier;
                    }
                } else {
                    if (window.appInstance && typeof window.appInstance.showToast === 'function') {
                        window.appInstance.showToast(response.message, 'error');
                    } else {
                        this.dialog.show('error', { title: 'Error', message: response.message });
                    }
                }
            } catch (error) {
                console.error("Error al publicar perfil:", error);
                if (window.appInstance && typeof window.appInstance.showToast === 'function') {
                    window.appInstance.showToast('Ha ocurrido un error de conexión.', 'error');
                } else {
                    this.dialog.show('error', { title: 'Error', message: 'Ha ocurrido un error de conexión.' });
                }
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
                if (window.appInstance && typeof window.appInstance.showToast === 'function') {
                    window.appInstance.showToast('La imagen es demasiado grande. Límite: 6 MB.', 'error');
                } else {
                    this.dialog.show('error', {
                        title: 'Archivo muy grande',
                        message: 'Para obtener los mejores resultados en todos los dispositivos, usa una imagen de 2048 × 1152 píxeles como mínimo y 6 MB como máximo.'
                    });
                }
                fileInput.value = '';
                return;
            }

            const img = new Image();
            const objectUrl = URL.createObjectURL(file);

            img.onload = () => {
                URL.revokeObjectURL(objectUrl);
                
                if (img.width < 1024 || img.height < 576) {
                    if (window.appInstance && typeof window.appInstance.showToast === 'function') {
                        window.appInstance.showToast('La imagen es demasiado pequeña. Mínimo: 1024 x 576.', 'error');
                    } else {
                        this.dialog.show('error', {
                            title: 'Dimensiones insuficientes',
                            message: 'Las imágenes deben ser de 1024 × 576 píxeles como mínimo. Para obtener los mejores resultados en todos los dispositivos, usa una imagen de 2048 × 1152 píxeles como mínimo y 6 MB como máximo.'
                        });
                    }
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
                if (window.appInstance && typeof window.appInstance.showToast === 'function') {
                    window.appInstance.showToast('El archivo seleccionado no es una imagen válida.', 'error');
                } else {
                    alert("El archivo seleccionado no es una imagen válida.");
                }
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
                if (window.appInstance && typeof window.appInstance.showToast === 'function') {
                    window.appInstance.showToast('Subiendo y recortando tu banner...', 'info');
                } else {
                    this.dialog.show('success', { title: 'Procesando...', message: 'Subiendo y recortando tu banner, por favor espera.' });
                }

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
                    
                    if (window.appInstance && typeof window.appInstance.showToast === 'function') {
                        window.appInstance.showToast('Banner actualizado correctamente.', 'success');
                    } else {
                        this.dialog.show('success', { title: '¡Listo!', message: 'Tu banner ha sido actualizado correctamente.' });
                    }
                } else {
                    if (window.appInstance && typeof window.appInstance.showToast === 'function') {
                        window.appInstance.showToast(apiResult.message || 'No se pudo subir el banner.', 'error');
                    } else {
                        this.dialog.show('error', { title: 'Error', message: apiResult.message || 'No se pudo subir el banner.' });
                    }
                }
            } catch (error) {
                console.error("Error al subir el banner:", error);
                if (window.appInstance && typeof window.appInstance.showToast === 'function') {
                    window.appInstance.showToast('Error inesperado al contactar con el servidor.', 'error');
                } else {
                    this.dialog.show('error', { title: 'Error', message: 'Ha ocurrido un error inesperado al contactar con el servidor.' });
                }
            }
        }
    }
}