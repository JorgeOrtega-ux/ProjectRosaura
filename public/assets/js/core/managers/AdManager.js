import { CardTemplates } from '../components/CardTemplates.js';

export class AdManager {
    constructor() {
        this.enabled = true;
        this.testMode = false;
        this.mode = 'mock';
        this.cooldownMs = 180000;
        this.defaultDuration = 5;
        this.totalAdsInPod = 1;

        this.feedAdsEnabled = true;
        this.feedAdInterval = 8;
        this.feedAdProvider = 'mock';
        this.feedMockConfig = {
            title: 'Patrocinado',
            desc: 'Explora lienzos colaborativos y funciones exclusivas en Rosaura',
            badge: 'Patrocinado',
            ctaText: 'Descubrir más',
            ctaUrl: '/upgrade'
        };

        this.modalAdsEnabled = true;
        this.modalAdProvider = 'mock';
        this.modalMutedDefault = true;
        this.modalMockConfig = {
            sponsorTitle: 'Rosaura Cloud',
            sponsorTagline: 'Infraestructura de renderizado colaborativo ultrarrápida',
            sponsorUrl: 'https://rosaura.io',
            sponsorAvatar: 'cloud_done'
        };

        this.drawerAdsEnabled = true;
        this.drawerPaletteEnabled = true;
        this.drawerTemplatesEnabled = true;
        this.drawerAdProvider = 'mock';
        this.drawerMockConfig = {
            title: 'Paletas y Plantillas Pro',
            tagline: 'Desbloquea exportaciones ilimitadas y tokens',
            ctaUrl: '/upgrade',
            ctaText: 'Ver planes',
            badge: 'PRO'
        };

        this.adSenseConfig = {
            client: 'ca-pub-0000000000000000',
            slot: '0000000000',
            inFeedSlot: '0000000000',
            inFeedLayoutKey: '-fb+5w+4e-db+86'
        };

        this.activeCampaigns = {
            feed: [],
            modal: [],
            drawer_palette: [],
            drawer_templates: []
        };
        this._feedRotationIndex = 0;

        this._storageKey = 'pr_last_ad_break_ts';
        this._currentAdIndex = 1;
        this._totalAds = 1;
        this._remainingSeconds = 5;
        this._currentDuration = 5;
        this._timerInterval = null;
        this._animationFrameId = null;
        this._isSoundMuted = true;
        this._activeResolve = null;
        this._activeBox = null;
        this._boundClickHandler = this._handleClick.bind(this);

        if (window.APP_ACTIVE_CAMPAIGNS) {
            this.activeCampaigns = window.APP_ACTIVE_CAMPAIGNS;
        }

        if (window.APP_MONETIZATION_CONFIG) {
            this.syncConfig(window.APP_MONETIZATION_CONFIG);
        }
    }

