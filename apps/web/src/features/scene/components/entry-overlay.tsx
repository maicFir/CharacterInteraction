import { Icon } from '@/components/ui/icon';
import { patchScene, useScene } from '../model/store';

export function EntryOverlay() {
  const definition = useScene((state) => state.definition);
  const entered = useScene((state) => state.entered);
  const mock = useScene((state) => state.mock);
  if (entered) return null;
  return (
    <div className="entry-overlay">
      <section className="entry-card">
        <div className="eyebrow">A MOMENT BETWEEN STRANGERS</div>
        <span className="entry-star">✦</span>
        <h2>{definition.entry_title}</h2>
        <p>{definition.entry_description}</p>
        <button className="enter-button" onClick={() => patchScene({ entered: true })}>
          {definition.enter_label}
          <Icon name="arrow" />
        </button>
        <small>
          约 3–5 分钟 · 建议开启声音
          <br />
          {mock ? '当前为 Mock，可无密钥体验。' : '当前为真实模式，需要后端服务。'}
        </small>
      </section>
    </div>
  );
}
