import type { SceneGateway, Session } from '../../../services/module/scene.types';
import { initial, patchScene, useScene } from '../model/store';
import { TurnGate, interpretMock, type Reply, type Ticket } from '../model/turns';

export class SceneController {
  constructor(private readonly gateway: SceneGateway) {}
  private gate = new TurnGate();
  private current?: Ticket;
  private session?: Session;
  private socket?: WebSocket;
  private abort?: AbortController;
  private audio?: HTMLAudioElement;
  private objectUrl?: string;
  private recorder?: MediaRecorder;
  private stream?: MediaStream;
  private recordingTimer?: ReturnType<typeof setTimeout>;
  private waitingTimer?: ReturnType<typeof setTimeout>;
  private releaseRequested = false;
  private recordingCancelled = false;
  private seen = new Set<string>();
  private replay?: () => void;
  private failureNext = false;

  async activate(mock: boolean): Promise<void> {
    this.disconnect();
    patchScene({
      ...initial,
      entered: true,
      mock,
      muted: useScene.getState().muted,
      stage: mock ? '本地演示已就绪' : '正在连接场景',
    });
    const ticket = this.gate.next();
    this.current = ticket;
    if (mock) {
      patchScene({ connected: true });
      return;
    }
    try {
      const session = await this.gateway.createSession();
      if (!this.gate.isCurrent(ticket)) {
        void this.removeSession(session);
        return;
      }
      this.session = session;
      const ws = this.gateway.openSocket(session);
      this.socket = ws;
      const timeout = setTimeout(() => {
        if (this.gate.isCurrent(ticket) && !useScene.getState().connected) {
          ws.close();
          this.fail('连接超时，请重新连接或切换 Mock。');
        }
      }, 10000);
      ws.onopen = () => {
        if (this.gate.isCurrent(ticket)) ws.send(JSON.stringify({ token: session.token }));
      };
      ws.onmessage = (message) => {
        if (this.socket !== ws) return;
        try {
          const event = JSON.parse(message.data);
          if (event.type === 'ready' && event.epoch === session.epoch) {
            clearTimeout(timeout);
            patchScene({ connected: true, stage: '真实场景已连接', error: '' });
            return;
          }
          const active = this.current;
          if (
            !active ||
            !this.gate.isCurrent(active) ||
            event.epoch !== session.epoch ||
            event.turn_id !== active.turn ||
            this.seen.has(event.event_id)
          )
            return;
          this.seen.add(event.event_id);
          if (event.type === 'state') patchScene({ phase: 'thinking', stage: event.payload.stage });
          if (event.type === 'recognized') patchScene({ userText: event.payload.text });
          if (event.type === 'error') this.fail(event.payload.message);
          if (event.type === 'reply.ready') {
            this.clearWaiting();
            void this.play(event.payload, active);
          }
        } catch {
          this.fail('收到无法识别的场景事件，请重新连接。');
        }
      };
      ws.onclose = () => {
        clearTimeout(timeout);
        if (this.socket === ws) {
          this.stop();
          patchScene({
            connected: false,
            error: '连接已断开。重新连接后会开始新会话。',
            stage: '连接中断',
          });
        }
      };
      ws.onerror = () => {
        if (this.socket === ws) this.fail('无法建立实时连接，请检查后端 HTTPS 与跨域配置。');
      };
    } catch (error) {
      if (this.gate.isCurrent(ticket)) this.fail(this.message(error));
    }
  }

