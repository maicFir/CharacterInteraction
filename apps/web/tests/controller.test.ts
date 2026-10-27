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

test('selected model survives scene reset and is sent when creating a real session', async () => {
  let requested: unknown;
  const controller = new SceneController({
    ...sceneApi,
    createSession: async (input) => {
      requested = input;
      throw new Error('test connection intentionally stopped');
    },
  });
  Object.assign(globalThis, { WebSocket: { OPEN: 1 } });
  patchScene({ ...initial, selectedModel: 'vendor/chosen' });
  try {
    await controller.activate(false);
    assert.deepEqual(requested, { model_id: 'vendor/chosen' });
    assert.equal(useScene.getState().selectedModel, 'vendor/chosen');
  } finally {
    controller.disconnect();
  }
});

test('custom scene survives activation and is bound to the backend session', async () => {
  const { scenePresets } = await import('../src/features/scene/model/scene-definition');
  let requested: unknown;
  const controller = new SceneController({
    ...sceneApi,
    createSession: async (input) => {
      requested = input;
      throw new Error('intentional stop');
    },
  });
  patchScene({ ...initial, definition: scenePresets[1] });
  try {
    await controller.activate(false);
    assert.equal(useScene.getState().definition.character.name, scenePresets[1].character.name);
    assert.deepEqual((requested as { scene: unknown }).scene, scenePresets[1]);
  } finally {
    controller.disconnect();
  }
});

test('character visibility preference survives mode and scene activation', async () => {
  assert.equal(initial.showCharacter, true);
  const controller = new SceneController(sceneApi);
  patchScene({ ...initial, showCharacter: false });
  try {
    await controller.activate(true);
    assert.equal(useScene.getState().showCharacter, false);
  } finally {
    controller.disconnect();
  }
});

test('hands-free speech immediately cancels the previous request and auto submits a new audio turn', async () => {
  let callbacks:
    import('../src/features/scene/runtime/voice-capture').VoiceCaptureCallbacks | undefined;
  let oldSignal: AbortSignal | undefined;
  let upload: import('../src/services/module/scene.types').AudioRequest | undefined;
  const ws = {
    readyState: 1,
    send() {},
    close() {},
    onmessage: null as null | ((event: { data: string }) => void),
  };
  const controller = new SceneController(
    {
      ...sceneApi,
      createSession: async () => ({ id: 'test', token: 'token', epoch: 'epoch' }),
      openSocket: () => ws as unknown as WebSocket,
      sendText: async (request) => {
        oldSignal = request.signal;
        return { accepted: true, turn_id: request.turnId };
      },
      uploadAudio: async (request) => {
        upload = request;
        return { accepted: true, turn_id: Number(request.form.get('turn_id')) };
      },
      closeSession: async () => {},
    },
    (value) => {
      callbacks = value;
      return { start: async () => {}, stop() {} };
    },
  );
  Object.assign(globalThis, { WebSocket: { OPEN: 1 } });
  patchScene({ ...initial });
  try {
    await controller.activate(false);
    ws.onmessage?.({ data: JSON.stringify({ type: 'ready', epoch: 'epoch' }) });
    await controller.submit('上一句还在处理');
    await controller.startVoiceConversation();
    callbacks!.onStart();
    assert.equal(oldSignal?.aborted, true);
    assert.equal(useScene.getState().phase, 'listening');
    callbacks!.onEnd(new Blob([new Uint8Array(128)], { type: 'audio/wav' }));
    await new Promise((resolve) => setTimeout(resolve, 0));
    assert.ok(upload);
    assert.equal(upload.form.get('file') instanceof Blob, true);
    controller.stopVoiceConversation();
    assert.equal(useScene.getState().voiceEnabled, false);
  } finally {
    controller.disconnect();
  }
});
