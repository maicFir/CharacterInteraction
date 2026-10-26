import secrets

from ..models.session import Session


class EventPublisher:
    async def publish(self, session: Session, turn: int, event_type: str, payload: dict):
        if not session.current(turn) or not session.socket:
            return
        envelope = {
            "session_id": session.id,
            "epoch": session.epoch,
            "turn_id": turn,
            "event_id": secrets.token_hex(8),
            "type": event_type,
            "payload": payload,
        }
        try:
            await session.socket.send_json(envelope)
        except Exception:
            # A socket can close after the current-turn check; never replay the event.
            return
