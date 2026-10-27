import { IconButton } from '@/components/ui/icon-button';
import Image from 'next/image';
import { patchScene, useScene } from '../model/store';

export function PhotoCard() {
  const definition = useScene((state) => state.definition);
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
        alt={definition.photo_description}
      />
      <div>
        {definition.photo_caption}
        <span>{definition.character.name}</span>
      </div>
    </aside>
  );
}
