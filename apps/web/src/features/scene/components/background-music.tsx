import { useEffect } from 'react';
import { patchScene, useScene } from '../model/store';
import { BackgroundMusicPlayer } from '../runtime/background-music';

export function BackgroundMusic({ tracks }: { tracks: string[] }) {
  useEffect(() => {
    const player = new BackgroundMusicPlayer(tracks, undefined, undefined, (message) => {
      if (useScene.getState().musicError !== message) patchScene({ musicError: message });
    });
    const sync = () => {
      const state = useScene.getState();
      player.configure({
        enabled: state.musicEnabled,
        muted: state.muted,
        suspended: state.voiceEnabled || state.recording || document.hidden,
        duck: state.phase === 'speaking',
      });
    };
    const unlock = () => player.unlock();
    sync();
    const unsubscribe = useScene.subscribe(sync);
    document.addEventListener('click', unlock);
    document.addEventListener('keydown', unlock);
    document.addEventListener('visibilitychange', sync);
    return () => {
      unsubscribe();
      document.removeEventListener('click', unlock);
      document.removeEventListener('keydown', unlock);
      document.removeEventListener('visibilitychange', sync);
      player.dispose();
    };
  }, [tracks]);
  return null;
}
