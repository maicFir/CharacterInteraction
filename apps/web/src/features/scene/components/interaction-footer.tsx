import { Icon } from '@/components/ui/icon';
import { useScene } from '../model/store';
import type { SceneController } from '../runtime/scene-controller';

export function InteractionFooter({ controller }: { controller: SceneController }) {
  const name = useScene((state) => state.definition.character.name);
  const connected = useScene((state) => state.connected);
  const mock = useScene((state) => state.mock);
  const voiceEnabled = useScene((state) => state.voiceEnabled);
  const phase = useScene((state) => state.phase);
  const muted = useScene((state) => state.muted);
  return (
    <div className="interaction-footer">
      <span className="connection-status">
        <i className={connected ? 'connected' : ''} />
        {mock ? 'Mock · 本地预设回应' : connected ? '真实 API · 已连接' : '真实 API · 等待连接'}
      </span>
      <span className="interrupt-hint">
        {voiceEnabled ? `直接开口，即可打断${name}` : `按住麦克风，即可打断${name}`}
      </span>
      <div className="playback-actions">
        {phase === 'speaking' || phase === 'thinking' ? (
          <button aria-label="停止当前回复" onClick={() => controller.stop()}>
            <Icon name="stop" />
          </button>
        ) : null}
        <button
          aria-label={muted ? '开启声音' : '静音'}
          aria-pressed={muted}
          onClick={() => controller.toggleMute()}
        >
          <Icon name={muted ? 'mute' : 'sound'} />
        </button>
      </div>
    </div>
  );
}
