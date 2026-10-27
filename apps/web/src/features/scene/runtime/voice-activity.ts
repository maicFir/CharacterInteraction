type Callbacks = {
  onStart: () => void;
  onEnd: (samples: Float32Array) => void;
  onLevel?: (level: number) => void;
};

/** Local energy VAD with sustained onset, pre-roll and silence endpointing. */
export class VoiceActivityDetector {
  private noise = 0.003;
  private onset = 0;
  private silence = 0;
  private voiced = 0;
  private duration = 0;
  private active = false;
  private preRoll: Float32Array[] = [];
  private preRollSamples = 0;
  private chunks: Float32Array[] = [];
  private meter = 0;
  constructor(
    private sampleRate: number,
    private callbacks: Callbacks,
  ) {}

  push(frame: Float32Array) {
    let energy = 0;
    for (const sample of frame) energy += sample * sample;
    const rms = Math.sqrt(energy / Math.max(1, frame.length));
    const threshold = Math.max(0.018, this.noise * 3.5);
    const speaking = rms >= threshold;
    const ms = (frame.length / this.sampleRate) * 1000;
    if (++this.meter % 4 === 0) this.callbacks.onLevel?.(Math.min(1, rms * 9));
    if (!this.active) {
      this.preRoll.push(frame);
      this.preRollSamples += frame.length;
      while (this.preRollSamples > this.sampleRate * 0.28 && this.preRoll.length > 1) {
        this.preRollSamples -= this.preRoll.shift()!.length;
      }
      this.onset = speaking ? this.onset + ms : 0;
      if (!speaking) this.noise = Math.min(0.02, this.noise * 0.98 + rms * 0.02);
      if (this.onset < 90) return;
      this.active = true;
      this.chunks = [...this.preRoll];
      this.duration = (this.preRollSamples / this.sampleRate) * 1000;
      this.voiced = this.onset;
      this.silence = 0;
      this.preRoll = [];
      this.preRollSamples = 0;
      this.callbacks.onStart();
      return;
    }
    this.chunks.push(frame);
    this.duration += ms;
    this.silence = speaking ? 0 : this.silence + ms;
    if (speaking) this.voiced += ms;
    if (this.silence < 650 && this.duration < 18000) return;
    const size = this.chunks.reduce((sum, part) => sum + part.length, 0);
    const trim = Math.max(0, Math.floor(((this.silence - 150) * this.sampleRate) / 1000));
    const audio = new Float32Array(Math.max(0, size - trim));
    let offset = 0;
    for (const part of this.chunks) {
      const count = Math.min(part.length, audio.length - offset);
      if (count <= 0) break;
      audio.set(part.subarray(0, count), offset);
      offset += count;
    }
    const valid = this.voiced >= 160;
    this.active = false;
    this.onset = 0;
    this.silence = 0;
    this.chunks = [];
    this.duration = 0;
    this.voiced = 0;
    if (valid) this.callbacks.onEnd(audio);
    else this.callbacks.onEnd(new Float32Array(0));
  }
}

/** Standalone WAV per turn avoids MediaRecorder chunks without container headers. */
export function encodeWav(samples: Float32Array, sampleRate: number): Blob {
  if (sampleRate > 24000) {
    const ratio = sampleRate / 24000;
    const reduced = new Float32Array(Math.floor(samples.length / ratio));
    for (let index = 0; index < reduced.length; index++) {
      const start = Math.floor(index * ratio);
      const end = Math.min(samples.length, Math.floor((index + 1) * ratio));
      let sum = 0;
      for (let cursor = start; cursor < end; cursor++) sum += samples[cursor];
      reduced[index] = sum / Math.max(1, end - start);
    }
    samples = reduced;
    sampleRate = 24000;
  }

  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);
  const ascii = (offset: number, text: string) => {
    for (let i = 0; i < text.length; i++) view.setUint8(offset + i, text.charCodeAt(i));
  };
  ascii(0, 'RIFF');
  view.setUint32(4, 36 + samples.length * 2, true);
  ascii(8, 'WAVE');
  ascii(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  ascii(36, 'data');
  view.setUint32(40, samples.length * 2, true);
  samples.forEach((sample, index) => {
    const value = Math.max(-1, Math.min(1, sample));
    view.setInt16(44 + index * 2, Math.round(value * (value < 0 ? 32768 : 32767)), true);
  });
  return new Blob([buffer], { type: 'audio/wav' });
}
