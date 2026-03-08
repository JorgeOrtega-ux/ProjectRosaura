<div class="view-content component-layout-centered" style="align-items: flex-start; padding-top: 24px;">
    <div class="component-wrapper component-wrapper--full" style="max-width: 1200px;"> <div class="video-player-container" style="width: 100%; aspect-ratio: 16/9; background-color: var(--bg-surface-alt, #000); border-radius: 12px; display: flex; align-items: center; justify-content: center; border: 1px solid var(--border-color);">
            <span class="material-symbols-rounded" style="font-size: 64px; color: var(--text-tertiary);">play_circle</span>
        </div>

        <div class="video-info-section" style="margin-top: 12px; display: flex; flex-direction: column; gap: 16px;">
            
            <h1 id="watch-video-title" style="font-size: 24px; font-weight: 700; color: var(--text-primary); margin: 0;">
                Título de prueba del video
            </h1>
            
            <div style="display: flex; gap: 12px; flex-wrap: wrap;">
                
                <div style="display: flex; gap: 8px; flex-wrap: wrap;" id="watch-video-models">
                    <span class="component-badge component-badge--sm">
                        <span class="material-symbols-rounded">person</span> Modelo 1
                    </span>
                    <span class="component-badge component-badge--sm">
                        <span class="material-symbols-rounded">person</span> Modelo 2
                    </span>
                </div>

                <div style="display: flex; gap: 8px; flex-wrap: wrap;" id="watch-video-categories">
                    <span class="component-badge component-badge--sm">
                        <span class="material-symbols-rounded">category</span> Categoría A
                    </span>
                </div>

            </div>

            <div class="video-description-box" style="background-color: var(--bg-surface-alt); padding: 16px; border-radius: 12px; border: 1px solid var(--border-color);">
                <p id="watch-video-description" style="font-size: 14px; color: var(--text-secondary); margin: 0; line-height: 1.5;">
                    Esta es la descripción por defecto del video. Una vez que conectemos esto con el controlador JS y la base de datos, aquí se inyectará la sinopsis, fecha de subida y otros detalles que configuraste desde el Studio.
                </p>
            </div>

        </div>

    </div>
</div>