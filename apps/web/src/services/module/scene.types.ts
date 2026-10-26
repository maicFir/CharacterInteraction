import type { Reply } from '../../features/scene/model/turns';

export type Session = { id: string; token: string; epoch: string };
export type BackendHealth = { status: string; llm_configured: boolean; stt: string; tts: string };
export type AcceptedTurn = { accepted: boolean; turn_id: number };
export type TextRequest = { session: Session; turnId: number; text: string; signal: AbortSignal };
export type AudioRequest = { session: Session; form: FormData; signal: AbortSignal };
export type LoadAudioRequest = { session?: Session; reply: Reply; signal: AbortSignal };

/** The runtime consumes this port; a React business hook supplies its implementation. */
export interface SceneGateway {
  createSession(): Promise<Session>;
  closeSession(session: Session): Promise<unknown>;
  sendText(request: TextRequest): Promise<AcceptedTurn>;
  uploadAudio(request: AudioRequest): Promise<AcceptedTurn>;
  loadAudio(request: LoadAudioRequest): Promise<Blob>;
  openSocket(session: Session): WebSocket;
}
