<?php

use App\Api\Services\User\UserProfileViewService;
use App\Core\Helpers\Utils;

global $container;
$profileService = $container ? $container->get(UserProfileViewService::class) : null;

$identifierParam = $_GET['identifier'] ?? '';
$profileData = null;

if ($profileService && !empty($identifierParam)) {
    $profileData = $profileService->getProfileData($identifierParam);
}

if (!$profileData):
?>
<div class="view-content">
    <div class="component-wrapper">
        <div class="component-empty-state" style="padding: 80px 20px; text-align: center;">
            <span class="material-symbols-rounded" style="font-size: 64px; color: var(--text-muted);">person_off</span>
            <h2 class="component-page-title" style="margin-top: 16px;"><?php echo __('error.user_not_found'); ?></h2>
            <p class="component-page-description"><?php echo __('user_not_found_desc', ['identifier' => htmlspecialchars($identifierParam)]); ?></p>
            <div style="margin-top: 24px;">
                <button type="button" class="component-button component-button--primary component-button--h38" data-nav="/">
                    <span class="material-symbols-rounded">home</span>
                    <span><?php echo __('home'); ?></span>
                </button>
            </div>
        </div>
    </div>
</div>
<?php
return;
endif;

$user = $profileData['user'];
$isOwner = $profileData['is_owner'];
$stats = $profileData['stats'];
$liveCanvas = $profileData['live_canvas'];
$publications = $profileData['publications'];
$publicCanvases = $profileData['public_canvases'];

$memberSince = date('M Y', strtotime($user['created_at']));
$subBg = $user['subscription_color'] ?? 'var(--text-muted)';
?>

