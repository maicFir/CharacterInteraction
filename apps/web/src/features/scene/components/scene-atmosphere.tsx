import { SceneBackdrop } from './scene-backdrop';
import { Icon } from '@/components/ui/icon';
import { useScene } from '../model/store';

export function SceneAtmosphere() {
  const definition = useScene((state) => state.definition);
  const environment = useScene((state) => state.environment);
  return (
    <>
      {definition.id === 'mira' ? (
        <div className="scene-art" aria-hidden="true" />
      ) : (
        <SceneBackdrop definition={definition} />
      )}
      <div className="scene-vignette" aria-hidden="true" />
      <div hidden={definition.visual.setting !== 'cafe'} className="rain-layer" aria-hidden="true">
        <i />
        <i />
        <i />
        <i />
        <i />
        <i />
      </div>
      <section className="scene-intro" aria-label="场景介绍">
        <div className="eyebrow">
          <span /> {definition.chapter}
        </div>
        <h1>
          {definition.headline[0]}
          <br />
          {definition.headline[1]}
        </h1>
        <p>
          {definition.intro[0]}
          <br />
          {definition.intro[1]}
        </p>
        <div className="intro-rule" />
        <span className="scene-number">{definition.tagline}</span>
      </section>
      <div className="location">
        <span className="location-dot" />
        <span>{definition.location}</span>
        <span className="location-divider" />
        {definition.time} <Icon name="rain" />
        <span className="weather-label">
          {environment === 'rain_window' ? '雨声渐近' : definition.weather}
        </span>
      </div>
      <div className="table-foreground" aria-hidden="true" />
      <span className="scene-credit">AN INTERACTIVE SHORT STORY</span>
    </>
  );
}
