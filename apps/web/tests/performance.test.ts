import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { SceneCharacter } from '../src/features/scene/components/scene-character';
import { scenePresets } from '../src/features/scene/model/scene-definition';
import type { Phase, Reply } from '../src/features/scene/model/turns';

function render(phase: Phase, action: Reply['action']) {
  return renderToStaticMarkup(
    createElement(SceneCharacter, {
      definition: scenePresets[1],
      phase,
      emotion: 'curious',
      action,
    }),
  );
}

test('custom characters perform dialogue actions and hold the revealed photo', () => {
  assert.match(render('speaking', 'look_window'), /data-performance="look_window"/);
  const photo = render('speaking', 'offer_photo');
  assert.match(photo, /data-performance="offer_photo"/);
  assert.match(photo, /data-prop="photo"/);
  assert.doesNotMatch(render('idle', 'none'), /data-prop="photo"/);
});

test('listening and thinking suppress a previous action immediately', () => {
  for (const phase of ['listening', 'thinking'] as const) {
    const html = render(phase, 'offer_photo');
    assert.match(html, new RegExp(`data-performance="${phase}"`));
    assert.doesNotMatch(html, /data-prop="photo"/);
  }
});

test('custom Mock dialogue drives the same actions and environment as real replies', async () => {
  const { SceneController } = await import('../src/features/scene/runtime/scene-controller');
  const { sceneApi } = await import('../src/services/module/scene.transport');
  const { initial, patchScene, useScene } = await import('../src/features/scene/model/store');
  const controller = new SceneController(sceneApi);
  patchScene({ ...initial, definition: scenePresets[1], connected: true, entered: true });
  try {
    await controller.submit('窗外的雨');
    assert.equal(useScene.getState().action, 'look_window');
    assert.equal(useScene.getState().environment, 'rain_window');
    await controller.submit('看看照片');
    assert.equal(useScene.getState().action, 'offer_photo');
    assert.equal(useScene.getState().photo, true);
    controller.stop();
    assert.equal(useScene.getState().action, 'none');
  } finally {
    controller.disconnect();
  }
});
