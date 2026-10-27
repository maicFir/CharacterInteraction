import { VoiceActivityDetector, encodeWav } from './voice-activity';

export type VoiceCaptureCallbacks = {
  onStart: () => void;
  onEnd: (audio: Blob) => void;
  onLevel: (level: number) => void;
  onError: (message: string) => void;
};
export interface VoiceCapturePort {
  start(): Promise<void>;
  stop(): void;
}
export type VoiceCaptureFactory = (callbacks: VoiceCaptureCallbacks) => VoiceCapturePort;

class BrowserVoiceCapture implements VoiceCapturePort {
  private stream?: MediaStream;
  private context?: AudioContext;
  private node?: AudioWorkletNode;
  private source?: MediaStreamAudioSourceNode;
  private gain?: GainNode;
  private stopped = false;
  constructor(private callbacks: VoiceCaptureCallbacks) {}
  async start() {
    if (!navigator.mediaDevices?.getUserMedia || !window.AudioContext || !window.AudioWorkletNode)
      throw new Error(
        '此浏览器不支持连续语音，请在 HTTPS 下使用新版 Safari/Chrome，或使用按住说话。',
      );
    // Create/resume during the initiating gesture, before awaiting permission.
    const context = new AudioContext({ latencyHint: 'interactive' });
    this.context = context;
    try {
      if (!context.audioWorklet)
        throw new Error('当前页面无法启动连续语音，请使用 HTTPS 或 localhost。');
      await context.resume();
      if (this.stopped) return;
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1,
        },
      });
      if (this.stopped) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      this.stream = stream;
      await context.audioWorklet.addModule('/audio/voice-capture.worklet.js');
      if (this.stopped) return;
      const detector = new VoiceActivityDetector(context.sampleRate, {
        onStart: () => {
          if (!this.stopped) this.callbacks.onStart();
        },
        onEnd: (samples) => {
          if (!this.stopped) this.callbacks.onEnd(encodeWav(samples, context.sampleRate));
        },
        onLevel: (level) => {
          if (!this.stopped) this.callbacks.onLevel(level);
        },
      });
      const node = new AudioWorkletNode(context, 'voice-capture');
      this.node = node;
      node.port.onmessage = (event) => {
        if (!this.stopped && event.data instanceof Float32Array) detector.push(event.data);
      };
      node.onprocessorerror = () => {
        if (!this.stopped) this.callbacks.onError('麦克风采集被中断，请重新开启语音对话。');
      };
      const source = context.createMediaStreamSource(stream);
      this.source = source;
      const gain = context.createGain();
      gain.gain.value = 0;
      this.gain = gain;
      source.connect(node);
      node.connect(gain);
      gain.connect(context.destination);
      for (const track of stream.getAudioTracks())
        track.onended = () => {
          if (!this.stopped) this.callbacks.onError('麦克风已断开，请重新开启语音对话。');
        };
    } catch (error) {
      this.stop();
      throw error;
    }
  }
  stop() {
    this.stopped = true;
    if (this.node) {
      this.node.port.onmessage = null;
      this.node.onprocessorerror = null;
      this.node.disconnect();
      this.node.port.close();
    }
    this.source?.disconnect();
    this.gain?.disconnect();
    this.stream?.getTracks().forEach((track) => {
      track.onended = null;
      track.stop();
    });
    if (this.context && this.context.state !== 'closed') void this.context.close().catch(() => {});
    this.node = undefined;
    this.source = undefined;
    this.gain = undefined;
    this.stream = undefined;
    this.context = undefined;
  }
}
export const createVoiceCapture: VoiceCaptureFactory = (callbacks) =>
  new BrowserVoiceCapture(callbacks);
