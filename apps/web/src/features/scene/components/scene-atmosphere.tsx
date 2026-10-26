import { Icon } from '@/components/ui/icon';
import { useScene } from '../model/store';

export function SceneAtmosphere() {
  const environment = useScene((state) => state.environment);
  return (
    <>
      <div className="scene-art" aria-hidden="true" />
      <div className="scene-vignette" aria-hidden="true" />
      <div className="rain-layer" aria-hidden="true">
        <i />
        <i />
        <i />
        <i />
        <i />
        <i />
      </div>
      <section className="scene-intro" aria-label="场景介绍">
        <div className="eyebrow">
          <span /> CHAPTER 01 · THE ENCOUNTER
        </div>
        <h1>
          雨停之前，
          <br />
          再坐一会儿。
        </h1>
        <p>
          城市在窗外慢了下来。
          <br />
          而她的故事，似乎才刚刚开始。
        </p>
        <div className="intro-rule" />
        <span className="scene-number">一场雨 · 一杯咖啡 · 一次偶遇</span>
      </section>
      <div className="location">
        <span className="location-dot" />
        <span>街角咖啡馆</span>
        <span className="location-divider" />
        23:17 <Icon name="rain" />
        <span className="weather-label">{environment === 'rain_window' ? '雨声渐近' : '雨夜'}</span>
      </div>
      <div className="table-foreground" aria-hidden="true" />
      <span className="scene-credit">AN INTERACTIVE SHORT STORY</span>
    </>
  );
}