    syncConfig(cfg) {
        if (!cfg || typeof cfg !== 'object') return;

        if (window.APP_ACTIVE_CAMPAIGNS) {
            this.activeCampaigns = window.APP_ACTIVE_CAMPAIGNS;
        }

        this.enabled = cfg.enabled !== undefined ? (Number(cfg.enabled) === 1) : this.enabled;
        this.testMode = cfg.test_mode !== undefined ? (Number(cfg.test_mode) === 1) : this.testMode;
        this.mode = cfg.default_provider || this.mode;

        if (cfg.modal_ad_cooldown_seconds) {
            this.cooldownMs = parseInt(cfg.modal_ad_cooldown_seconds, 10) * 1000;
        }
        if (cfg.modal_ad_duration_seconds) {
            this.defaultDuration = parseInt(cfg.modal_ad_duration_seconds, 10);
        }
        if (cfg.modal_ad_pod_size) {
            this.totalAdsInPod = parseInt(cfg.modal_ad_pod_size, 10);
        }

        this.feedAdsEnabled = cfg.feed_ads_enabled !== undefined ? (Number(cfg.feed_ads_enabled) === 1) : this.feedAdsEnabled;
        if (cfg.feed_ad_interval) {
            this.feedAdInterval = parseInt(cfg.feed_ad_interval, 10);
        }
        if (cfg.feed_ad_provider) {
            this.feedAdProvider = cfg.feed_ad_provider;
        }
        if (cfg.feed_mock_title) this.feedMockConfig.title = cfg.feed_mock_title;
        if (cfg.feed_mock_desc) this.feedMockConfig.desc = cfg.feed_mock_desc;
        if (cfg.feed_mock_badge) this.feedMockConfig.badge = cfg.feed_mock_badge;
        if (cfg.feed_mock_cta_text) this.feedMockConfig.ctaText = cfg.feed_mock_cta_text;
        if (cfg.feed_mock_cta_url) this.feedMockConfig.ctaUrl = cfg.feed_mock_cta_url;
        if (cfg.feed_mock_image_url !== undefined) this.feedMockConfig.imageUrl = cfg.feed_mock_image_url;
        if (cfg.feed_custom_html !== undefined) this.feedCustomHtml = cfg.feed_custom_html;
        if (cfg.modal_custom_html !== undefined) this.modalCustomHtml = cfg.modal_custom_html;
        if (cfg.drawer_custom_html !== undefined) this.drawerCustomHtml = cfg.drawer_custom_html;
        if (cfg.custom_header_scripts !== undefined) this.customHeaderScripts = cfg.custom_header_scripts;

        this.modalAdsEnabled = cfg.modal_ads_enabled !== undefined ? (Number(cfg.modal_ads_enabled) === 1) : this.modalAdsEnabled;
        if (cfg.modal_ad_provider) {
            this.modalAdProvider = cfg.modal_ad_provider;
        }
        if (cfg.modal_ad_muted_default !== undefined) {
            this.modalMutedDefault = Number(cfg.modal_ad_muted_default) === 1;
        }
        if (cfg.modal_mock_sponsor_title) this.modalMockConfig.sponsorTitle = cfg.modal_mock_sponsor_title;
        if (cfg.modal_mock_sponsor_tagline) this.modalMockConfig.sponsorTagline = cfg.modal_mock_sponsor_tagline;
        if (cfg.modal_mock_sponsor_url) this.modalMockConfig.sponsorUrl = cfg.modal_mock_sponsor_url;
        if (cfg.modal_mock_sponsor_avatar) this.modalMockConfig.sponsorAvatar = cfg.modal_mock_sponsor_avatar;

        this.drawerAdsEnabled = cfg.drawer_ads_enabled !== undefined ? (Number(cfg.drawer_ads_enabled) === 1) : this.drawerAdsEnabled;
        this.drawerPaletteEnabled = cfg.drawer_ad_palette_enabled !== undefined ? (Number(cfg.drawer_ad_palette_enabled) === 1) : this.drawerPaletteEnabled;
        this.drawerTemplatesEnabled = cfg.drawer_ad_templates_enabled !== undefined ? (Number(cfg.drawer_ad_templates_enabled) === 1) : this.drawerTemplatesEnabled;
        if (cfg.drawer_ad_provider) {
            this.drawerAdProvider = cfg.drawer_ad_provider;
        }
        if (cfg.drawer_mock_title) this.drawerMockConfig.title = cfg.drawer_mock_title;
        if (cfg.drawer_mock_tagline) this.drawerMockConfig.tagline = cfg.drawer_mock_tagline;
        if (cfg.drawer_mock_cta_url) this.drawerMockConfig.ctaUrl = cfg.drawer_mock_cta_url;
        if (cfg.drawer_mock_cta_text) this.drawerMockConfig.ctaText = cfg.drawer_mock_cta_text;
        if (cfg.drawer_mock_badge) this.drawerMockConfig.badge = cfg.drawer_mock_badge;

        if (cfg.adsense_client_id) this.adSenseConfig.client = cfg.adsense_client_id;
        if (cfg.feed_adsense_slot) this.adSenseConfig.inFeedSlot = cfg.feed_adsense_slot;
        if (cfg.feed_adsense_layout_key) this.adSenseConfig.inFeedLayoutKey = cfg.feed_adsense_layout_key;
        if (cfg.modal_adsense_slot) this.adSenseConfig.slot = cfg.modal_adsense_slot;
    }

