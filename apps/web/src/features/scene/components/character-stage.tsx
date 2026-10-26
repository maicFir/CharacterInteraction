import { useState, type CSSProperties } from 'react';
import Image from 'next/image';
import { emotionNames, phaseNames } from '../model/labels';
import { patchScene, useScene } from '../model/store';

export function CharacterStage() {
  const phase = useScene((state) => state.phase);
  const action = useScene((state) => state.action);
  const emotion = useScene((state) => state.emotion);
  const [failed, setFailed] = useState(false);
  const row =
    phase === 'listening'
      ? 5
      : phase === 'thinking'
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
      aria-label={`Mira，26岁成年旅行摄影师，${emotionNames[emotion]}，${phaseNames[phase]}`}
    >
      <div className="character-glow" />
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
      {failed ? (
        <div className="portrait-fallback">
          M
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
