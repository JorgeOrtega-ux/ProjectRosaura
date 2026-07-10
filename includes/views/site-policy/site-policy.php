<?php
?>
<div class="view-content">
    <div class="component-wrapper component-wrapper--full no-padding" data-ref="site-policy-hub-wrapper">
        <div class="component-top">
            <div class="component-top-left">
                <h1 class="component-top-title">Centro de Ayuda y Políticas</h1>
                <p class="component-top-subtitle" style="color: var(--text-muted); margin-top: 5px;">Todo lo que necesitas saber sobre nuestras reglas, privacidad y cómo operamos.</p>
            </div>
        </div>
        <div class="component-bottom" style="padding: 24px;">
            
            <div class="policy-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 20px;">
                
                                <div class="policy-card nav-item" data-nav="<?php echo APP_URL; ?>/site-policy/terms-conditions" style="background: var(--bg-surface, #1e1e24); padding: 20px; border-radius: 12px; border: 1px solid var(--border-color, #333); cursor: pointer; transition: transform 0.2s, border-color 0.2s;">
                    <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
                        <span class="material-symbols-rounded" style="color: var(--color-primary, #6c5ce7); font-size: 32px;">gavel</span>
                        <h3 style="margin: 0; font-size: 18px; color: var(--text-color, #fff);">Términos y Condiciones</h3>
                    </div>
                    <p style="margin: 0; color: var(--text-muted, #aaa); font-size: 14px; line-height: 1.5;">
                        Reglas generales de uso, derechos y responsabilidades al utilizar nuestra plataforma de lienzos y herramientas de diseño.
                    </p>
                </div>

                                <div class="policy-card nav-item" data-nav="<?php echo APP_URL; ?>/site-policy/privacy-policy" style="background: var(--bg-surface, #1e1e24); padding: 20px; border-radius: 12px; border: 1px solid var(--border-color, #333); cursor: pointer; transition: transform 0.2s, border-color 0.2s;">
                    <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
                        <span class="material-symbols-rounded" style="color: var(--color-primary, #6c5ce7); font-size: 32px;">shield_lock</span>
                        <h3 style="margin: 0; font-size: 18px; color: var(--text-color, #fff);">Política de Privacidad</h3>
                    </div>
                    <p style="margin: 0; color: var(--text-muted, #aaa); font-size: 14px; line-height: 1.5;">
                        Cómo recopilamos, utilizamos y protegemos tus datos personales y los de tus equipos.
                    </p>
                </div>

                                <div class="policy-card nav-item" data-nav="<?php echo APP_URL; ?>/site-policy/cookies-policy" style="background: var(--bg-surface, #1e1e24); padding: 20px; border-radius: 12px; border: 1px solid var(--border-color, #333); cursor: pointer; transition: transform 0.2s, border-color 0.2s;">
                    <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
                        <span class="material-symbols-rounded" style="color: var(--color-primary, #6c5ce7); font-size: 32px;">cookie</span>
                        <h3 style="margin: 0; font-size: 18px; color: var(--text-color, #fff);">Política de Cookies</h3>
                    </div>
                    <p style="margin: 0; color: var(--text-muted, #aaa); font-size: 14px; line-height: 1.5;">
                        Información sobre las cookies que utilizamos para mejorar tu experiencia de usuario.
                    </p>
                </div>

                                <div class="policy-card nav-item" data-nav="<?php echo APP_URL; ?>/site-policy/legal-notice" style="background: var(--bg-surface, #1e1e24); padding: 20px; border-radius: 12px; border: 1px solid var(--border-color, #333); cursor: pointer; transition: transform 0.2s, border-color 0.2s;">
                    <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
                        <span class="material-symbols-rounded" style="color: var(--color-primary, #6c5ce7); font-size: 32px;">balance</span>
                        <h3 style="margin: 0; font-size: 18px; color: var(--text-color, #fff);">Aviso Legal</h3>
                    </div>
                    <p style="margin: 0; color: var(--text-muted, #aaa); font-size: 14px; line-height: 1.5;">
                        Información corporativa, datos de contacto y responsabilidades legales del servicio.
                    </p>
                </div>

                                <div class="policy-card nav-item" data-nav="<?php echo APP_URL; ?>/site-policy/refund-policy" style="background: var(--bg-surface, #1e1e24); padding: 20px; border-radius: 12px; border: 1px solid var(--border-color, #333); cursor: pointer; transition: transform 0.2s, border-color 0.2s;">
                    <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
                        <span class="material-symbols-rounded" style="color: var(--color-primary, #6c5ce7); font-size: 32px;">currency_exchange</span>
                        <h3 style="margin: 0; font-size: 18px; color: var(--text-color, #fff);">Política de Reembolsos</h3>
                    </div>
                    <p style="margin: 0; color: var(--text-muted, #aaa); font-size: 14px; line-height: 1.5;">
                        Condiciones sobre devoluciones, cancelaciones de planes premium y compras integradas.
                    </p>
                </div>

            </div>

            <style>
                .policy-card:hover {
                    border-color: var(--color-primary, #6c5ce7) !important;
                    transform: translateY(-2px);
                }
            </style>

        </div>
    </div>
</div>