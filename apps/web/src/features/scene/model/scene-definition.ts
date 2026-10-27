import definitions from '../../../../../../packages/contracts/scenes.json';
import type { SceneDefinition } from '../../../../../../packages/contracts/scene';
export type { SceneDefinition };
export const scenePresets = definitions as SceneDefinition[];
export const defaultScene = scenePresets[0];
export const scenePrompt = (scene: SceneDefinition) =>
  `${scene.location}，${scene.weather}。${scene.character.name}是一名${scene.character.age}岁的${scene.character.profession}，${scene.character.appearance}${scene.character.backstory}`;
