import { Icon } from '@/components/ui/icon';
import { useScene } from '../model/store';
const topics = ['你好，可以坐这里吗？', '你在等谁？', '能看看你的照片吗？'];

export function TopicSuggestions({ onSend }: { onSend: (text: string) => void }) {
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
