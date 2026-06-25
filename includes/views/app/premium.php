<style>
/* CSS Exclusivo para Premium adaptado a components.css */
.pricing-grid {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 24px;
    margin-bottom: 48px;
    width: 100%;
}

/* Toggle Switch Facturación */
.billing-toggle-container {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 16px;
    margin-bottom: 32px;
    margin-top: 16px;
}

.billing-label {
    font-size: 15px;
    font-weight: 600;
    color: var(--text-secondary);
    cursor: pointer;
    transition: color 0.2s ease;
    user-select: none;
}

.billing-label.active {
    color: var(--text-primary);
}

.billing-discount {
    background-color: var(--color-success-bg);
    color: var(--color-success);
    font-size: 11px;
    padding: 2px 8px;
    border-radius: var(--sl-border-radius-pill);
    margin-left: 6px;
    font-weight: 700;
}

.toggle-switch {
    position: relative;
    width: 50px;
    height: 28px;
    background-color: var(--bg-hover-light);
    border: var(--border-dynamic);
    border-radius: var(--sl-border-radius-pill);
    cursor: pointer;
    transition: background-color 0.2s ease, border-color 0.2s ease;
}

.toggle-knob {
    position: absolute;
    top: 2px;
    left: 3px;
    width: 22px;
    height: 22px;
    background-color: var(--text-primary);
    border-radius: 50%;
    transition: transform 0.2s cubic-bezier(0.2, 0.8, 0.2, 1);
}

.billing-yearly-active .toggle-knob {
    transform: translateX(20px);
    background-color: var(--action-primary);
}

.billing-yearly-active .toggle-switch {
    border-color: var(--action-primary);
}

