import { SceneCharacter } from './scene-character';
import { useState, type CSSProperties } from 'react';
import Image from 'next/image';
import { emotionNames, phaseNames } from '../model/labels';
import { patchScene, useScene } from '../model/store';

export function CharacterStage() {
  const definition = useScene((state) => state.definition);
  const phase = useScene((state) => state.phase);
  const reactionReady = useScene((state) => state.reactionReady);
  const posePhase = phase === 'thinking' && reactionReady ? 'idle' : phase;
  const action = useScene((state) => state.action);
  const emotion = useScene((state) => state.emotion);
  const [failed, setFailed] = useState(false);
  const row =
    posePhase === 'listening'
      ? 5
      : posePhase === 'thinking'
        ? 6
        : action === 'look_window'
          ? 3
          : action === 'offer_photo'
            ? 4
            : emotion === 'curious'
              ? 1
              : emotion === 'sad'
                ? 2
                : 0;
  const animated = phase === 'speaking' || action !== 'none';
  return (
    <div
      className="character-stage"
      aria-label={`${definition.character.name}，${definition.character.age}岁${definition.character.profession}，${emotionNames[emotion]}，${phaseNames[phase]}`}
    >
      <div className="character-glow" />
      {definition.id !== 'mira' ? (
        <SceneCharacter
          definition={definition}
          phase={posePhase}
          emotion={emotion}
          action={action}
        />
      ) : (
        <>
          <div
            className={`actor ${animated ? 'animated' : ''} ${failed ? 'actor-failed' : ''}`}
            style={{ '--sprite-row': `${(row / 6) * 100}%` } as CSSProperties}
          />
          <Image
            hidden
            unoptimized
            loading="eager"
            width={2880}
            height={5040}
            src="/art/mira-sprites.svg"
            alt=""
            onError={() => {
              setFailed(true);
              patchScene({ mediaFailed: true });
            }}
          />
        </>
      )}
      {failed && definition.id === 'mira' ? (
        <div className="portrait-fallback">
          {definition.character.name.slice(0, 1)}
          <span>
            角色画面暂未加载
            <br />
            仍可继续文字与语音互动
          </span>
        </div>
      ) : null}
    </div>
  );
}
