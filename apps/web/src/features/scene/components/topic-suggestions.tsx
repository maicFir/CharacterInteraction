import { Icon } from '@/components/ui/icon';
import { useScene } from '../model/store';

export function TopicSuggestions({ onSend }: { onSend: (text: string) => void }) {
  const topics = useScene((state) => state.definition.topics);
  const connected = useScene((state) => state.connected);
  return (
    <div className="suggestions" aria-label="话题建议">
      {topics.map((topic, index) => (
        <button key={topic} disabled={!connected} onClick={() => onSend(topic)}>
          <span>0{index + 1}</span>
          {topic}
          <Icon name="arrow" />
        </button>
      ))}
    </div>
  );
}
