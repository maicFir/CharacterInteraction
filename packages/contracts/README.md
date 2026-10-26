# Scene event contract v1

HTTP uses `X-Session-Token`. WebSocket authenticates in its first JSON message
`{ "token": "..." }`, then receives `ready` with the server epoch. Tokens are
short-lived anonymous session capabilities, never model keys.

Server envelopes: `session_id, epoch, turn_id, event_id, type, payload`.
Types: `state`, `recognized`, `reply.ready`, `error`.
Replies: `text, emotion, action, environment, event, audio_path`.
The client discards every event whose epoch or turn is stale and deduplicates event_id.

Client control: `{ type:"interrupt", epoch, turn_id }` invalidates turns <= turn_id;
`{ type:"playback", epoch, turn_id, status:"started"|"ended" }` acknowledges audio.
Schema authority: `apps/api/app/models/scene.py`; frontend union types: `apps/web/src/features/scene/model/turns.ts`.
