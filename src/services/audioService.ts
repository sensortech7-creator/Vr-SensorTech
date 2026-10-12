/**
 * Audio Service for SensorTech VR WebXR Application
 */

declare global {
  interface Window {
    SensorTechAudio?: SensorTechAudioService;
  }
}

// Textos de la guía (misma redacción que los audios guia-1.mp3, guia-2.mp3, guia-3.mp3).
export const GUIDE_TEXTS: Record<number, string> = {
  1: 'Bienvenido a la planta principal de producción. En estas instalaciones implementamos los lineamientos de la Industria 4.0 mediante SensorTech, nuestro sistema avanzado de mantenimiento predictivo diseñado para optimizar las máquinas de inyección.',
  2: 'Esta es una de nuestras estaciones de inyección. Como puedes ver, cuenta con módulos sensoriales compactos instalados: ESP32 con sensores BME280, acelerómetros para vibración y monitoreo de corriente en tiempo real.',
  3: 'Punto 03: Dashboard de Machine Learning. Toda la información capturada en la planta viaja a nuestro servidor central, procesando modelos predictivos para calcular la vida útil restante y anticipar cualquier anomalía.',
};

const BASE_URL: string = ((import.meta as any).env && (import.meta as any).env.BASE_URL) || '/';

export class SensorTechAudioService {
  private ctx: AudioContext | null = null;
  private guideBuffers: Map<number, AudioBuffer> = new Map();
  private guideLoadPromise: Promise<void> | null = null;
  private guideLoadDone = false;
  private guideSource: AudioBufferSourceNode | null = null;
  private guideRequestId = 0;
  private chimePlayed = false;
  private isUnlocked: boolean = false;
  private ambientGain: GainNode | null = null;
  private isMuted: boolean = false;
  private speechVoice: SpeechSynthesisVoice | null = null;

  constructor() {
    this.initVoice();
  }

