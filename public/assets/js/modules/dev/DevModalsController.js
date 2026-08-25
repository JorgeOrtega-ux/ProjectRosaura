import { ModalTemplates } from '../../core/components/ModalTemplates.js';
import { showMessage, escapeHTML } from '../../core/utils/uiUtils.js';

class DevModalsController {
    constructor() {
        this.handleClickBound = this.handleClick.bind(this);
        this.handleInputBound = this.handleInput.bind(this);
        this.activeCategory = 'all';
        this.searchQuery = '';
        this.modalsList = [];
    }

    init() {
        this.buildCatalog();
        this.render();
        this.bindEvents();
    }

    destroy() {
        document.removeEventListener('click', this.handleClickBound);
        document.removeEventListener('input', this.handleInputBound);
    }

    bindEvents() {
        document.addEventListener('click', this.handleClickBound);
        document.addEventListener('input', this.handleInputBound);
    }

    getMockDataForModal(name) {
        const mocks = {
            setup2faModal: {
                secret: 'JBSWY3DPEHPK3PXP'
            },
            recoveryCodesDisplayModal: {
                recovery_codes: [
                    'A1B2-C3D4', 'E5F6-G7H8', 'I9J0-K1L2', 'M3N4-O5P6', 'Q7R8-S9T0',
                    'U1V2-W3X4', 'Y5Z6-A7B8', 'C9D0-E1F2', 'G3H4-I5J6', 'K7L8-M9N0'
                ]
            },
            confirmPasswordModal: {
                title: 'Confirmación de Seguridad',
                desc: 'Ingresa tu contraseña actual o verifica tu sesión de Google para autorizar esta acción.',
                confirmText: 'Confirmar acción'
            },
            changePasswordModal: {},
            welcomePremiumModal: {
                tier_name: 'Tier Élite',
                subscription_name: 'Rosaura Pro Max'
            },
            purchaseSuccessModal: {
                title: '¡Compra Realizada con Éxito!',
                desc: 'Tu suscripción Pro ha sido activada y tienes acceso inmediato a todas las funciones avanzadas.',
                item_name: 'Suscripción Rosaura Pro (1 mes)',
                amount: '$9.99 USD',
                date: '24/08/2026'
            },
            joinCanvasModal: {
                canvasName: 'Lienzo Creativo #42'
            },
            welcomeUserModal: {
                username: 'RosauraFan_99'
            },
            onboardingTourModal: {
                modalId: 'onboarding-tour-demo',
                steps: [
                    {
                        title: '¡Bienvenido al Lienzo!',
                        desc: 'Aprende a usar las herramientas principales para colaborar en tiempo real.',
                        icons: ['brush', 'palette', 'layers']
                    },
                    {
                        title: 'Gestión de Capas y Colores',
                        desc: 'Personaliza tu paleta de colores y guarda tus diseños favoritos.',
                        icons: ['auto_awesome', 'palette', 'star']
                    }
                ]
            },
            verifyEmailCode: {
                email: 'usuario_demo@ejemplo.com'
            },
            confirmRevokeAllDevices: {},
            roleForm: {
                name: 'Moderador de Lienzo',
                color: '#4285F4',
                weight: 50,
                nameValue: 'Moderador de Lienzo'
            },
            editRolePermissions: {
                roleId: 1,
                roleName: 'Diseñador Senior',
                permissionsListHtml: `
                    <div style="display: flex; flex-direction: column; gap: 8px; padding: 4px;">
                        <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
                            <input type="checkbox" checked>
                            <span>Dibujar y pintar en el lienzo</span>
                        </label>
                        <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
                            <input type="checkbox" checked>
                            <span>Acceso al chat en vivo</span>
                        </label>
                        <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
                            <input type="checkbox">
                            <span>Moderar miembros y sanciones</span>
                        </label>
                    </div>
                `
            },
            verifyPasswordDialog: {
                title: 'Verificación requerida',
                desc: 'Por favor confirma tu identidad para continuar.'
            },
            confirmDeleteAccountDialog: {},
            confirmDeleteAvatar: {},
            confirmClearAreaModal: {
                count: 144
            },
            confirmProtectAreaModal: {
                count: 64
            },
            offlineResizeModal: {
                currentSize: '64x64',
                userTier: 2,
                isOfflineMode: false,
                resizeActive: false,
                nextResizeAt: ''
            },
            offlineResetModal: {
                canTakeSnapshot: true,
                isOfflineMode: false,
                resetActive: false,
                nextResetAt: ''
            },
            imageViewer: {
                images: [
                    {
                        url: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?auto=format&fit=crop&w=800&q=80',
                        name: 'Arte Conceptual #1',
                        sender: 'Artista Digital',
                        date: '24/08/2026 18:30'
                    }
                ],
                initialIndex: 0
            }
        };

        return mocks[name] || {};
    }

    categorizeModal(name) {
        const lower = name.toLowerCase();
        if (lower.includes('2fa') || lower.includes('password') || lower.includes('security') || lower.includes('email') || lower.includes('device') || lower.includes('recovery')) {
            return 'security';
        }
        if (lower.includes('canvas') || lower.includes('area') || lower.includes('resize') || lower.includes('reset') || lower.includes('palette') || lower.includes('chat') || lower.includes('snapshot') || lower.includes('template')) {
            return 'canvas';
        }
        if (lower.includes('role') || lower.includes('permission') || lower.includes('user') || lower.includes('ban') || lower.includes('tier') || lower.includes('admin') || lower.includes('moderation')) {
            return 'admin';
        }
        if (lower.includes('purchase') || lower.includes('premium') || lower.includes('billing') || lower.includes('subscription')) {
            return 'billing';
        }
        if (lower.includes('confirm') || lower.includes('warning') || lower.includes('dialog') || lower.includes('alert')) {
            return 'dialogs';
        }
        return 'general';
    }