    injectFeedAds(items, interval = this.feedAdInterval) {
        if (!Array.isArray(items) || items.length === 0) return items;
        if (!this.enabled || !this.feedAdsEnabled) return items;
        if (this.isExempt()) return items;

        const effectiveInterval = Math.max(2, interval || this.feedAdInterval);
        const result = [];
        let counter = 0;
        const feedCampaigns = (this.activeCampaigns && Array.isArray(this.activeCampaigns.feed) && this.activeCampaigns.feed.length > 0)
            ? this.activeCampaigns.feed
            : null;

        for (let i = 0; i < items.length; i++) {
            result.push(items[i]);
            counter++;

            if (counter >= effectiveInterval && i < items.length - 1) {
                let cardData = {
                    is_ad: true,
                    id: `ad_${Date.now()}_${i}`,
                    uuid: `ad_${i}`,
                    provider: this.feedAdProvider,
                    name: this.feedMockConfig.title,
                    desc: this.feedMockConfig.desc,
                    badge: this.feedMockConfig.badge,
                    imageUrl: this.feedMockConfig.imageUrl,
                    ctaText: this.feedMockConfig.ctaText,
                    ctaUrl: this.feedMockConfig.ctaUrl,
                    customHtml: this.feedCustomHtml
                };

                if (this.feedAdProvider === 'mock' && feedCampaigns && feedCampaigns.length > 0) {
                    const campaign = feedCampaigns[this._feedRotationIndex % feedCampaigns.length];
                    this._feedRotationIndex++;
                    cardData.name = campaign.title || campaign.name || cardData.name;
                    cardData.desc = campaign.description || cardData.desc;
                    cardData.badge = campaign.badge_text || cardData.badge;
                    cardData.imageUrl = campaign.media_url || cardData.imageUrl;
                    cardData.ctaText = campaign.cta_text || cardData.ctaText;
                    cardData.ctaUrl = campaign.target_url || cardData.ctaUrl;
                    if (campaign.html_content) {
                        cardData.customHtml = campaign.html_content;
                        cardData.provider = 'custom';
                    }
                }

                result.push(cardData);
                counter = 0;
            }
        }
        return result;
    }

    isExempt() {
        if (this.testMode) return false;

        if (window.APP_LIMITS && (window.APP_LIMITS.feat_no_ads === true || window.APP_LIMITS.no_ads === true)) {
            return true;
        }

        if (window.APP_USER && window.APP_TIERS && Array.isArray(window.APP_TIERS)) {
            const userTierLevel = window.APP_USER.subscription_tier;
            const currentTierObj = window.APP_TIERS.find(t => parseInt(t.tier_level, 10) === parseInt(userTierLevel, 10));
            if (currentTierObj && (currentTierObj.feat_no_ads === 1 || currentTierObj.feat_no_ads === true || currentTierObj.feat_no_ads === '1')) {
                return true;
            }
        }

        const perms = (window.APP_CONFIG && Array.isArray(window.APP_CONFIG.permissions))
            ? window.APP_CONFIG.permissions
            : (window.APP_USER && Array.isArray(window.APP_USER.permissions)
                ? window.APP_USER.permissions
                : (Array.isArray(window.userPermissions) ? window.userPermissions : []));

        if (perms.includes('no_ads') || perms.includes('feat_no_ads')) {
            return true;
        }

        return false;
    }

    isOnCooldown() {
        if (this.testMode) return false;
        const lastTs = localStorage.getItem(this._storageKey);
        if (!lastTs) return false;
        const elapsed = Date.now() - parseInt(lastTs, 10);
        return elapsed < this.cooldownMs;
    }

    shouldShowAd(force = false) {
        if (!this.enabled || !this.modalAdsEnabled) return false;
        if (force || this.testMode) return true;
        if (this.isExempt()) return false;
        if (this.isOnCooldown()) return false;
        return true;
    }