  private initVoice() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      const updateVoices = () => {
        const voices = window.speechSynthesis.getVoices();
        this.speechVoice = voices.find(v => v.lang.startsWith('es')) || voices[0] || null;
      };
      updateVoices();
      if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = updateVoices;
      }
    }
  }

  public getContext(): AudioContext {
    if (!this.ctx) {
      const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtxClass();
    }
    return this.ctx;
  }

  public unlock(): boolean {
    const ctx = this.getContext();
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    if (!this.unlockedState()) {
      this.isUnlocked = true;
      try {
        const buffer = ctx.createBuffer(1, 1, 22050);
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(ctx.destination);
        source.start(0);
      } catch (e) {}

      if (!this.chimePlayed) {
        this.chimePlayed = true;
        this.playStartupChime();
      }
      this.startAmbientHum();
      this.preloadGuideAudio();
      
      // DESBLOQUEO DEL MOTOR DE VOZ
      if ('speechSynthesis' in window) {
        const silentUtterance = new SpeechSynthesisUtterance('');
        silentUtterance.volume = 0;
        window.speechSynthesis.speak(silentUtterance);
      }
    }
    return true;
  }

  public unlockedState(): boolean {
    return this.isUnlocked && (this.ctx ? this.ctx.state === 'running' : false);
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (this.ambientGain) {
      this.ambientGain.gain.setValueAtTime(muted ? 0 : 0.035, this.ctx ? this.ctx.currentTime : 0);
    }
    if (muted) {
      this.stopGuide();
    }
  }

  /** Reanuda el AudioContext (el Quest lo suspende al cambiar entre 2D e inmersivo). */
  public resume(): Promise<void> {
    try {
      const ctx = this.getContext();
      if (ctx.state === 'suspended') return ctx.resume().catch(() => {});
    } catch (e) {}
    return Promise.resolve();
  }

  public isGuidePlaying(): boolean {
    return this.guideSource !== null;
  }

  public stopGuide() {
    this.guideRequestId++;
    if (this.guideSource) {
      try { this.guideSource.onended = null; this.guideSource.stop(); } catch (e) {}
      this.guideSource = null;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try { window.speechSynthesis.cancel(); } catch (e) {}
    }
  }

  /** Descarga y decodifica audio/guia-N.mp3 (si existen). Se reproducen por WebAudio, igual que los beeps. */
  public preloadGuideAudio(): Promise<void> {
    if (this.guideLoadPromise) return this.guideLoadPromise;
    const ctx = this.getContext();
    this.guideLoadPromise = Promise.all(
      Object.keys(GUIDE_TEXTS).map(async (key) => {
        const n = Number(key);
        try {
          const res = await fetch(`${BASE_URL}audio/guia-${n}.mp3`);
          if (!res.ok) return;
          const type = res.headers.get('content-type') || '';
          if (type.includes('text/html')) return; // el servidor devolvió una página en vez del mp3
          const data = await res.arrayBuffer();
          const buffer = await ctx.decodeAudioData(data);
          this.guideBuffers.set(n, buffer);
        } catch (e) {
          // sin archivo: se usará la voz del navegador como respaldo
        }
      })
    ).then(() => { this.guideLoadDone = true; });
    return this.guideLoadPromise;
  }

  public toggleMute(): boolean {
    this.setMuted(!this.isMuted);
    return this.isMuted;
  }

  private startAmbientHum() {
    if (this.ambientGain || this.isMuted) return;
    try {
      const ctx = this.getContext();
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      this.ambientGain = ctx.createGain();

      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(60, ctx.currentTime);
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(120, ctx.currentTime);
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(260, ctx.currentTime);
      this.ambientGain.gain.setValueAtTime(0.035, ctx.currentTime);

      osc1.connect(filter);
      osc2.connect(filter);
      filter.connect(this.ambientGain);
      this.ambientGain.connect(ctx.destination);

      osc1.start();
      osc2.start();
    } catch (e) {}
  }

  public playStartupChime() {
    if (this.isMuted) return;
    try {
      const ctx = this.getContext();
      const notes = [440, 554.37, 659.25, 880];
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.08);
        gain.gain.setValueAtTime(0.001, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.1, ctx.currentTime + idx * 0.08 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + idx * 0.08 + 0.85);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + idx * 0.08);
        osc.stop(ctx.currentTime + idx * 0.08 + 0.95);
      });
    } catch (e) {}
  }

  public playLeverPurge() {
    if (this.isMuted) return;
    try {
      const ctx = this.getContext();
      const clankOsc = ctx.createOscillator();
      const clankGain = ctx.createGain();
      clankOsc.type = 'square';
      clankOsc.frequency.setValueAtTime(150, ctx.currentTime);
      clankOsc.frequency.exponentialRampToValueAtTime(35, ctx.currentTime + 0.15);
      clankGain.gain.setValueAtTime(0.3, ctx.currentTime);
      clankGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);
      clankOsc.connect(clankGain);
      clankGain.connect(ctx.destination);
      clankOsc.start();
      clankOsc.stop(ctx.currentTime + 0.2);

      const bufferSize = ctx.sampleRate * 0.7;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      const noiseFilter = ctx.createBiquadFilter();
      noiseFilter.type = 'bandpass';
      noiseFilter.frequency.setValueAtTime(2400, ctx.currentTime);
      noiseFilter.frequency.exponentialRampToValueAtTime(900, ctx.currentTime + 0.65);
      noiseFilter.Q.setValueAtTime(3.0, ctx.currentTime);
      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(0.35, ctx.currentTime + 0.03);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.68);
      noise.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      noiseGain.connect(ctx.destination);
      noise.start(ctx.currentTime + 0.02);
      noise.stop(ctx.currentTime + 0.7);

      const hydroOsc = ctx.createOscillator();
      const hydroGain = ctx.createGain();
      hydroOsc.type = 'sawtooth';
      hydroOsc.frequency.setValueAtTime(85, ctx.currentTime + 0.1);
      hydroOsc.frequency.linearRampToValueAtTime(110, ctx.currentTime + 0.4);
      hydroOsc.frequency.linearRampToValueAtTime(80, ctx.currentTime + 0.7);
      hydroGain.gain.setValueAtTime(0.001, ctx.currentTime);
      hydroGain.gain.linearRampToValueAtTime(0.12, ctx.currentTime + 0.2);
      hydroGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.75);
      hydroOsc.connect(hydroGain);
      hydroGain.connect(ctx.destination);
      hydroOsc.start(ctx.currentTime + 0.1);
      hydroOsc.stop(ctx.currentTime + 0.8);
    } catch (e) {}
  }

  public playCraneMove() {
    if (this.isMuted) return;
    try {
      const ctx = this.getContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(180, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(240, ctx.currentTime + 0.5);
      osc.frequency.linearRampToValueAtTime(190, ctx.currentTime + 1.2);
      gain.gain.setValueAtTime(0.001, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.15, ctx.currentTime + 0.2);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.4);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 1.5);

      [0.1, 0.5, 0.9].forEach(t => {
        const beep = ctx.createOscillator();
        const bGain = ctx.createGain();
        beep.type = 'sine';
        beep.frequency.setValueAtTime(880, ctx.currentTime + t);
        bGain.gain.setValueAtTime(0.08, ctx.currentTime + t);
        bGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.15);
        beep.connect(bGain);
        bGain.connect(ctx.destination);
        beep.start(ctx.currentTime + t);
        beep.stop(ctx.currentTime + t + 0.16);
      });
    } catch (e) {}
  }

  public playBeep(high: boolean = false) {
    if (this.isMuted) return;
    try {
      const ctx = this.getContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(high ? 1760 : 1050, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(high ? 2100 : 1320, ctx.currentTime + 0.06);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.09);
    } catch (e) {}
  }

  public playAlert() {
    if (this.isMuted) return;
    try {
      const ctx = this.getContext();
      [0, 0.2, 0.4].forEach(delay => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(680, ctx.currentTime + delay);
        osc.frequency.setValueAtTime(520, ctx.currentTime + delay + 0.08);
        gain.gain.setValueAtTime(0.18, ctx.currentTime + delay);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + 0.15);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + delay);
        osc.stop(ctx.currentTime + delay + 0.16);
      });
    } catch (e) {}
  }

  private emitCaption(text: string, seconds: number) {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new CustomEvent('sensortech:caption', { detail: { text, seconds } }));
  }

  private playGuideBuffer(buffer: AudioBuffer, requestId: number) {
    const ctx = this.getContext();
    const start = () => {
      if (requestId !== this.guideRequestId || this.isMuted) return;
      const source = ctx.createBufferSource();
      const gain = ctx.createGain();
      gain.gain.value = 1.0;
      source.buffer = buffer;
      source.connect(gain);
      gain.connect(ctx.destination);
      source.onended = () => { if (this.guideSource === source) this.guideSource = null; };
      this.guideSource = source;
      source.start(0);
    };
    if (ctx.state === 'suspended') ctx.resume().then(start).catch(start);
    else start();
  }

  private speakWithSynthesis(text: string) {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'es-MX';
      utterance.rate = 1.0;
      utterance.pitch = 1.04;
      utterance.volume = 1.0;
      if (this.speechVoice) utterance.voice = this.speechVoice;
      // Evita que el navegador del Quest descarte la locución a la mitad
      (window as any).__currentSpeech = utterance;
      window.speechSynthesis.speak(utterance);
    } catch (e) {}
  }

  public speakWaypoint(pointNumber: number) {
    const text = GUIDE_TEXTS[pointNumber];
    if (!text) return;

    this.stopGuide();
    const requestId = this.guideRequestId;

    const buffer = this.guideBuffers.get(pointNumber);
    const seconds = buffer ? buffer.duration : Math.max(6, text.length * 0.07);
    this.emitCaption(text, seconds + 2);
    if (this.isMuted) return;

    if (buffer) {
      this.playGuideBuffer(buffer, requestId);
      return;
    }
    // Los audios aún se están descargando: esperar un instante antes de usar la voz del navegador
    if (this.guideLoadPromise && !this.guideLoadDone) {
      this.guideLoadPromise.then(() => {
        if (requestId !== this.guideRequestId) return;
        const late = this.guideBuffers.get(pointNumber);
        if (late) this.playGuideBuffer(late, requestId);
        else this.speakWithSynthesis(text);
      });
      return;
    }
    this.speakWithSynthesis(text);
  }
}

export const audioService = new SensorTechAudioService();
if (typeof window !== 'undefined') {
  window.SensorTechAudio = audioService;
}
