/**
 * SoundManager.js - Motor de Audio MP3 (Web Audio API)
 *
 * Sin síntesis JS. Todos los sonidos son archivos MP3 reales.
 * Agregar un perk nuevo = una entrada en SOUND_PROFILES + el MP3 en /assets/sounds/.
 *
 * Características:
 *  - maxDuration : corta el MP3 al terminar la animación (fade-out de 150ms)
 *  - throttleMs  : perks multi-objetivo (cluster, meteor) solo disparan 1 sonido
 *  - Panning espacial según posición X en el canvas
 *  - DSP chain: compressor → masterGain (limiter de estudio)
 */

// =============================================================================
// SOUND PROFILES — única fuente de verdad
// Campos:
//   file        – nombre del MP3 en /assets/sounds/ (obligatorio)
//   warnFile    – MP3 de advertencia/loop durante cuenta regresiva (opcional)
//   maxDuration – segundos máximos de reproducción (recorta el MP3 si es largo)
//   throttleMs  – ms mínimos entre disparos del mismo perk (0 = sin límite)
//                 Para perks multi-objetivo: igualar a la duración de la animación
// =============================================================================
const SOUND_PROFILES = {

    orbital_cannon_1: {
        file:        'orbital_cannon.mp3',
        warnFile:    'orbital_cannon_warning.mp3',
        maxDuration: 7.0,   // explosion.duration 10s → dejamos sonar 7s
        throttleMs:  0,
    },

    atomic_bomb_1: {
        file:        'atomic_bomb.mp3',
        warnFile:    'atomic_bomb_warning.mp3',
        maxDuration: 7.0,   // explosion.duration 10s
        throttleMs:  0,
    },

    black_hole_1: {
        file:        'black_hole.mp3',
        warnFile:    'black_hole_warning.mp3',
        maxDuration: 7.0,   // explosion.duration 10s
        throttleMs:  0,
    },

    // multi_target — warnThrottleMs: solo 1 warning por ráfaga de N eventos
    meteor_shower_1: {
        file:          'meteor_shower.mp3',
        warnFile:      'meteor_shower_warning.mp3',
        maxDuration:   5.0,    // explosion.duration 4s + cola
        throttleMs:    7000,   // jitter_delay 5s → 1 explosión por ráfaga
        warnThrottleMs: 14000, // warning_seconds 12s → 1 warning total
    },

    cluster_bomb_1: {
        file:          'cluster_bomb.mp3',
        warnFile:      'cluster_bomb_warning.mp3',
        maxDuration:   5.0,    // explosion.duration 5s
        throttleMs:    7000,   // 5 objetivos → 1 explosión
        warnThrottleMs: 10000, // warning_seconds 8s → 1 warning
    },

    pixel_shield_1: {
        file:        'pixel_shield.mp3',
        maxDuration: 2.0,
        throttleMs:  0,
    },

    pixel_missile_1: {
        file:        'pixel_missile.mp3',
        warnFile:    'pixel_missile_warning.mp3',
        maxDuration: 2.5,
        throttleMs:  300,
    },

    pixel_bomb_1: {
        file:        'pixel_bomb.mp3',
        warnFile:    'pixel_bomb_warning.mp3',
        maxDuration: 3.0,
        throttleMs:  0,
    },

    mines_1: {
        file:        'mines.mp3',
        // warning_seconds: 0 → no necesita warnFile
        maxDuration: 2.0,
        throttleMs:  200,
    },

    supernova_blast: {
        file:        'supernova_blast.mp3',
        warnFile:    'supernova_blast_warning.mp3',
        maxDuration: 7.0,
        throttleMs:  0,
    },

    ion_strike: {
        file:        'ion_strike.mp3',
        warnFile:    'ion_strike_warning.mp3',
        maxDuration: 4.0,
        throttleMs:  300,
    },
};