  private async removeSession(session: Session) {
    try {
      await this.gateway.closeSession(session);
    } catch {
      /* expires server-side */
    }
  }
  disconnect() {
    this.stop();
    this.cancelRecording();
    this.gate.reset();
    this.current = undefined;
    const old = this.session;
    this.session = undefined;
    if (this.socket) {
      this.socket.onclose = null;
      this.socket.close();
      this.socket = undefined;
    }
    if (old) void this.removeSession(old);
    this.seen.clear();
  }
  stop() {
    const previous = this.current;
    this.current = this.gate.next();
    this.clearWaiting();
    this.abort?.abort();
    this.abort = undefined;
    if (this.audio) {
      this.audio.onended = null;
      this.audio.onerror = null;
      this.audio.onplaying = null;
      this.audio.pause();
      this.audio.removeAttribute('src');
      this.audio.load();
      this.audio = undefined;
    }
    if (this.objectUrl) {
      URL.revokeObjectURL(this.objectUrl);
      this.objectUrl = undefined;
    }
    this.replay = undefined;
    if (previous) this.send({ type: 'interrupt', turn_id: previous.turn });
    patchScene({ phase: 'idle', action: 'none', subtitle: '', blocked: false, stage: '等你继续' });
  }
  private begin(): Ticket {
    this.stop();
    const ticket = this.current!;
    this.seen.clear();
    patchScene({ error: '', phase: 'thinking', stage: '整理思绪' });
    this.waitingTimer = setTimeout(() => {
      if (this.gate.isCurrent(ticket)) {
        this.stop();
        this.fail('等待回复超时，请重新发送。');
      }
    }, 100000);
    return ticket;
  }
  async submit(text: string) {
    const value = text.trim();
    if (!value || !useScene.getState().connected) return;
    this.cancelRecording();
    const ticket = this.begin();
    patchScene({ userText: value });
    if (useScene.getState().mock) {
      await new Promise((resolve) => setTimeout(resolve, 700));
      if (!this.gate.isCurrent(ticket)) return;
      this.clearWaiting();
      if (this.failureNext) {
        this.failureNext = false;
        this.fail('模拟：语音服务暂时不可用。画面仍保留，可以重新发送。');
        return;
      }
      await this.play(interpretMock(value), ticket);
    } else {
      try {
        const session = this.session;
        if (!session) throw new Error('请先重新连接。');
        this.abort = new AbortController();
        await this.gateway.sendText({
          session,
          turnId: ticket.turn,
          text: value,
          signal: this.abort.signal,
        });
      } catch (error) {
        if (this.gate.isCurrent(ticket)) this.fail(this.message(error));
      }
    }
  }

  private async play(reply: Reply, ticket: Ticket) {
    if (!this.gate.isCurrent(ticket)) return;
    this.abort = new AbortController();
    const signal = this.abort.signal;
    try {
      const blob = await this.gateway.loadAudio({ session: this.session, reply, signal });
      if (!this.gate.isCurrent(ticket)) return;
      this.objectUrl = URL.createObjectURL(blob);
      const audio = new Audio(this.objectUrl);
      this.audio = audio;
      audio.muted = useScene.getState().muted;
      audio.onplaying = () => {
        if (!this.gate.isCurrent(ticket)) {
          audio.pause();
          return;
        }
        patchScene({
          phase: 'speaking',
          stage: 'Mira 正在说话',
          subtitle: reply.text,
          emotion: reply.emotion,
          action: reply.action,
          environment: reply.environment,
          photo: reply.event === 'reveal_photo' || useScene.getState().photo,
          blocked: false,
        });
        this.send({ type: 'playback', turn_id: ticket.turn, status: 'started' });
      };
      audio.onended = () => {
        if (!this.gate.isCurrent(ticket)) return;
        this.send({ type: 'playback', turn_id: ticket.turn, status: 'ended' });
        patchScene({ phase: 'idle', action: 'none', stage: '等你继续', blocked: false });
        if (this.objectUrl) URL.revokeObjectURL(this.objectUrl);
        this.objectUrl = undefined;
        this.audio = undefined;
        this.replay = undefined;
      };
      audio.onerror = () => {
        if (this.gate.isCurrent(ticket)) this.fail('这段声音无法播放。请重新发送。');
      };
      this.replay = () => {
        if (this.gate.isCurrent(ticket))
          void audio.play().catch(() => this.fail('浏览器仍未允许播放，请重新进入场景。'));
      };
      try {
        await audio.play();
      } catch (error) {
        if (!this.gate.isCurrent(ticket)) return;
        if (error instanceof DOMException && error.name === 'NotAllowedError')
          patchScene({
            blocked: true,
            phase: 'idle',
            stage: '点击继续播放',
            error: '浏览器需要你点击后才能播放声音。',
          });
        else throw error;
      }
    } catch (error) {
      if (this.gate.isCurrent(ticket)) {
        patchScene({ subtitle: reply.text });
        this.fail(this.message(error));
      }
    }
  }
  resumeAudio() {
    patchScene({ error: '' });
    this.replay?.();
  }
  toggleMute() {
    const muted = !useScene.getState().muted;
    if (this.audio) this.audio.muted = muted;
    patchScene({ muted });
  }
  simulateFailure() {
    this.failureNext = true;
    void this.submit('你好');
  }