    async showInterstitial(options = {}) {
        const onComplete = options.onComplete || null;
        const force = options.force || false;
        const totalAds = options.totalAds || this.totalAdsInPod;
        const duration = options.duration || this.defaultDuration;
        const mode = options.mode || this.modalAdProvider || this.mode;

        if (!this.shouldShowAd(force)) {
            if (typeof onComplete === 'function') {
                onComplete();
            }
            return {
                shown: false,
                reason: this.isExempt() ? 'permission_exempt' : 'cooldown'
            };
        }

        this._clearTimers();
        this._currentAdIndex = 1;
        this._totalAds = Math.max(1, totalAds);
        this._remainingSeconds = duration;
        this._currentDuration = duration;
        this._isSoundMuted = this.modalMutedDefault;

        if (!window.modalSystem) {
            if (typeof onComplete === 'function') {
                onComplete();
            }
            return { shown: false, reason: 'no_modal_system' };
        }

        return new Promise((resolve) => {
            this._activeResolve = resolve;

            let sponsorTitle = options.sponsorTitle || this.modalMockConfig.sponsorTitle;
            let sponsorTagline = options.sponsorTagline || this.modalMockConfig.sponsorTagline;
            let sponsorAvatar = options.sponsorAvatar || this.modalMockConfig.sponsorAvatar;
            let sponsorUrl = options.sponsorUrl || this.modalMockConfig.sponsorUrl;
            let customHtml = options.customHtml || this.modalCustomHtml;
            let imageUrl = options.imageUrl || this.modalMockConfig.imageUrl || '/assets/img/ads/ad_nordvpn_shield.jpg';
            let videoUrl = options.videoUrl || this.modalMockConfig.videoUrl || '';

            const modalCampaigns = (this.activeCampaigns && Array.isArray(this.activeCampaigns.modal) && this.activeCampaigns.modal.length > 0)
                ? this.activeCampaigns.modal
                : null;

            if (mode === 'mock' && modalCampaigns && modalCampaigns.length > 0) {
                const randomCampaign = modalCampaigns[Math.floor(Math.random() * modalCampaigns.length)];
                sponsorTitle = randomCampaign.title || randomCampaign.name || sponsorTitle;
                sponsorTagline = randomCampaign.description || sponsorTagline;
                sponsorUrl = randomCampaign.target_url || sponsorUrl;
                if (randomCampaign.media_url) {
                    if (randomCampaign.media_url.endsWith('.mp4') || randomCampaign.media_url.endsWith('.webm')) {
                        videoUrl = randomCampaign.media_url;
                    } else {
                        imageUrl = randomCampaign.media_url;
                    }
                }
                if (randomCampaign.html_content) {
                    customHtml = randomCampaign.html_content;
                }
            }

            this._activeSponsorUrl = sponsorUrl;

            window.modalSystem.show('adBreakModal', {
                currentAd: this._currentAdIndex,
                totalAds: this._totalAds,
                duration: this._currentDuration,
                mode: mode,
                sponsorTitle: sponsorTitle,
                sponsorTagline: sponsorTagline,
                sponsorAvatar: sponsorAvatar,
                sponsorUrl: sponsorUrl,
                imageUrl: imageUrl,
                videoUrl: videoUrl,
                customHtml: customHtml,
                adClient: this.adSenseConfig.client,
                adSlot: this.adSenseConfig.slot
            }).then((res) => {
                this._clearTimers();
                this._removeEventListeners();
                this._recordAdImpression();

                if (typeof onComplete === 'function') {
                    onComplete();
                }

                if (this._activeResolve) {
                    this._activeResolve({ shown: true, completed: true, result: res });
                    this._activeResolve = null;
                }
            });

            requestAnimationFrame(() => {
                const modalBox = document.querySelector('.component-modal-box--ad');
                if (modalBox) {
                    this._activeBox = modalBox;
                    this._initAdView(modalBox, mode);
                }
            });
        });
    }

    testAdBreak(options = {}) {
        return this.showInterstitial({
            force: true,
            totalAds: options.totalAds || 1,
            duration: options.duration || this.defaultDuration,
            mode: options.mode || 'mock',
            ...options
        });
    }

