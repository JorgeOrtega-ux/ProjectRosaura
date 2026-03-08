<div class="component-feed-section">
    <div class="component-about-layout">
        
        <div class="component-about-main">
            
            <h2 class="component-feed-title component-about-title">Descripción</h2>
            <div class="component-about-card">
                <p class="component-about-text" style="margin-bottom: 12px; font-size: 1.1rem; color: var(--text-primary);"><strong>Acerca de <?php echo htmlspecialchars($displayName); ?></strong></p>
                <p class="component-about-text"><?php echo !empty($channelDesc) ? nl2br(htmlspecialchars($channelDesc)) : 'Este canal no ha proporcionado una descripción todavía.'; ?></p>
            </div>

            <?php if (!empty($channelUser['interests'])): ?>
                <h2 class="component-feed-title component-about-title">Intereses y Pasatiempos</h2>
                <div class="component-about-card">
                    <p class="component-about-text"><?php echo nl2br(htmlspecialchars($channelUser['interests'])); ?></p>
                </div>
            <?php endif; ?>

            <h2 class="component-feed-title component-about-title">Detalles Personales</h2>
            <div class="component-about-details-grid">
                <?php 
                $details = [
                    'Estado de relación' => $relStatusMap[$channelUser['relationship_status'] ?? ''] ?? 'No especificado',
                    'Interesado en' => $interestedInMap[$channelUser['interested_in'] ?? ''] ?? 'No especificado',
                    'Género' => $genderMap[$channelUser['gender'] ?? ''] ?? 'No especificado',
                    'País de nacimiento' => $countriesMap[$channelUser['country'] ?? ''] ?? 'No especificado',
                    'Etnia / Descendencia' => $ethnicityMap[$channelUser['ethnicity'] ?? ''] ?? 'No especificado',
                    'Color de ojos' => $eyeColorMap[$channelUser['eye_color'] ?? ''] ?? 'No especificado',
                    'Color de cabello' => $hairColorMap[$channelUser['hair_color'] ?? ''] ?? 'No especificado',
                    'Pechos / Busto' => $boobsMap[$channelUser['boobs'] ?? ''] ?? 'No especificado',
                    'Estatura' => !empty($channelUser['height']) ? htmlspecialchars($channelUser['height']) . ' m' : 'No especificado',
                    'Peso' => !empty($channelUser['weight']) ? htmlspecialchars($channelUser['weight']) . ' kg' : 'No especificado',
                    'Tatuajes' => !empty($channelUser['tattoos']) ? 'Sí' : 'No',
                    'Perforaciones' => !empty($channelUser['piercings']) ? 'Sí' : 'No',
                ];
                
                $hasAnyDetail = false;
                foreach($details as $label => $value) {
                    if ($value !== 'No especificado' && $value !== '0.00 m' && $value !== '0.00 kg' && $value !== '') {
                        $hasAnyDetail = true;
                        echo '
                        <div class="component-about-detail-item">
                            <span class="component-about-detail-label">' . $label . '</span>
                            <span class="component-about-detail-value">' . $value . '</span>
                        </div>';
                    }
                }

                if (!$hasAnyDetail): ?>
                    <div class="component-about-card component-empty-state" style="grid-column: 1 / -1;">
                        No hay detalles personales especificados.
                    </div>
                <?php endif; ?>
            </div>

        </div>

        <div class="component-about-sidebar">
            
            <h2 class="component-feed-title component-about-title">Estadísticas</h2>
            <div class="component-about-card">
                <ul class="component-about-list">
                    <li class="component-about-list-item">
                        <span class="material-symbols-rounded component-about-list-icon">calendar_today</span>
                        <span>Se unió el <?php echo date('d M Y', strtotime($channelUser['created_at'])); ?></span>
                    </li>
                    <li class="component-about-list-item">
                        <span class="material-symbols-rounded component-about-list-icon">visibility</span>
                        <span><?php echo $totalVideos; ?> videos publicados</span>
                    </li>
                    <li class="component-about-list-item">
                        <span class="material-symbols-rounded component-about-list-icon">bar_chart</span>
                        <span>75,432 visualizaciones</span>
                    </li>
                </ul>
            </div>

            <?php 
            $socials = [
                'Facebook' => ['url' => $channelUser['social_facebook'] ?? '', 'icon' => 'public'], // Uso public como fallback de icono
                'YouTube' => ['url' => $channelUser['social_youtube'] ?? '', 'icon' => 'smart_display'],
                'Instagram' => ['url' => $channelUser['social_instagram'] ?? '', 'icon' => 'photo_camera'],
                'X (Twitter)' => ['url' => $channelUser['social_x'] ?? '', 'icon' => 'alternate_email'],
                'OnlyFans' => ['url' => $channelUser['social_onlyfans'] ?? '', 'icon' => 'lock_person'],
                'Snapchat' => ['url' => $channelUser['social_snapchat'] ?? '', 'icon' => 'chat_bubble']
            ];
            $hasSocials = array_filter($socials, function($s) { return !empty($s['url']); });
            
            if (!empty($hasSocials)):
            ?>
                <h2 class="component-feed-title component-about-title">Vínculos</h2>
                <div class="component-about-socials">
                    <?php foreach($hasSocials as $name => $data): ?>
                        <a href="<?php echo htmlspecialchars($data['url']); ?>" target="_blank" rel="noopener noreferrer" class="component-about-social-link">
                            <span class="material-symbols-rounded component-about-social-icon"><?php echo $data['icon']; ?></span>
                            <span class="component-about-social-text"><?php echo $name; ?></span>
                        </a>
                    <?php endforeach; ?>
                </div>
            <?php endif; ?>

            <?php if (!empty($channelContact)): ?>
                <h2 class="component-feed-title component-about-title">Contacto</h2>
                <div class="component-about-card">
                    <p class="component-about-contact-text">Para consultas comerciales u otros asuntos:</p>
                    <div style="display: flex; align-items: center; gap: 12px; padding: 15px; border: 1px solid #00000020; border-radius: 12px; background-color: #f9f9f9;">
                        <span class="material-symbols-rounded component-about-list-icon" style="color: var(--text-secondary);">mail</span>
                        <a href="mailto:<?php echo htmlspecialchars($channelContact); ?>" style="color: var(--text-primary); text-decoration: none; font-size: 15px; font-weight: 500; word-break: break-all;"><?php echo htmlspecialchars($channelContact); ?></a>
                    </div>
                </div>
            <?php endif; ?>

        </div>
    </div>
</div>