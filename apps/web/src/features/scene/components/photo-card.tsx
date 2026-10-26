import { IconButton } from '@/components/ui/icon-button';
import Image from 'next/image';
import { patchScene, useScene } from '../model/store';

export function PhotoCard() {
  const visible = useScene((state) => state.photo);
  if (!visible) return null;
  return (
    <aside className="photo-card">
      <IconButton
        icon="close"
        label="收起照片"
        className="photo-close"
        onClick={() => patchScene({ photo: false })}
      />
      <Image
        src="/art/seaside.svg"
        width={600}
        height={450}
        unoptimized
        alt="Mira在雨后拍摄的海边：灯塔、海浪与天空"
      />
      <div>
        雨后，海边。<span>OCT. 17 · MIRA</span>
      </div>
    </aside>
  );
}
