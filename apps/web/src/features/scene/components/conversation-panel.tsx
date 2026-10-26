import { useState } from 'react';
import type { SceneController } from '../runtime/scene-controller';
import { SubtitlePanel } from './subtitle-panel';
import { TopicSuggestions } from './topic-suggestions';
import { Composer } from './composer';
import { ErrorFeedback } from './error-feedback';
import { InteractionFooter } from './interaction-footer';

export function ConversationPanel({
  controller,
  onReconnect,
}: {
  controller: SceneController;
  onReconnect: () => void;
}) {
  const [input, setInput] = useState('');
  const send = (text: string) => {
    if (text.trim()) {
      setInput('');
      void controller.submit(text);
    }
  };
  return (
    <section className="conversation" aria-label="与 Mira 互动">
      <SubtitlePanel />
      <ErrorFeedback controller={controller} onReconnect={onReconnect} onSend={send} />
      <TopicSuggestions onSend={send} />
      <Composer input={input} onInput={setInput} onSend={send} controller={controller} />
      <InteractionFooter controller={controller} />
    </section>
  );
}
