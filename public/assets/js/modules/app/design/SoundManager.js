/**
 * SoundManager.js - Motor de Audio AAA / Cine Oscuro & Terror (Web Audio API)
 *
 * Incorpora:
 * 1. Procesamiento DSP de distorsión armónica analógica (WaveShaperNode Valve Saturation) para lograr retumbos caóticos, oscuros y pesados.
 * 2. Carga automática de muestras de audio reales de alta definición (.mp3/.wav) desde /assets/sounds/.
 * 3. Síntesis espacial 3D, generadores de sub-graves de 25Hz y respuesta multicanal de cine.
 */

export class SoundManager {
    constructor() {
        this.ctx = null;
        this.masterGain = null;
        this.compressor = null;
        this.distortionNode = null;
        this.isMuted = false;
        this.volume = 0.9;
        this.activeLoops = new Map(); // key -> audio nodes
        this.sampleCache = new Map(); // URL -> AudioBuffer
        
        // Mapeo opcional de archivos de audio reales HD
        this.soundUrls = {
            'canon_orbital_1': window.AppBasePath ? `${window.AppBasePath}/assets/sounds/canon_orbital.mp3` : '/assets/sounds/canon_orbital.mp3',
            'bomba_atomica_1': window.AppBasePath ? `${window.AppBasePath}/assets/sounds/bomba_atomica.mp3` : '/assets/sounds/bomba_atomica.mp3',
            'agujero_negro_1': window.AppBasePath ? `${window.AppBasePath}/assets/sounds/agujero_negro.mp3` : '/assets/sounds/agujero_negro.mp3',
            'lluvia_meteoritos_1': window.AppBasePath ? `${window.AppBasePath}/assets/sounds/lluvia_meteoritos.mp3` : '/assets/sounds/lluvia_meteoritos.mp3',
            'bomba_racimo_1': window.AppBasePath ? `${window.AppBasePath}/assets/sounds/bomba_racimo.mp3` : '/assets/sounds/bomba_racimo.mp3',
            'pixel_misil_1': window.AppBasePath ? `${window.AppBasePath}/assets/sounds/pixel_misil.mp3` : '/assets/sounds/pixel_misil.mp3',
            'proteccion_pixeles_1': window.AppBasePath ? `${window.AppBasePath}/assets/sounds/proteccion.mp3` : '/assets/sounds/proteccion.mp3',
            'minas_1': window.AppBasePath ? `${window.AppBasePath}/assets/sounds/minas.mp3` : '/assets/sounds/minas.mp3'
        };

        this.initOnUserGesture();
        this.preloadSamples();
    }

    initOnUserGesture() {
        const initCtx = () => {
            if (!this.ctx) {
                const AudioCtx = window.AudioContext || window.webkitAudioContext;
                if (!AudioCtx) return;
                this.ctx = new AudioCtx();

                // 1. Distortion WaveShaper (Saturación analógica para impacto pesado y caótico)
                this.distortionNode = this.ctx.createWaveShaper();
                this.distortionNode.curve = this.makeDistortionCurve(25);
                this.distortionNode.oversample = '4x';

                // 2. Limiter de Estudio (DynamicsCompressorNode)
                this.compressor = this.ctx.createDynamicsCompressor();
                this.compressor.threshold.setValueAtTime(-10, this.ctx.currentTime);
                this.compressor.knee.setValueAtTime(8, this.ctx.currentTime);
                this.compressor.ratio.setValueAtTime(14, this.ctx.currentTime);
                this.compressor.attack.setValueAtTime(0.002, this.ctx.currentTime);
                this.compressor.release.setValueAtTime(0.25, this.ctx.currentTime);

                // 3. Control de Volumen Master
                this.masterGain = this.ctx.createGain();
                this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);

                // Cadena DSP: Fuente -> Distortion -> Compressor -> MasterGain -> Parlantes
                this.distortionNode.connect(this.compressor);
                this.compressor.connect(this.masterGain);
                this.masterGain.connect(this.ctx.destination);
            } else if (this.ctx.state === 'suspended') {
                this.ctx.resume();
            }
            window.removeEventListener('click', initCtx);
            window.removeEventListener('keydown', initCtx);
        };

