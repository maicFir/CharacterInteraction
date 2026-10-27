import { Icon } from '@/components/ui/icon';
import { useScene } from '../model/store';
import type { SceneController } from '../runtime/scene-controller';
type Props = {
  input: string;
  onInput: (value: string) => void;
  onSend: (text: string) => void;
  controller: SceneController;
};

export function Composer({ input, onInput, onSend, controller }: Props) {
  const name = useScene((state) => state.definition.character.name);
  const connected = useScene((state) => state.connected);
  const recording = useScene((state) => state.recording);
  const voiceEnabled = useScene((state) => state.voiceEnabled);
  const mock = useScene((state) => state.mock);
  return (
    <form
      className="composer"
      onSubmit={(event) => {
        event.preventDefault();
        onSend(input);
      }}
    >
      <div className="input-wrap">
        <span className="input-spark" aria-hidden="true">
          ✧
        </span>
        <input
          className="outline-none focus-visible:outline-0"
          aria-label={`想对 ${name} 说的话`}
          placeholder={`想对 ${name} 说些什么…`}
          maxLength={1000}
          value={input}
          onChange={(event) => onInput(event.target.value)}
          disabled={!connected}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && event.nativeEvent.isComposing) event.preventDefault();
          }}
        />
        <button
          className="send-button"
          aria-label="发送文字"
          type="submit"
          disabled={!connected || !input.trim()}
        >
          <Icon name="send" />
        </button>
      </div>
      <button
        type="button"
        className={`mic-button ${recording ? 'recording' : ''}`}
        aria-label={`按住说话，打断 ${name}`}
        disabled={!connected || voiceEnabled}
        onPointerDown={(event) => {
          if (event.button !== 0) return;
          event.preventDefault();
          event.currentTarget.setPointerCapture(event.pointerId);
          void controller.startRecording();
        }}
        onPointerUp={() => controller.finishRecording()}
        onPointerCancel={() => {
          controller.cancelRecording();
          controller.stop();
        }}
        onKeyDown={(event) => {
          if ((event.key === ' ' || event.key === 'Enter') && !event.repeat) {
            event.preventDefault();
            void controller.startRecording();
          }
        }}
        onKeyUp={(event) => {
          if (event.key === ' ' || event.key === 'Enter') {
            event.preventDefault();
            controller.finishRecording();
          }
        }}
      >
        <Icon name="mic" />
        <span>
          {voiceEnabled ? '自动聆听' : recording ? '松开发送' : mock ? '按住演示' : '按住说话'}
        </span>
      </button>
    </form>
  );
}