// =============================================================================
// SoundManager
// =============================================================================
export class SoundManager {
    constructor() {
        this.ctx          = null;
        this.masterGain   = null;
        this.compressor   = null;
        this.isMuted      = false;
        this.volume       = 0.9;

        this.activeLoops    = new Map(); // key → { source, gainNode }
        this.sampleCache    = new Map(); // cacheKey → AudioBuffer
        this._lastExplosion = new Map(); // perkId   → timestamp (throttle explosiones)
        this._lastWarning   = new Map(); // perkId   → timestamp (throttle warnings)

        this.initOnUserGesture();
        this.preloadSamples();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Inicialización del contexto de audio
    // ─────────────────────────────────────────────────────────────────────────

    initOnUserGesture() {
        const initCtx = () => {
            if (!this.ctx) {
                const AudioCtx = window.AudioContext || window.webkitAudioContext;
                if (!AudioCtx) return;
                this.ctx = new AudioCtx();

                // ── Cadena DSP Hollywood ─────────────────────────────────────
                //  Fuente → inputBus → EQ (3 bandas) → Compressor → Limiter → MasterGain → Salida
                //
                //  EQ:
                //   · Low-shelf  +3 dB @ 80 Hz   — cuerpo y peso en explosiones
                //   · Peak       +2 dB @ 3 kHz    — presencia e inteligibilidad
                //   · High-shelf +1.5 dB @ 10 kHz — aire y brillo cinematografico
                //
                //  Compressor (cine):
                //   threshold -18 dB | ratio 4:1 | knee 12 dB (suave)
                //   attack 5 ms (transparente) | release 300 ms (musical)
                //
                //  Limiter (brickwall):
                //   threshold -0.5 dB | ratio 20:1 | attack 0 ms | release 50 ms
                //   Evita cualquier clip en el DAC, equivalente a un True Peak limiter

                // 1. Bus de entrada — todas las fuentes se conectan aqui
                this.inputBus = this.ctx.createGain();
                this.inputBus.gain.setValueAtTime(1.0, this.ctx.currentTime);

                // 2. EQ — Low-shelf
                this.eqLow = this.ctx.createBiquadFilter();
                this.eqLow.type            = 'lowshelf';
                this.eqLow.frequency.value = 80;
                this.eqLow.gain.value      = 3.0;

                // 3. EQ — Peak de presencia
                this.eqMid = this.ctx.createBiquadFilter();
                this.eqMid.type            = 'peaking';
                this.eqMid.frequency.value = 3000;
                this.eqMid.Q.value         = 0.8;
                this.eqMid.gain.value      = 2.0;

                // 4. EQ — High-shelf de aire
                this.eqHigh = this.ctx.createBiquadFilter();
                this.eqHigh.type            = 'highshelf';
                this.eqHigh.frequency.value = 10000;
                this.eqHigh.gain.value      = 1.5;

                // 5. Compresor cinematografico (suave, transparente)
                this.compressor = this.ctx.createDynamicsCompressor();
                this.compressor.threshold.setValueAtTime(-18, this.ctx.currentTime);
                this.compressor.knee.setValueAtTime(12,   this.ctx.currentTime);
                this.compressor.ratio.setValueAtTime(4,   this.ctx.currentTime);
                this.compressor.attack.setValueAtTime(0.005, this.ctx.currentTime);
                this.compressor.release.setValueAtTime(0.30, this.ctx.currentTime);

                // 6. Limitador brickwall (evita clips)
                this.limiter = this.ctx.createDynamicsCompressor();
                this.limiter.threshold.setValueAtTime(-0.5, this.ctx.currentTime);
                this.limiter.knee.setValueAtTime(0,    this.ctx.currentTime);
                this.limiter.ratio.setValueAtTime(20,  this.ctx.currentTime);
                this.limiter.attack.setValueAtTime(0.0001, this.ctx.currentTime);
                this.limiter.release.setValueAtTime(0.05,  this.ctx.currentTime);

                // 7. Master gain
                this.masterGain = this.ctx.createGain();
                this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);

                // Cadena: inputBus → EQ low → EQ mid → EQ high → Compressor → Limiter → MasterGain → Salida
                this.inputBus.connect(this.eqLow);
                this.eqLow.connect(this.eqMid);
                this.eqMid.connect(this.eqHigh);
                this.eqHigh.connect(this.compressor);
                this.compressor.connect(this.limiter);
                this.limiter.connect(this.masterGain);
                this.masterGain.connect(this.ctx.destination);

            } else if (this.ctx.state === 'suspended') {
                this.ctx.resume();
            }
            window.removeEventListener('click',   initCtx);
            window.removeEventListener('keydown', initCtx);
        };

        window.addEventListener('click',   initCtx, { once: false });
        window.addEventListener('keydown', initCtx, { once: false });
    }

