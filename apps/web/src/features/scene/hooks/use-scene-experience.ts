'use client';
import { useCallback, useEffect, useState } from 'react';
import { useSceneGatewayApi } from '@/services';
import { patchScene, useScene } from '../model/store';
import type { SceneDefinition } from '../model/scene-definition';
import { SceneController } from '../runtime/scene-controller';

export function useSceneExperience() {
  const gateway = useSceneGatewayApi();
  // SWR mutation triggers are stable and retain the latest fetcher internally.
  const [controller] = useState(() => new SceneController(gateway));
  const entered = useScene((state) => state.entered);
  const definition = useScene((state) => state.definition);
  useEffect(() => {
    document.title = `${definition.title} · ${definition.english_title}`;
  }, [definition.title, definition.english_title]);
  const selectedModel = useScene((state) => state.selectedModel);
  const mock = useScene((state) => state.mock);
  useEffect(() => {
    if (entered) void controller.activate(mock);
    return () => controller.disconnect();
  }, [controller, entered, mock, selectedModel, definition]);
  useEffect(() => {
    const onBlur = () => {
      const voice = useScene.getState();
      if (voice.voiceEnabled && voice.voiceStatus !== 'starting') {
        controller.stopVoiceConversation();
        controller.stop();
      }

      if (useScene.getState().recording) {
        controller.cancelRecording();
        controller.stop();
      }
    };
    const onVisibility = () => {
      if (document.hidden) {
        controller.stopVoiceConversation();
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
  const selectModel = useCallback(
    (model: string) => {
      controller.cancelRecording();
      controller.stop();
      patchScene({ selectedModel: model });
    },
    [controller],
  );
  const applyScene = useCallback(
    (scene: SceneDefinition) => {
      controller.disconnect();
      patchScene({
        definition: { ...scene },
        entered: true,
        connected: false,
        photo: false,
        userText: '',
        subtitle: '',
      });
    },
    [controller],
  );
  return { controller, reconnect, selectModel, applyScene };
}
