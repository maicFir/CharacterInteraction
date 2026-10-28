import { Scene } from '@/features/scene/scene';
import { readMusicTracks } from '@/features/scene/model/music-catalog.server';
export default async function Page() {
  const musicTracks = await readMusicTracks();
  return <Scene musicTracks={musicTracks} />;
}
