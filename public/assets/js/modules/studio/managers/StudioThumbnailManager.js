export class StudioThumbnailManager {
    constructor(api, state, onThumbnailChangedCallback) {
        this.api = api;
        this.state = state;
        this.onThumbnailChanged = onThumbnailChangedCallback;
        // Guardamos el estado original del botón por defecto
        this.defaultBtnHtml = '<span class="material-symbols-rounded">auto_awesome</span><span>Generar opciones</span>';
        this.attachEvents();
    }

    // NUEVO: Método para limpiar la interfaz al cambiar de video
    resetUI() {
        const grid = document.getElementById('generatedThumbnailsContainer');
        if (grid) {
            grid.innerHTML = '';
            grid.style.display = 'none';
        }
        const btn = document.getElementById('btnGenerateThumbnails');
        if (btn) {
            btn.innerHTML = this.defaultBtnHtml;
        }
        const hiddenInput = document.getElementById('selectedGeneratedThumbnail');
        if (hiddenInput) hiddenInput.value = '';
    }

    async generateThumbnails() {
        if (!this.state.selectedVideoId) return;
        
        // Guardar el ID actual para prevenir condiciones de carrera si el usuario cambia de pestaña
        const currentVideoId = this.state.selectedVideoId; 
        const videoData = this.state.getVideo(currentVideoId);
        
        if (!videoData || (videoData.status !== 'processed' && videoData.status !== 'published')) {
            alert("El video debe terminar de procesarse al 100% para poder generar sus miniaturas.");
            return;
        }

        const btn = document.getElementById('btnGenerateThumbnails');
        
        // Prevención extra si el botón tiene la clase de deshabilitado
        if (btn && btn.classList.contains('disabled-interactive')) return;

        if (btn) {
            // Respaldamos el texto si no es el de "Cargando..." para no perder traducciones si las hubiera
            if (!btn.innerHTML.includes('sync')) {
                this.defaultBtnHtml = btn.innerHTML;
            }
            btn.innerHTML = '<span class="material-symbols-rounded">sync</span><span>Cargando opciones...</span>';
            btn.disabled = true;
        }

        const grid = document.getElementById('generatedThumbnailsContainer');
        if (grid) {
            grid.style.display = 'grid';
            grid.innerHTML = '';
        }

        try {
            await new Promise(r => setTimeout(r, 600));

            // PREVENCIÓN: Si el usuario cambió de video mientras "cargaba", abortamos la renderización
            if (this.state.selectedVideoId !== currentVideoId) return;

            const uuid = videoData.uuid;
            let baseUrl = window.AppBasePath || '';
            if (!baseUrl.startsWith('http')) baseUrl = window.location.origin + (baseUrl.startsWith('/') ? '' : '/') + baseUrl;
            if (baseUrl.endsWith('/')) baseUrl = baseUrl.slice(0, -1);

            for (let i = 1; i <= 6; i++) {
                const thumbUrl = `${baseUrl}/public/storage/thumbnails/generated/${uuid}/thumb_${i}.jpg`;
                const relativePath = `/storage/thumbnails/generated/${uuid}/thumb_${i}.jpg`;
                
                const item = document.createElement('div');
                item.className = 'component-thumbnail-item';
                item.innerHTML = `<img src="${thumbUrl}" alt="Opción ${i}" onerror="this.parentElement.style.display='none'">`;
                item.onclick = () => this.selectGeneratedThumbnail(item, thumbUrl, relativePath);
                if (grid) grid.appendChild(item);
            }
        } catch (error) {
            console.error(error); 
            alert("Error al cargar las miniaturas."); 
            if (grid) grid.style.display = 'none';
        } finally {
            // Solo restaurar el botón si seguimos en el mismo video; de lo contrario resetUI ya se encargó
            if (this.state.selectedVideoId === currentVideoId && btn) {
                btn.innerHTML = this.defaultBtnHtml; 
                btn.disabled = false;
            }
        }
    }

    async selectGeneratedThumbnail(itemElement, fullUrl, relativePath) {
        document.querySelectorAll('.component-thumbnail-item').forEach(el => el.classList.remove('component-thumbnail-selected'));
        itemElement.classList.add('component-thumbnail-selected');
        
        const hiddenInput = document.getElementById('selectedGeneratedThumbnail');
        if (hiddenInput) hiddenInput.value = relativePath;

        const video = this.state.getVideo(this.state.selectedVideoId);
        if (video) {
            video.draftThumbnailType = 'generated';
            video.draftThumbnailData = relativePath;
            video.draftThumbnailPreview = fullUrl;
            this.updateThumbnailPreview(fullUrl);
            if(this.onThumbnailChanged) this.onThumbnailChanged();
        }
    }

    updateThumbnailPreview(thumbnailPath) {
        const container = document.querySelector('.studio-video-card__player');
        if (!container) return;

        if (thumbnailPath) {
            let finalUrl = thumbnailPath;
            let isBlob = finalUrl.startsWith('blob:') || finalUrl.startsWith('data:');
            
            if (!isBlob && !finalUrl.startsWith('http')) {
                let base = window.AppBasePath || '';
                if (!base.startsWith('http')) base = window.location.origin + (base.startsWith('/') ? '' : '/') + base;
                if (base.endsWith('/')) base = base.slice(0, -1);
                let cleanPath = thumbnailPath.replace(/^\//, '');
                let baseNoSlash = (window.AppBasePath || '').replace(/^\//, '');
                if (baseNoSlash && cleanPath.startsWith(baseNoSlash + '/')) cleanPath = cleanPath.substring(baseNoSlash.length + 1);
                if (!cleanPath.startsWith('public/')) cleanPath = 'public/' + cleanPath;
                finalUrl = base + '/' + cleanPath;
            }

            if (finalUrl.includes('?cb=')) finalUrl = finalUrl.split('?cb=')[0];

            container.style.backgroundImage = 'none';
            container.style.backgroundColor = 'transparent';
            container.style.position = 'relative';
            
            container.innerHTML = `
                <img id="dynamicThumbPreview" src="${finalUrl}" 
                     alt="Miniatura" 
                     style="width: 100%; height: 100%; object-fit: cover; border-radius: inherit; position: absolute; top: 0; left: 0;" 
                     onerror="if(!this.dataset.retried) { this.dataset.retried = 'true'; this.src = this.src.replace('/public/storage/', '/storage/'); } else { this.style.display='none'; this.nextElementSibling.style.display='block'; }">
                <span class="material-symbols-rounded" style="color: white; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); font-size: 48px; z-index: 2; text-shadow: 0 2px 5px rgba(0,0,0,0.7);">play_circle</span>
            `;

            if (!isBlob && !finalUrl.includes('/generated/')) {
                const fetchImage = async (url) => {
                    try {
                        const response = await fetch(url, { cache: 'reload' });
                        if (response.ok) {
                            const blob = await response.blob();
                            const img = document.getElementById('dynamicThumbPreview');
                            if (img) img.src = URL.createObjectURL(blob); 
                        } else if (url.includes('/public/storage/')) {
                            fetchImage(url.replace('/public/storage/', '/storage/'));
                        }
                    } catch (e) { console.warn("Cache visual error:", e); }
                };
                fetchImage(finalUrl);
            }
        } else {
            container.style.backgroundImage = 'none';
            container.style.backgroundColor = 'var(--background-secondary, #2a2a2a)';
            container.innerHTML = '<span class="material-symbols-rounded" style="color: white; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); font-size: 48px;">play_circle</span>';
        }
    }

    attachEvents() {
        document.addEventListener('click', (e) => {
            const btnGen = e.target.closest('#btnGenerateThumbnails');
            if (btnGen) { this.generateThumbnails(); return; }
        });

        document.addEventListener('change', (e) => {
            if (e.target && e.target.id === 'thumbnailInput') {
                if (!e.target.files.length || !this.state.selectedVideoId) return;
                const file = e.target.files[0];
                const localPreviewUrl = URL.createObjectURL(file);
                const video = this.state.getVideo(this.state.selectedVideoId);
                if (video) {
                    video.draftThumbnailType = 'file';
                    video.draftThumbnailData = file;
                    video.draftThumbnailPreview = localPreviewUrl;
                    this.updateThumbnailPreview(localPreviewUrl);
                    if(this.onThumbnailChanged) this.onThumbnailChanged();
                }
                e.target.value = ''; 
            }
        });
    }
}