import { ApiRoutes } from '../api/ApiRoutes.js';
import { ApiService } from '../api/ApiServices.js';

// =========================================================================
// Constante de testing para forzar la visualización continua de los modales
// de introducción (Welcome y Onboarding Tours).
// Pon en true para probarlos siempre, o false para el comportamiento normal (1 sola vez).
// =========================================================================
export const TESTING_ONBOARDING_MODALS = true;
window.TESTING_ONBOARDING_MODALS = TESTING_ONBOARDING_MODALS;

export class OnboardingTourManager {
    constructor() {
        this.api = new ApiService();
        this.pendingWelcomeTimeout = null;
        this.pendingTourTimeout = null;
        
        this.tours = {
            '/canvases/manage': {
                modalId: 'onboarding-canvas-manage',
                flagKey: 'onboarding_canvas_manage_seen',
                steps: [
                    {
                        titleKey: 'onboarding_canvas_manage_step1_title',
                        defaultTitle: 'Consola de Lienzos',
                        descKey: 'onboarding_canvas_manage_step1_desc',
                        defaultDesc: 'Crea nuevos lienzos, duplícalos, configúralos o elimínalos.',
                        icons: ['dashboard']
                    },
                    {
                        titleKey: 'onboarding_canvas_manage_step2_title',
                        defaultTitle: 'Búsqueda y Filtros',
                        descKey: 'onboarding_canvas_manage_step2_desc',
                        defaultDesc: 'Usa la barra de búsqueda y los filtros para localizar lienzos específicos.',
                        icons: ['search', 'tune']
                    }
                ]
            },
            '/canvases/members/:uuid': {
                modalId: 'onboarding-canvas-members',
                flagKey: 'onboarding_canvas_members_seen',
                steps: [
                    {
                        titleKey: 'onboarding_canvas_members_step1_title',
                        defaultTitle: 'Colaboradores Activos',
                        descKey: 'onboarding_canvas_members_step1_desc',
                        defaultDesc: 'Verifica quién está colaborando, edita sus permisos asignándoles roles o desvincula cuentas.',
                        icons: ['group']
                    },
                    {
                        titleKey: 'onboarding_canvas_members_step2_title',
                        defaultTitle: 'Moderación',
                        descKey: 'onboarding_canvas_members_step2_desc',
                        defaultDesc: 'Restringe el acceso o suspende miembros que infrinjan las normas.',
                        icons: ['gavel']
                    }
                ]
            },
            '/canvases/manage/resets/:uuid': {
                modalId: 'onboarding-canvas-resets',
                flagKey: 'onboarding_canvas_resets_seen',
                steps: [
                    {
                        titleKey: 'onboarding_canvas_resets_step1_title',
                        defaultTitle: 'Mantenimiento del Lienzo',
                        descKey: 'onboarding_canvas_resets_step1_desc',
                        defaultDesc: 'Útil para iniciar nuevas temporadas de dibujo o limpiar trazos inapropiados.',
                        icons: ['restart_alt']
                    },
                    {
                        titleKey: 'onboarding_canvas_resets_step2_title',
                        defaultTitle: 'Opciones de Limpieza',
                        descKey: 'onboarding_canvas_resets_step2_desc',
                        defaultDesc: 'Elige si deseas limpiar todo, o solo píxeles de usuarios específicos.',
                        icons: ['delete']
                    }
                ]
            },
            '/canvases/manage/resize/:uuid': {
                modalId: 'onboarding-canvas-resize',
                flagKey: 'onboarding_canvas_resize_seen',
                steps: [
                    {
                        titleKey: 'onboarding_canvas_resize_step1_title',
                        defaultTitle: 'Redimensionar Lienzo',
                        descKey: 'onboarding_canvas_resize_step1_desc',
                        defaultDesc: 'Aumenta la cuadrícula del lienzo para permitir construcciones más grandes.',
                        icons: ['aspect_ratio']
                    },
                    {
                        titleKey: 'onboarding_canvas_resize_step2_title',
                        defaultTitle: 'Límites del Servidor',
                        descKey: 'onboarding_canvas_resize_step2_desc',
                        defaultDesc: 'Ten en cuenta que redimensionar un lienzo puede afectar el rendimiento.',
                        icons: ['grid_view']
                    }
                ]
            },
            '/canvases/manage/roles/:uuid': {
                modalId: 'onboarding-canvas-roles',
                flagKey: 'onboarding_canvas_roles_seen',
                steps: [
                    {
                        titleKey: 'onboarding_canvas_roles_step1_title',
                        defaultTitle: 'Roles y Jerarquía',
                        descKey: 'onboarding_canvas_roles_step1_desc',
                        defaultDesc: 'Crea roles personalizados y define su peso jerárquico para proteger la administración.',
                        icons: ['shield_person']
                    },
                    {
                        titleKey: 'onboarding_canvas_roles_step2_title',
                        defaultTitle: 'Configurar Permisos',
                        descKey: 'onboarding_canvas_roles_step2_desc',
                        defaultDesc: 'Asigna permisos específicos como pintar, usar chat, crear invitaciones o expulsar colaboradores.',
                        icons: ['checklist']
                    }
                ]
            },
            '/canvases/manage/invites/:uuid': {
                modalId: 'onboarding-canvas-invites',
                flagKey: 'onboarding_canvas_invites_seen',
                steps: [
                    {
                        titleKey: 'onboarding_canvas_invites_step1_title',
                        defaultTitle: 'Invitaciones Dinámicas',
                        descKey: 'onboarding_canvas_invites_step1_desc',
                        defaultDesc: 'Genera códigos y enlaces únicos de invitación para colaboradores.',
                        icons: ['link']
                    },
                    {
                        titleKey: 'onboarding_canvas_invites_step2_title',
                        defaultTitle: 'Control de Usos y Expiración',
                        descKey: 'onboarding_canvas_invites_step2_desc',
                        defaultDesc: 'Establece límites de uso máximo o una fecha de caducidad para el código.',
                        icons: ['schedule']
                    }
                ]
            },
            '/canvases/manage/sanctions/:uuid': {
                modalId: 'onboarding-canvas-sanctions',
                flagKey: 'onboarding_canvas_sanctions_seen',
                steps: [
                    {
                        titleKey: 'onboarding_canvas_sanctions_step1_title',
                        defaultTitle: 'Control y Moderación',
                        descKey: 'onboarding_canvas_sanctions_step1_desc',
                        defaultDesc: 'Visualiza todas las cuentas restringidas o baneadas del lienzo y administra sus sanciones.',
                        icons: ['gavel']
                    },
                    {
                        titleKey: 'onboarding_canvas_sanctions_step2_title',
                        defaultTitle: 'Sancionar y Perdonar',
                        descKey: 'onboarding_canvas_sanctions_step2_desc',
                        defaultDesc: 'Aplica restricciones temporales o permanentes y levanta sanciones ingresando tu contraseña.',
                        icons: ['key', 'gavel']
                    }
                ]
            },
            '/canvases/manage/requests/:uuid': {
                modalId: 'onboarding-canvas-requests',
                flagKey: 'onboarding_canvas_requests_seen',
                steps: [
                    {
                        titleKey: 'onboarding_canvas_requests_step1_title',
                        defaultTitle: 'Aprobación de Miembros',
                        descKey: 'onboarding_canvas_requests_step1_desc',
                        defaultDesc: 'Para lienzos privados, revisa la lista de usuarios interesados en unirse.',
                        icons: ['person_add']
                    },
                    {
                        titleKey: 'onboarding_canvas_requests_step2_title',
                        defaultTitle: 'Aceptar o Denegar Miembros',
                        descKey: 'onboarding_canvas_requests_step2_desc',
                        defaultDesc: 'Selecciona solicitudes de la lista y aprueba o rechaza el acceso en lote.',
                        icons: ['group_add']
                    }
                ]
            }
        };
    }

