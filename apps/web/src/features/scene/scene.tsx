'use client';
import { useState } from 'react';
import { useSceneExperience } from './hooks/use-scene-experience';
import { useScene } from './model/store';
import { SceneAtmosphere } from './components/scene-atmosphere';
import { SceneHeader } from './components/scene-header';
import { CharacterStage } from './components/character-stage';
import { PhotoCard } from './components/photo-card';
import { ConversationPanel } from './components/conversation-panel';
import { EntryOverlay } from './components/entry-overlay';
import { ExperienceDialog } from './components/experience-dialog';

export function Scene() {
  const { controller, reconnect } = useSceneExperience();
  const environment = useScene((state) => state.environment);
  const [details, setDetails] = useState(false);
  return (
    <main className={`experience ${environment === 'rain_window' ? 'rain-close' : ''}`}>
      <SceneAtmosphere />
      <SceneHeader onOpenDetails={() => setDetails(true)} />
      <CharacterStage />
      <PhotoCard />
      <ConversationPanel controller={controller} onReconnect={reconnect} />
      <EntryOverlay />
      {details ? (
        <ExperienceDialog onClose={() => setDetails(false)} controller={controller} />
      ) : null}
    </main>
  );
}
