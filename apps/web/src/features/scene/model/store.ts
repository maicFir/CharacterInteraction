import { create } from 'zustand';
import { defaultScene, type SceneDefinition } from './scene-definition';
import type { Phase, Reply } from './turns';
type SceneState = {
  definition: SceneDefinition;
  showCharacter: boolean;
  voiceEnabled: boolean;
  voiceStatus: 'off' | 'starting' | 'listening' | 'processing';
  voiceLevel: number;
  reactionReady: boolean;
  selectedModel: string;
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
  definition: defaultScene,
  showCharacter: true,
  voiceEnabled: false,
  voiceStatus: 'off',
  voiceLevel: 0,
  reactionReady: false,
  selectedModel: '',
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
