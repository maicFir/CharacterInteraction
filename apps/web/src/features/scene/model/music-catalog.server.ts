import { readdir } from 'node:fs/promises';
import path from 'node:path';

/** Runs during the Next.js page build. Audio stays in public/music and is served statically. */
export async function readMusicTracks(): Promise<string[]> {
  try {
    const entries = await readdir(path.join(process.cwd(), 'public', 'music'), {
      withFileTypes: true,
    });
    return entries
      .filter((entry) => entry.isFile() && /\.(mp3|wav|ogg|m4a|aac|flac)$/i.test(entry.name))
      .map((entry) => `/music/${encodeURIComponent(entry.name)}`)
      .sort();
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [];
    throw error;
  }
}
