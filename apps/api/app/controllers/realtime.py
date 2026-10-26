import asyncio
import contextlib

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from ..core.errors import BusinessError
from .dependencies import get_services

router = APIRouter()


@router.websocket("/ws/sessions/{session_id}")
async def scene_socket(ws: WebSocket, session_id: str):
    services = get_services(ws)
    if ws.headers.get("origin") not in services.settings.origins:
        await ws.close(code=1008)
        return
    await ws.accept()
    session = None
    try:
        auth = await asyncio.wait_for(ws.receive_json(), timeout=5)
        if not isinstance(auth, dict):
            await ws.close(code=1008)
            return
        session = services.sessions.authenticate(session_id, auth.get("token", ""))
        if session.socket:
            await ws.close(code=1008)
            return
        session.socket = ws
        await ws.send_json({"type": "ready", "epoch": session.epoch})
        while True:
            message = await ws.receive_json()
            if isinstance(message, dict):
                services.sessions.control(session, message)
    except (WebSocketDisconnect, TimeoutError, BusinessError, ValueError, TypeError):
        pass
    finally:
        if session and session.socket is ws:
            session.interrupt(session.turn)
            session.socket = None
        with contextlib.suppress(Exception):
            await ws.close()
