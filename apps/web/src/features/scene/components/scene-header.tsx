import { Icon } from '@/components/ui/icon';
import Link from 'next/link';
import { IconButton } from '@/components/ui/icon-button';
import { Toggle } from '@/components/ui/toggle';
import { patchScene, useScene } from '../model/store';

export function SceneHeader({ onOpenDetails }: { onOpenDetails: () => void }) {
  const mock = useScene((state) => state.mock);
  return (
    <header className="masthead">
      <Link href="/" className="brand" aria-label="雨停之前 首页">
        <span className="brand-symbol">
          <Icon name="rain" />
        </span>
        <span>
          雨停之前<small>AFTER RAIN</small>
        </span>
      </Link>
      <div className="header-actions">
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
