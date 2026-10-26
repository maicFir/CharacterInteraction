import { patchScene, useScene } from '../model/store';
import type { SceneController } from '../runtime/scene-controller';
type Props = {
  controller: SceneController;
  onReconnect: () => void;
  onSend: (text: string) => void;
};

export function ErrorFeedback({ controller, onReconnect, onSend }: Props) {
  const error = useScene((state) => state.error);
  const blocked = useScene((state) => state.blocked);
  const connected = useScene((state) => state.connected);
  const mock = useScene((state) => state.mock);
  if (!error) return null;
  const retry = () => {
    const text = useScene.getState().userText;
    patchScene({ error: '' });
    if (text) onSend(text);
  };
  return (
    <div className="error-message" role="alert">
      <span>{error}</span>
      {blocked ? (
        <button onClick={() => controller.resumeAudio()}>继续播放</button>
      ) : !connected && !mock ? (
        <button onClick={onReconnect}>重新连接</button>
      ) : (
        <button onClick={retry}>重试</button>
      )}
    </div>
  );
}
