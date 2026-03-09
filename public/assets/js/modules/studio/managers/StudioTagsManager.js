export class StudioTagsManager {
    constructor(api, state, onTagsChangedCallback) {
        this.api = api;
        this.state = state;
        this.onTagsChanged = onTagsChangedCallback;
        this.selectedModels = [];
        this.selectedCategories = [];
        this.selectedFreeTags = []; 
        this.attachEvents();
        console.log("🟢 [StudioTagsManager] Inicializado correctamente.");
    }

    setInitialTags(tags) {
        console.log("🔵 [StudioTagsManager] setInitialTags() - Cargando etiquetas desde BD:", tags);
        this.selectedModels = [];
        this.selectedCategories = [];
        this.selectedFreeTags = [];
        
        if (tags && Array.isArray(tags)) {
            tags.forEach(tag => {
                if (tag.type === 'modelo') {
                    this.selectedModels.push(tag);
                } else if (tag.type === 'category') {
                    this.selectedCategories.push(tag);
                } else {
                    // FILTRO ABSOLUTO: Si no es modelo ni categoría, es etiqueta libre.
                    // Extraemos el string ya sea que venga como texto plano o como objeto {name: "..."}
                    const tagName = typeof tag === 'string' ? tag : (tag.name || '');
                    if (tagName.trim() !== '') {
                        this.selectedFreeTags.push(tagName.trim());
                    }
                }
            });
        }
        
        console.log("✅ [StudioTagsManager] Modelos mapeados:", this.selectedModels);
        console.log("✅ [StudioTagsManager] Categorías mapeadas:", this.selectedCategories);
        console.log("✅ [StudioTagsManager] Etiquetas Libres mapeadas:", this.selectedFreeTags);

        this.renderSelectedTags('modelo');
        this.renderSelectedTags('category');
        this.renderFreeTags();
    }

    getModelsIds() {
        return this.selectedModels.map(t => parseInt(t.id));
    }

    getCategoriesIds() {
        return this.selectedCategories.map(t => parseInt(t.id));
    }

    getFreeTags() {
        // MEJORA: Auto-capturar texto que el usuario olvidó darle "Enter" antes de guardar
        const inputEl = document.getElementById('freeTagsInput');
        if (inputEl && inputEl.value.trim() !== '') {
            console.log(`[StudioTagsManager] ⚠️ Se detectó texto pendiente al guardar: '${inputEl.value}'. Agregando automáticamente.`);
            this.addFreeTag(inputEl.value);
            inputEl.value = '';
        }

        console.log("🔵 [StudioTagsManager] getFreeTags() solicitado. Retornando:", this.selectedFreeTags);
        return this.selectedFreeTags;
    }

    async loadTagsData(moduleName, type) {
        const menu = document.querySelector(`[data-module="${moduleName}"]`);
        if (!menu) return;

        const list = menu.querySelector('.tag-results-list');
        if (!list || list.hasAttribute('data-loaded')) return;

        list.innerHTML = '<div style="padding: 16px; text-align: center; color: var(--text-secondary);"><span class="material-symbols-rounded">sync</span> Cargando...</div>';

        try {
            const res = type === 'modelo' ? await this.api.fetchModels() : await this.api.fetchCategories();
            
            if (res.status === 'success') {
                list.innerHTML = '';
                const currentSelection = type === 'modelo' ? this.selectedModels : this.selectedCategories;
                const currentIds = currentSelection.map(t => parseInt(t.id));

                if (res.data.length === 0) {
                    list.innerHTML = '<div style="padding: 16px; text-align: center; color: var(--text-secondary); font-size: 13px;">No hay opciones disponibles en la base de datos.</div>';
                } else {
                    res.data.forEach(tag => {
                        const isActive = currentIds.includes(parseInt(tag.id));
                        const item = document.createElement('div');
                        item.className = `component-menu-link tag-option-link ${isActive ? 'active' : ''}`;
                        item.setAttribute('data-id', tag.id);
                        item.setAttribute('data-name', tag.name);
                        item.setAttribute('data-type', tag.type);
                        item.setAttribute('data-is-new', 'false');

                        let icon = tag.type === 'modelo' ? 'person' : 'category';
                        item.innerHTML = `
                            <div class="component-menu-link-icon"><span class="material-symbols-rounded">${icon}</span></div>
                            <div class="component-menu-link-text"><span>${tag.name}</span></div>
                        `;
                        list.appendChild(item);
                    });
                }
                list.setAttribute('data-loaded', 'true');
            } else {
                list.innerHTML = `<div style="padding: 16px; color: red;">Error: ${res.message}</div>`;
            }
        } catch (error) {
            list.innerHTML = '<div style="padding: 16px; color: red;">Error de red</div>';
        }
    }

    addTag(id, name, type) {
        const arr = type === 'modelo' ? this.selectedModels : this.selectedCategories;
        
        if (type === 'modelo' && arr.length >= 25) { alert("Has alcanzado el límite máximo de 25 modelos por video."); return; }
        if (type === 'category' && arr.length >= 50) { alert("Has alcanzado el límite máximo de 50 categorías por video."); return; }
        
        if (!arr.find(t => parseInt(t.id) === parseInt(id))) {
            arr.push({ id, name, type, isNew: false });
            this.renderSelectedTags(type);
            
            const menuId = type === 'modelo' ? 'moduleTagsModels' : 'moduleTagsCategories';
            const menu = document.querySelector(`[data-module="${menuId}"]`);
            
            if (menu) {
                const input = menu.querySelector('.tag-search-input');
                if (input) {
                    input.value = '';
                    input.dispatchEvent(new Event('input', { bubbles: true }));
                }
            }
            
            const option = document.querySelector(`[data-module="${menuId}"] .tag-option-link[data-id="${id}"]`);
            if (option) option.classList.add('active');
            
            if(this.onTagsChanged) this.onTagsChanged();
        }
    }

    removeTag(id, type) {
        if (type === 'modelo') this.selectedModels = this.selectedModels.filter(t => String(t.id) !== String(id));
        else this.selectedCategories = this.selectedCategories.filter(t => String(t.id) !== String(id));
        
        this.renderSelectedTags(type);
        if(this.onTagsChanged) this.onTagsChanged();

        const menuId = type === 'modelo' ? 'moduleTagsModels' : 'moduleTagsCategories';
        const option = document.querySelector(`[data-module="${menuId}"] .tag-option-link[data-id="${id}"]`);
        if (option) option.classList.remove('active');
    }

    addFreeTag(name) {
        const cleanName = name.trim();
        if (!cleanName) return;
        
        if (!this.selectedFreeTags.includes(cleanName)) {
            if (this.selectedFreeTags.length >= 50) { 
                alert("Has alcanzado el límite máximo de 50 etiquetas."); 
                return; 
            }
            this.selectedFreeTags.push(cleanName);
            this.renderFreeTags();
            if(this.onTagsChanged) this.onTagsChanged();
        }
    }

    removeFreeTag(name) {
        this.selectedFreeTags = this.selectedFreeTags.filter(t => t !== name);
        this.renderFreeTags();
        if(this.onTagsChanged) this.onTagsChanged();
    }

    renderSelectedTags(type) {
        const arr = type === 'modelo' ? this.selectedModels : this.selectedCategories;
        const hiddenId = type === 'modelo' ? 'hiddenModelsArray' : 'hiddenCategoriesArray';
        const wrapperId = type === 'modelo' ? 'modelsTagsWrapper' : 'categoriesTagsWrapper';
        const containerId = type === 'modelo' ? 'selectedModelsContainer' : 'selectedCategoriesContainer';
        const triggerAttr = type === 'modelo' ? 'moduleTagsModels' : 'moduleTagsCategories';

        const hiddenInput = document.getElementById(hiddenId);
        if (!hiddenInput) return;
        
        const inputName = type === 'modelo' ? 'models' : 'categories';
        if (!hiddenInput.hasAttribute('name')) {
            hiddenInput.setAttribute('name', inputName);
        }

        let wrapper = document.getElementById(wrapperId);

        if (arr.length === 0) {
            if (wrapper) wrapper.remove();
            hiddenInput.value = '[]';
            return;
        }

        if (!wrapper) {
            wrapper = document.createElement('div');
            wrapper.id = wrapperId;
            wrapper.setAttribute('data-component', 'tags-wrapper'); 
            
            const innerContainer = document.createElement('div');
            innerContainer.id = containerId;
            innerContainer.setAttribute('data-component', 'tags-container'); 
            
            wrapper.appendChild(innerContainer);
            
            const triggerEl = document.querySelector(`[data-target="${triggerAttr}"]`);
            if (triggerEl) {
                const parentGroup = triggerEl.closest('.component-group-item');
                if (parentGroup) {
                    parentGroup.appendChild(wrapper);
                } else {
                    triggerEl.parentElement.appendChild(wrapper); // Plan B
                }
            }
        }

        const container = document.getElementById(containerId);
        if (!container) return; 

        container.innerHTML = '';
        arr.forEach(tag => {
            const pill = document.createElement('div');
            pill.className = 'tag-pill';
            
            pill.innerHTML = `
                <span class="tag-pill-text">${tag.name}</span>
                <span class="material-symbols-rounded tag-pill-remove" data-id="${tag.id}" data-type="${type}">close</span>
            `;

            container.appendChild(pill);
        });

        hiddenInput.value = JSON.stringify(arr.map(t => parseInt(t.id)));
    }

    renderFreeTags() {
        const hiddenInput = document.getElementById('hiddenTagsArray');
        
        if (!hiddenInput) {
            console.error("❌ [StudioTagsManager] No se encontró el input 'hiddenTagsArray' en el DOM.");
            return;
        }

        if (!hiddenInput.hasAttribute('name') || hiddenInput.getAttribute('name') !== 'tags') {
            hiddenInput.setAttribute('name', 'tags');
        }

        let wrapper = document.getElementById('freeTagsWrapper');

        if (this.selectedFreeTags.length === 0) {
            if (wrapper) wrapper.remove();
            hiddenInput.value = '[]';
            return;
        }

        if (!wrapper) {
            wrapper = document.createElement('div');
            wrapper.id = 'freeTagsWrapper';
            wrapper.setAttribute('data-component', 'tags-wrapper'); 
            
            const innerContainer = document.createElement('div');
            innerContainer.id = 'selectedFreeTagsContainer';
            innerContainer.setAttribute('data-component', 'tags-container'); 
            
            wrapper.appendChild(innerContainer);
            
            const inputEl = document.getElementById('freeTagsInput');
            if (inputEl) {
                const parentGroup = inputEl.closest('.component-group-item');
                if (parentGroup) {
                    parentGroup.appendChild(wrapper); // Plan A: Inyectar en el grupo principal
                } else {
                    console.warn("⚠️ [StudioTagsManager] Plan B: Inyectando badges junto al input.");
                    inputEl.parentElement.appendChild(wrapper); // Plan B: Inyectar junto al input
                }
            }
        }

        const container = document.getElementById('selectedFreeTagsContainer');
        if (!container) return; 

        container.innerHTML = '';
        this.selectedFreeTags.forEach(tagName => {
            const pill = document.createElement('div');
            pill.className = 'tag-pill';
            pill.style.border = '1px dashed var(--border-color)';
            pill.style.backgroundColor = 'transparent';
            
            pill.innerHTML = `
                <span class="material-symbols-rounded" style="font-size: 14px; margin-right: 4px; color: var(--text-secondary);">tag</span>
                <span class="tag-pill-text">${tagName}</span>
                <span class="material-symbols-rounded tag-pill-remove" data-name="${tagName}" data-type="free">close</span>
            `;

            container.appendChild(pill);
        });

        hiddenInput.value = JSON.stringify(this.selectedFreeTags);
    }

    attachEvents() {
        document.addEventListener('input', (e) => {
            if (e.target.classList.contains('tag-search-input')) {
                const term = e.target.value.toLowerCase().trim();
                const menu = e.target.closest('.component-menu');
                const list = menu.querySelector('.tag-results-list');
                
                if(list) {
                    list.querySelectorAll('.tag-option-link').forEach(item => {
                        const name = item.getAttribute('data-name').toLowerCase();
                        const isMatch = name.includes(term);
                        item.style.display = isMatch ? 'flex' : 'none';
                    });
                }
            }
        });

        document.addEventListener('keydown', (e) => {
            if (e.target.id === 'freeTagsInput') {
                if (e.key === 'Enter' || e.key === ',') {
                    e.preventDefault();
                    this.addFreeTag(e.target.value);
                    e.target.value = '';
                }
            }
        });

        // NUEVO: Auto-guardar la etiqueta si hace clic fuera del campo de texto
        document.addEventListener('focusout', (e) => {
            if (e.target.id === 'freeTagsInput') {
                if (e.target.value.trim() !== '') {
                    this.addFreeTag(e.target.value);
                    e.target.value = '';
                }
            }
        });

        document.addEventListener('click', (e) => {
            const toggleTagsBtn = e.target.closest('[data-action="toggleModule"]');
            if (toggleTagsBtn) {
                const target = toggleTagsBtn.getAttribute('data-target');
                const type = toggleTagsBtn.getAttribute('data-type');
                
                if (target === 'moduleTagsModels' || target === 'moduleTagsCategories') {
                    this.loadTagsData(target, type);
                    
                    const menu = document.querySelector(`[data-module="${target}"]`);
                    if (menu && menu.classList.contains('disabled')) {
                        const input = menu.querySelector('.tag-search-input');
                        if (input) {
                            input.value = '';
                            input.dispatchEvent(new Event('input', { bubbles: true }));
                        }
                    }
                }
            }

            const tagOption = e.target.closest('.tag-option-link');
            if (tagOption) {
                const id = tagOption.getAttribute('data-id');
                const name = tagOption.getAttribute('data-name');
                const type = tagOption.getAttribute('data-type');
                
                if (tagOption.classList.contains('active')) this.removeTag(id, type);
                else this.addTag(id, name, type);
                return;
            }

            const removePill = e.target.closest('.tag-pill-remove');
            if (removePill) {
                const type = removePill.getAttribute('data-type');
                if (type === 'free') {
                    const name = removePill.getAttribute('data-name');
                    this.removeFreeTag(name);
                } else {
                    const id = removePill.getAttribute('data-id');
                    this.removeTag(id, type);
                }
                return;
            }
        });
    }
}