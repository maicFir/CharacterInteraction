import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sceneApi } from '../src/services/module/scene.transport';
import { SceneController } from '../src/features/scene/runtime/scene-controller';
import { initial, patchScene, useScene } from '../src/features/scene/model/store';
import fs from 'node:fs';
import path from 'node:path';

test('Mock audio failure never blames the backend', async () => {
  const original = globalThis.fetch;
  Object.assign(globalThis, { WebSocket: { OPEN: 1 } });
  globalThis.fetch = async () => new Response('', { status: 404 });
  const controller = new SceneController(sceneApi);
  patchScene({ ...initial, connected: true, entered: true });
  try {
    await controller.submit('窗外的雨');
    assert.match(useScene.getState().error, /Mock.*本地/);
    assert.doesNotMatch(useScene.getState().error, /后端/);
  } finally {
    controller.disconnect();
    globalThis.fetch = original;
  }
});

test('every bundled Mock clip contains playable PCM data', () => {
  for (const name of ['hello', 'photo', 'rain', 'waiting', 'travel', 'goodbye']) {
    const buffer = fs.readFileSync(path.resolve('public/audio', name + '.wav'));
    assert.equal(buffer.toString('ascii', 0, 4), 'RIFF');
    assert.equal(buffer.toString('ascii', 8, 12), 'WAVE');
    assert.ok(buffer.length > 10000, `${name} must contain speech, not an empty WAV`);
  }
});

test('a delayed audio-ended callback cannot overwrite a new listening turn', async () => {
  const original = globalThis.fetch;
  let ended: (() => void) | null = null;
  class FakeAudio {
    onplaying: (() => void) | null = null;
    onended: (() => void) | null = null;
    onerror: (() => void) | null = null;
    muted = false;
    async play() {
      this.onplaying?.();
      ended = this.onended;
    }
    pause() {}
    removeAttribute() {}
    load() {}
  }
  Object.assign(globalThis, { WebSocket: { OPEN: 1 }, Audio: FakeAudio });
  globalThis.fetch = async () => new Response(new Blob(['wav']));
  const controller = new SceneController(sceneApi);
  patchScene({ ...initial, connected: true, entered: true });
  try {
    await controller.submit('你好');
    assert.equal(useScene.getState().phase, 'speaking');
    controller.stop();
    patchScene({ phase: 'listening' });
    (ended as (() => void) | null)?.();
    assert.equal(useScene.getState().phase, 'listening');
  } finally {
    controller.disconnect();
    globalThis.fetch = original;
  }
});

test('Mock hold-to-talk works without accessing microphone hardware', async () => {
  const controller = new SceneController(sceneApi);
  patchScene({ ...initial, connected: true, entered: true });
  try {
    await controller.startRecording();
    assert.equal(useScene.getState().phase, 'listening');
    assert.equal(useScene.getState().recording, true);
    assert.equal(useScene.getState().error, '');
  } finally {
    controller.disconnect();
  }
});
