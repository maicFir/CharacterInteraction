export type Phase = 'idle' | 'listening' | 'thinking' | 'speaking';
export type Reply = {
  text: string;
  emotion: 'calm' | 'curious' | 'sad';
  action: 'none' | 'look_window' | 'offer_photo';
  environment: 'cafe_night' | 'rain_window';
  event: 'none' | 'reveal_photo';
  audio_path?: string;
  clip?: string;
};
export type Ticket = { epoch: number; turn: number };
export class TurnGate {
  private epoch = 0;
  private turn = 0;
  next(): Ticket {
    return { epoch: this.epoch, turn: ++this.turn };
  }
  reset() {
    this.epoch++;
    this.turn = 0;
  }
  isCurrent(ticket: Ticket) {
    return ticket.epoch === this.epoch && ticket.turn === this.turn;
  }
}
export function interpretMock(text: string): Reply {
  const base: Reply = {
    text: '你好，我叫 Mira。雨刚小了一点。要不要在这里坐一会儿？这杯咖啡还很暖。',
    emotion: 'calm',
    action: 'none',
    environment: 'cafe_night',
    event: 'none',
    clip: 'hello',
  };
  if (/照片|摄影|相机|拍照|photo|camera/i.test(text))
    return {
      ...base,
      text: '这是我去年在海边拍的照片。那天也是下雨，后来天突然放晴了。你看，光落在海面上的样子。',
      emotion: 'curious',
      action: 'offer_photo',
      event: 'reveal_photo',
      clip: 'photo',
    };
  if (/雨|窗|rain|window/i.test(text))
    return {
      ...base,
      text: '你听，雨还在敲窗。我挺喜欢这样的夜晚，好像整个城市终于慢了下来。我们再等一会儿吧。',
      action: 'look_window',
      environment: 'rain_window',
      clip: 'rain',
    };
  if (/等谁|等人|朋友|难过|伤心|等待/.test(text))
    return {
      ...base,
      text: '我在等一位很久没见的朋友。其实我也不知道她会不会来。带着这张照片，总觉得还能再见一面。',
      emotion: 'sad',
      clip: 'waiting',
    };
  if (/旅|海|哪里|故事/.test(text))
    return {
      ...base,
      text: '我去过一座靠海的小城。那里的人把雨天当成假期，坐在屋檐下喝茶。下次，我也想带你看看。',
      emotion: 'curious',
      clip: 'travel',
    };
  if (/再见|谢谢|晚安/.test(text))
    return {
      ...base,
      text: '谢谢你陪我等这一场雨。和你聊过以后，今晚好像没有那么冷了。路上小心，我们下次再见。',
      clip: 'goodbye',
    };
  return base;
}
