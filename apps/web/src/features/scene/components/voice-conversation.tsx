import type { CSSProperties } from 'react';
import { Icon } from '@/components/ui/icon';
import { useScene } from '../model/store';
import type { SceneController } from '../runtime/scene-controller';

export function VoiceConversation({ controller }: { controller: SceneController }) {
  const mock = useScene((state) => state.mock);
  const connected = useScene((state) => state.connected);
  const enabled = useScene((state) => state.voiceEnabled);
  const status = useScene((state) => state.voiceStatus);
  const level = useScene((state) => state.voiceLevel);
  const recording = useScene((state) => state.recording);
  const phase = useScene((state) => state.phase);
  const message = !enabled
    ? mock
      ? '关闭 Mock 可开启免按键连续对话'
      : '开启后直接说话，停顿自动发送'
    : status === 'starting'
      ? '正在开启麦克风…'
      : recording
        ? '正在听你说话，停顿后自动发送'
        : phase === 'speaking'
          ? '随时开口，立即打断当前回复'
          : phase === 'thinking'
            ? '正在准备回复，你仍可开口打断'
            : '我在听，直接说话就好';
  return (
    <div
      className={`voice-conversation ${enabled ? 'active' : ''}`}
      style={{ '--voice-level': level } as CSSProperties}
    >
      <div className="voice-indicator" aria-hidden="true">
        {enabled ? (
          <span className="voice-bars">
            {[0.5, 0.9, 0.65, 1, 0.5].map((height, index) => (
              <i key={index} style={{ '--bar-height': height } as CSSProperties} />
            ))}
          </span>
        ) : (
          <Icon name="mic" />
        )}
      </div>
      <div className="voice-copy">
        <strong>连续语音对话</strong>
        <span role="status">{message}</span>
      </div>
      <button
        type="button"
        className="voice-toggle"
        disabled={mock || !connected}
        aria-pressed={enabled}
        onClick={() => controller.toggleVoiceConversation()}
      >
        {enabled ? '结束对话' : '开启对话'}
      </button>
    </div>
  );
}
