<?php
use App\Config\Database\DatabaseManager;
use App\Core\System\DatabaseConstants as DB;

$canvasUuid = $_GET['canvas'] ?? '';
$msgId = (int)($_GET['msg'] ?? 0);
$idx = (int)($_GET['idx'] ?? 0);

$hasAccess = false;
$attachments = [];
$errorMsg = null;

global $sessionManager;
$userId = $sessionManager && $sessionManager->isLoggedIn() ? $sessionManager->getActiveAccountId() : null;

if ($userId && !empty($canvasUuid) && $msgId > 0) {
    try {
        $dbManager = new DatabaseManager();
        $pdo = $dbManager->getConnection(DB::CONN_CANVASES);
        
        $stmt = $pdo->prepare("SELECT id, privacy, owner_id FROM " . DB::TBL_CANVASES . " WHERE uuid = ?");
        $stmt->execute([$canvasUuid]);
        $canvas = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($canvas) {
            $canvasId = (int)$canvas['id'];
            if ($canvas['privacy'] === 'public' || $canvas['owner_id'] == $userId) {
                $hasAccess = true;
            } else {
                $stmt = $pdo->prepare("SELECT id FROM canvas_user_roles WHERE canvas_id = ? AND user_id = ? LIMIT 1");
                $stmt->execute([$canvasId, $userId]);
                if ($stmt->fetch()) {
                    $hasAccess = true;
                }
            }
        }
        
        if ($hasAccess) {
            $stmt = $pdo->prepare("SELECT attachments FROM canvas_chat_messages WHERE id = ? AND canvas_id = ?");
            $stmt->execute([$msgId, $canvasId]);
            $msg = $stmt->fetch(PDO::FETCH_ASSOC);
            if ($msg && !empty($msg['attachments'])) {
                $decoded = is_string($msg['attachments']) ? json_decode($msg['attachments'], true) : $msg['attachments'];
                if (is_array($decoded)) {
                    foreach ($decoded as $att) {
                        if (strpos($att, '/public/') === 0) {
                            $attachments[] = $att;
                        } else {
                            $attachments[] = '/api.php?route=chat.attachment&canvas_uuid=' . $canvasUuid . '&file=' . urlencode(basename($att));
                        }
                    }
                }
            } else {
                $errorMsg = "El mensaje no tiene imágenes adjuntas.";
            }
        } else {
            $errorMsg = "No tienes permiso para ver estas imágenes.";
        }
    } catch (\Exception $e) {
        $errorMsg = "Error al cargar la imagen.";
    }
} else {
    $errorMsg = "Parámetros inválidos.";
}

$totalImages = count($attachments);
if ($idx < 0 || $idx >= $totalImages) $idx = 0;
$attachmentsJson = json_encode($attachments);
?>

<div class="view-content" data-ref="chat-viewer-wrapper" data-images='<?php echo htmlspecialchars($attachmentsJson, ENT_QUOTES); ?>' data-idx="<?php echo $idx; ?>">
    <div class="component-top" style="align-items: center;">
        <div class="component-top-left">
            <h1 class="component-top-title">Visor de imágenes</h1>
        </div>
        <div class="component-top-center"></div>
        <div class="component-top-right" style="display: flex; gap: 8px;">
            <?php if ($totalImages > 0): ?>
            <div class="component-inline-control" data-ref="pagination-container" data-tooltip="Paginación" data-position="bottom">
                <div class="component-inline-control__group">
                    <button class="component-inline-control__btn <?php echo $idx === 0 ? 'disabled-interaction' : ''; ?>" id="cv-btn-prev">
                        <span class="material-symbols-rounded">chevron_left</span>
                    </button>
                </div>
                <div class="component-inline-control__center" id="cv-counter"><?php echo ($idx + 1) . ' / ' . $totalImages; ?></div>
                <div class="component-inline-control__group">
                    <button class="component-inline-control__btn <?php echo $idx === $totalImages - 1 ? 'disabled-interaction' : ''; ?>" id="cv-btn-next">
                        <span class="material-symbols-rounded">chevron_right</span>
                    </button>
                </div>
            </div>
            
            <button class="component-button component-button--icon component-button--h40" id="cv-btn-download" data-tooltip="Descargar plantilla" data-position="bottom">
                <span class="material-symbols-rounded">download</span>
            </button>
            <?php endif; ?>
        </div>
    </div>
    
    <div class="component-bottom" style="display: flex; justify-content: center; align-items: center; background: var(--bg-secondary); border-radius: 12px; overflow: hidden; height: calc(100vh - 120px);">
        <?php if ($errorMsg): ?>
            <div style="color: var(--danger-color); padding: 20px;"><?php echo htmlspecialchars($errorMsg); ?></div>
        <?php elseif ($totalImages > 0): ?>
            <img id="cv-main-image" src="<?php echo htmlspecialchars($attachments[$idx]); ?>" style="max-width: 100%; max-height: 100%; object-fit: contain;">
        <?php else: ?>
            <div style="color: var(--text-secondary); padding: 20px;">No hay imágenes para mostrar.</div>
        <?php endif; ?>
    </div>
