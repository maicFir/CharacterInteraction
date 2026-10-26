import { phaseNames } from '../model/labels';
import { useScene } from '../model/store';

export function SubtitlePanel() {
  const phase = useScene((state) => state.phase);
  const subtitle = useScene((state) => state.subtitle);
  const stage = useScene((state) => state.stage);
  const userText = useScene((state) => state.userText);
  const text =
    subtitle ||
    (phase === 'listening'
      ? '我在听，说完后松开就好。'
      : phase === 'thinking'
        ? `${stage}…`
        : '她抬起头，向你轻轻笑了一下。');
  return (
    <>
      <div className="character-label">
        <span className={`presence ${phase}`} />
        <span>Mira</span>
        <span className="role-description">旅行摄影师 · 26</span>
        <span className="phase-badge" data-testid="phase">
          {phaseNames[phase]}
        </span>
      </div>
      <div className={`subtitle ${subtitle ? 'has-text' : ''}`} aria-live="polite">
        <p>{text}</p>
        {phase === 'thinking' ? (
          <div className="thinking-dots">
            <i />
            <i />
            <i />
          </div>
        ) : null}
      </div>
      {userText ? (
        <p className="your-words">你 · {userText}</p>
      ) : (
        <p className="your-words placeholder">从一句问候，开始今晚的故事</p>
      )}
    </>
  );
}
