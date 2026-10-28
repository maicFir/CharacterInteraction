import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  BackgroundMusicPlayer,
  type MusicAudio,
} from '../src/features/scene/runtime/background-music';

class AudioStub {
  src = '';
  volume = 1;
  preload = 'none';
  onended: (() => void) | null = null;
  onerror: (() => void) | null = null;
  plays = 0;
  pauses = 0;
  blocked = false;
  async play() {
    this.plays++;
    if (this.blocked) throw new DOMException('gesture required', 'NotAllowedError');
  }
  pause() {
    this.pauses++;
  }
  removeAttribute() {}
  load() {}
}
const options = { enabled: true, suspended: false, muted: false, duck: false };
function player(random = () => 0) {
  const clips: AudioStub[] = [];
  const instance = new BackgroundMusicPlayer(
    ['/music/a.mp3', '/music/b.mp3', '/music/c.mp3'],
    (src) => {
      const audio = new AudioStub();
      audio.src = src;
      clips.push(audio);
      return audio as unknown as MusicAudio;
    },
    random,
  );
  return { instance, clips };
}

test('a random song starts and ending selects another song without immediate repeat', () => {
  const { instance, clips } = player(() => 0.5);
  instance.configure(options);
  assert.equal(clips[0].src, '/music/b.mp3');
  clips[0].onended!();
  assert.notEqual(clips[1].src, clips[0].src);
  instance.dispose();
});

test('disabling pauses music and continuous microphone capture suspends it', () => {
  const { instance, clips } = player();
  instance.configure(options);
  instance.configure({ ...options, suspended: true });
  assert.ok(clips[0].pauses > 0);
  const before = clips[0].plays;
  instance.configure({ ...options, suspended: true });
  assert.equal(clips[0].plays, before);
  instance.configure(options);
  assert.equal(clips[0].plays, before + 1);
  instance.configure({ ...options, enabled: false });
  assert.ok(clips[0].pauses > 1);
  instance.dispose();
});

test('blocked autoplay retries on a gesture and never restarts while disabled', async () => {
  const audio = new AudioStub();
  audio.blocked = true;
  const instance = new BackgroundMusicPlayer(
    ['/music/a.mp3'],
    () => audio as unknown as MusicAudio,
  );
  instance.configure(options);
  await Promise.resolve();
  await Promise.resolve();
  audio.blocked = false;
  instance.unlock();
  assert.equal(audio.plays, 2);
  instance.configure({ ...options, enabled: false });
  instance.unlock();
  assert.equal(audio.plays, 2);
  instance.dispose();
});
