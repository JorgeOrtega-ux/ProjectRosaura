export class StudioTagsManager {
    constructor(api, state, onTagsChangedCallback) {
        this.api = api;
        this.state = state;
        this.onTagsChanged = onTagsChangedCallback;
        this.selectedModels = [];
        this.selectedCategories = [];
        this.attachEvents();
    }

    setInitialTags(tags) {
        this.selectedModels = [];
        this.selectedCategories = [];
        if (tags && Array.isArray(tags)) {
            tags.forEach(tag => {
                const isNew = tag.is_official === 0 || tag.is_official === "0";
                if (tag.type === 'modelo') this.selectedModels.push({...tag, isNew: isNew});
                else if (tag.type === 'category') this.selectedCategories.push({...tag, isNew: isNew});
            });
        }
        this.renderSelectedTags('modelo');
        this.renderSelectedTags('category');
    }

    getModelsIds() {
        return this.selectedModels.map(t => t.isNew ? t.name : parseInt(t.id));
    }

    getCategoriesIds() {
        return this.selectedCategories.map(t => t.isNew ? t.name : parseInt(t.id));
    }

    async toggleTagsMenu(menu, type) {
        const isClosing = menu.classList.contains('active');
        
        document.querySelectorAll('.component-module[id$="SelectorMenu"]').forEach(m => {
            if (m !== menu) {
                m.classList.remove('active');
                m.classList.add('disabled');
            }
        });

        if (isClosing) {
            menu.classList.remove('active');
            menu.classList.add('disabled');
            return;
        }

        menu.classList.remove('disabled');
        menu.classList.add('active');
        
        const list = menu.querySelector('.tag-results-list');
        const input = menu.querySelector('.tag-search-input');
        if (input) input.value = ''; 
        
        list.innerHTML = '<div style="padding: 16px; text-align: center; color: var(--text-secondary);"><span class="material-symbols-rounded">sync</span> Cargando...</div>';

        try {
            const res = type === 'modelo' ? await this.api.fetchModels() : await this.api.fetchCategories();
            
            if (res.status === 'success') {
                list.innerHTML = '';
                const currentSelection = type === 'modelo' ? this.selectedModels : this.selectedCategories;
                const currentIds = currentSelection.map(t => t.isNew ? t.name : parseInt(t.id));

                if (res.data.length === 0) {
                    list.innerHTML = '<div style="padding: 16px; text-align: center; color: var(--text-secondary); font-size: 13px;">No hay opciones oficiales. Escribe para crear una local.</div>';
                    return;
                }

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
            } else {
                list.innerHTML = `<div style="padding: 16px; color: red;">Error: ${res.message}</div>`;
            }
        } catch (error) {
            list.innerHTML = '<div style="padding: 16px; color: red;">Error de red</div>';
        }
    }

    addTag(id, name, type, isNew = false) {
        const arr = type === 'modelo' ? this.selectedModels : this.selectedCategories;
        
        if (type === 'modelo' && arr.length >= 25) { alert("Has alcanzado el límite máximo de 25 modelos por video."); return; }
        if (type === 'category' && arr.length >= 50) { alert("Has alcanzado el límite máximo de 50 categorías por video."); return; }
        
        if (!arr.find(t => t.name.toLowerCase() === name.toLowerCase())) {
            arr.push({ id, name, type, isNew });
            this.renderSelectedTags(type);
            
            const menuId = type === 'modelo' ? 'modelsSelectorMenu' : 'categoriesSelectorMenu';
            const menu = document.getElementById(menuId);
            
            if (menu) {
                const input = menu.querySelector('.tag-search-input');
                if (input) {
                    input.value = '';
                    input.dispatchEvent(new Event('input', { bubbles: true }));
                }
            }
            
            const option = document.querySelector(`#${menuId} .tag-option-link[data-id="${id}"]`);
            if (option) option.classList.add('active');
            
            if(this.onTagsChanged) this.onTagsChanged();
        }
    }

    removeTag(id, type) {
        if (type === 'modelo') this.selectedModels = this.selectedModels.filter(t => String(t.id) !== String(id));
        else this.selectedCategories = this.selectedCategories.filter(t => String(t.id) !== String(id));
        
        this.renderSelectedTags(type);
        if(this.onTagsChanged) this.onTagsChanged();

        const menuId = type === 'modelo' ? 'modelsSelectorMenu' : 'categoriesSelectorMenu';
        const option = document.querySelector(`#${menuId} .tag-option-link[data-id="${id}"]`);
        if (option) option.classList.remove('active');
    }

    renderSelectedTags(type) {
        const arr = type === 'modelo' ? this.selectedModels : this.selectedCategories;
        const hiddenId = type === 'modelo' ? 'hiddenModelsArray' : 'hiddenCategoriesArray';
        const wrapperId = type === 'modelo' ? 'modelsTagsWrapper' : 'categoriesTagsWrapper';
        const containerId = type === 'modelo' ? 'selectedModelsContainer' : 'selectedCategoriesContainer';
        const triggerAttr = type === 'modelo' ? 'modelsSelectorMenu' : 'categoriesSelectorMenu';

        const hiddenInput = document.getElementById(hiddenId);
        if (!hiddenInput) return;

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
                if (parentGroup) parentGroup.appendChild(wrapper);
            }
        }

        const container = document.getElementById(containerId);
        if (!container) return; 

        container.innerHTML = '';
        arr.forEach(tag => {
            const pill = document.createElement('div');
            pill.className = 'tag-pill';
            
            const iconHtml = tag.isNew 
                ? '<span class="material-symbols-rounded" style="font-size: 14px; margin-right: 4px; color: var(--accent-color);" title="Etiqueta local (Sólo para este video)">push_pin</span>' 
                : '';
                
            pill.innerHTML = `
                ${iconHtml}
                <span class="tag-pill-text">${tag.name}</span>
                <span class="material-symbols-rounded tag-pill-remove" data-id="${tag.id}" data-type="${type}">close</span>
            `;

            if (tag.isNew) {
                pill.style.border = '1px dashed var(--border-color)';
                pill.style.backgroundColor = 'transparent';
            }

            container.appendChild(pill);
        });

        hiddenInput.value = JSON.stringify(arr.map(t => t.isNew ? t.name : parseInt(t.id)));
    }

    attachEvents() {
        document.addEventListener('input', (e) => {
            if (e.target.classList.contains('tag-search-input')) {
                const term = e.target.value.toLowerCase().trim();
                const menu = e.target.closest('.component-menu');
                const list = menu.querySelector('.tag-results-list');
                
                if(list) {
                    let exactMatch = false;
                    list.querySelectorAll('.tag-option-link:not(.tag-create-link)').forEach(item => {
                        const name = item.getAttribute('data-name').toLowerCase();
                        const isMatch = name.includes(term);
                        item.style.display = isMatch ? 'flex' : 'none';
                        if (name === term) exactMatch = true;
                    });

                    const existingCreateBtn = list.querySelector('.tag-create-link');
                    if (existingCreateBtn) existingCreateBtn.remove();

                    if (term.length > 0 && !exactMatch) {
                        const isModels = e.target.closest('#modelsSelectorMenu') !== null;
                        const type = isModels ? 'modelo' : 'category';
                        const originalTerm = e.target.value.trim();
                        
                        const createBtn = document.createElement('div');
                        createBtn.className = 'component-menu-link tag-option-link tag-create-link';
                        createBtn.setAttribute('data-id', 'new_' + Date.now()); 
                        createBtn.setAttribute('data-name', originalTerm);
                        createBtn.setAttribute('data-type', type);
                        createBtn.setAttribute('data-is-new', 'true');
                        
                        createBtn.innerHTML = `
                            <div class="component-menu-link-icon" style="color: var(--accent-color);"><span class="material-symbols-rounded">add_box</span></div>
                            <div class="component-menu-link-text">
                                <span style="display:block; line-height:1.2;">Crear "<b>${originalTerm}</b>"</span>
                                <span style="font-size: 11px; color: var(--text-secondary);">Etiqueta local (sólo para este video)</span>
                            </div>
                        `;
                        list.appendChild(createBtn);
                    }
                }
            }
        });

        document.addEventListener('click', (e) => {
            const toggleTagsBtn = e.target.closest('[data-action="toggleStudioTags"]');
            if (toggleTagsBtn) {
                const visMenu = document.getElementById('visibilitySelectorMenu');
                if(visMenu) { visMenu.classList.remove('active'); visMenu.classList.add('disabled'); }

                const targetId = toggleTagsBtn.getAttribute('data-target');
                const type = toggleTagsBtn.getAttribute('data-type');
                const menu = document.getElementById(targetId);
                if (menu) this.toggleTagsMenu(menu, type);
                return; 
            }

            const tagOption = e.target.closest('.tag-option-link');
            if (tagOption) {
                const id = tagOption.getAttribute('data-id');
                const name = tagOption.getAttribute('data-name');
                const type = tagOption.getAttribute('data-type');
                const isNew = tagOption.getAttribute('data-is-new') === 'true';
                
                if (tagOption.classList.contains('active')) this.removeTag(id, type);
                else this.addTag(id, name, type, isNew);
                return;
            }

            const removePill = e.target.closest('.tag-pill-remove');
            if (removePill) {
                const id = removePill.getAttribute('data-id');
                const type = removePill.getAttribute('data-type');
                this.removeTag(id, type);
                return;
            }
        });
    }
}