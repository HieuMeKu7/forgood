// Tiny WebAudio synth — no external assets. All playback respects the
// sound toggle in Settings (callers pass enabled).

let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  try {
    if (!ctx) ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    return ctx;
  } catch {
    return null;
  }
}

function blip(freq: number, duration: number, type: OscillatorType, volume = 0.08, slide = 0): void {
  const ac = getCtx();
  if (!ac) return;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, ac.currentTime);
  if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), ac.currentTime + duration);
  gain.gain.setValueAtTime(volume, ac.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + duration);
  osc.connect(gain).connect(ac.destination);
  osc.start();
  osc.stop(ac.currentTime + duration);
}

export type SoundName = 'play' | 'hit' | 'block' | 'heal' | 'ultimate' | 'flip' | 'victory' | 'defeat' | 'click';

export function playSound(name: SoundName, enabled: boolean): void {
  if (!enabled) return;
  switch (name) {
    case 'play': blip(440, 0.08, 'triangle', 0.05); break;
    case 'hit': blip(160, 0.12, 'sawtooth', 0.09, -80); break;
    case 'block': blip(300, 0.1, 'square', 0.05, 60); break;
    case 'heal': blip(600, 0.15, 'sine', 0.06, 200); break;
    case 'ultimate': blip(120, 0.4, 'sawtooth', 0.1, 300); blip(240, 0.4, 'square', 0.06, 400); break;
    case 'flip': blip(500, 0.08, 'triangle', 0.05, -200); break;
    case 'victory': blip(523, 0.15, 'sine', 0.08); setTimeout(() => blip(659, 0.15, 'sine', 0.08), 140); setTimeout(() => blip(784, 0.3, 'sine', 0.08), 280); break;
    case 'defeat': blip(300, 0.3, 'sawtooth', 0.07, -180); setTimeout(() => blip(200, 0.5, 'sawtooth', 0.07, -120), 250); break;
    case 'click': blip(800, 0.03, 'square', 0.03); break;
  }
}
