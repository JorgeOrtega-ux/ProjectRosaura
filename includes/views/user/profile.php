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
        <div class="component-bottom">
            <?php echo Utils::renderEmptyState([
                'type' => 'canvas',
                'title' => __('error.user_not_found'),
                'message' => __('user_not_found_desc', ['identifier' => htmlspecialchars($identifierParam)]),
                'actions' => '<button type="button" class="component-button component-button--primary component-button--h38" data-nav="/"><span class="material-symbols-rounded">home</span><span>' . __('home') . '</span></button>'
            ]); ?>
        </div>
    </div>
</div>
<?php
return;
endif;

$user = $profileData['user'];
$isOwner = $profileData['is_owner'];
$isFollowing = !empty($profileData['is_following']);
$stats = $profileData['stats'];
$liveCanvas = $profileData['live_canvas'];
$publications = $profileData['publications'];
$publicCanvases = $profileData['public_canvases'];
$followers = $profileData['followers'] ?? [];
$following = $profileData['following'] ?? [];

$memberSince = date('M Y', strtotime($user['created_at']));
$subBg = $user['subscription_bg'] ?? '';
$hasSubscription = !empty($user['subscription_tier']) && $user['subscription_tier'] > 0;
?>

<div class="view-content component-profile-view" data-ref="profile-container" data-profile-user-id="<?php echo $user['id']; ?>" data-profile-identifier="<?php echo htmlspecialchars($user['identifier']); ?>" data-is-owner="<?php echo $isOwner ? 'true' : 'false'; ?>">
    
    <!-- Banner Area -->
    <div class="component-profile-banner" data-ref="profile-banner-container">
        <?php if (!empty($user['banner_url'])): ?>
            <img class="component-profile-banner__img image-lazy-fade" data-ref="profile-banner-img" onload="this.classList.add('image-loaded')" src="<?php echo htmlspecialchars($user['banner_url']); ?>" alt="<?php echo htmlspecialchars($user['username']); ?>">
        <?php else: ?>
            <div class="component-profile-banner__placeholder" data-ref="profile-banner-placeholder"></div>
            <img class="component-profile-banner__img disabled" data-ref="profile-banner-img" src="" alt="<?php echo htmlspecialchars($user['username']); ?>">
        <?php endif; ?>

        <?php if ($isOwner): ?>
            <div class="component-profile-banner__actions">
                <input type="file" class="disabled" data-ref="input-profile-banner-file" accept="image/png, image/jpeg, image/jpg, image/webp">
                <button type="button" class="component-profile-banner__edit-btn" data-action="triggerBannerUpload" data-tooltip="<?php echo __('profile.change_banner'); ?>" data-position="bottom">
                    <span class="material-symbols-rounded">photo_camera</span>
                    <span><?php echo __('profile.change_banner'); ?></span>
                </button>
            </div>
        <?php endif; ?>
    </div>

    <!-- Header info -->
    <div class="component-profile-header">
        <div class="component-profile-header__top">
            <div class="component-avatar component-avatar--120 <?php echo ($hasSubscription && !empty($subBg)) ? 'subscription-dynamic' : ''; ?>" <?php if ($hasSubscription && !empty($subBg)): ?>data-sub-bg="<?php echo htmlspecialchars($subBg); ?>" style="--active-subscription-bg: <?php echo htmlspecialchars($subBg); ?>;"<?php endif; ?> data-ref="profile-avatar">
                <img class="image-lazy-fade" data-ref="profile-avatar-img" onload="this.classList.add('image-loaded')" src="<?php echo htmlspecialchars($user['avatar_url']); ?>" alt="<?php echo htmlspecialchars($user['username']); ?>" onerror="this.onerror=null; this.src='<?php echo htmlspecialchars(\App\Core\Helpers\Utils::getDefaultAvatarUrl($user['username'] ?? 'U', (string)($user['id'] ?? ''))); ?>'; this.classList.add('image-loaded');">
            </div>

            <div class="component-profile-header__actions">
                <?php if ($isOwner): ?>
                    <button type="button" class="component-button component-button--icon component-button--h40" data-nav="/settings/your-account" data-tooltip="<?php echo __('profile.edit_profile'); ?>" data-position="bottom">
                        <span class="material-symbols-rounded">tune</span>
                    </button>
                <?php else: ?>
                    <?php if (!empty($_SESSION['user_id'])): ?>
                        <button type="button" class="component-button <?php echo $isFollowing ? 'component-button--secondary' : 'component-button--primary'; ?> component-button--h40 btn-follow" data-action="toggleProfileFollow" data-user-id="<?php echo $user['id']; ?>">
                            <span class="material-symbols-rounded component-icon--20"><?php echo $isFollowing ? 'person_remove' : 'person_add'; ?></span>
                            <span class="btn-text"><?php echo $isFollowing ? __('profile.unfollow') : __('profile.follow'); ?></span>
                        </button>
                    <?php else: ?>
                        <button type="button" class="component-button component-button--primary component-button--h40" data-nav="/login">
                            <span class="material-symbols-rounded component-icon--20">person_add</span>
                            <span><?php echo __('profile.follow'); ?></span>
                        </button>
                    <?php endif; ?>
                <?php endif; ?>
                <button type="button" class="component-button component-button--icon component-button--h40" data-action="copyProfileLink" data-tooltip="<?php echo __('btn_share'); ?>" data-position="bottom">
                    <span class="material-symbols-rounded">share</span>
                </button>
            </div>
        </div>

        <div class="component-profile-info">
            <div class="component-profile-name-row">
                <h1 class="component-page-title"><?php echo htmlspecialchars($user['username']); ?></h1>
                <span class="component-badge">@<?php echo htmlspecialchars($user['identifier']); ?></span>
                
                <?php if (!empty($user['role_name']) && strtolower($user['role_name']) !== 'user' && strtolower($user['role_name']) !== 'usuario'): ?>
                    <span class="component-badge component-badge--accent"><?php echo htmlspecialchars($user['role_name']); ?></span>
                <?php endif; ?>
            </div>

            <?php if (!empty($user['bio'])): ?>
                <p class="component-profile-bio"><?php echo htmlspecialchars($user['bio']); ?></p>
            <?php endif; ?>

            <div class="component-badge-list">
                <span class="component-badge cursor-pointer" data-action="switchProfileTab" data-tab="followers">
                    <span class="material-symbols-rounded">group</span>
                    <span><strong data-ref="profile-followers-count"><?php echo number_format($stats['followers_count'] ?? 0); ?></strong> <?php echo __('profile.followers'); ?></span>
                </span>
                <span class="component-badge cursor-pointer" data-action="switchProfileTab" data-tab="following">
                    <span class="material-symbols-rounded">person_search</span>
                    <span><strong data-ref="profile-following-count"><?php echo number_format($stats['following_count'] ?? 0); ?></strong> <?php echo __('profile.following'); ?></span>
                </span>
                <span class="component-badge">
                    <span class="material-symbols-rounded">calendar_today</span>
                    <span><?php echo __('profile.member_since'); ?> <?php echo htmlspecialchars($memberSince); ?></span>
                </span>
                <?php if ($liveCanvas): ?>
                    <span class="component-badge component-badge--success">
                        <span class="material-symbols-rounded">sensors</span>
                        <span><?php echo __('profile.live_active'); ?></span>
                    </span>
                <?php endif; ?>
            </div>
        </div>
    </div>

    <!-- Navigation Tabs -->
    <div class="component-profile-tabs" data-ref="profile-tabs-bar">
        <button type="button" class="component-tab-btn active" data-action="switchProfileTab" data-tab="publications">
            <span class="material-symbols-rounded">palette</span>
            <span><?php echo __('profile.tab_publications'); ?></span>
            <span class="component-tab-badge"><?php echo count($publications); ?></span>
        </button>
        <?php if ($liveCanvas): ?>
            <button type="button" class="component-tab-btn" data-action="switchProfileTab" data-tab="live">
                <span class="material-symbols-rounded">sensors</span>
                <span><?php echo __('profile.tab_live_canvas'); ?></span>
            </button>
        <?php endif; ?>
        <button type="button" class="component-tab-btn" data-action="switchProfileTab" data-tab="followers">
            <span class="material-symbols-rounded">group</span>
            <span><?php echo __('profile.tab_followers'); ?></span>
            <span class="component-tab-badge" data-ref="tab-badge-followers"><?php echo number_format($stats['followers_count'] ?? 0); ?></span>
        </button>
        <button type="button" class="component-tab-btn" data-action="switchProfileTab" data-tab="following">
            <span class="material-symbols-rounded">person_search</span>
            <span><?php echo __('profile.tab_following'); ?></span>
            <span class="component-tab-badge" data-ref="tab-badge-following"><?php echo number_format($stats['following_count'] ?? 0); ?></span>
        </button>
        <button type="button" class="component-tab-btn" data-action="switchProfileTab" data-tab="stats">
            <span class="material-symbols-rounded">bar_chart</span>
            <span><?php echo __('profile.tab_stats'); ?></span>
        </button>
    </div>

    <!-- Tab Content: Publications -->
    <div class="component-profile-tab-content active" data-ref="tab-content-publications">
        <?php if (!empty($publications)): ?>
            <div class="component-grid" data-ref="profile-publications-grid">
                <?php foreach ($publications as $pub): ?>
                    <div class="component-gallery-card component-publication-card" data-publication-uuid="<?php echo htmlspecialchars($pub['uuid']); ?>">
                        <img class="component-gallery-card__image image-lazy-fade" onload="this.classList.add('image-loaded')" src="<?php echo htmlspecialchars($pub['image_url']); ?>" alt="<?php echo htmlspecialchars($pub['title']); ?>" loading="lazy" decoding="async" onerror="this.onerror=null; this.src='<?php echo APP_URL; ?>/assets/img/fallbacks/canvas-default.png'; this.classList.add('image-loaded');">

                        <div class="component-badge component-badge--glass component-badge--absolute-tr">
                            <span class="material-symbols-rounded component-text-accent">favorite</span>
                            <span class="pub-like-count"><?php echo number_format($pub['likes_count']); ?></span>
                            <span class="component-badge-divider">|</span>
                            <span class="material-symbols-rounded">chat</span>
                            <span><?php echo number_format($pub['comments_count']); ?></span>
                        </div>

                        <div class="component-gallery-link" data-nav="/publication/<?php echo htmlspecialchars($pub['uuid']); ?>">
                            <h3 class="component-gallery-title"><?php echo htmlspecialchars($pub['title']); ?></h3>
                        </div>

                        <div class="component-gallery-actions-wrapper component-dropdown-wrapper">
                            <div class="component-gallery-actions">
                                <?php if (!empty($_SESSION['user_id'])): ?>
                                    <button type="button" class="component-button component-button--icon component-button--h32 btn-favorite <?php echo $pub['is_liked'] ? 'is-favorite' : ''; ?>" data-action="togglePublicationLike" data-uuid="<?php echo htmlspecialchars($pub['uuid']); ?>" data-tooltip="<?php echo __('publications.like'); ?>" data-position="bottom">
                                        <span class="material-symbols-rounded component-icon--20">favorite</span>
                                    </button>
                                <?php endif; ?>
                            </div>
                        </div>
                    </div>
                <?php endforeach; ?>
            </div>
        <?php else: ?>
            <?php echo Utils::renderEmptyState([
                'type' => 'palette',
                'title' => __('profile.no_publications_title'),
                'message' => __('profile.no_publications')
            ]); ?>
        <?php endif; ?>
    </div>

    <!-- Tab Content: Live Canvas -->
    <?php if ($liveCanvas): ?>
    <div class="component-profile-tab-content" data-ref="tab-content-live">
        <div class="component-grid">
            <div class="component-gallery-card" data-card-id="<?php echo $liveCanvas['id']; ?>">
                <img class="component-gallery-card__image image-lazy-fade" onload="this.classList.add('image-loaded')" src="<?php echo htmlspecialchars(!empty($liveCanvas['thumbnail_url']) ? $liveCanvas['thumbnail_url'] : (APP_URL . '/assets/img/fallbacks/canvas-default.png')); ?>" alt="<?php echo htmlspecialchars($liveCanvas['name']); ?>" loading="lazy" decoding="async" onerror="this.onerror=null; this.src='<?php echo APP_URL; ?>/assets/img/fallbacks/canvas-default.png'; this.classList.add('image-loaded');">

                <div class="component-badge component-badge--success component-badge--absolute-tl">
                    <span class="material-symbols-rounded">sensors</span>
                    <span><?php echo __('profile.live_active'); ?></span>
                </div>

                <div class="component-badge component-badge--glass component-badge--absolute-tr">
                    <span class="material-symbols-rounded">group</span>
                    <span><?php echo number_format($liveCanvas['members_count']); ?></span>
                    <span class="component-badge-divider">|</span>
                    <span class="material-symbols-rounded component-text-accent">favorite</span>
                    <span><?php echo number_format($liveCanvas['favorites_count']); ?></span>
                </div>

                <div class="component-gallery-link" data-nav="<?php echo htmlspecialchars($liveCanvas['url']); ?>">
                    <h3 class="component-gallery-title"><?php echo htmlspecialchars($liveCanvas['name']); ?></h3>
                </div>

                <div class="component-gallery-actions-wrapper component-dropdown-wrapper">
                    <div class="component-gallery-actions">
                        <?php if (!empty($_SESSION['user_id'])): ?>
                            <button type="button" class="component-button component-button--icon component-button--h32 btn-favorite <?php echo !empty($liveCanvas['is_favorite']) ? 'is-favorite' : ''; ?>" data-action="toggleFavorite" data-id="<?php echo $liveCanvas['id']; ?>" data-tooltip="<?php echo __('favorite'); ?>" data-position="bottom">
                                <span class="material-symbols-rounded component-icon--20">favorite</span>
                            </button>
                        <?php endif; ?>
                    </div>
                </div>
            </div>
        </div>
    </div>
    <?php endif; ?>

    <!-- Tab Content: Followers -->
    <div class="component-profile-tab-content" data-ref="tab-content-followers">
        <?php if (!empty($followers)): ?>
            <div class="component-grid component-grid--users" data-ref="profile-followers-grid">
                <?php foreach ($followers as $followerUser): ?>
                    <div class="component-user-card" data-user-id="<?php echo $followerUser['id']; ?>" data-identifier="<?php echo htmlspecialchars($followerUser['identifier']); ?>">
                        <div data-nav="/@<?php echo htmlspecialchars($followerUser['identifier']); ?>" class="component-user-card__banner">
                            <?php if (!empty($followerUser['banner_url'])): ?>
                                <img src="<?php echo htmlspecialchars($followerUser['banner_url']); ?>" alt="<?php echo htmlspecialchars($followerUser['username']); ?>" class="component-user-card__banner-img image-lazy-fade" loading="lazy" onload="this.classList.add('image-loaded')">
                            <?php else: ?>
                                <div class="component-user-card__banner-placeholder"></div>
                            <?php endif; ?>
                        </div>
                        <div class="component-user-card__body">
                            <div class="component-user-card__avatar-row">
                                <div data-nav="/@<?php echo htmlspecialchars($followerUser['identifier']); ?>" class="component-avatar component-avatar--56">
                                    <img src="<?php echo htmlspecialchars($followerUser['avatar_url']); ?>" alt="<?php echo htmlspecialchars($followerUser['username']); ?>" class="image-lazy-fade" loading="lazy" onload="this.classList.add('image-loaded')" onerror="this.onerror=null; this.src='<?php echo APP_URL; ?>/assets/img/fallbacks/avatar-default.png'; this.classList.add('image-loaded');">
                                </div>
                                <div class="component-user-card__actions">
                                    <?php if (!$followerUser['is_self']): ?>
                                        <?php if (!empty($_SESSION['user_id'])): ?>
                                            <button type="button" class="component-button <?php echo !empty($followerUser['is_following']) ? 'component-button--secondary' : 'component-button--primary'; ?> component-button--h32 btn-follow" data-action="toggleUserFollow" data-user-id="<?php echo $followerUser['id']; ?>">
                                                <span class="material-symbols-rounded component-icon--18"><?php echo !empty($followerUser['is_following']) ? 'person_remove' : 'person_add'; ?></span>
                                                <span class="btn-text"><?php echo !empty($followerUser['is_following']) ? __('profile.unfollow') : __('profile.follow'); ?></span>
                                            </button>
                                        <?php else: ?>
                                            <button type="button" class="component-button component-button--primary component-button--h32" data-nav="/login">
                                                <span class="material-symbols-rounded component-icon--18">person_add</span>
                                                <span><?php echo __('profile.follow'); ?></span>
                                            </button>
                                        <?php endif; ?>
                                    <?php endif; ?>
                                </div>
                            </div>
                            <div data-nav="/@<?php echo htmlspecialchars($followerUser['identifier']); ?>" class="component-user-card__info">
                                <div class="component-user-card__name-row">
                                    <h3 class="component-user-card__name"><?php echo htmlspecialchars($followerUser['username']); ?></h3>
                                    <span class="component-user-card__handle">@<?php echo htmlspecialchars($followerUser['identifier']); ?></span>
                                </div>
                                <?php if (!empty($followerUser['bio'])): ?>
                                    <p class="component-user-card__bio"><?php echo htmlspecialchars($followerUser['bio']); ?></p>
                                <?php endif; ?>
                                <div class="component-user-card__stats">
                                    <span class="component-badge">
                                        <span class="material-symbols-rounded">group</span>
                                        <span class="user-followers-count"><?php echo number_format($followerUser['followers_count']); ?></span>
                                        <span><?php echo __('profile.followers'); ?></span>
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                <?php endforeach; ?>
            </div>
        <?php else: ?>
            <?php echo Utils::renderEmptyState([
                'type' => 'users',
                'title' => __('profile.no_followers_title'),
                'message' => __('profile.no_followers')
            ]); ?>
        <?php endif; ?>
    </div>

    <!-- Tab Content: Following -->
    <div class="component-profile-tab-content" data-ref="tab-content-following">
        <?php if (!empty($following)): ?>
            <div class="component-grid component-grid--users" data-ref="profile-following-grid">
                <?php foreach ($following as $followingUser): ?>
                    <div class="component-user-card" data-user-id="<?php echo $followingUser['id']; ?>" data-identifier="<?php echo htmlspecialchars($followingUser['identifier']); ?>">
                        <div data-nav="/@<?php echo htmlspecialchars($followingUser['identifier']); ?>" class="component-user-card__banner">
                            <?php if (!empty($followingUser['banner_url'])): ?>
                                <img src="<?php echo htmlspecialchars($followingUser['banner_url']); ?>" alt="<?php echo htmlspecialchars($followingUser['username']); ?>" class="component-user-card__banner-img image-lazy-fade" loading="lazy" onload="this.classList.add('image-loaded')">
                            <?php else: ?>
                                <div class="component-user-card__banner-placeholder"></div>
                            <?php endif; ?>
                        </div>
                        <div class="component-user-card__body">
                            <div class="component-user-card__avatar-row">
                                <div data-nav="/@<?php echo htmlspecialchars($followingUser['identifier']); ?>" class="component-avatar component-avatar--56">
                                    <img src="<?php echo htmlspecialchars($followingUser['avatar_url']); ?>" alt="<?php echo htmlspecialchars($followingUser['username']); ?>" class="image-lazy-fade" loading="lazy" onload="this.classList.add('image-loaded')" onerror="this.onerror=null; this.src='<?php echo APP_URL; ?>/assets/img/fallbacks/avatar-default.png'; this.classList.add('image-loaded');">
                                </div>
                                <div class="component-user-card__actions">
                                    <?php if (!$followingUser['is_self']): ?>
                                        <?php if (!empty($_SESSION['user_id'])): ?>
                                            <button type="button" class="component-button <?php echo !empty($followingUser['is_following']) ? 'component-button--secondary' : 'component-button--primary'; ?> component-button--h32 btn-follow" data-action="toggleUserFollow" data-user-id="<?php echo $followingUser['id']; ?>">
                                                <span class="material-symbols-rounded component-icon--18"><?php echo !empty($followingUser['is_following']) ? 'person_remove' : 'person_add'; ?></span>
                                                <span class="btn-text"><?php echo !empty($followingUser['is_following']) ? __('profile.unfollow') : __('profile.follow'); ?></span>
                                            </button>
                                        <?php else: ?>
                                            <button type="button" class="component-button component-button--primary component-button--h32" data-nav="/login">
                                                <span class="material-symbols-rounded component-icon--18">person_add</span>
                                                <span><?php echo __('profile.follow'); ?></span>
                                            </button>
                                        <?php endif; ?>
                                    <?php endif; ?>
                                </div>
                            </div>
                            <div data-nav="/@<?php echo htmlspecialchars($followingUser['identifier']); ?>" class="component-user-card__info">
                                <div class="component-user-card__name-row">
                                    <h3 class="component-user-card__name"><?php echo htmlspecialchars($followingUser['username']); ?></h3>
                                    <span class="component-user-card__handle">@<?php echo htmlspecialchars($followingUser['identifier']); ?></span>
                                </div>
                                <?php if (!empty($followingUser['bio'])): ?>
                                    <p class="component-user-card__bio"><?php echo htmlspecialchars($followingUser['bio']); ?></p>
                                <?php endif; ?>
                                <div class="component-user-card__stats">
                                    <span class="component-badge">
                                        <span class="material-symbols-rounded">group</span>
                                        <span class="user-followers-count"><?php echo number_format($followingUser['followers_count']); ?></span>
                                        <span><?php echo __('profile.followers'); ?></span>
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                <?php endforeach; ?>
            </div>
        <?php else: ?>
            <?php echo Utils::renderEmptyState([
                'type' => 'users',
                'title' => __('profile.no_following_title'),
                'message' => __('profile.no_following')
            ]); ?>
        <?php endif; ?>
    </div>

    <!-- Tab Content: Stats -->
    <div class="component-profile-tab-content" data-ref="tab-content-stats">
        <div class="component-profile-stats">
            <div class="component-stat-card">
                <div class="component-stat-card__icon">
                    <span class="material-symbols-rounded">group</span>
                </div>
                <div class="component-stat-card__content">
                    <span class="component-stat-card__title"><?php echo __('profile.stats_followers'); ?></span>
                    <span class="component-stat-card__value" data-ref="stat-followers"><?php echo number_format($stats['followers_count'] ?? 0); ?></span>
                </div>
            </div>
            <div class="component-stat-card">
                <div class="component-stat-card__icon">
                    <span class="material-symbols-rounded">person_search</span>
                </div>
                <div class="component-stat-card__content">
                    <span class="component-stat-card__title"><?php echo __('profile.stats_following'); ?></span>
                    <span class="component-stat-card__value" data-ref="stat-following"><?php echo number_format($stats['following_count'] ?? 0); ?></span>
                </div>
            </div>
            <div class="component-stat-card">
                <div class="component-stat-card__icon">
                    <span class="material-symbols-rounded">palette</span>
                </div>
                <div class="component-stat-card__content">
                    <span class="component-stat-card__title"><?php echo __('profile.stats_pubs'); ?></span>
                    <span class="component-stat-card__value" data-ref="stat-pubs"><?php echo number_format($stats['total_publications']); ?></span>
                </div>
            </div>
            <div class="component-stat-card">
                <div class="component-stat-card__icon">
                    <span class="material-symbols-rounded component-text-accent">favorite</span>
                </div>
                <div class="component-stat-card__content">
                    <span class="component-stat-card__title"><?php echo __('profile.stats_likes'); ?></span>
                    <span class="component-stat-card__value" data-ref="stat-likes"><?php echo number_format($stats['total_likes_received']); ?></span>
                </div>
            </div>
            <div class="component-stat-card">
                <div class="component-stat-card__icon">
                    <span class="material-symbols-rounded">visibility</span>
                </div>
                <div class="component-stat-card__content">
                    <span class="component-stat-card__title"><?php echo __('profile.stats_views'); ?></span>
                    <span class="component-stat-card__value" data-ref="stat-views"><?php echo number_format($stats['total_views_received']); ?></span>
                </div>
            </div>
        </div>
    </div>
</div>