    ensureContext() {
        if (!this.ctx) {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (AudioCtx) this.ctx = new AudioCtx();
        }
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Volumen y mute
    // ─────────────────────────────────────────────────────────────────────────

    setMuted(muted) {
        this.isMuted = muted;
        if (this.masterGain && this.ctx) {
            this.masterGain.gain.setValueAtTime(
                this.isMuted ? 0 : this.volume,
                this.ctx.currentTime
            );
        }
    }

    setVolume(vol) {
        this.volume = Math.max(0, Math.min(1, vol));
        if (this.masterGain && this.ctx && !this.isMuted) {
            this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Panning espacial según posición X en el canvas
    // ─────────────────────────────────────────────────────────────────────────

    _createPanner(x = null, boardWidth = 4096) {
        if (!this.ctx) return null;

        if (typeof this.ctx.createStereoPanner === 'function') {
            const panner = this.ctx.createStereoPanner();
            if (x !== null && boardWidth > 0) {
                const pan = Math.max(-0.85, Math.min(0.85, (x / boardWidth) * 2 - 1));
                panner.pan.setValueAtTime(pan, this.ctx.currentTime);
            }
            panner.connect(this.inputBus);
            return panner;
        }

        const panner3d = this.ctx.createPanner();
        panner3d.panningModel = 'equalpower';
        if (x !== null && boardWidth > 0) {
            panner3d.setPosition((x / boardWidth) * 2 - 1, 0, 1);
        }
        panner3d.connect(this.inputBus);
        return panner3d;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Precarga de samples MP3
    // ─────────────────────────────────────────────────────────────────────────

    async preloadSamples() {
        // Carga 100% bajo demanda: Cero peticiones de audio al entrar al lienzo.
        // Los sonidos MP3 se descargan únicamente cuando se activa o lanza cada ventaja.
    }

    async _loadSample(cacheKey, url) {
        if (this.sampleCache.has(cacheKey)) {
            return this.sampleCache.get(cacheKey);
        }
        try {
            const res = await fetch(url);
            if (!res.ok) return null;

            const arrayBuffer = await res.arrayBuffer();

            return new Promise((resolve) => {
                const decode = () => {
                    if (!this.ctx) { setTimeout(decode, 200); return; }
                    this.ctx.decodeAudioData(arrayBuffer.slice(0))
                        .then(buf => {
                            this.sampleCache.set(cacheKey, buf);
                            resolve(buf);
                        })
                        .catch(() => resolve(null));
                };
                decode();
            });
        } catch (e) {
            return null;
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Helper: reproduce un AudioBuffer con maxDuration y fade-out
    // ─────────────────────────────────────────────────────────────────────────

    _playBuffer(buf, { maxDuration = null, x = null, boardWidth = 4096, loop = false, loopEnd = null } = {}) {
        if (!this.ctx) return null;

        const now     = this.ctx.currentTime;
        const clipDur = maxDuration
            ? Math.min(buf.duration, maxDuration)
            : buf.duration;

        // Cola de reverb: el sonido sigue sonando suavemente 0.8s más allá del clip
        // para que no se corte de golpe cuando acaba la animación
        const TAIL    = Math.min(0.8, buf.duration - clipDur > 0 ? 0.8 : 0.0);
        const playDur = clipDur + TAIL;

        const source = this.ctx.createBufferSource();
        source.buffer = buf;
        source.playbackRate.value = 0.95 + Math.random() * 0.1;

        if (loop) {
            source.loop    = true;
            source.loopEnd = loopEnd ?? Math.min(buf.duration, clipDur);
        }

        const fadeGain = this.ctx.createGain();
        fadeGain.gain.setValueAtTime(1.0, now);

        if (clipDur > 0.3) {
            // Mantener volumen pleno hasta el punto de corte de animación,
            // luego hacer un fade-out suave exponencial durante la cola
            fadeGain.gain.setValueAtTime(1.0, now + clipDur - 0.05);
            fadeGain.gain.exponentialRampToValueAtTime(0.001, now + playDur);
        }

        const panner = this._createPanner(x, boardWidth);
        source.connect(fadeGain);
        fadeGain.connect(panner ?? this.inputBus);

        source.start(now);
        source.stop(now + playDur);

        return { source, fadeGain };
    }

    // ─────────────────────────────────────────────────────────────────────────
    // UI click
    // ─────────────────────────────────────────────────────────────────────────

    playUiClick() {
        if (this.isMuted) return;
        this.ensureContext();
        if (!this.ctx) return;

        // Click de UI: sonido corto generado en memoria (no es un perk, no necesita MP3)
        const now = this.ctx.currentTime;
        const osc  = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(1400, now);
        osc.frequency.exponentialRampToValueAtTime(250, now + 0.035);

        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.035);

        osc.connect(gain);
        gain.connect(this.inputBus);
        osc.start(now);
        osc.stop(now + 0.035);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Warning sound (loop durante la cuenta regresiva)
    // ─────────────────────────────────────────────────────────────────────────

    async playWarningSound(perkId, durationSecs = 10, key = null) {
        if (this.isMuted) return;
        this.ensureContext();
        if (!this.ctx) return;

        const profile        = SOUND_PROFILES[perkId] || {};
        const warnThrottleMs = profile.warnThrottleMs || 0;

        // Throttle de warning: perks multi-objetivo solo reproducen 1 sonido de alarma
        if (warnThrottleMs > 0) {
            const last = this._lastWarning.get(perkId) || 0;
            const now  = Date.now();
            if (now - last < warnThrottleMs) return;
            this._lastWarning.set(perkId, now);
        }

        const warnKey = `${perkId}_warn`;
        let buf = this.sampleCache.get(warnKey);
        if (!buf && profile.warnFile) {
            const base = window.AppBasePath || '';
            buf = await this._loadSample(warnKey, `${base}/assets/sounds/${profile.warnFile}`);
        }
        if (!buf) return;

        const now    = this.ctx.currentTime;
        const source = this.ctx.createBufferSource();
        source.buffer  = buf;
        source.loop    = true;
        source.loopEnd = Math.min(buf.duration, durationSecs);

        const gainNode = this.ctx.createGain();
        gainNode.gain.setValueAtTime(0.01, now);
        gainNode.gain.linearRampToValueAtTime(0.7,   now + Math.min(1.5, durationSecs * 0.2));
        gainNode.gain.setValueAtTime(0.7,             now + durationSecs - 0.5);
        gainNode.gain.linearRampToValueAtTime(0.001,  now + durationSecs);

        source.connect(gainNode);
        gainNode.connect(this.inputBus);
        source.start(now);
        source.stop(now + durationSecs);

        if (key) this.activeLoops.set(key, { source, gainNode });
    }

    stopWarningSound(key) {
        if (!this.activeLoops.has(key)) return;
        const { source, gainNode } = this.activeLoops.get(key);
        try {
            if (this.ctx && gainNode) {
                gainNode.gain.linearRampToValueAtTime(0.001, this.ctx.currentTime + 0.1);
            }
            if (source) {
                setTimeout(() => { try { source.stop(); } catch (e) {} }, 110);
            }
        } catch (e) {}
        this.activeLoops.delete(key);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Explosion sound
    // ─────────────────────────────────────────────────────────────────────────

    async playExplosionSound(perkId, x = null, y = null, boardWidth = 4096) {
        if (this.isMuted) return;
        this.ensureContext();
        if (!this.ctx) return;

        const profile    = SOUND_PROFILES[perkId] || {};
        const throttleMs = profile.throttleMs || 0;

        // Throttle: perks multi-objetivo solo disparan 1 sonido por ráfaga
        if (throttleMs > 0) {
            const last = this._lastExplosion.get(perkId) || 0;
            const now  = Date.now();
            if (now - last < throttleMs) return;
            this._lastExplosion.set(perkId, now);
        }

        let buf = this.sampleCache.get(perkId);
        if (!buf && profile.file) {
            const base = window.AppBasePath || '';
            buf = await this._loadSample(perkId, `${base}/assets/sounds/${profile.file}`);
        }

        if (buf) {
            this._playBuffer(buf, {
                maxDuration: profile.maxDuration || null,
                x,
                boardWidth,
            });
        }
    }
}

// Instancia singleton compartida
export const soundManager = new SoundManager();