        window.addEventListener('click', initCtx, { once: false });
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

    /**
     * Curva de saturación analógica de válvulas para dar peso, crunch y caótica distorsión a las explosiones.
     */
    makeDistortionCurve(amount = 25) {
        const n_samples = 44100;
        const curve = new Float32Array(n_samples);
        const deg = Math.PI / 180;
        for (let i = 0; i < n_samples; ++i) {
            const x = (i * 2) / n_samples - 1;
            curve[i] = ((3 + amount) * x * 20 * deg) / (Math.PI + amount * Math.abs(x));
        }
        return curve;
    }

    setMuted(muted) {
        this.isMuted = muted;
        if (this.masterGain && this.ctx) {
            this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.volume, this.ctx.currentTime);
        }
    }

    setVolume(vol) {
        this.volume = Math.max(0, Math.min(1, vol));
        if (this.masterGain && this.ctx && !this.isMuted) {
            this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);
        }
    }

    createPanner(x = null, boardWidth = 4096) {
        if (!this.ctx) return null;

        if (typeof this.ctx.createStereoPanner === 'function') {
            const panner = this.ctx.createStereoPanner();
            if (x !== null && boardWidth > 0) {
                const pan = Math.max(-0.85, Math.min(0.85, (x / boardWidth) * 2 - 1));
                panner.pan.setValueAtTime(pan, this.ctx.currentTime);
            }
            panner.connect(this.distortionNode || this.compressor);
            return panner;
        }

        const panner3d = this.ctx.createPanner();
        panner3d.panningModel = 'equalpower';
        if (x !== null && boardWidth > 0) {
            const panX = (x / boardWidth) * 2 - 1;
            panner3d.setPosition(panX, 0, 1);
        }
        panner3d.connect(this.distortionNode || this.compressor);
        return panner3d;
    }

    /**
     * Intenta precargar archivos de audio MP3 reales si existen en el servidor.
     */
    async preloadSamples() {
        for (const [key, url] of Object.entries(this.soundUrls)) {
            try {
                const response = await fetch(url, { method: 'HEAD' });
                if (response.ok) {
                    const audioRes = await fetch(url);
                    const arrayBuffer = await audioRes.arrayBuffer();
                    if (this.ctx) {
                        const audioBuffer = await this.ctx.decodeAudioData(arrayBuffer);
                        this.sampleCache.set(key, audioBuffer);
                    }
                }
            } catch (e) {}
        }
    }

    /**
     * Generador de Ruido Marrón Oscuro para el impacto y turbulencia de detonaciones masivas.
     */
    createDarkNoiseBuffer(durationSecs = 3.0) {
        if (!this.ctx) return null;
        const sampleRate = this.ctx.sampleRate;
        const bufferSize = sampleRate * durationSecs;
        const buffer = this.ctx.createBuffer(1, bufferSize, sampleRate);
        const output = buffer.getChannelData(0);
        let lastOutput = 0.0;

        for (let i = 0; i < bufferSize; i++) {
            const white = Math.random() * 2 - 1;
            output[i] = (lastOutput + (0.04 * white)) / 1.04;
            lastOutput = output[i];
            output[i] *= 4.2; 
        }
        return buffer;
    }

    // =========================================================================
    // SÍNTESIS DE AUDIO AAA DE TERROR & IMPACTO PESADO
    // =========================================================================

    playUiClick() {
        if (this.isMuted) return;
        this.ensureContext();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(1400, now);
        osc.frequency.exponentialRampToValueAtTime(250, now + 0.035);

        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.035);

        osc.connect(gain);
        gain.connect(this.compressor);

        osc.start(now);
        osc.stop(now + 0.035);
    }

    playWarningSound(perkId, durationSecs = 10, key = null) {
        if (this.isMuted) return;
        this.ensureContext();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;

        if (perkId === 'canon_orbital_1') {
            // Zumbido electromagnético espacial sci-fi con trémolo inquietante
            const carrier = this.ctx.createOscillator();
            const modulator = this.ctx.createOscillator();
            const modGain = this.ctx.createGain();
            const filter = this.ctx.createBiquadFilter();
            const masterG = this.ctx.createGain();

            carrier.type = 'sawtooth';
            modulator.type = 'sine';
            filter.type = 'lowpass';
            filter.Q.value = 6;

            modulator.frequency.setValueAtTime(6, now);
            modulator.frequency.linearRampToValueAtTime(24, now + durationSecs); 
            modGain.gain.setValueAtTime(60, now);

            carrier.frequency.setValueAtTime(90, now);
            carrier.frequency.exponentialRampToValueAtTime(950, now + durationSecs);

            filter.frequency.setValueAtTime(140, now);
            filter.frequency.exponentialRampToValueAtTime(3800, now + durationSecs);

            modulator.connect(modGain);
            modGain.connect(carrier.frequency);

            masterG.gain.setValueAtTime(0.01, now);
            masterG.gain.linearRampToValueAtTime(0.25, now + durationSecs * 0.85);
            masterG.gain.linearRampToValueAtTime(0.001, now + durationSecs);

            carrier.connect(filter);
            filter.connect(masterG);
            masterG.connect(this.distortionNode || this.compressor);

            carrier.start(now);
            modulator.start(now);
            carrier.stop(now + durationSecs);
            modulator.stop(now + durationSecs);

            if (key) this.activeLoops.set(key, { osc: carrier, gain: masterG });

        } else if (perkId === 'bomba_atomica_1') {
            // Sirena inquietante de pánico nuclear
            const osc1 = this.ctx.createOscillator();
            const osc2 = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc1.type = 'sawtooth';
            osc2.type = 'sine';

            const startTime = now;
            const endTime = now + durationSecs;

            for (let t = 0; t < durationSecs; t += 1.0) {
                osc1.frequency.setValueAtTime(280, startTime + t);
                osc1.frequency.linearRampToValueAtTime(460, startTime + t + 0.5);
                osc1.frequency.linearRampToValueAtTime(280, startTime + t + 1.0);

                osc2.frequency.setValueAtTime(140, startTime + t);
                osc2.frequency.linearRampToValueAtTime(230, startTime + t + 0.5);
                osc2.frequency.linearRampToValueAtTime(140, startTime + t + 1.0);
            }

            const filter = this.ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(900, now);

            gain.gain.setValueAtTime(0.15, startTime);
            gain.gain.linearRampToValueAtTime(0.001, endTime);

            osc1.connect(filter);
            osc2.connect(filter);
            filter.connect(gain);
            gain.connect(this.distortionNode || this.compressor);

            osc1.start(startTime);
            osc2.start(startTime);
            osc1.stop(endTime);
            osc2.stop(endTime);

            if (key) this.activeLoops.set(key, { osc: osc1, gain });
        }
    }

    stopWarningSound(key) {
        if (this.activeLoops.has(key)) {
            const { osc, gain } = this.activeLoops.get(key);
            try {
                if (this.ctx && gain) {
                    gain.gain.linearRampToValueAtTime(0.001, this.ctx.currentTime + 0.1);
                }
                if (osc) {
                    setTimeout(() => osc.stop(), 100);
                }
            } catch (e) {}
            this.activeLoops.delete(key);
        }
    }

    /**
     * IMPACTOS PESADOS Y DETONACIONES CINEMATOGRÁFICAS AAA (DE TERROR Y CAÓTICAS)
     */
    playExplosionSound(perkId, x = null, y = null, boardWidth = 4096) {
        if (this.isMuted) return;
        this.ensureContext();
        if (!this.ctx) return;

        // Si existe un archivo .mp3 real precargado en sampleCache, reproducirlo directamente
        if (this.sampleCache.has(perkId)) {
            const sampleBuf = this.sampleCache.get(perkId);
            const source = this.ctx.createBufferSource();
            source.buffer = sampleBuf;
            const panner = this.createPanner(x, boardWidth);
            source.connect(panner || this.compressor);
            source.playbackRate.value = 0.95 + Math.random() * 0.1;
            source.start(0);
            return;
        }

        const now = this.ctx.currentTime;
        const panner = this.createPanner(x, boardWidth);
        const destination = panner || this.distortionNode || this.compressor;

        if (perkId === 'canon_orbital_1') {
            // === CAÑÓN ORBITAL (IMPACTO CAÓTICO Y PROFUNDO DE LÁSER ESPACIAL) ===

            // 1. Supersonic Energy Crack (Impacto de plasma inicial con distorsión)
            const noiseBuf = this.createDarkNoiseBuffer(0.5);
            if (noiseBuf) {
                const noise = this.ctx.createBufferSource();
                noise.buffer = noiseBuf;
                const hpFilter = this.ctx.createBiquadFilter();
                hpFilter.type = 'highpass';
                hpFilter.frequency.setValueAtTime(1800, now);

                const noiseG = this.ctx.createGain();
                noiseG.gain.setValueAtTime(0.7, now);
                noiseG.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

                noise.connect(hpFilter);
                hpFilter.connect(noiseG);
                noiseG.connect(destination);
                noise.start(now);
            }

            // 2. Sub-atomic Laser Drop (Caída de frecuencia láser pesada de 1600Hz a 30Hz)
            const laserOsc = this.ctx.createOscillator();
            const laserG = this.ctx.createGain();
            laserOsc.type = 'sawtooth';
            laserOsc.frequency.setValueAtTime(1600, now);
            laserOsc.frequency.exponentialRampToValueAtTime(28, now + 3.5);

            laserG.gain.setValueAtTime(0.65, now);
            laserG.gain.exponentialRampToValueAtTime(0.001, now + 3.5);

            laserOsc.connect(laserG);
            laserG.connect(destination);
            laserOsc.start(now);
            laserOsc.stop(now + 3.5);

            // 3. Earthquake Sub-Bass Slam (Sub-graves soplados de 22Hz prolongados durante 5.5s)
            const subOsc = this.ctx.createOscillator();
            const subG = this.ctx.createGain();
            subOsc.type = 'sine';
            subOsc.frequency.setValueAtTime(80, now);
            subOsc.frequency.exponentialRampToValueAtTime(18, now + 5.5);

            subG.gain.setValueAtTime(0.9, now);
            subG.gain.exponentialRampToValueAtTime(0.001, now + 5.5);

            subOsc.connect(subG);
            subG.connect(destination);
            subOsc.start(now);
            subOsc.stop(now + 5.5);

        } else if (perkId === 'bomba_atomica_1') {
            // === BOMBA ATÓMICA (EXPLOSIÓN DE TERROR RETUMBANTE DE 4 CAPAS) ===

            // 1. Shockwave Blast Snap
            const snapBuf = this.createDarkNoiseBuffer(0.25);
            if (snapBuf) {
                const snap = this.ctx.createBufferSource();
                snap.buffer = snapBuf;
                const snapG = this.ctx.createGain();
                snapG.gain.setValueAtTime(0.8, now);
                snapG.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
                snap.connect(snapG);
                snapG.connect(destination);
                snap.start(now);
            }

            // 2. Heavy Rolling Brown Noise Blast (Cuerpo de explosión retumbante)
            const brownBuf = this.createDarkNoiseBuffer(3.8);
            if (brownBuf) {
                const brown = this.ctx.createBufferSource();
                brown.buffer = brownBuf;
                const lpFilter = this.ctx.createBiquadFilter();
                lpFilter.type = 'lowpass';
                lpFilter.Q.value = 5; // Resonancia sónica pesada
                lpFilter.frequency.setValueAtTime(1800, now);
                lpFilter.frequency.exponentialRampToValueAtTime(32, now + 3.8);

                const brownG = this.ctx.createGain();
                brownG.gain.setValueAtTime(0.85, now);
                brownG.gain.exponentialRampToValueAtTime(0.001, now + 3.8);

                brown.connect(lpFilter);
                lpFilter.connect(brownG);
                brownG.connect(destination);
                brown.start(now);
            }

            // 3. Sub-Bass Earthquake Drop (Sub-graves sismos de 24Hz de ultra baja frecuencia)
            const sub1 = this.ctx.createOscillator();
            const sub2 = this.ctx.createOscillator();
            const subG = this.ctx.createGain();

            sub1.type = 'sine';
            sub2.type = 'sine';

            sub1.frequency.setValueAtTime(55, now);
            sub1.frequency.exponentialRampToValueAtTime(20, now + 3.8);

            sub2.frequency.setValueAtTime(38, now);
            sub2.frequency.exponentialRampToValueAtTime(14, now + 3.8);

            subG.gain.setValueAtTime(0.9, now);
            subG.gain.exponentialRampToValueAtTime(0.001, now + 3.8);

            sub1.connect(subG);
            sub2.connect(subG);
            subG.connect(destination);

            sub1.start(now);
            sub2.start(now);
            sub1.stop(now + 3.8);
            sub2.stop(now + 3.8);

        } else if (perkId === 'agujero_negro_1') {
            // === AGUJERO NEGRO (IMPLOSIÓN DE TERROR CÓSMICO Y DESTORSIÓN) ===

            // 1. Succión Inversa de Vacío Oscuro
            const darkBuf = this.createDarkNoiseBuffer(2.2);
            if (darkBuf) {
                const noise = this.ctx.createBufferSource();
                noise.buffer = darkBuf;
                const filter = this.ctx.createBiquadFilter();
                filter.type = 'bandpass';
                filter.Q.value = 7;
                filter.frequency.setValueAtTime(50, now);
                filter.frequency.exponentialRampToValueAtTime(1400, now + 0.9);
                filter.frequency.exponentialRampToValueAtTime(25, now + 2.2);

                const noiseG = this.ctx.createGain();
                noiseG.gain.setValueAtTime(0.08, now);
                noiseG.gain.linearRampToValueAtTime(0.6, now + 0.9);
                noiseG.gain.exponentialRampToValueAtTime(0.001, now + 2.2);

                noise.connect(filter);
                filter.connect(noiseG);
                noiseG.connect(destination);
                noise.start(now);
            }

            // 2. Sub-Harmonic Singularity Pulse (Pulso de sub-graves de 22Hz)
            const sub = this.ctx.createOscillator();
            const subG = this.ctx.createGain();
            sub.type = 'sine';
            sub.frequency.setValueAtTime(32, now);
            sub.frequency.linearRampToValueAtTime(210, now + 0.9);
            sub.frequency.exponentialRampToValueAtTime(16, now + 2.2);

            subG.gain.setValueAtTime(0.12, now);
            subG.gain.linearRampToValueAtTime(0.7, now + 0.9);
            subG.gain.exponentialRampToValueAtTime(0.001, now + 2.2);

            sub.connect(subG);
            subG.connect(destination);
            sub.start(now);
            sub.stop(now + 2.2);

        } else if (perkId === 'bomba_racimo_1' || perkId === 'lluvia_meteoritos_1') {
            // === METEORITOS & RACIMO (IMPACTOS CAÓTICOS PESADOS Y ESCALONADOS) ===
            const count = perkId === 'bomba_racimo_1' ? 5 : 7;
            for (let i = 0; i < count; i++) {
                const delay = i * 0.09;
                const nowD = now + delay;

                const darkBuf = this.createDarkNoiseBuffer(0.4);
                if (darkBuf) {
                    const noise = this.ctx.createBufferSource();
                    noise.buffer = darkBuf;
                    const bpFilter = this.ctx.createBiquadFilter();
                    bpFilter.type = 'lowpass';
                    bpFilter.frequency.setValueAtTime(900 + Math.random() * 500, nowD);
                    bpFilter.frequency.exponentialRampToValueAtTime(60, nowD + 0.35);

                    const noiseG = this.ctx.createGain();
                    noiseG.gain.setValueAtTime(0.45, nowD);
                    noiseG.gain.exponentialRampToValueAtTime(0.001, nowD + 0.35);

                    noise.connect(bpFilter);
                    bpFilter.connect(noiseG);
                    noiseG.connect(destination);
                    noise.start(nowD);
                }

                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();

                osc.type = 'sine';
                const startFreq = 260 + Math.random() * 140;
                osc.frequency.setValueAtTime(startFreq, nowD);
                osc.frequency.exponentialRampToValueAtTime(28, nowD + 0.35);

                gain.gain.setValueAtTime(0.4, nowD);
                gain.gain.exponentialRampToValueAtTime(0.001, nowD + 0.35);

                osc.connect(gain);
                gain.connect(destination);
                osc.start(nowD);
                osc.stop(nowD + 0.35);
            }

        } else if (perkId === 'proteccion_pixeles_1') {
            // === PROTECCIÓN DE PÍXELES (ESCUDO DE ENERGÍA PESADO) ===
            const freqs = [440, 554.37, 659.25, 880];
            freqs.forEach((freq, idx) => {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();

                osc.type = 'sine';
                osc.frequency.setValueAtTime(freq, now + idx * 0.03);

                gain.gain.setValueAtTime(0.2, now + idx * 0.03);
                gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.03 + 0.9);

                osc.connect(gain);
                gain.connect(destination);
                osc.start(now + idx * 0.03);
                osc.stop(now + idx * 0.03 + 0.9);
            });

        } else if (perkId === 'minas_1') {
            // === MINAS TERRESTRES (DETONACIÓN METÁLICA PESADA) ===
            const darkBuf = this.createDarkNoiseBuffer(0.45);
            if (darkBuf) {
                const noise = this.ctx.createBufferSource();
                noise.buffer = darkBuf;
                const hpFilter = this.ctx.createBiquadFilter();
                hpFilter.type = 'highpass';
                hpFilter.frequency.setValueAtTime(1400, now);

                const noiseG = this.ctx.createGain();
                noiseG.gain.setValueAtTime(0.55, now);
                noiseG.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

                noise.connect(hpFilter);
                hpFilter.connect(noiseG);
                noiseG.connect(destination);
                noise.start(now);
            }

            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(320, now);
            osc.frequency.exponentialRampToValueAtTime(30, now + 0.45);

            gain.gain.setValueAtTime(0.5, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

            osc.connect(gain);
            gain.connect(destination);
            osc.start(now);
            osc.stop(now + 0.45);

        } else {
            // === EXPLOSIÓN GENÉRICA PESADA DE MISIL / BOMBA PIXEL ===
            const darkBuf = this.createDarkNoiseBuffer(1.0);
            if (darkBuf) {
                const noise = this.ctx.createBufferSource();
                noise.buffer = darkBuf;
                const lpFilter = this.ctx.createBiquadFilter();
                lpFilter.type = 'lowpass';
                lpFilter.Q.value = 4;
                lpFilter.frequency.setValueAtTime(1200, now);
                lpFilter.frequency.exponentialRampToValueAtTime(38, now + 1.0);

                const noiseG = this.ctx.createGain();
                noiseG.gain.setValueAtTime(0.6, now);
                noiseG.gain.exponentialRampToValueAtTime(0.001, now + 1.0);

                noise.connect(lpFilter);
                lpFilter.connect(noiseG);
                noiseG.connect(destination);
                noise.start(now);
            }

            const sub = this.ctx.createOscillator();
            const subG = this.ctx.createGain();
            sub.type = 'sine';
            sub.frequency.setValueAtTime(140, now);
            sub.frequency.exponentialRampToValueAtTime(24, now + 1.0);

            subG.gain.setValueAtTime(0.6, now);
            subG.gain.exponentialRampToValueAtTime(0.001, now + 1.0);

            sub.connect(subG);
            subG.connect(destination);
            sub.start(now);
            sub.stop(now + 1.0);
        }
    }
}

// Instancia singleton compartida
export const soundManager = new SoundManager();