    isTestingMode() {
        if (typeof window.TESTING_ONBOARDING_MODALS !== 'undefined') {
            return !!window.TESTING_ONBOARDING_MODALS;
        }
        return !!TESTING_ONBOARDING_MODALS;
    }

    cancelPendingTours() {
        if (this.pendingWelcomeTimeout) {
            clearTimeout(this.pendingWelcomeTimeout);
            this.pendingWelcomeTimeout = null;
        }
        if (this.pendingTourTimeout) {
            clearTimeout(this.pendingTourTimeout);
            this.pendingTourTimeout = null;
        }
    }

    async triggerWelcomeTour() {
        if (!window.modalSystem || !window.APP_USER || !window.activeUserId) return;

        const isTesting = this.isTestingMode();
        const flagKey = 'welcome_modal_seen';
        const hasSeen = window.AppUserFlags && window.AppUserFlags.includes(flagKey);

        if (!isTesting && hasSeen) {
            return;
        }

        if (this.pendingWelcomeTimeout) {
            clearTimeout(this.pendingWelcomeTimeout);
            this.pendingWelcomeTimeout = null;
        }

        this.pendingWelcomeTimeout = setTimeout(async () => {
            this.pendingWelcomeTimeout = null;
            const result = await window.modalSystem.show('welcomeUserModal');
            if (result && result.confirmed) {
                if (!isTesting) {
                    this.markTourAsSeen(flagKey);
                }
            }
        }, 500);
    }

    async triggerTour(relativePath) {
        const rawConfig = this.tours[relativePath];
        if (!rawConfig) return;

        const isTesting = this.isTestingMode();
        const hasSeen = window.AppUserFlags && window.AppUserFlags.includes(rawConfig.flagKey);

        if (!isTesting && hasSeen) {
            return;
        }

        // Traducir los textos dinámicamente usando la función de traducción global
        const tourConfig = {
            modalId: rawConfig.modalId,
            flagKey: rawConfig.flagKey,
            steps: rawConfig.steps.map(step => {
                const title = (typeof window.__ === 'function') ? window.__(step.titleKey) : step.defaultTitle;
                const description = (typeof window.__ === 'function') ? window.__(step.descKey) : step.defaultDesc;
                const icons = step.icons || ['info'];
                return { title, description, icons };
            })
        };

        if (this.pendingTourTimeout) {
            clearTimeout(this.pendingTourTimeout);
            this.pendingTourTimeout = null;
        }

        if (window.modalSystem) {
            this.pendingTourTimeout = setTimeout(async () => {
                this.pendingTourTimeout = null;
                const result = await window.modalSystem.show('onboardingTourModal', tourConfig);
                if (result && result.confirmed) {
                    if (!isTesting) {
                        this.markTourAsSeen(rawConfig.flagKey);
                    }
                }
            }, 500); // 500ms delay to ensure DOM is ready and visual transitions are smooth
        }
    }

    async markTourAsSeen(flagKey) {
        if (window.AppUserFlags && !window.AppUserFlags.includes(flagKey)) {
            window.AppUserFlags.push(flagKey);
        }

        try {
            const apiRoute = ApiRoutes.Settings && ApiRoutes.Settings.SetFlag ? ApiRoutes.Settings.SetFlag : 'settings.set_flag';
            await this.api.post(apiRoute, { flag_key: flagKey });
        } catch (e) {
            console.warn('[OnboardingTourManager] Error persisting tour seen flag:', e);
        }
    }
}
