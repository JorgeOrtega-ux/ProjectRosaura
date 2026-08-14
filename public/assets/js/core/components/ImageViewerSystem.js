/**
 * ImageViewerSystem — Visor de imágenes modal en pantalla completa para chat y soporte.
 */
export class ImageViewerSystem {
    static show(imageUrl) {
        if (!imageUrl) return;

        let overlay = document.querySelector('.chat-image-viewer-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.className = 'chat-image-viewer-overlay';
            overlay.innerHTML = `
                <div class="chat-image-viewer-top">
                    <div></div>
                    <div class="chat-image-viewer-actions">
                        <a class="chat-image-viewer-btn icon-only" href="" target="_blank" rel="noopener noreferrer" data-ref="viewer-download" title="Abrir en pestaña nueva">
                            <span class="material-symbols-rounded">open_in_new</span>
                        </a>
                        <button class="chat-image-viewer-btn icon-only" data-action="closeImageViewer" type="button" title="Cerrar">
                            <span class="material-symbols-rounded">close</span>
                        </button>
                    </div>
                </div>
                <div class="chat-image-viewer-content" data-action="closeImageViewer">
                    <img class="chat-image-viewer-img" src="" alt="Vista previa de imagen" onclick="event.stopPropagation()">
                </div>
            `;
            document.body.appendChild(overlay);

            overlay.addEventListener('click', (e) => {
                if (e.target.closest('[data-action="closeImageViewer"]')) {
                    overlay.classList.remove('active');
                }
            });

            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && overlay.classList.contains('active')) {
                    overlay.classList.remove('active');
                }
            });
        }

        const img = overlay.querySelector('.chat-image-viewer-img');
        const openLink = overlay.querySelector('[data-ref="viewer-download"]');
        if (img) img.src = imageUrl;
        if (openLink) openLink.href = imageUrl;

        void overlay.offsetHeight;
        requestAnimationFrame(() => {
            overlay.classList.add('active');
        });
    }

    static close() {
        const overlay = document.querySelector('.chat-image-viewer-overlay');
        if (overlay) {
            overlay.classList.remove('active');
        }
    }
}
