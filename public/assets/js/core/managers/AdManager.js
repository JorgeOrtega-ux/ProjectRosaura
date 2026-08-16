export class AdManager {
    constructor() {
        this.enabled = true;
        this.mode = 'mock';
        this.cooldownMs = 180000;
        this.defaultDuration = 5;
        this.totalAdsInPod = 1;
        this.adSenseConfig = {
            client: 'ca-pub-0000000000000000',
            slot: '0000000000'
        };

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
    }

    isExempt() {
        // Check if user has feat_no_ads or no_ads enabled in plan limits
        if (window.APP_LIMITS && (window.APP_LIMITS.feat_no_ads === true || window.APP_LIMITS.no_ads === true)) {
            return true;
        }

        // Check if user's current tier in APP_TIERS has feat_no_ads enabled
        if (window.APP_USER && window.APP_TIERS && Array.isArray(window.APP_TIERS)) {
            const userTierLevel = window.APP_USER.subscription_tier;
            const currentTierObj = window.APP_TIERS.find(t => parseInt(t.tier_level, 10) === parseInt(userTierLevel, 10));
            if (currentTierObj && (currentTierObj.feat_no_ads === 1 || currentTierObj.feat_no_ads === true || currentTierObj.feat_no_ads === '1')) {
                return true;
            }
        }

        // Check user session / config permissions if defined
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
        const lastTs = localStorage.getItem(this._storageKey);
        if (!lastTs) return false;
        const elapsed = Date.now() - parseInt(lastTs, 10);
        return elapsed < this.cooldownMs;
    }

    shouldShowAd(force = false) {
        if (!this.enabled) return false;
        if (force) return true;
        if (this.isExempt()) return false;
        if (this.isOnCooldown()) return false;
        return true;
    }

    async showInterstitial(options = {}) {
        const onComplete = options.onComplete || null;
        const force = options.force || false;
        const totalAds = options.totalAds || this.totalAdsInPod;
        const duration = options.duration || this.defaultDuration;
        const mode = options.mode || this.mode;

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
        this._currentDuration = Math.max(2, duration);
        this._remainingSeconds = this._currentDuration;
        this._isSoundMuted = true;

        if (!window.modalSystem) {
            if (typeof onComplete === 'function') {
                onComplete();
            }
            return { shown: false, reason: 'no_modal_system' };
        }

        return new Promise((resolve) => {
            this._activeResolve = resolve;

            window.modalSystem.show('adBreakModal', {
                currentAd: this._currentAdIndex,
                totalAds: this._totalAds,
                duration: this._currentDuration,
                mode: mode,
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
            totalAds: options.totalAds || 2,
            duration: options.duration || 5,
            mode: options.mode || 'mock',
            ...options
        });
    }

    _initAdView(modalBox, mode) {
        this._attachEventListeners(modalBox);

        if (mode === 'adsense') {
            try {
                if (window.adsbygoogle && Array.isArray(window.adsbygoogle)) {
                    window.adsbygoogle.push({});
                }
            } catch (err) {}
        }

        this._startCountdown(modalBox);
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
            this._handleSkip();
            return;
        }

        const soundBtn = e.target.closest('[data-action="toggleAdSound"]');
        if (soundBtn) {
            e.preventDefault();
            this._toggleSound(soundBtn);
            return;
        }

        const visitBtn = e.target.closest('[data-action="visitAdSponsor"]');
        if (visitBtn) {
            e.preventDefault();
            window.open('https://rosaura.io', '_blank');
            return;
        }
    }

    _toggleSound(soundBtn) {
        this._isSoundMuted = !this._isSoundMuted;
        const iconEl = soundBtn.querySelector('[data-ref="ad-sound-icon"]');
        if (iconEl) {
            iconEl.textContent = this._isSoundMuted ? 'volume_off' : 'volume_up';
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
        if (this._timerInterval) {
            clearInterval(this._timerInterval);
            this._timerInterval = null;
        }
    }
}