    buildCatalog() {
        const templates = window.modalSystem ? window.modalSystem.templates : ModalTemplates;
        this.modalsList = Object.keys(templates).map(name => {
            const tpl = templates[name] || {};
            const category = this.categorizeModal(name);
            const customBoxClass = tpl.customBoxClass || '';
            const is2Column = customBoxClass.includes('2fa-setup') || customBoxClass.includes('split') || name === 'setup2faModal' || name === 'recoveryCodesDisplayModal';
            
            return {
                name,
                category,
                customBoxClass,
                is2Column,
                hasMock: !!this.getMockDataForModal(name)
            };
        });
    }

    handleInput(e) {
        if (e.target && e.target.getAttribute('data-ref') === 'modal-search-input') {
            this.searchQuery = e.target.value.toLowerCase().trim();
            this.render();
        }
    }

    handleClick(e) {
        const catBtn = e.target.closest('[data-category]');
        if (catBtn) {
            document.querySelectorAll('[data-ref="modal-category-filters"] button').forEach(b => b.classList.remove('active'));
            catBtn.classList.add('active');
            this.activeCategory = catBtn.getAttribute('data-category');
            this.render();
            return;
        }

        const openBtn = e.target.closest('[data-action="testModal"]');
        if (openBtn) {
            const modalName = openBtn.getAttribute('data-modal-name');
            if (modalName && window.modalSystem) {
                const mockData = this.getMockDataForModal(modalName);
                window.modalSystem.show(modalName, mockData).then(res => {
                    console.log(`[ModalPlayground] Modal ${modalName} cerrado con resultado:`, res);
                });
            } else {
                showMessage('No se pudo abrir el modal solicitado', 'error');
            }
        }
    }

    render() {
        const grid = document.getElementById('dev-modals-grid');
        const countEl = document.querySelector('[data-ref="modal-total-count"]');
        if (!grid) return;

        const filtered = this.modalsList.filter(item => {
            const matchesCategory = (this.activeCategory === 'all' || item.category === this.activeCategory);
            const matchesSearch = !this.searchQuery || item.name.toLowerCase().includes(this.searchQuery) || item.category.toLowerCase().includes(this.searchQuery) || item.customBoxClass.toLowerCase().includes(this.searchQuery);
            return matchesCategory && matchesSearch;
        });

        if (countEl) {
            countEl.textContent = `${filtered.length} de ${this.modalsList.length} modales`;
        }

        if (filtered.length === 0) {
            grid.innerHTML = `
                <div class="component-card--grouped" style="grid-column: 1 / -1; padding: 32px; text-align: center;">
                    <span class="material-symbols-rounded" style="font-size: 3rem; color: var(--text-tertiary);">search_off</span>
                    <p style="margin-top: 8px; color: var(--text-secondary);">No se encontraron modales para el filtro actual.</p>
                </div>
            `;
            return;
        }

        const categoryLabels = {
            security: 'Seguridad & 2FA',
            canvas: 'Lienzo & Workspace',
            admin: 'Admin & Roles',
            billing: 'Facturación & Tienda',
            dialogs: 'Confirmación',
            general: 'General'
        };

        grid.innerHTML = filtered.map(item => {
            const catLabel = categoryLabels[item.category] || item.category;
            const badgeClassHtml = item.customBoxClass ? `<span class="component-badge component-badge--sm" title="Clase CSS personalizada">${escapeHTML(item.customBoxClass)}</span>` : `<span class="component-badge component-badge--sm" style="opacity: 0.6;">default-box</span>`;
            const splitBadgeHtml = item.is2Column ? `<span class="component-badge component-badge--sm component-badge--primary">Split 2 Columnas</span>` : '';

            return `
                <div class="component-card--grouped" style="padding: 16px; display: flex; flex-direction: column; justify-content: space-between; gap: 14px; border: 1px solid var(--border-color); border-radius: 12px; transition: border-color 0.2s ease;">
                    <div style="display: flex; flex-direction: column; gap: 8px;">
                        <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px;">
                            <span class="component-badge component-badge--sm" style="font-weight: 700; text-transform: uppercase; font-size: 0.65rem;">${catLabel}</span>
                            ${splitBadgeHtml}
                        </div>
                        <h3 style="margin: 0; font-size: 0.95rem; font-weight: 700; font-family: monospace; color: var(--text-primary); word-break: break-all;">
                            ${escapeHTML(item.name)}
                        </h3>
                        <div style="display: flex; gap: 6px; flex-wrap: wrap; margin-top: 4px;">
                            ${badgeClassHtml}
                        </div>
                    </div>

                    <div style="display: flex; align-items: center; justify-content: flex-end; margin-top: 8px; border-top: 1px solid var(--border-color); padding-top: 12px;">
                        <button type="button" class="component-button component-button--primary component-button--h36 component-button--full" data-action="testModal" data-modal-name="${escapeHTML(item.name)}">
                            <span class="material-symbols-rounded">visibility</span>
                            <span>Probar Modal</span>
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    }
}

export { DevModalsController };