<div class="view-content component-profile-page" data-profile-user-id="<?php echo $user['id']; ?>" data-profile-identifier="<?php echo htmlspecialchars($user['identifier']); ?>" data-is-owner="<?php echo $isOwner ? 'true' : 'false'; ?>">
    
    <!-- Banner Area -->
    <div class="component-profile-banner" data-ref="profile-banner-container">
        <?php if (!empty($user['banner_url'])): ?>
            <img src="<?php echo htmlspecialchars($user['banner_url']); ?>" alt="Banner" class="component-profile-banner__img" data-ref="profile-banner-img">
        <?php else: ?>
            <div class="component-profile-banner__placeholder" data-ref="profile-banner-placeholder"></div>
            <img src="" alt="Banner" class="component-profile-banner__img disabled" data-ref="profile-banner-img">
        <?php endif; ?>

        <?php if ($isOwner): ?>
            <input type="file" data-ref="input-profile-banner-file" accept="image/png, image/jpeg, image/jpg, image/webp" class="disabled">
            <button type="button" class="component-profile-banner__edit-btn" data-action="triggerBannerUpload" data-tooltip="<?php echo __('profile.change_banner'); ?>" data-position="bottom">
                <span class="material-symbols-rounded">photo_camera</span>
                <span><?php echo __('profile.change_banner'); ?></span>
            </button>
        <?php endif; ?>
    </div>

    <!-- Header info -->
    <div class="component-profile-header">
        <div class="component-profile-header__main">
            <div class="component-profile-avatar-wrapper subscription-dynamic" style="--active-subscription-bg: <?php echo htmlspecialchars($subBg); ?>;">
                <img src="<?php echo htmlspecialchars($user['avatar_url']); ?>" alt="<?php echo htmlspecialchars($user['username']); ?>">
            </div>

            <div class="component-profile-info">
                <div class="component-profile-name-row">
                    <h1 class="component-profile-display-name"><?php echo htmlspecialchars($user['username']); ?></h1>
                    <span class="component-profile-handle-badge"><?php echo htmlspecialchars($user['handle']); ?></span>
                    
                    <?php if (!empty($user['role_name']) && strtolower($user['role_name']) !== 'user'): ?>
                        <span class="component-badge component-badge--accent"><?php echo htmlspecialchars($user['role_name']); ?></span>
                    <?php endif; ?>

                    <?php if ($user['subscription_tier'] > 0): ?>
                        <span class="component-badge component-badge--warning">
                            <span class="material-symbols-rounded">workspace_premium</span>
                            <span>PRO</span>
                        </span>
                    <?php endif; ?>
                </div>

                <?php if (!empty($user['bio'])): ?>
                    <p class="component-profile-bio"><?php echo htmlspecialchars($user['bio']); ?></p>
                <?php endif; ?>

                <div class="component-profile-meta">
                    <div class="component-profile-meta-item">
                        <span class="material-symbols-rounded">calendar_today</span>
                        <span><?php echo __('profile.member_since'); ?> <?php echo htmlspecialchars($memberSince); ?></span>
                    </div>
                    <?php if ($liveCanvas): ?>
                        <div class="component-profile-meta-item component-text-success">
                            <span class="material-symbols-rounded">sensors</span>
                            <span><?php echo __('profile.live_active'); ?></span>
                        </div>
                    <?php endif; ?>
                </div>
            </div>
        </div>

        <div class="component-profile-actions">
            <?php if ($isOwner): ?>
                <button type="button" class="component-button component-button--h34" data-nav="/settings/your-account">
                    <span class="material-symbols-rounded">tune</span>
                    <span><?php echo __('profile.edit_profile'); ?></span>
                </button>
            <?php endif; ?>
            <button type="button" class="component-button component-button--icon component-button--h34" data-action="copyProfileLink" data-tooltip="<?php echo __('btn_share'); ?>" data-position="bottom">
                <span class="material-symbols-rounded">share</span>
            </button>
        </div>
    </div>

    <!-- Stats Cards Grid -->
    <div class="component-profile-stat-grid">
        <div class="component-card component-stat-card">
            <div class="component-icon-frame component-stat-card__icon">
                <span class="material-symbols-rounded">palette</span>
            </div>
            <div class="component-stat-card__content">
                <span class="component-stat-card__title"><?php echo __('profile.stats_pubs'); ?></span>
                <span class="component-stat-card__value" data-ref="stat-pubs"><?php echo number_format($stats['total_publications']); ?></span>
            </div>
        </div>
        <div class="component-card component-stat-card">
            <div class="component-icon-frame component-stat-card__icon">
                <span class="material-symbols-rounded component-text-accent">favorite</span>
            </div>
            <div class="component-stat-card__content">
                <span class="component-stat-card__title"><?php echo __('profile.stats_likes'); ?></span>
                <span class="component-stat-card__value" data-ref="stat-likes"><?php echo number_format($stats['total_likes_received']); ?></span>
            </div>
        </div>
        <div class="component-card component-stat-card">
            <div class="component-icon-frame component-stat-card__icon">
                <span class="material-symbols-rounded">visibility</span>
            </div>
            <div class="component-stat-card__content">
                <span class="component-stat-card__title"><?php echo __('profile.stats_views'); ?></span>
                <span class="component-stat-card__value" data-ref="stat-views"><?php echo number_format($stats['total_views_received']); ?></span>
            </div>
        </div>
    </div>

    <!-- Navigation Tabs as Toggle Pill -->
    <div style="padding: 0 16px; margin-top: 24px;">
        <div class="component-toggle-pill component-toggle-pill--profile" data-ref="profile-toggle-pill" data-tab="publications">
            <div class="component-toggle-pill-glider" data-ref="profile-glider"></div>
            <button type="button" class="component-button component-button--rounded-pill active" data-action="switchProfileTab" data-tab="publications">
                <span class="material-symbols-rounded">palette</span>
                <span><?php echo __('profile.tab_publications'); ?> (<?php echo count($publications); ?>)</span>
            </button>
            <?php if ($liveCanvas): ?>
            <button type="button" class="component-button component-button--rounded-pill" data-action="switchProfileTab" data-tab="live">
                <span class="material-symbols-rounded">sensors</span>
                <span><?php echo __('profile.tab_live_canvas'); ?></span>
            </button>
            <?php endif; ?>
            <button type="button" class="component-button component-button--rounded-pill" data-action="switchProfileTab" data-tab="canvases">
                <span class="material-symbols-rounded">brush</span>
                <span><?php echo __('profile.tab_canvases'); ?> (<?php echo count($publicCanvases); ?>)</span>
            </button>
        </div>
    </div>

    <!-- Tab Content: Publications -->
    <div class="component-profile-tab-content active" data-ref="tab-content-publications">
        <?php if (!empty($publications)): ?>
            <div class="component-grid" data-ref="profile-publications-grid">
                <?php foreach ($publications as $pub): ?>
                    <div class="component-gallery-card component-publication-card" data-publication-uuid="<?php echo htmlspecialchars($pub['uuid']); ?>">
                        <img src="<?php echo htmlspecialchars($pub['image_url']); ?>" 
                             alt="<?php echo htmlspecialchars($pub['title']); ?>" 
                             class="component-gallery-card__image image-lazy-fade" 
                             loading="lazy" 
                             decoding="async"
                             onload="this.classList.add('image-loaded')"
                             onerror="this.onerror=null; this.src='<?php echo APP_URL; ?>/assets/img/fallbacks/canvas-default.png'; this.classList.add('image-loaded');">

                        <div class="component-badge component-badge--glass component-badge--absolute-tr">
                            <span class="material-symbols-rounded component-text-accent">favorite</span>
                            <span class="pub-like-count"><?php echo number_format($pub['likes_count']); ?></span>
                            <span class="component-badge-divider">|</span>
                            <span class="material-symbols-rounded">chat</span>
                            <span><?php echo number_format($pub['comments_count']); ?></span>
                        </div>

                        <div data-nav="/publication/<?php echo htmlspecialchars($pub['uuid']); ?>" class="component-gallery-link">
                            <h3 class="component-gallery-title"><?php echo htmlspecialchars($pub['title']); ?></h3>
                        </div>

                        <div class="component-gallery-actions-wrapper component-dropdown-wrapper">
                            <div class="component-gallery-actions">
                                <?php if (!empty($_SESSION['user_id'])): ?>
                                    <button type="button" class="component-button component-button--icon component-button--h32 btn-favorite <?php echo $pub['is_liked'] ? 'is-favorite' : ''; ?>" data-action="togglePublicationLike" data-uuid="<?php echo htmlspecialchars($pub['uuid']); ?>" data-tooltip="<?php echo __('publications.like'); ?>">
                                        <span class="material-symbols-rounded component-icon--20">favorite</span>
                                    </button>
                                <?php endif; ?>
                            </div>
                        </div>
                    </div>
                <?php endforeach; ?>
            </div>
        <?php else: ?>
            <div class="component-empty-state" style="padding: 60px 20px; text-align: center;">
                <span class="material-symbols-rounded" style="font-size: 48px; color: var(--text-muted);">palette</span>
                <p class="component-page-description" style="margin-top: 12px;"><?php echo __('profile.no_publications'); ?></p>
            </div>
        <?php endif; ?>
    </div>

    <!-- Tab Content: Live Canvas -->
    <?php if ($liveCanvas): ?>
    <div class="component-profile-tab-content disabled" data-ref="tab-content-live" style="padding: 20px;">
        <div class="component-card component-card--interactive" style="max-width: 600px; padding: 24px; border: 1px solid var(--border-subtle); border-radius: var(--border-radius-lg); background: var(--bg-surface);">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px;">
                <div class="component-badge component-badge--success">
                    <span class="material-symbols-rounded">sensors</span>
                    <span><?php echo __('profile.live_active'); ?></span>
                </div>
                <span class="component-text-muted component-font-sm"><?php echo htmlspecialchars($liveCanvas['size']); ?> px</span>
            </div>

            <h3 style="font-size: 1.3rem; font-weight: 700; color: var(--text-primary); margin-bottom: 8px;"><?php echo htmlspecialchars($liveCanvas['name']); ?></h3>

            <div style="display: flex; align-items: center; gap: 16px; margin-bottom: 20px; color: var(--text-secondary); font-size: 0.85rem;">
                <span style="display: flex; align-items: center; gap: 4px;">
                    <span class="material-symbols-rounded">group</span>
                    <span><?php echo number_format($liveCanvas['members_count']); ?> participantes</span>
                </span>
                <span style="display: flex; align-items: center; gap: 4px;">
                    <span class="material-symbols-rounded component-text-accent">favorite</span>
                    <span><?php echo number_format($liveCanvas['favorites_count']); ?> favoritos</span>
                </span>
            </div>

            <button type="button" class="component-button component-button--primary component-button--full component-button--h40" data-nav="<?php echo htmlspecialchars($liveCanvas['url']); ?>">
                <span class="material-symbols-rounded">palette</span>
                <span><?php echo __('profile.join_live'); ?></span>
            </button>
        </div>
    </div>
    <?php endif; ?>

    <!-- Tab Content: Public Canvases -->
    <div class="component-profile-tab-content disabled" data-ref="tab-content-canvases">
        <?php if (!empty($publicCanvases)): ?>
            <div class="component-grid" data-ref="profile-canvases-grid">
                <?php foreach ($publicCanvases as $canv): 
                    $thumbnailUrl = !empty($canv['thumbnail_url']) ? $canv['thumbnail_url'] : (APP_URL . '/assets/img/fallbacks/canvas-default.png');
                ?>
                    <div class="component-gallery-card" data-card-id="<?php echo $canv['id']; ?>">
                        <img src="<?php echo htmlspecialchars($thumbnailUrl); ?>" 
                             alt="<?php echo htmlspecialchars($canv['name']); ?>" 
                             class="component-gallery-card__image image-lazy-fade" 
                             loading="lazy" 
                             decoding="async" 
                             onload="this.classList.add('image-loaded')" 
                             onerror="this.onerror=null; this.src='<?php echo APP_URL; ?>/assets/img/fallbacks/canvas-default.png'; this.classList.add('image-loaded');">

                        <div class="component-badge component-badge--glass component-badge--absolute-tr">
                            <span class="material-symbols-rounded">group</span>
                            <span><?php echo number_format($canv['members_count']); ?></span>
                            <span class="component-badge-divider">|</span>
                            <span class="material-symbols-rounded component-text-accent">favorite</span>
                            <span><?php echo number_format($canv['favorites_count']); ?></span>
                        </div>

                        <div data-nav="<?php echo htmlspecialchars($canv['url']); ?>" class="component-gallery-link">
                            <h3 class="component-gallery-title"><?php echo htmlspecialchars($canv['name']); ?></h3>
                        </div>

                        <div class="component-gallery-actions-wrapper component-dropdown-wrapper">
                            <div class="component-gallery-actions">
                                <?php if (!empty($_SESSION['user_id'])): ?>
                                    <button type="button" class="component-button component-button--icon component-button--h32 btn-favorite <?php echo !empty($canv['is_favorite']) ? 'is-favorite' : ''; ?>" data-action="toggleFavorite" data-id="<?php echo $canv['id']; ?>">
                                        <span class="material-symbols-rounded component-icon--20">favorite</span>
                                    </button>
                                <?php endif; ?>
                            </div>
                        </div>
                    </div>
                <?php endforeach; ?>
            </div>
        <?php else: ?>
            <div class="component-empty-state" style="padding: 60px 20px; text-align: center;">
                <span class="material-symbols-rounded" style="font-size: 48px; color: var(--text-muted);">draw</span>
                <p class="component-page-description" style="margin-top: 12px;"><?php echo __('profile.no_canvases'); ?></p>
            </div>
        <?php endif; ?>
    </div>
</div>
