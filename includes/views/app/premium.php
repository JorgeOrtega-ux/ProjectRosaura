<?php
// includes/views/app/premium.php
if (session_status() === PHP_SESSION_NONE) session_start();

// Lógica de UI para identificar el plan actual y cambiar botones
$activeAccountId = $_SESSION['active_account'] ?? null;
$linkedAccounts = $_SESSION['accounts'] ?? [];
$tier = 0;
if ($activeAccountId && isset($linkedAccounts[$activeAccountId])) {
    $tier = (int)($linkedAccounts[$activeAccountId]['subscription_tier'] ?? 0);
}
?>
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

/* Estilo especial para el plan Advanced */
.pricing-card.advanced {
    border: 2px solid #FFA500;
    background: linear-gradient(145deg, #1f1f1f, #2a1b00);
    transform: scale(1.05);
    z-index: 10;
    box-shadow: 0 10px 30px rgba(255, 165, 0, 0.15);
}

.pricing-card.advanced:hover {
    border-color: #FFC04D;
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

.advanced-badge {
    background-color: #FFA500;
    color: #000;
}

.plan-name {
    font-size: 20px;
    font-weight: 700;
    color: var(--text-primary);
    margin-bottom: 8px;
}

.pricing-card.advanced .plan-name,
.pricing-card.advanced .plan-currency,
.pricing-card.advanced .plan-price {
    color: #FFA500;
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

.pricing-card.advanced .plan-desc {
    border-bottom-color: rgba(255, 165, 0, 0.2);
    color: #ddd;
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

.pricing-card.advanced .plan-features li {
    color: #eee;
}

.feature-icon-check {
    color: var(--color-success);
    font-size: 18px !important;
}

.pricing-card.advanced .feature-icon-check {
    color: #FFA500;
}

.feature-icon-cross {
    color: var(--text-tertiary);
    font-size: 18px !important;
}

/* Tabla Comparativa */
.comparison-wrapper {
    margin: 32px auto 0 auto;
    width: 100%;
    max-width: 1008px; 
}

.comparison-title {
    text-align: center;
    font-size: 20px;
    font-weight: 700;
    color: var(--text-primary);
    margin-bottom: 24px;
}

.btn-advanced {
    background-color: #FFA500;
    color: #000;
    border: none;
    font-weight: bold;
}
.btn-advanced:hover {
    background-color: #FFC04D;
}
</style>

<div class="view-content">
    <div class="component-wrapper component-wrapper--full" style="max-width: 1050px;">
        
        <div style="text-align: center; padding: 24px 0;">
            <h1 class="component-page-title">Mejora tu experiencia en ProjectRosaura</h1>
            <p class="component-page-description" style="max-width: 600px; margin: 0 auto;">Lleva tus diseños al siguiente nivel con límites expandidos, almacenamiento masivo y herramientas de colaboración en tiempo real.</p>
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
                <div class="plan-name">Básico</div>
                <div class="plan-price-wrapper">
                    <span class="plan-currency">$</span>
                    <span class="plan-price" data-monthly="0" data-yearly="0">0</span>
                    <span class="plan-period" data-period-monthly="/ mes" data-period-yearly="/ año">/ mes</span>
                </div>
                <p class="plan-desc">Perfecto para empezar a explorar la plataforma de forma individual.</p>
                
                <ul class="plan-features">
                    <li><span class="material-symbols-rounded feature-icon-check">check_circle</span> Almacenamiento total: <b>1 MB</b></li>
                    <li><span class="material-symbols-rounded feature-icon-check">check_circle</span> 1 Lienzo y 1 Snapshot</li>
                    <li><span class="material-symbols-rounded feature-icon-cross">cancel</span> Participantes máximos: 1</li>
                    <li><span class="material-symbols-rounded feature-icon-cross">cancel</span> Sin Compartir en Vivo</li>
                </ul>
                <?php if ($tier === 0): ?>
                    <a href="#" class="component-button component-button--full component-button--h45 disabled">Tu Plan Actual</a>
                <?php else: ?>
                    <a href="#" class="component-button component-button--full component-button--h45">Volver al Básico</a>
                <?php endif; ?>
            </div>

            <div class="pricing-card featured">
                <div class="featured-badge">Más Elegido</div>
                <div class="plan-name">Pro</div>
                <div class="plan-price-wrapper">
                    <span class="plan-currency">$</span>
                    <span class="plan-price" data-monthly="15" data-yearly="144">15</span>
                    <span class="plan-period" data-period-monthly="/ mes" data-period-yearly="/ año">/ mes</span>
                </div>
                <p class="plan-desc">Para profesionales que necesitan más potencia y colaboración en equipo.</p>
                
                <ul class="plan-features">
                    <li><span class="material-symbols-rounded feature-icon-check">check_circle</span> Almacenamiento: <b>500 MB</b></li>
                    <li><span class="material-symbols-rounded feature-icon-check">check_circle</span> 5 Lienzos y 5 Participantes</li>
                    <li><span class="material-symbols-rounded feature-icon-check">check_circle</span> <b>Compartir en Vivo (Sync)</b></li>
                    <li><span class="material-symbols-rounded feature-icon-check">check_circle</span> Herramientas Premium y Paletas</li>
                </ul>
                <?php if ($tier === 1): ?>
                    <a href="#" class="component-button component-button--dark component-button--full component-button--h45 disabled">Tu Plan Actual</a>
                <?php elseif ($tier > 1): ?>
                    <a href="#" class="component-button component-button--dark component-button--full component-button--h45">Bajar a Pro</a>
                <?php else: ?>
                    <a href="#" class="component-button component-button--dark component-button--full component-button--h45">Mejorar a Pro</a>
                <?php endif; ?>
            </div>

            <div class="pricing-card advanced">
                <div class="featured-badge advanced-badge">Nivel Máximo</div>
                <div class="plan-name">Advanced</div>
                <div class="plan-price-wrapper">
                    <span class="plan-currency">$</span>
                    <span class="plan-price" data-monthly="35" data-yearly="336">35</span>
                    <span class="plan-period" data-period-monthly="/ mes" data-period-yearly="/ año">/ mes</span>
                </div>
                <p class="plan-desc">Solución definitiva con herramientas ilimitadas y límites expansivos.</p>
                
                <ul class="plan-features">
                    <li><span class="material-symbols-rounded feature-icon-check">check_circle</span> Almacenamiento masivo: <b>5 GB</b></li>
                    <li><span class="material-symbols-rounded feature-icon-check">check_circle</span> Lienzos y Snapshots <b>Ilimitados</b></li>
                    <li><span class="material-symbols-rounded feature-icon-check">check_circle</span> Hasta <b>50 Participantes</b> por lienzo</li>
                    <li><span class="material-symbols-rounded feature-icon-check">check_circle</span> Gestión de Roles Avanzados</li>
                </ul>
                <?php if ($tier === 2): ?>
                    <a href="#" class="component-button component-button--full component-button--h45 disabled">Tu Plan Actual</a>
                <?php else: ?>
                    <a href="#" class="component-button component-button--full component-button--h45 btn-advanced">Elegir Advanced</a>
                <?php endif; ?>
            </div>

        </div>

        <div class="comparison-wrapper">
            <h2 class="comparison-title">Compara las características al detalle</h2>
            <div class="component-table-wrapper">
                <table class="component-table">
                    <thead>
                        <tr>
                            <th>Características</th>
                            <th>Básico</th>
                            <th>Pro</th>
                            <th>Advanced</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr class="component-table-row">
                            <td style="font-weight: 600;">Límite de Almacenamiento</td>
                            <td>1 MB</td>
                            <td>500 MB</td>
                            <td><span style="color: #FFA500; font-weight: bold;">5 GB (5120 MB)</span></td>
                        </tr>
                        <tr class="component-table-row">
                            <td style="font-weight: 600;">Lienzos Activos Permitidos</td>
                            <td>1</td>
                            <td>5</td>
                            <td>Ilimitados</td>
                        </tr>
                        <tr class="component-table-row">
                            <td style="font-weight: 600;">Participantes por Lienzo</td>
                            <td>1 (Individual)</td>
                            <td>Hasta 5</td>
                            <td>Hasta 50</td>
                        </tr>
                        <tr class="component-table-row">
                            <td style="font-weight: 600;">Snapshots (Historial de Versiones)</td>
                            <td>1 Entrada</td>
                            <td>5 Entradas</td>
                            <td>Ilimitados</td>
                        </tr>
                        <tr class="component-table-row">
                            <td style="font-weight: 600;">Compartir en Vivo (Transmisión Sync)</td>
                            <td><span class="material-symbols-rounded feature-icon-cross">remove</span></td>
                            <td><span class="material-symbols-rounded feature-icon-check">check</span></td>
                            <td><span class="material-symbols-rounded feature-icon-check" style="color:#FFA500;">check</span></td>
                        </tr>
                        <tr class="component-table-row">
                            <td style="font-weight: 600;">Herramientas Premium / Paletas Custom</td>
                            <td><span class="material-symbols-rounded feature-icon-cross">remove</span></td>
                            <td><span class="material-symbols-rounded feature-icon-check">check</span></td>
                            <td><span class="material-symbols-rounded feature-icon-check" style="color:#FFA500;">check</span></td>
                        </tr>
                        <tr class="component-table-row">
                            <td style="font-weight: 600;">Exportación Alta Resolución</td>
                            <td><span class="material-symbols-rounded feature-icon-cross">remove</span></td>
                            <td><span class="material-symbols-rounded feature-icon-check">check</span></td>
                            <td><span class="material-symbols-rounded feature-icon-check" style="color:#FFA500;">check</span></td>
                        </tr>
                        <tr class="component-table-row">
                            <td style="font-weight: 600;">Gestión de Roles Avanzados</td>
                            <td><span class="material-symbols-rounded feature-icon-cross">remove</span></td>
                            <td><span class="material-symbols-rounded feature-icon-cross">remove</span></td>
                            <td><span class="material-symbols-rounded feature-icon-check" style="color:#FFA500;">check</span></td>
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