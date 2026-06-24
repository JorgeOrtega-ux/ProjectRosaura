// public/assets/js/modules/canvases/LocationSelectors.js

import { ApiRoutes } from '../../core/api/ApiRoutes.js';
import { ApiService } from '../../core/api/ApiServices.js';

class LocationSelectors {
    constructor() {
        this.api = new ApiService();
        
        // Elementos DOM
        this.selectScopeType = document.querySelector('[data-ref="select-scope-type"]');
        this.containerLocations = document.querySelector('[data-ref="scope-locations-container"]');
        this.containerOrg = document.querySelector('[data-ref="scope-organization-container"]');
        
        this.selectCountry = document.querySelector('[data-ref="select-scope-country"]');
        this.selectState = document.querySelector('[data-ref="select-scope-state"]');
        this.selectCity = document.querySelector('[data-ref="select-scope-city"]');
        
        this.wrapperState = document.querySelector('[data-ref="wrapper-scope-state"]');
        this.wrapperCity = document.querySelector('[data-ref="wrapper-scope-city"]');

        this.abortController = new AbortController();
        this.isInitialized = false;

        this.bindEvents();
    }

    init() {
        if (this.isInitialized || !this.selectScopeType) return;
        this.isInitialized = true;
        // Solo cargar países si el scope actual lo requiere
        this.handleScopeChange();
    }

    destroy() {
        if (this.abortController) this.abortController.abort();
        this.isInitialized = false;
    }

    bindEvents() {
        if (!this.selectScopeType) return;

        this.selectScopeType.addEventListener('change', () => this.handleScopeChange());
        this.selectCountry.addEventListener('change', () => this.handleCountryChange());
        this.selectState.addEventListener('change', () => this.handleStateChange());
    }

    handleScopeChange() {
        const type = this.selectScopeType.value;
        
        // Resetear visibilidad
        this.containerLocations.style.display = 'none';
        this.containerOrg.style.display = 'none';
        this.wrapperState.style.display = 'none';
        this.wrapperCity.style.display = 'none';

        if (type === 'personal' || type === 'global') {
            // No requiere campos adicionales
        } else if (type === 'organization') {
            this.containerOrg.style.display = 'block';
        } else {
            // Es country, state o municipality
            this.containerLocations.style.display = 'flex';
            this.loadCountries();

            if (type === 'state' || type === 'municipality') {
                this.wrapperState.style.display = 'block';
            }
            if (type === 'municipality') {
                this.wrapperCity.style.display = 'block';
            }
        }
    }

    async loadCountries() {
        if (this.selectCountry.options.length > 1) return; // Ya están cargados
        
        try {
            this.selectCountry.innerHTML = '<option value="">Cargando países...</option>';
            const result = await this.api.get(ApiRoutes.Locations.GetCountries, {}, this.abortController.signal);
            
            if (result && result.success) {
                this.selectCountry.innerHTML = '<option value="">Selecciona un País...</option>';
                result.data.forEach(country => {
                    const option = document.createElement('option');
                    option.value = country.name;
                    option.dataset.id = country.id;
                    option.textContent = country.name;
                    this.selectCountry.appendChild(option);
                });
            } else {
                this.selectCountry.innerHTML = '<option value="">Error al cargar</option>';
            }
        } catch (error) {
            if (error.name !== 'AbortError') console.error('Error fetching countries:', error);
        }
    }

    async handleCountryChange() {
        const selectedOption = this.selectCountry.options[this.selectCountry.selectedIndex];
        const countryId = selectedOption ? selectedOption.dataset.id : null;
        
        this.selectState.innerHTML = '<option value="">Selecciona un Estado...</option>';
        this.selectCity.innerHTML = '<option value="">Selecciona un Municipio...</option>';
        
        if (!countryId) return;

        try {
            this.selectState.innerHTML = '<option value="">Cargando estados...</option>';
            const result = await this.api.get(`${ApiRoutes.Locations.GetStates}?id=${countryId}`, {}, this.abortController.signal);
            
            if (result && result.success) {
                this.selectState.innerHTML = '<option value="">Selecciona un Estado...</option>';
                result.data.forEach(state => {
                    const option = document.createElement('option');
                    option.value = state.name;
                    option.dataset.id = state.id;
                    option.textContent = state.name;
                    this.selectState.appendChild(option);
                });
            } else {
                this.selectState.innerHTML = '<option value="">Error al cargar</option>';
            }
        } catch (error) {
            if (error.name !== 'AbortError') console.error('Error fetching states:', error);
        }
    }

    async handleStateChange() {
        const selectedOption = this.selectState.options[this.selectState.selectedIndex];
        const stateId = selectedOption ? selectedOption.dataset.id : null;
        
        this.selectCity.innerHTML = '<option value="">Selecciona un Municipio...</option>';
        
        if (!stateId) return;

        try {
            this.selectCity.innerHTML = '<option value="">Cargando municipios...</option>';
            const result = await this.api.get(`${ApiRoutes.Locations.GetCities}?id=${stateId}`, {}, this.abortController.signal);
            
            if (result && result.success) {
                this.selectCity.innerHTML = '<option value="">Selecciona un Municipio...</option>';
                result.data.forEach(city => {
                    const option = document.createElement('option');
                    option.value = city.name;
                    option.dataset.id = city.id;
                    option.textContent = city.name;
                    this.selectCity.appendChild(option);
                });
            } else {
                this.selectCity.innerHTML = '<option value="">Error al cargar</option>';
            }
        } catch (error) {
            if (error.name !== 'AbortError') console.error('Error fetching cities:', error);
        }
    }
}

export { LocationSelectors };