    initDrawerAds() {
        const footers = document.querySelectorAll('.component-menu-footer--ad');
        if (!this.enabled || !this.drawerAdsEnabled || this.isExempt()) {
            footers.forEach(el => el.classList.add('disabled'));
            return;
        }

        const paletteFooter = document.querySelector('[data-ref="palette-ad-footer"]');
        if (paletteFooter) {
            if (!this.drawerPaletteEnabled) {
                paletteFooter.classList.add('disabled');
            } else {
                paletteFooter.classList.remove('disabled');
            }
        }

        const templatesFooter = document.querySelector('[data-ref="templates-ad-footer"]');
        if (templatesFooter) {
            if (!this.drawerTemplatesEnabled) {
                templatesFooter.classList.add('disabled');
            } else {
                templatesFooter.classList.remove('disabled');
            }
        }

        if (this.drawerAdProvider === 'custom' && this.drawerCustomHtml) {
            document.querySelectorAll('.component-drawer-ad-card').forEach(card => {
                card.innerHTML = this.drawerCustomHtml;
            });
        } else if (this.drawerAdProvider === 'mock') {
            const paletteCard = document.querySelector('.component-drawer-ad-card[data-ad-card="palette"]');
            if (paletteCard) {
                const paletteCamp = (this.activeCampaigns && this.activeCampaigns.drawer_palette && this.activeCampaigns.drawer_palette[0])
                    ? this.activeCampaigns.drawer_palette[0]
                    : this.drawerMockConfig;

                const cardData = {
                    name: paletteCamp.title || paletteCamp.name || this.drawerMockConfig.title,
                    badge: paletteCamp.badge_text || paletteCamp.badge || 'RECOMENDADO',
                    ctaText: paletteCamp.cta_text || paletteCamp.ctaText || 'Conocer Modelos',
                    ctaUrl: paletteCamp.target_url || paletteCamp.ctaUrl || 'https://wacom.com',
                    imageUrl: paletteCamp.media_url || '/assets/img/ads/ad_graphics_tablet.jpg',
                    thumbnail_url: paletteCamp.media_url || '/assets/img/ads/ad_graphics_tablet.jpg',
                    provider: 'mock'
                };

                paletteCard.innerHTML = CardTemplates.nativeAdCard(cardData);
            }

            const templatesCard = document.querySelector('.component-drawer-ad-card[data-ad-card="templates"]');
            if (templatesCard) {
                const tmplCamp = (this.activeCampaigns && this.activeCampaigns.drawer_templates && this.activeCampaigns.drawer_templates[0])
                    ? this.activeCampaigns.drawer_templates[0]
                    : this.drawerMockConfig;

                const cardData = {
                    name: tmplCamp.title || tmplCamp.name || this.drawerMockConfig.title,
                    badge: tmplCamp.badge_text || tmplCamp.badge || 'DESTACADO',
                    ctaText: tmplCamp.cta_text || tmplCamp.ctaText || 'Explorar Plantillas',
                    ctaUrl: tmplCamp.target_url || tmplCamp.ctaUrl || 'https://canva.com',
                    imageUrl: tmplCamp.media_url || '/assets/img/ads/ad_templates_pro.jpg',
                    thumbnail_url: tmplCamp.media_url || '/assets/img/ads/ad_templates_pro.jpg',
                    provider: 'mock'
                };

                templatesCard.innerHTML = CardTemplates.nativeAdCard(cardData);
            }
        } else if (this.drawerAdProvider === 'adsense') {
            try {
                if (window.adsbygoogle && Array.isArray(window.adsbygoogle)) {
                    window.adsbygoogle.push({});
                }
            } catch (err) {}
        }
    }

    _initAdView(modalBox, mode) {
        this._attachEventListeners(modalBox);

        if (mode === 'adsense') {
            try {
                if (window.adsbygoogle && Array.isArray(window.adsbygoogle)) {
                    window.adsbygoogle.push({});
                }
            } catch (err) {}
        } else {
            const videoEl = modalBox.querySelector('[data-ref="ad-video-element"]');
            if (videoEl) {
                videoEl.muted = this._isSoundMuted;
                videoEl.play().catch(() => {});
            }

            const motionCanvas = modalBox.querySelector('[data-ref="ad-motion-canvas"]');
            if (motionCanvas) {
                this._startMotionCanvas(motionCanvas);
            }
        }

        this._startCountdown(modalBox);
    }

