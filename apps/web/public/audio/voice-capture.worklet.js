/* global AudioWorkletProcessor, registerProcessor */
/* Local-only PCM capture. Output is silent; microphone data is sent once per VAD turn. */
class VoiceCaptureProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.buffer = new Float32Array(1024);
    this.offset = 0;
  }
  process(inputs) {
    const samples = inputs[0]?.[0];
    if (samples) {
      for (let index = 0; index < samples.length; index++) {
        this.buffer[this.offset++] = samples[index];
        if (this.offset === this.buffer.length) {
          this.port.postMessage(this.buffer, [this.buffer.buffer]);
          this.buffer = new Float32Array(1024);
          this.offset = 0;
        }
      }
    }
    return true;
  }
}
registerProcessor('voice-capture', VoiceCaptureProcessor);
