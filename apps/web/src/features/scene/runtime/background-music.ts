export type MusicAudio = Pick<
  HTMLAudioElement,
  | 'play'
  | 'pause'
  | 'volume'
  | 'preload'
  | 'src'
  | 'removeAttribute'
  | 'load'
  | 'onended'
  | 'onerror'
>;
type Options = { enabled: boolean; suspended: boolean; muted: boolean; duck: boolean };

/** One player per mounted scene; random transitions never immediately repeat a song. */
export class BackgroundMusicPlayer {
  private options: Options = { enabled: false, suspended: false, muted: false, duck: false };
  private audio?: MusicAudio;
  private index = -1;
  private generation = 0;
  private requested = false;
  private blocked = false;
  private failed = new Set<number>();
  constructor(
    private tracks: readonly string[],
    private factory: (src: string) => MusicAudio = (src) => new Audio(src),
    private random = Math.random,
    private onProblem: (message: string) => void = () => {},
  ) {}

  configure(options: Options) {
    const wasEnabled = this.options.enabled;
    this.options = options;
    if (!options.enabled || options.suspended) {
      if (this.audio && this.requested) this.audio.pause();
      this.requested = false;
      if (!options.enabled) return;
    }
    if (options.enabled && (!wasEnabled || !this.audio)) {
      this.failed.clear();
      this.next();
      return;
    }
    this.sync();
  }
  unlock() {
    if (this.blocked && this.options.enabled && !this.options.suspended) this.play();
  }
  private sync() {
    if (!this.audio) return;
    this.audio.volume = this.options.muted ? 0 : this.options.duck ? 0.035 : 0.15;
    if (this.options.enabled && !this.options.suspended && !this.requested && !this.blocked)
      this.play();
  }
  private play() {
    const audio = this.audio;
    if (!audio || !this.options.enabled || this.options.suspended || this.requested) return;
    const ticket = this.generation;
    this.requested = true;
    void audio
      .play()
      .then(() => {
        if (ticket !== this.generation || !this.options.enabled || this.options.suspended) {
          audio.pause();
          return;
        }
        this.blocked = false;
      })
      .catch((error) => {
        if (ticket !== this.generation) return;
        this.requested = false;
        if (!this.options.enabled || this.options.suspended) return;
        if (error instanceof DOMException && error.name === 'NotAllowedError') this.blocked = true;
        else this.failure(ticket);
      });
  }
  private next() {
    const available = this.tracks.map((_, i) => i).filter((i) => !this.failed.has(i));
    const choices = available.filter((i) => i !== this.index);
    const candidates = choices.length ? choices : available;
    this.release();
    if (!candidates.length) {
      this.onProblem('背景音乐暂时无法加载，请检查 public/music 中的音频文件。');
      return;
    }
    this.index =
      candidates[Math.min(candidates.length - 1, Math.floor(this.random() * candidates.length))];
    const audio = this.factory(this.tracks[this.index]);
    this.audio = audio;
    audio.preload = 'none';
    const ticket = this.generation;
    audio.onended = () => {
      if (ticket === this.generation && this.options.enabled) this.next();
    };
    audio.onerror = () => this.failure(ticket);
    this.sync();
  }
  private failure(ticket: number) {
    if (ticket !== this.generation || !this.options.enabled) return;
    this.failed.add(this.index);
    this.next();
  }
  private release() {
    this.generation++;
    this.requested = false;
    this.blocked = false;
    if (this.audio) {
      this.audio.onended = null;
      this.audio.onerror = null;
      this.audio.pause();
      this.audio.removeAttribute('src');
      this.audio.load();
      this.audio = undefined;
    }
  }
  dispose() {
    this.options = { ...this.options, enabled: false };
    this.release();
  }
}