    _startMotionCanvas(canvas) {
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const resize = () => {
            const rect = canvas.getBoundingClientRect();
            canvas.width = rect.width || 640;
            canvas.height = rect.height || 360;
        };
        resize();

        const particles = [];
        const numParticles = 30;
        for (let i = 0; i < numParticles; i++) {
            particles.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                vx: (Math.random() - 0.5) * 1.2,
                vy: (Math.random() - 0.5) * 1.2,
                size: Math.random() * 2 + 1,
                alpha: Math.random() * 0.5 + 0.2,
                hue: Math.random() > 0.5 ? 200 : 270
            });
        }

        let scanY = 0;
        const scanSpeed = 1.5;

        const renderFrame = () => {
            if (!this._activeBox || !document.contains(canvas)) return;

            ctx.clearRect(0, 0, canvas.width, canvas.height);

            scanY += scanSpeed;
            if (scanY > canvas.height) scanY = 0;

            const grad = ctx.createLinearGradient(0, scanY - 25, 0, scanY + 10);
            grad.addColorStop(0, 'rgba(59, 130, 246, 0)');
            grad.addColorStop(0.7, 'rgba(139, 92, 246, 0.12)');
            grad.addColorStop(1, 'rgba(59, 130, 246, 0.35)');

            ctx.fillStyle = grad;
            ctx.fillRect(0, scanY - 25, canvas.width, 35);

            for (let i = 0; i < particles.length; i++) {
                const p = particles[i];
                p.x += p.vx;
                p.y += p.vy;

                if (p.x < 0) p.x = canvas.width;
                if (p.x > canvas.width) p.x = 0;
                if (p.y < 0) p.y = canvas.height;
                if (p.y > canvas.height) p.y = 0;

                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fillStyle = `hsla(${p.hue}, 85%, 65%, ${p.alpha})`;
                ctx.fill();

                for (let j = i + 1; j < particles.length; j++) {
                    const p2 = particles[j];
                    const dx = p.x - p2.x;
                    const dy = p.y - p2.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < 80) {
                        ctx.beginPath();
                        ctx.moveTo(p.x, p.y);
                        ctx.lineTo(p2.x, p2.y);
                        ctx.strokeStyle = `rgba(139, 92, 246, ${(1 - dist / 80) * 0.2})`;
                        ctx.lineWidth = 0.8;
                        ctx.stroke();
                    }
                }
            }

            this._motionFrameId = requestAnimationFrame(renderFrame);
        };

        this._motionFrameId = requestAnimationFrame(renderFrame);
    }

    _attachEventListeners(modalBox) {
        modalBox.addEventListener('click', this._boundClickHandler);
    }

    _removeEventListeners() {
        if (this._activeBox) {
            this._activeBox.removeEventListener('click', this._boundClickHandler);
            this._activeBox = null;
        }
    }

    _handleClick(e) {
        const skipBtn = e.target.closest('[data-action="skipAdBreak"]');
        if (skipBtn) {
            e.preventDefault();
            e.stopPropagation();
            this._handleSkip();
            return;
        }

        const soundBtn = e.target.closest('[data-action="toggleAdSound"]');
        if (soundBtn) {
            e.preventDefault();
            e.stopPropagation();
            this._toggleSound(soundBtn);
            return;
        }

        const visitBtn = e.target.closest('[data-action="visitAdSponsor"]') || e.target.closest('.component-ad-mock-media');
        if (visitBtn) {
            e.preventDefault();
            const targetUrl = this._activeSponsorUrl || this.modalMockConfig.sponsorUrl || 'https://nordvpn.com';
            window.open(targetUrl, '_blank', 'noopener,noreferrer');
            return;
        }
    }

    _toggleSound(soundBtn) {
        this._isSoundMuted = !this._isSoundMuted;
        const iconEl = soundBtn.querySelector('[data-ref="ad-sound-icon"]');
        if (iconEl) {
            iconEl.textContent = this._isSoundMuted ? 'volume_off' : 'volume_up';
        }

        const videoEl = this._activeBox ? this._activeBox.querySelector('video') : null;
        if (videoEl) {
            videoEl.muted = this._isSoundMuted;
        }
    }

    _handleSkip() {
        this._clearTimers();
        if (window.modalSystem) {
            window.modalSystem.closeCurrent(true);
        }
    }

    _startCountdown(modalBox) {
        this._clearTimers();
        const circumference = 56.55;
        const startTime = Date.now();
        const totalDurationMs = this._currentDuration * 1000;

        const progressCircle = modalBox.querySelector('[data-ref="ad-timer-progress"]');
        const numberEl = modalBox.querySelector('[data-ref="ad-timer-number"]');
        const fillBar = modalBox.querySelector('[data-ref="ad-progress-bar-fill"]');

        const updateTick = () => {
            const now = Date.now();
            const elapsed = now - startTime;
            const progressRatio = Math.min(1, elapsed / totalDurationMs);
            const remainingSec = Math.max(0, Math.ceil((totalDurationMs - elapsed) / 1000));

            if (numberEl) {
                numberEl.textContent = remainingSec.toString();
            }

            if (progressCircle) {
                const offset = circumference * (1 - progressRatio);
                progressCircle.setAttribute('stroke-dashoffset', offset.toFixed(2));
            }

            if (fillBar) {
                fillBar.style.width = `${(progressRatio * 100).toFixed(1)}%`;
            }

            if (progressRatio >= 1) {
                this._onAdFinished(modalBox);
            } else {
                this._animationFrameId = requestAnimationFrame(updateTick);
            }
        };

        this._animationFrameId = requestAnimationFrame(updateTick);
    }

    _onAdFinished(modalBox) {
        this._clearTimers();

        if (this._currentAdIndex < this._totalAds) {
            this._currentAdIndex++;
            this._remainingSeconds = this._currentDuration;

            const counterEl = modalBox.querySelector('[data-ref="ad-pod-counter-text"]');
            const __ = (typeof window.__ === 'function') ? window.__ : (k => k);
            if (counterEl) {
                counterEl.textContent = __('ad_pod_counter')
                    .replace('{current}', this._currentAdIndex)
                    .replace('{total}', this._totalAds);
            }

            const fillBar = modalBox.querySelector('[data-ref="ad-progress-bar-fill"]');
            if (fillBar) {
                fillBar.style.width = '0%';
            }

            this._startCountdown(modalBox);
        } else {
            const skipBtn = modalBox.querySelector('[data-ref="ad-skip-btn"]');
            const radialBox = modalBox.querySelector('[data-ref="ad-timer-radial-box"]');
            const skipIcon = modalBox.querySelector('[data-ref="ad-skip-icon"]');
            const skipLabel = modalBox.querySelector('[data-ref="ad-skip-label"]');
            const __ = (typeof window.__ === 'function') ? window.__ : (k => k);

            if (radialBox) {
                radialBox.classList.add('disabled');
            }

            if (skipIcon) {
                skipIcon.classList.remove('disabled');
            }

            if (skipLabel) {
                skipLabel.textContent = __('ad_continue_button');
            }

            if (skipBtn) {
                skipBtn.classList.remove('disabled');
            }
        }
    }

    _recordAdImpression() {
        try {
            localStorage.setItem(this._storageKey, Date.now().toString());
        } catch (e) {}
    }

    _clearTimers() {
        if (this._animationFrameId) {
            cancelAnimationFrame(this._animationFrameId);
            this._animationFrameId = null;
        }
        if (this._motionFrameId) {
            cancelAnimationFrame(this._motionFrameId);
            this._motionFrameId = null;
        }
        if (this._timerInterval) {
            clearInterval(this._timerInterval);
            this._timerInterval = null;
        }
    }
}
