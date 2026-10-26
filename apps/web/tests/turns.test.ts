import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TurnGate, interpretMock } from '../src/features/scene/model/turns';

test('a new input invalidates an old decoded audio callback', () => {
  const gate = new TurnGate();
  const first = gate.next();
  assert.equal(gate.isCurrent(first), true);
  const second = gate.next();
  assert.equal(gate.isCurrent(first), false);
  assert.equal(gate.isCurrent(second), true);
});
test('changing modes invalidates every callback of the old session', () => {
  const gate = new TurnGate();
  const old = gate.next();
  gate.reset();
  assert.equal(gate.isCurrent(old), false);
});
test('visual events follow the content, not the elapsed time', () => {
  assert.equal(interpretMock('你好').event, 'none');
  assert.equal(interpretMock('可以看看你的照片吗').event, 'reveal_photo');
  assert.equal(interpretMock('窗外的雨停了吗').environment, 'rain_window');
});
