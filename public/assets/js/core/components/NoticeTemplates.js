export const NoticeTemplates = {
    // A promotional card (e.g. at the bottom left)
    promoCard: {
        position: 'bottom-left', 
        customClass: 'component-notice-box--promo',
        hideCloseBtn: true, // Remove X button
        build: (data = {}) => {
            return `
                <div class="component-notice-content">
                    <div class="component-modal-header component-notice-header">
                        <h2 class="component-modal-title">${data.title || 'Notice'}</h2>
                        <p class="component-modal-desc">${data.message || ''}</p>
                    </div>
                    <div class="component-notice-actions component-notice-actions--right">
                        ${data.cancelText ? `<button class="component-button component-button--h40 component-button--ghost" data-action="cancel">${data.cancelText}</button>` : ''}
                        ${data.confirmText ? `<button class="component-button component-button--primary component-button--h40" data-action="confirm">${data.confirmText}</button>` : ''}
                    </div>
                </div>
            `;
        }
    },

    // A full width cookie consent / notice at the bottom center
    cookieBanner: {
        position: 'bottom-center',
        customClass: 'component-notice-box--banner',
        hideCloseBtn: true, // Remove X button
        build: (data = {}) => {
            return `
                <div class="component-notice-banner-content">
                    <div class="component-notice-banner-text component-modal-header">
                        <h2 class="component-modal-title">${data.title || 'Cookie Consent'}</h2>
                        <p class="component-modal-desc">${data.message || 'We use cookies to improve your experience.'}</p>
                    </div>
                    <div class="component-notice-banner-actions component-notice-actions--right">
                        ${data.cancelText ? `<button class="component-button component-button--h40 component-button--ghost" data-action="manage_cookies">${data.cancelText}</button>` : ''}
                        ${data.confirmText ? `<button class="component-button component-button--primary component-button--h40" data-action="confirm">${data.confirmText}</button>` : ''}
                    </div>
                </div>
            `;
        }
    }
};
