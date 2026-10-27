import { ModelSelector } from './model-selector';
import { Icon } from '@/components/ui/icon';
import Link from 'next/link';
import { IconButton } from '@/components/ui/icon-button';
import { Toggle } from '@/components/ui/toggle';
import { patchScene, useScene } from '../model/store';

export function SceneHeader({
  onOpenDetails,
  onSelectModel,
  onOpenSettings,
}: {
  onOpenDetails: () => void;
  onOpenSettings: () => void;
  onSelectModel: (model: string) => void;
}) {
  const definition = useScene((state) => state.definition);
  const mock = useScene((state) => state.mock);
  return (
    <header className="masthead">
      <Link href="/" className="brand" aria-label={`${definition.title} 首页`}>
        <span className="brand-symbol">
          <Icon name="rain" />
        </span>
        <span>
          {definition.title}
          <small>{definition.english_title}</small>
        </span>
      </Link>
      <div className="header-actions">
        <IconButton
          icon="settings"
          label="场景设置"
          className="info-button"
          onClick={onOpenSettings}
        />
        <ModelSelector onSelect={onSelectModel} />
        <div className="mode-control">
          <span className="mode-label">MOCK</span>
          <Toggle
            label="Mock 模式"
            checked={mock}
            onChange={(value) => patchScene({ mock: value })}
          />
          <span className="mode-value">{mock ? '演示' : '真实'}</span>
        </div>
        <IconButton
          icon="info"
          label="查看体验说明"
          className="info-button"
          onClick={onOpenDetails}
        />
      </div>
    </header>
  );
}
