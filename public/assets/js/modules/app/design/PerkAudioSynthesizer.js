/**
 * Procedural Audio Synthesizer for Perks & Explosions
 * Uses native Web Audio API - 0 external audio files needed.
 */
class PerkAudioSynthesizer {
    constructor() {
        this.ctx = null;
        this.lastWarningBeep = 0;
    }

    init() {
        if (!this.ctx) {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (AudioCtx) {
                this.ctx = new AudioCtx();
            }
        }
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume().catch(() => {});
        }
    }

    /**
     * Play warning countdown beep/siren
     */
    playWarningBeep(isUrgent = false) {
        const nowMs = Date.now();
        // Throttle beeps slightly so multiple simultaneous warnings don't deafen the user
        if (nowMs - this.lastWarningBeep < 150) return;
        this.lastWarningBeep = nowMs;

        try {
            this.init();
            if (!this.ctx) return;

            const now = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'sawtooth';
            const startFreq = isUrgent ? 1100 : 750;
            const endFreq = isUrgent ? 550 : 380;

            osc.frequency.setValueAtTime(startFreq, now);
            osc.frequency.exponentialRampToValueAtTime(endFreq, now + 0.12);

            gain.gain.setValueAtTime(0.08, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start(now);
            osc.stop(now + 0.12);
        } catch (e) {
            // Audio context blocked or unsupported
        }
    }

    /**
     * Synthesize procedural explosion sound
     * @param {'nuclear'|'missile'|'medium'|'meteor'|string} style
     */
    playExplosionSound(style = 'medium') {
        try {
            this.init();
            if (!this.ctx) return;

            const now = this.ctx.currentTime;
            
            let duration = 0.8;
            let startFilter = 800;
            let endFilter = 40;
            let subFreq = 80;
            let masterVol = 0.4;

            if (style === 'nuclear') {
                duration = 2.2;
                startFilter = 1400;
                endFilter = 25;
                subFreq = 55;
                masterVol = 0.7;
            } else if (style === 'missile') {
                duration = 0.35;
                startFilter = 1600;
                endFilter = 100;
                subFreq = 120;
                masterVol = 0.3;
            } else if (style === 'meteor') {
                duration = 0.6;
                startFilter = 900;
                endFilter = 45;
                subFreq = 90;
                masterVol = 0.4;
            }

            // 1. Noise Generator (White Noise for rumble/blast)
            const bufferSize = Math.floor(this.ctx.sampleRate * duration);
            const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
            const output = noiseBuffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                output[i] = Math.random() * 2 - 1;
            }

            const noiseNode = this.ctx.createBufferSource();
            noiseNode.buffer = noiseBuffer;

            // 2. Low-Pass Filter for muffled rumble
            const filter = this.ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(startFilter, now);
            filter.frequency.exponentialRampToValueAtTime(endFilter, now + duration);

            // 3. Noise Gain Envelope
            const noiseGain = this.ctx.createGain();
            noiseGain.gain.setValueAtTime(masterVol, now);
            noiseGain.gain.exponentialRampToValueAtTime(0.001, now + duration);

            noiseNode.connect(filter);
            filter.connect(noiseGain);
            noiseGain.connect(this.ctx.destination);

            noiseNode.start(now);

            // 4. Sub-Bass Oscillator for heavy thump
            const subOsc = this.ctx.createOscillator();
            const subGain = this.ctx.createGain();

            subOsc.type = 'sine';
            subOsc.frequency.setValueAtTime(subFreq, now);
            subOsc.frequency.exponentialRampToValueAtTime(20, now + (duration * 0.7));

            subGain.gain.setValueAtTime(masterVol * 0.6, now);
            subGain.gain.exponentialRampToValueAtTime(0.001, now + (duration * 0.7));

            subOsc.connect(subGain);
            subGain.connect(this.ctx.destination);

            subOsc.start(now);
            subOsc.stop(now + duration);

        } catch (e) {
            // Audio context error or blocked
        }
    }
}

const perkAudio = new PerkAudioSynthesizer();
if (typeof window !== 'undefined') {
    window.perkAudio = perkAudio;
}

export default perkAudio;
export { perkAudio };