</div>

<script>
(function() {
    const wrapper = document.querySelector('[data-ref="chat-viewer-wrapper"]');
    if (!wrapper) return;
    
    let images = [];
    try {
        images = JSON.parse(wrapper.dataset.images);
    } catch(e) {}
    
    let currentIndex = parseInt(wrapper.dataset.idx, 10) || 0;
    
    const btnPrev = document.getElementById('cv-btn-prev');
    const btnNext = document.getElementById('cv-btn-next');
    const counter = document.getElementById('cv-counter');
    const mainImg = document.getElementById('cv-main-image');
    const btnDownload = document.getElementById('cv-btn-download');
    
    const updateView = () => {
        if (!mainImg) return;
        mainImg.src = images[currentIndex];
        if (counter) counter.innerText = `${currentIndex + 1} / ${images.length}`;
        
        if (btnPrev) {
            if (currentIndex === 0) btnPrev.classList.add('disabled-interaction');
            else btnPrev.classList.remove('disabled-interaction');
        }
        
        if (btnNext) {
            if (currentIndex === images.length - 1) btnNext.classList.add('disabled-interaction');
            else btnNext.classList.remove('disabled-interaction');
        }
    };
    
    if (btnPrev) {
        btnPrev.addEventListener('click', () => {
            if (btnPrev.classList.contains('disabled-interaction')) return;
            if (currentIndex > 0) {
                currentIndex--;
                updateView();
            }
        });
    }
    
    if (btnNext) {
        btnNext.addEventListener('click', () => {
            if (btnNext.classList.contains('disabled-interaction')) return;
            if (currentIndex < images.length - 1) {
                currentIndex++;
                updateView();
            }
        });
    }
    
    if (btnDownload) {
        btnDownload.addEventListener('click', async (e) => {
            const btn = e.currentTarget;
            if (btn.hasAttribute('disabled')) return;
            
            const currentUrl = images[currentIndex];
            btn.setAttribute('disabled', 'true');
            btn.innerHTML = '<span class="material-symbols-rounded" style="animation: spin 1s linear infinite;">progress_activity</span> <span>Guardando...</span>';

            try {
                const response = await fetch(currentUrl);
                const blob = await response.blob();
                
                let fileName = 'template.png';
                try {
                    const urlObj = new URL(currentUrl, window.location.origin);
                    if (urlObj.searchParams.has('file')) {
                        fileName = urlObj.searchParams.get('file');
                    } else {
                        fileName = currentUrl.split('/').pop();
                    }
                } catch(e) {}

                const file = new File([blob], fileName, { type: blob.type });
                const formData = new FormData();
                formData.append('file', file);

                const api = new (await import((window.AppBasePath || '') + '/public/assets/js/core/api/ApiServices.js')).ApiService();
                const ApiRoutes = (await import((window.AppBasePath || '') + '/public/assets/js/core/api/ApiRoutes.js')).ApiRoutes;
                
                const uploadRes = await api.postForm(ApiRoutes.Canvases.UploadTemplate, formData);
                const showMessage = (await import((window.AppBasePath || '') + '/public/assets/js/core/utils/uiUtils.js')).showMessage;
                
                if (uploadRes.success || uploadRes.status === 'success') {
                    showMessage('Plantilla guardada exitosamente', 'success');
                } else {
                    showMessage(uploadRes.message || 'Error al guardar la plantilla', 'error');
                }
            } catch (error) {
                console.error('Error descargando plantilla:', error);
                const showMessage = (await import((window.AppBasePath || '') + '/public/assets/js/core/utils/uiUtils.js')).showMessage;
                showMessage('Error de red al guardar la plantilla', 'error');
            } finally {
                btn.removeAttribute('disabled');
                btn.innerHTML = '<span class="material-symbols-rounded">download</span>';
            }
        });
    }
})();
</script>
