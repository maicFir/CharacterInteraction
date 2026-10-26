import { Icon } from '@/components/ui/icon';
import { patchScene, useScene } from '../model/store';

export function EntryOverlay() {
  const entered = useScene((state) => state.entered);
  const mock = useScene((state) => state.mock);
  if (entered) return null;
  return (
    <div className="entry-overlay">
      <section className="entry-card">
        <div className="eyebrow">A MOMENT BETWEEN STRANGERS</div>
        <span className="entry-star">✦</span>
        <h2>恰好，雨还没停。</h2>
        <p>
          在即将打烊的咖啡馆，
          <br />
          认识一位带着照片与心事的旅人。
        </p>
        <button className="enter-button" onClick={() => patchScene({ entered: true })}>
          坐下来，聊一会儿
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