  async startRecording() {
    if (!useScene.getState().connected || this.recorder || useScene.getState().recording) return;
    const ticket = this.begin();
    this.clearWaiting();
    this.releaseRequested = false;
    this.recordingCancelled = false;
    patchScene({ phase: 'listening', recording: true, stage: '正在听你说话', userText: '' });
    if (useScene.getState().mock) {
      this.recordingTimer = setTimeout(() => this.finishRecording(), 20000);
      return;
    }
    try {
      if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder)
        throw new Error('此浏览器无法录音。请使用 HTTPS 下的 Safari/Chrome，或改用文字。');
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
      });
      if (!this.gate.isCurrent(ticket)) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      this.stream = stream;
      if (this.releaseRequested) {
        this.cancelRecording();
        this.stop();
        return;
      }
      const mimeType = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/webm'].find((t) =>
        MediaRecorder.isTypeSupported(t),
      );
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      this.recorder = recorder;
      const chunks: Blob[] = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size) chunks.push(event.data);
      };
      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        this.stream = undefined;
        this.recorder = undefined;
        patchScene({ recording: false });
        if (this.recordingCancelled || !this.gate.isCurrent(ticket)) return;
        const blob = new Blob(chunks, { type: recorder.mimeType });
        if (blob.size < 100) {
          this.fail('录音太短，请按住说完后松开。');
          return;
        }
        if (useScene.getState().mock) {
          patchScene({ stage: 'Mock 语音样例：窗外的雨停了吗？' });
          void this.submit('窗外的雨停了吗？');
        } else void this.uploadAudio(blob, ticket);
      };
      recorder.onerror = () => {
        this.cancelRecording();
        this.fail('录音被系统打断，请重试。');
      };
      recorder.start();
      this.recordingTimer = setTimeout(() => this.finishRecording(), 20000);
    } catch (error) {
      if (this.gate.isCurrent(ticket)) {
        patchScene({ recording: false });
        this.fail(
          error instanceof DOMException && error.name === 'NotAllowedError'
            ? '麦克风未获授权，可以修改浏览器权限或使用文字。'
            : this.message(error),
        );
      }
    }
  }
  finishRecording() {
    this.releaseRequested = true;
    if (this.recordingTimer) clearTimeout(this.recordingTimer);
    if (useScene.getState().mock && useScene.getState().recording) {
      patchScene({ recording: false });
      void this.submit('窗外的雨停了吗？');
      return;
    }
    if (this.recorder?.state === 'recording') this.recorder.stop();
  }
  cancelRecording() {
    this.recordingCancelled = true;
    this.releaseRequested = true;
    if (this.recordingTimer) clearTimeout(this.recordingTimer);
    if (this.recorder) {
      this.recorder.onstop = null;
      if (this.recorder.state === 'recording') this.recorder.stop();
      this.recorder = undefined;
    }
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = undefined;
    patchScene({ recording: false });
  }
  private async uploadAudio(blob: Blob, ticket: Ticket) {
    if (!this.session || !this.gate.isCurrent(ticket)) return;
    patchScene({ phase: 'thinking', stage: '识别你的声音' });
    this.waitingTimer = setTimeout(() => {
      if (this.gate.isCurrent(ticket)) {
        this.stop();
        this.fail('语音处理超时，请重试。');
      }
    }, 100000);
    this.abort = new AbortController();
    const form = new FormData();
    form.append('file', blob, blob.type.includes('mp4') ? 'speech.m4a' : 'speech.webm');
    form.append('turn_id', String(ticket.turn));
    try {
      await this.gateway.uploadAudio({ session: this.session, form, signal: this.abort.signal });
    } catch (error) {
      if (this.gate.isCurrent(ticket)) this.fail(this.message(error));
    }
  }
  private send(message: object) {
    if (this.socket?.readyState === WebSocket.OPEN)
      this.socket.send(JSON.stringify({ ...message, epoch: this.session?.epoch }));
  }
  private clearWaiting() {
    if (this.waitingTimer) clearTimeout(this.waitingTimer);
    this.waitingTimer = undefined;
  }
  private fail(message: string) {
    this.clearWaiting();
    patchScene({
      error: message,
      phase: 'idle',
      action: 'none',
      recording: false,
      stage: '稍等一下',
    });
  }
  private message(error: unknown) {
    return error instanceof Error ? error.message : '发生连接错误，请重试。';
  }
}
