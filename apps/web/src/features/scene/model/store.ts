import { create } from 'zustand';
import type { Phase, Reply } from './turns';
type SceneState = {
  mock: boolean;
  entered: boolean;
  connected: boolean;
  phase: Phase;
  stage: string;
  emotion: Reply['emotion'];
  action: Reply['action'];
  environment: Reply['environment'];
  subtitle: string;
  userText: string;
  photo: boolean;
  error: string;
  muted: boolean;
  recording: boolean;
  blocked: boolean;
  mediaFailed: boolean;
};
export const initial: SceneState = {
  mock: true,
  entered: false,
  connected: false,
  phase: 'idle',
  stage: '等你坐下',
  emotion: 'calm',
  action: 'none',
  environment: 'cafe_night',
  subtitle: '',
  userText: '',
  photo: false,
  error: '',
  muted: false,
  recording: false,
  blocked: false,
  mediaFailed: false,
};
export const useScene = create<SceneState>(() => ({ ...initial }));
export const patchScene = (patch: Partial<SceneState>) => useScene.setState(patch);
