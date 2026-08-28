<?php
/**
 * Auth Section Header Logo Placeholder
 */
?>
<div class="auth-header-logo" data-nav="<?php echo APP_URL; ?>/" title="<?php echo htmlspecialchars(APP_NAME); ?>">
    <svg width="210" height="52" viewBox="0 0 210 52" fill="none" xmlns="http://www.w3.org/2000/svg" title="SpriteBoard">
        <defs>
            <linearGradient id="sb-primary-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#6366F1" />
                <stop offset="50%" stop-color="#8B5CF6" />
                <stop offset="100%" stop-color="#D946EF" />
            </linearGradient>
            <linearGradient id="sb-cyan-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#06B6D4" />
                <stop offset="100%" stop-color="#3B82F6" />
            </linearGradient>
            <filter id="sb-glow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="1.5" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
        </defs>
        <!-- Icon: Modular Sprite Board & Central Star -->
        <g transform="translate(2, 4)">
            <!-- Floating Board Tiles -->
            <rect x="4" y="4" width="16" height="16" rx="4.5" fill="url(#sb-primary-grad)" />
            <rect x="24" y="4" width="16" height="16" rx="4.5" fill="url(#sb-cyan-grad)" opacity="0.9" />
            <rect x="4" y="24" width="16" height="16" rx="4.5" fill="url(#sb-cyan-grad)" opacity="0.9" />
            <rect x="24" y="24" width="16" height="16" rx="4.5" fill="url(#sb-primary-grad)" />
            
            <!-- Central Dynamic Sprite Spark -->
            <path d="M22 13 C22 19.5, 25.5 22, 31 22 C25.5 22, 22 24.5, 22 31 C22 24.5, 18.5 22, 13 22 C18.5 22, 22 19.5, 22 13 Z" fill="#FFFFFF" filter="url(#sb-glow)" />
        </g>
        <!-- Wordmark: SpriteBoard -->
        <text x="56" y="33" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif" font-size="23" font-weight="800" letter-spacing="-0.03em" fill="currentColor">Sprite<tspan font-weight="400" opacity="0.78">Board</tspan></text>
        <circle cx="198" cy="30" r="3" fill="url(#sb-primary-grad)" />
    </svg>
</div>
