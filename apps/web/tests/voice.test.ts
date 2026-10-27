import assert from 'node:assert/strict';
import { test } from 'node:test';
import { VoiceActivityDetector, encodeWav } from '../src/features/scene/runtime/voice-activity';

const block = (volume: number) => new Float32Array(160).fill(volume);

test('voice detection ignores short noise, interrupts at sustained speech and auto submits after silence', () => {
  let starts = 0;
  const segments: Float32Array[] = [];
  const detector = new VoiceActivityDetector(16000, {
    onStart: () => starts++,
    onEnd: (audio) => segments.push(audio),
  });
  for (let i = 0; i < 40; i++) detector.push(block(0.001));
  detector.push(block(0.2));
  for (let i = 0; i < 20; i++) detector.push(block(0.001));
  assert.equal(starts, 0);
  for (let i = 0; i < 40; i++) detector.push(block(0.15));
  assert.equal(starts, 1);
  for (let i = 0; i < 80; i++) detector.push(block(0.001));
  assert.equal(segments.length, 1);
  assert.ok(segments[0].length >= 6400);
});

test('continuous capture can interrupt again while the previous utterance is processing', () => {
  let starts = 0,
    ends = 0;
  const detector = new VoiceActivityDetector(16000, {
    onStart: () => starts++,
    onEnd: () => ends++,
  });
  for (let round = 0; round < 2; round++) {
    for (let i = 0; i < 40; i++) detector.push(block(0.15));
    for (let i = 0; i < 80; i++) detector.push(block(0.001));
  }
  assert.equal(starts, 2);
  assert.equal(ends, 2);
});

test('WAV encoder preserves mono PCM timing and clips samples safely', async () => {
  const blob = encodeWav(new Float32Array([-2, 0, 2]), 16000);
  const bytes = await blob.arrayBuffer();
  const view = new DataView(bytes);
  assert.equal(blob.type, 'audio/wav');
  assert.equal(view.getUint32(24, true), 16000);
  assert.equal(view.getUint32(40, true), 6);
  assert.equal(view.getInt16(44, true), -32768);
  assert.equal(view.getInt16(48, true), 32767);
});

test('capture worklet batches live samples without retaining detached buffers', async () => {
  const { readFileSync } = await import('node:fs');
  const { runInNewContext } = await import('node:vm');
  const sent: Float32Array[] = [];
  let Processor: (new () => { process(inputs: Float32Array[][]): boolean }) | undefined;
  class Base {
    port = { postMessage: (value: Float32Array) => sent.push(value) };
  }
  runInNewContext(readFileSync('public/audio/voice-capture.worklet.js', 'utf8'), {
    AudioWorkletProcessor: Base,
    registerProcessor: (_name: string, value: typeof Processor) => {
      Processor = value;
    },
    Float32Array,
  });
  const processor = new Processor!();
  for (let i = 0; i < 16; i++) processor.process([[new Float32Array(128).fill(0.2)]]);
  assert.equal(sent.length, 2);
  assert.equal(sent[0].length, 1024);
  assert.notEqual(sent[0].buffer, sent[1].buffer);
  assert.ok(Math.abs(sent[0][0] - 0.2) < 0.0001);
});

test('high-rate microphone audio is downsampled below the backend upload limit', async () => {
  const blob = encodeWav(new Float32Array(96000).fill(0.1), 96000);
  const view = new DataView(await blob.arrayBuffer());
  assert.equal(view.getUint32(24, true), 24000);
  assert.equal(view.getUint32(40, true), 48000);
  assert.equal(blob.size, 48044);
});
