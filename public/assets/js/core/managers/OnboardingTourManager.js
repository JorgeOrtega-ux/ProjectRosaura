import { ApiRoutes } from '../api/ApiRoutes.js';
import { ApiService } from '../api/ApiService.js';

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
            },
            '/design/:id': {
                modalId: 'onboarding-canvas-studio',
                flagKey: 'onboarding_canvas_studio_seen',
                steps: [
                    {
                        titleKey: 'onboarding_canvas_studio_step1_title',
                        defaultTitle: 'Herramientas de dibujo y paleta',
                        descKey: 'onboarding_canvas_studio_step1_desc',
                        defaultDesc: 'Utilice el lápiz, borrador, cuentagotas y el selector de colores para pintar sobre la cuadrícula. Puede hacer zoom y desplazarse libremente.',
                        icons: ['brush', 'palette']
                    },
                    {
                        titleKey: 'onboarding_canvas_studio_step2_title',
                        defaultTitle: 'Colaboración en vivo y chat',
                        descKey: 'onboarding_canvas_studio_step2_desc',
                        defaultDesc: 'Observe los trazos de otros colaboradores en tiempo real y comuníquese mediante el chat integrado de la sala.',
                        icons: ['group', 'chat']
                    },
                    {
                        titleKey: 'onboarding_canvas_studio_step3_title',
                        defaultTitle: 'Snapshots y atajos',
                        descKey: 'onboarding_canvas_studio_step3_desc',
                        defaultDesc: 'Guarde instantáneas de su progreso para generar timelapses automáticos y utilice atajos de teclado para mayor agilidad.',
                        icons: ['photo_camera', 'keyboard']
                    }
                ]
            },
            '/design': {
                modalId: 'onboarding-canvas-studio',
                flagKey: 'onboarding_canvas_studio_seen',
                steps: [
                    {
                        titleKey: 'onboarding_canvas_studio_step1_title',
                        defaultTitle: 'Herramientas de dibujo y paleta',
                        descKey: 'onboarding_canvas_studio_step1_desc',
                        defaultDesc: 'Utilice el lápiz, borrador, cuentagotas y el selector de colores para pintar sobre la cuadrícula. Puede hacer zoom y desplazarse libremente.',
                        icons: ['brush', 'palette']
                    },
                    {
                        titleKey: 'onboarding_canvas_studio_step2_title',
                        defaultTitle: 'Colaboración en vivo y chat',
                        descKey: 'onboarding_canvas_studio_step2_desc',
                        defaultDesc: 'Observe los trazos de otros colaboradores en tiempo real y comuníquese mediante el chat integrado de la sala.',
                        icons: ['group', 'chat']
                    },
                    {
                        titleKey: 'onboarding_canvas_studio_step3_title',
                        defaultTitle: 'Snapshots y atajos',
                        descKey: 'onboarding_canvas_studio_step3_desc',
                        defaultDesc: 'Guarde instantáneas de su progreso para generar timelapses automáticos y utilice atajos de teclado para mayor agilidad.',
                        icons: ['photo_camera', 'keyboard']
                    }
                ]
            },
            '/design/s/:uuid': {
                modalId: 'onboarding-snapshots-gallery',
                flagKey: 'onboarding_snapshots_gallery_seen',
                steps: [
                    {
                        titleKey: 'onboarding_snapshots_gallery_step1_title',
                        defaultTitle: 'Línea temporal del lienzo',
                        descKey: 'onboarding_snapshots_gallery_step1_desc',
                        defaultDesc: 'Visualice las capturas guardadas automática o manualmente a lo largo del tiempo para apreciar la evolución del dibujo.',
                        icons: ['history', 'photo_library']
                    },
                    {
                        titleKey: 'onboarding_snapshots_gallery_step2_title',
                        defaultTitle: 'Reproducción y exportación',
                        descKey: 'onboarding_snapshots_gallery_step2_desc',
                        defaultDesc: 'Reproduzca el timelapse animado paso a paso de la creación del arte y expórtelo en video o compártalo con otros usuarios.',
                        icons: ['movie', 'share']
                    }
                ]
            },
            '/canvases/create': {
                modalId: 'onboarding-canvas-create',
                flagKey: 'onboarding_canvas_create_seen',
                steps: [
                    {
                        titleKey: 'onboarding_canvas_create_step1_title',
                        defaultTitle: 'Dimensiones y paleta base',
                        descKey: 'onboarding_canvas_create_step1_desc',
                        defaultDesc: 'Seleccione el tamaño de la cuadrícula y la paleta de colores inicial que estará disponible para todos los colaboradores.',
                        icons: ['grid_view', 'palette']
                    },
                    {
                        titleKey: 'onboarding_canvas_create_step2_title',
                        defaultTitle: 'Privacidad y tiempos de espera',
                        descKey: 'onboarding_canvas_create_step2_desc',
                        defaultDesc: 'Establezca si el lienzo será público o privado, el límite de participantes y el cooldown entre colocación de píxeles.',
                        icons: ['lock', 'timer']
                    }
                ]
            },
            '/canvases/trash': {
                modalId: 'onboarding-canvas-trash',
                flagKey: 'onboarding_canvas_trash_seen',
                steps: [
                    {
                        titleKey: 'onboarding_canvas_trash_step1_title',
                        defaultTitle: 'Retención de 30 días',
                        descKey: 'onboarding_canvas_trash_step1_desc',
                        defaultDesc: 'Los lienzos enviados a la papelera se conservan de forma segura durante 30 días antes de su eliminación permanente.',
                        icons: ['delete', 'schedule']
                    },
                    {
                        titleKey: 'onboarding_canvas_trash_step2_title',
                        defaultTitle: 'Restauración inmediata',
                        descKey: 'onboarding_canvas_trash_step2_desc',
                        defaultDesc: 'Restaure cualquier lienzo con todos sus píxeles, roles, miembros e historial intactos con solo un clic.',
                        icons: ['restore_from_trash', 'check_circle']
                    }
                ]
            },
            '/trash': {
                modalId: 'onboarding-canvas-trash',
                flagKey: 'onboarding_canvas_trash_seen',
                steps: [
                    {
                        titleKey: 'onboarding_canvas_trash_step1_title',
                        defaultTitle: 'Retención de 30 días',
                        descKey: 'onboarding_canvas_trash_step1_desc',
                        defaultDesc: 'Los lienzos enviados a la papelera se conservan de forma segura durante 30 días antes de su eliminación permanente.',
                        icons: ['delete', 'schedule']
                    },
                    {
                        titleKey: 'onboarding_canvas_trash_step2_title',
                        defaultTitle: 'Restauración inmediata',
                        descKey: 'onboarding_canvas_trash_step2_desc',
                        defaultDesc: 'Restaure cualquier lienzo con todos sus píxeles, roles, miembros e historial intactos con solo un clic.',
                        icons: ['restore_from_trash', 'check_circle']
                    }
                ]
            },
            '/admin/dashboard': {
                modalId: 'onboarding-admin-dashboard',
                flagKey: 'onboarding_admin_dashboard_seen',
                steps: [
                    {
                        titleKey: 'onboarding_admin_dashboard_step1_title',
                        defaultTitle: 'Métricas del sistema',
                        descKey: 'onboarding_admin_dashboard_step1_desc',
                        defaultDesc: 'Supervise en tiempo real el tráfico de la plataforma, conexiones activas, consumo de almacenamiento y estado de la infraestructura.',
                        icons: ['dashboard', 'monitoring']
                    },
                    {
                        titleKey: 'onboarding_admin_dashboard_step2_title',
                        defaultTitle: 'Monitoreo y accesos rápidos',
                        descKey: 'onboarding_admin_dashboard_step2_desc',
                        defaultDesc: 'Navegue rápidamente a las secciones críticas de moderación, auditoría de eventos y tareas de mantenimiento del servidor.',
                        icons: ['tune', 'speed']
                    }
                ]
            },
            '/admin': {
                modalId: 'onboarding-admin-dashboard',
                flagKey: 'onboarding_admin_dashboard_seen',
                steps: [
                    {
                        titleKey: 'onboarding_admin_dashboard_step1_title',
                        defaultTitle: 'Métricas del sistema',
                        descKey: 'onboarding_admin_dashboard_step1_desc',
                        defaultDesc: 'Supervise en tiempo real el tráfico de la plataforma, conexiones activas, consumo de almacenamiento y estado de la infraestructura.',
                        icons: ['dashboard', 'monitoring']
                    },
                    {
                        titleKey: 'onboarding_admin_dashboard_step2_title',
                        defaultTitle: 'Monitoreo y accesos rápidos',
                        descKey: 'onboarding_admin_dashboard_step2_desc',
                        defaultDesc: 'Navegue rápidamente a las secciones críticas de moderación, auditoría de eventos y tareas de mantenimiento del servidor.',
                        icons: ['tune', 'speed']
                    }
                ]
            },
            '/admin/users': {
                modalId: 'onboarding-admin-users',
                flagKey: 'onboarding_admin_users_seen',
                steps: [
                    {
                        titleKey: 'onboarding_admin_users_step1_title',
                        defaultTitle: 'Búsqueda y expediente',
                        descKey: 'onboarding_admin_users_step1_desc',
                        defaultDesc: 'Consulte la lista de usuarios registrados, filtre por rol o estado y acceda al historial de cambios de perfil y compras realizadas.',
                        icons: ['manage_accounts', 'history_edu']
                    },
                    {
                        titleKey: 'onboarding_admin_users_step2_title',
                        defaultTitle: 'Sanciones y jerarquía',
                        descKey: 'onboarding_admin_users_step2_desc',
                        defaultDesc: 'Aplique suspensiones temporales o definitivas, edite perfiles y asigne roles respetando la jerarquía de pesos de seguridad.',
                        icons: ['gavel', 'shield_person']
                    }
                ]
            },
            '/admin/backups': {
                modalId: 'onboarding-admin-backups',
                flagKey: 'onboarding_admin_backups_seen',
                steps: [
                    {
                        titleKey: 'onboarding_admin_backups_step1_title',
                        defaultTitle: 'Copias de seguridad cifradas',
                        descKey: 'onboarding_admin_backups_step1_desc',
                        defaultDesc: 'Genere respaldos manuales o programados de las bases de datos relacionales, NoSQL y archivos multimedia con cifrado AES.',
                        icons: ['backup', 'lock']
                    },
                    {
                        titleKey: 'onboarding_admin_backups_step2_title',
                        defaultTitle: 'Restauración del sistema',
                        descKey: 'onboarding_admin_backups_step2_desc',
                        defaultDesc: 'Restaure esquemas específicos de forma segura mediante workers en segundo plano con activación automática de modo mantenimiento.',
                        icons: ['settings_backup_restore', 'warning']
                    }
                ]
            },
            '/admin/advertisements': {
                modalId: 'onboarding-admin-ads',
                flagKey: 'onboarding_admin_ads_seen',
                steps: [
                    {
                        titleKey: 'onboarding_admin_ads_step1_title',
                        defaultTitle: 'Proveedores y campañas',
                        descKey: 'onboarding_admin_ads_step1_desc',
                        defaultDesc: 'Administre proveedores de anuncios, formatos de banners e intersticiales y active o pause campañas publicitarias.',
                        icons: ['campaign', 'ad_units']
                    },
                    {
                        titleKey: 'onboarding_admin_ads_step2_title',
                        defaultTitle: 'Métricas y reportes PDF',
                        descKey: 'onboarding_admin_ads_step2_desc',
                        defaultDesc: 'Analice impresiones, clics y porcentaje de interacción (CTR) en distintos períodos y descargue informes formales en PDF.',
                        icons: ['analytics', 'picture_as_pdf']
                    }
                ]
            },
            '/admin/messages': {
                modalId: 'onboarding-admin-messages',
                flagKey: 'onboarding_admin_messages_seen',
                steps: [
                    {
                        titleKey: 'onboarding_admin_messages_step1_title',
                        defaultTitle: 'Bandeja de reportes',
                        descKey: 'onboarding_admin_messages_step1_desc',
                        defaultDesc: 'Inspeccione los mensajes denunciados por los usuarios en los chats de los lienzos junto con los motivos y detalles aportados.',
                        icons: ['report', 'chat']
                    },
                    {
                        titleKey: 'onboarding_admin_messages_step2_title',
                        defaultTitle: 'Moderación de contenido',
                        descKey: 'onboarding_admin_messages_step2_desc',
                        defaultDesc: 'Oculte mensajes inapropiados, descarte reportes inválidos o aplique sanciones a infractores de forma centralizada.',
                        icons: ['visibility_off', 'done_all']
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
            const apiRoute = ApiRoutes.Settings.SetFlag;
            await this.api.post(apiRoute, { flag_key: flagKey });
        } catch (e) {
            console.warn('[OnboardingTourManager] Error persisting tour seen flag:', e);
        }
    }
}
