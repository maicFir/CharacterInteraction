import type { SceneDefinition } from '../../../../../packages/contracts/scene';
import { ApiPath } from '../api/path';
import { backendUrl, httpClient } from '../http-client';
import type {
  AcceptedTurn,
  CreateSessionRequest,
  AudioRequest,
  LoadAudioRequest,
  Session,
  TextRequest,
} from './scene.types';

const headers = (session: Session) => ({ 'X-Session-Token': session.token });

export const sceneApi = {
  generateScene: ({
    prompt,
    model_id,
    signal,
  }: {
    prompt: string;
    model_id?: string;
    signal: AbortSignal;
  }) =>
    httpClient.json<SceneDefinition>(
      ApiPath.generateScene,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, model_id }),
        signal,
      },
      100000,
    ),
  createSession: (input?: CreateSessionRequest) =>
    httpClient.json<Session>(ApiPath.sessions, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input || {}),
    }),
  closeSession: (session: Session) =>
    httpClient.json<{ closed: boolean }>(ApiPath.session(session.id), {
      method: 'DELETE',
      headers: headers(session),
    }),
  sendText: ({ session, turnId, text, signal }: TextRequest) =>
    httpClient.json<AcceptedTurn>(ApiPath.text(session.id), {
      method: 'POST',
      signal,
      headers: { ...headers(session), 'Content-Type': 'application/json' },
      body: JSON.stringify({ turn_id: turnId, text }),
    }),
  uploadAudio: ({ session, form, signal }: AudioRequest) =>
    httpClient.json<AcceptedTurn>(ApiPath.audio(session.id), {
      method: 'POST',
      signal,
      headers: headers(session),
      body: form,
    }),
  loadAudio: ({ session, reply, signal }: LoadAudioRequest) => {
    if (reply.clip)
      return httpClient.blob(`/audio/${encodeURIComponent(reply.clip)}.wav`, { signal }, true);
    if (!session || !reply.audio_path)
      return Promise.reject(new Error('音频会话已失效，请重新发送。'));
    // Only a path within this session is allowed; credentials never follow arbitrary model URLs.
    if (!reply.audio_path.startsWith(`${ApiPath.session(session.id)}/audio/`))
      return Promise.reject(new Error('收到无效的音频地址。'));
    return httpClient.blob(reply.audio_path, { signal, headers: headers(session) });
  },
  openSocket: (session: Session) => {
    const url = new URL(backendUrl(ApiPath.socket(session.id)));
    url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
    return new WebSocket(url);
  },
};