/* Pricing Cards - TAMAÑO FIJO */
.pricing-card {
    width: 320px; 
    max-width: 100%; 
    flex: 0 0 auto;
    background-color: var(--bg-surface);
    border: var(--border-dynamic);
    border-radius: 12px;
    padding: 24px;
    display: flex;
    flex-direction: column;
    position: relative;
    transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.pricing-card:hover {
    border-color: var(--border-color-hover);
}

.pricing-card.featured {
    border: 2px solid var(--action-primary);
    box-shadow: var(--shadow-card);
}

.featured-badge {
    position: absolute;
    top: -12px;
    left: 50%;
    transform: translateX(-50%);
    background-color: var(--action-primary);
    color: var(--text-inverse);
    padding: 2px 12px;
    border-radius: 12px;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.5px;
    text-transform: uppercase;
    white-space: nowrap;
}

.plan-name {
    font-size: 20px;
    font-weight: 700;
    color: var(--text-primary);
    margin-bottom: 8px;
}

.plan-price-wrapper {
    display: flex;
    align-items: baseline;
    margin-bottom: 12px;
}

.plan-currency {
    font-size: 20px;
    color: var(--text-primary);
    font-weight: 700;
}

.plan-price, .plan-period {
    transition: opacity 0.15s ease;
}

.plan-price {
    font-size: 36px;
    font-weight: 700;
    color: var(--text-primary);
    line-height: 1;
}

.plan-period {
    font-size: 13px;
    color: var(--text-secondary);
    margin-left: 4px;
}

.plan-desc {
    font-size: 13px;
    color: var(--text-secondary);
    margin-bottom: 20px;
    padding-bottom: 16px;
    border-bottom: 1px solid var(--border-color);
    line-height: 1.4;
}

.plan-features {
    list-style: none;
    padding: 0;
    margin: 0 0 24px 0;
    flex-grow: 1;
}

.plan-features li {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 12px;
    font-size: 14px;
    color: var(--text-primary);
}

.feature-icon-check {
    color: var(--color-success);
    font-size: 18px !important;
}

.feature-icon-cross {
    color: var(--text-tertiary);
    font-size: 18px !important;
}

/* Tabla Comparativa restringida al ancho de las tarjetas */
.comparison-wrapper {
    margin: 32px auto 0 auto;
    width: 100%;
    /* 320px * 3 tarjetas + 24px * 2 gaps = 1008px exactos */
    max-width: 1008px; 
}

.comparison-title {
    text-align: center;
    font-size: 20px;
    font-weight: 700;
    color: var(--text-primary);
    margin-bottom: 24px;
}
</style>

<div class="view-content">
    <div class="component-wrapper component-wrapper--full" style="max-width: 1050px;">
        
        <div style="text-align: center; padding: 24px 0;">
            <h1 class="component-page-title">Lleva tus ideas al siguiente nivel</h1>
            <p class="component-page-description" style="max-width: 600px; margin: 0 auto;">Elige el plan ideal para tus proyectos creativos en Project Rosaura. Escala junto a tu equipo sin límites y cancela cuando lo decidas.</p>
        </div>

        <div class="billing-toggle-container" id="premiumBillingToggle">
            <span class="billing-label active" id="lblMonthly" onclick="setBilling('monthly')">Mensual</span>
            <div class="toggle-switch" onclick="toggleBilling()">
                <div class="toggle-knob"></div>
            </div>
            <span class="billing-label" id="lblYearly" onclick="setBilling('yearly')">
                Anual <span class="billing-discount">Ahorra 20%</span>
            </span>
        </div>

        <div class="pricing-grid">
            
            <div class="pricing-card">
                <div class="plan-name">Basic</div>
                <div class="plan-price-wrapper">
                    <span class="plan-currency">$</span>
                    <span class="plan-price" data-monthly="0" data-yearly="0">0</span>
                    <span class="plan-period" data-period-monthly="/ mes" data-period-yearly="/ año">/ mes</span>
                </div>
                <p class="plan-desc">Perfecto para empezar a explorar la plataforma de forma individual.</p>
                
                <ul class="plan-features">
                    <li><span class="material-symbols-rounded feature-icon-check">check_circle</span> 1 Lienzo de diseño activo</li>
                    <li><span class="material-symbols-rounded feature-icon-check">check_circle</span> Herramientas gráficas base</li>
                    <li><span class="material-symbols-rounded feature-icon-check">check_circle</span> Exportación en formato JPG</li>
                    <li><span class="material-symbols-rounded feature-icon-cross">cancel</span> Historial de cambios</li>
                </ul>
                <a href="#" class="component-button component-button--full component-button--h45">Tu Plan Actual</a>
            </div>

            <div class="pricing-card featured">
                <div class="featured-badge">Más Elegido</div>
                <div class="plan-name">Pro</div>
                <div class="plan-price-wrapper">
                    <span class="plan-currency">$</span>
                    <span class="plan-price" data-monthly="15" data-yearly="144">15</span>
                    <span class="plan-period" data-period-monthly="/ mes" data-period-yearly="/ año">/ mes</span>
                </div>
                <p class="plan-desc">Para profesionales que necesitan más potencia y herramientas de colaboración.</p>
                
                <ul class="plan-features">
                    <li><span class="material-symbols-rounded feature-icon-check">check_circle</span> Lienzos ilimitados</li>
                    <li><span class="material-symbols-rounded feature-icon-check">check_circle</span> Colaboradores (Hasta 5)</li>
                    <li><span class="material-symbols-rounded feature-icon-check">check_circle</span> Exportación PNG/SVG de alta calidad</li>
                    <li><span class="material-symbols-rounded feature-icon-check">check_circle</span> Recuperación de Snapshots</li>
                </ul>
                <a href="#" class="component-button component-button--dark component-button--full component-button--h45">Mejorar a Pro</a>
            </div>

            <div class="pricing-card">
                <div class="plan-name">Advanced</div>
                <div class="plan-price-wrapper">
                    <span class="plan-currency">$</span>
                    <span class="plan-price" data-monthly="35" data-yearly="336">35</span>
                    <span class="plan-period" data-period-monthly="/ mes" data-period-yearly="/ año">/ mes</span>
                </div>
                <p class="plan-desc">Solución definitiva para equipos y diseños complejos de alta escala.</p>
                
                <ul class="plan-features">
                    <li><span class="material-symbols-rounded feature-icon-check">check_circle</span> Todo lo del plan Pro</li>
                    <li><span class="material-symbols-rounded feature-icon-check">check_circle</span> Colaboradores Ilimitados</li>
                    <li><span class="material-symbols-rounded feature-icon-check">check_circle</span> Retención total de Historial</li>
                    <li><span class="material-symbols-rounded feature-icon-check">check_circle</span> Soporte técnico 24/7 VIP</li>
                </ul>
                <a href="#" class="component-button component-button--full component-button--h45">Elegir Advanced</a>
            </div>

        </div>

        <div class="comparison-wrapper">
            <h2 class="comparison-title">Compara las características al detalle</h2>
            <div class="component-table-wrapper">
                <table class="component-table">
                    <thead>
                        <tr>
                            <th>Características</th>
                            <th>Basic</th>
                            <th>Pro</th>
                            <th>Advanced</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr class="component-table-row">
                            <td style="font-weight: 600;">Lienzos activos</td>
                            <td>Máximo 1</td>
                            <td>Ilimitados</td>
                            <td>Ilimitados</td>
                        </tr>
                        <tr class="component-table-row">
                            <td style="font-weight: 600;">Colaboradores por lienzo</td>
                            <td>0 (Solo lectura)</td>
                            <td>Hasta 5 editores</td>
                            <td>Ilimitados</td>
                        </tr>
                        <tr class="component-table-row">
                            <td style="font-weight: 600;">Exportación SVG / Transparencia</td>
                            <td><span class="material-symbols-rounded feature-icon-cross">remove</span></td>
                            <td><span class="material-symbols-rounded feature-icon-check">check</span></td>
                            <td><span class="material-symbols-rounded feature-icon-check">check</span></td>
                        </tr>
                        <tr class="component-table-row">
                            <td style="font-weight: 600;">Snapshots (Historial de Versiones)</td>
                            <td><span class="material-symbols-rounded feature-icon-cross">remove</span></td>
                            <td>Últimos 7 días</td>
                            <td>Ilimitado</td>
                        </tr>
                        <tr class="component-table-row">
                            <td style="font-weight: 600;">Gestión avanzada de Permisos</td>
                            <td><span class="material-symbols-rounded feature-icon-cross">remove</span></td>
                            <td>Básica</td>
                            <td>Avanzada (Roles Custom)</td>
                        </tr>
                        <tr class="component-table-row">
                            <td style="font-weight: 600;">Soporte Técnico</td>
                            <td>Comunidad</td>
                            <td>Email (Respuesta 24h)</td>
                            <td>Prioritario Dedicado</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>

    </div>
</div>

<script>
    let isYearlyPremium = false;

    function toggleBilling() {
        isYearlyPremium = !isYearlyPremium;
        updateUIBilling();
    }

    function setBilling(type) {
        if (type === 'yearly' && !isYearlyPremium) {
            isYearlyPremium = true;
            updateUIBilling();
        } else if (type === 'monthly' && isYearlyPremium) {
            isYearlyPremium = false;
            updateUIBilling();
        }
    }

    function updateUIBilling() {
        const toggleContainer = document.getElementById('premiumBillingToggle');
        const lblMonthly = document.getElementById('lblMonthly');
        const lblYearly = document.getElementById('lblYearly');
        const cards = document.querySelectorAll('.pricing-card');

        if (isYearlyPremium) {
            toggleContainer.classList.add('billing-yearly-active');
            lblYearly.classList.add('active');
            lblMonthly.classList.remove('active');
        } else {
            toggleContainer.classList.remove('billing-yearly-active');
            lblMonthly.classList.add('active');
            lblYearly.classList.remove('active');
        }

        cards.forEach(card => {
            const priceEl = card.querySelector('.plan-price');
            const periodEl = card.querySelector('.plan-period');
            
            if (priceEl && periodEl) {
                priceEl.style.opacity = '0';
                periodEl.style.opacity = '0';
                
                setTimeout(() => {
                    priceEl.textContent = isYearlyPremium 
                        ? priceEl.getAttribute('data-yearly') 
                        : priceEl.getAttribute('data-monthly');
                        
                    periodEl.textContent = isYearlyPremium 
                        ? periodEl.getAttribute('data-period-yearly') 
                        : periodEl.getAttribute('data-period-monthly');
                        
                    priceEl.style.opacity = '1';
                    periodEl.style.opacity = '1';
                }, 150);
            }
        });
    }
</script>