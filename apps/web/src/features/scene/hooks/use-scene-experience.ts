'use client';
import { useCallback, useEffect, useState } from 'react';
import { useSceneGatewayApi } from '@/services';
import { useScene } from '../model/store';
import { SceneController } from '../runtime/scene-controller';

export function useSceneExperience() {
  const gateway = useSceneGatewayApi();
  // SWR mutation triggers are stable and retain the latest fetcher internally.
  const [controller] = useState(() => new SceneController(gateway));
  const entered = useScene((state) => state.entered);
  const mock = useScene((state) => state.mock);
  useEffect(() => {
    if (entered) void controller.activate(mock);
    return () => controller.disconnect();
  }, [controller, entered, mock]);
  useEffect(() => {
    const onBlur = () => {
      if (useScene.getState().recording) {
        controller.cancelRecording();
        controller.stop();
      }
    };
    const onVisibility = () => {
      if (document.hidden) {
        onBlur();
        controller.stop();
      }
    };
    window.addEventListener('blur', onBlur);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('blur', onBlur);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [controller]);
  const reconnect = useCallback(() => {
    void controller.activate(useScene.getState().mock);
  }, [controller]);
  return { controller, reconnect };
}
