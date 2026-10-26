'use client';
import { useMemo } from 'react';
import { ApiPath } from '../api/path';
import { API_BASE } from '../http-client';
import { useFetch, useMutation } from '../hooks';
import { sceneApi } from './scene.transport';
import type {
  AcceptedTurn,
  AudioRequest,
  BackendHealth,
  LoadAudioRequest,
  SceneGateway,
  Session,
  TextRequest,
} from './scene.types';

export const useBackendHealthApi = (enabled: boolean) =>
  useFetch<BackendHealth>(enabled && API_BASE ? ApiPath.health : null);
export const useCreateSessionApi = () =>
  useMutation<void, Session>('scene/create-session', sceneApi.createSession);
export const useCloseSessionApi = () =>
  useMutation<Session, { closed: boolean }>('scene/close-session', sceneApi.closeSession);
export const useSendTextApi = () =>
  useMutation<TextRequest, AcceptedTurn>('scene/send-text', sceneApi.sendText);
export const useUploadAudioApi = () =>
  useMutation<AudioRequest, AcceptedTurn>('scene/upload-audio', sceneApi.uploadAudio);
export const useLoadAudioApi = () =>
  useMutation<LoadAudioRequest, Blob>('scene/load-audio', sceneApi.loadAudio);

export function useSceneGatewayApi(): SceneGateway {
  const { trigger: create } = useCreateSessionApi();
  const { trigger: close } = useCloseSessionApi();
  const { trigger: text } = useSendTextApi();
  const { trigger: audio } = useUploadAudioApi();
  const { trigger: load } = useLoadAudioApi();
  return useMemo(
    () => ({
      createSession: () => create(),
      closeSession: close,
      sendText: text,
      uploadAudio: audio,
      loadAudio: load,
      openSocket: sceneApi.openSocket,
    }),
    [create, close, text, audio, load],
  );
}
