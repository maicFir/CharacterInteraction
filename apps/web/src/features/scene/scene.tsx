'use client';
import { useState, type CSSProperties } from 'react';
import { useSceneExperience } from './hooks/use-scene-experience';
import { useScene } from './model/store';
import { BackgroundMusic } from './components/background-music';
import { SceneAtmosphere } from './components/scene-atmosphere';
import { SceneHeader } from './components/scene-header';
import { CharacterStage } from './components/character-stage';
import { PhotoCard } from './components/photo-card';
import { ConversationPanel } from './components/conversation-panel';
import { SceneSettings } from './components/scene-settings';
import { ExperienceDialog } from './components/experience-dialog';

interface SceneState {
  environment: string;
}

export function Scene({ musicTracks }: { musicTracks: string[] }) {
  const { controller, reconnect, selectModel, applyScene } = useSceneExperience();
  const showCharacter = useScene((state) => state.showCharacter);
  const definition = useScene((state) => state.definition);
  const [settings, setSettings] = useState(false);
  const environment = useScene((state: SceneState) => state.environment);
  const [details, setDetails] = useState(false);
  return (
    <main
      style={
        {
          '--scene-background': definition.palette.background,
          '--gold': definition.palette.accent,
        } as CSSProperties
      }
      className={`experience ${environment === 'rain_window' ? 'rain-close' : ''}`}
    >
      <BackgroundMusic tracks={musicTracks} />
      <SceneAtmosphere />
      <SceneHeader
        onOpenSettings={() => setSettings(true)}
        onSelectModel={selectModel}
        onOpenDetails={() => setDetails(true)}
      />
      {showCharacter && <CharacterStage />}
      <PhotoCard />
      <ConversationPanel controller={controller} onReconnect={reconnect} />
      {settings && <SceneSettings onClose={() => setSettings(false)} onApply={applyScene} />}
      {details ? (
        <ExperienceDialog onClose={() => setDetails(false)} controller={controller} />
      ) : null}
    </main>
  );
}
