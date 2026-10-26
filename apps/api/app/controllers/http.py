from typing import Annotated

from fastapi import APIRouter, Depends, File, Form, Header, Request, UploadFile
from fastapi.responses import Response

from ..core.container import Services
from ..models.requests import TextInput
from ..models.responses import (
    AcceptedTurnResponse,
    ClosedSessionResponse,
    HealthResponse,
    SessionResponse,
)
from .dependencies import get_services

router = APIRouter(prefix="/api")
ServiceDependency = Annotated[Services, Depends(get_services)]
Token = Annotated[str, Header(alias="X-Session-Token")]


@router.get("/health", response_model=HealthResponse)
async def health(services: ServiceDependency):
    cfg = services.settings
    return {
        "status": "ok",
        "llm_configured": cfg.llm_ready,
        "llm_provider": cfg.llm_provider,
        "stt": cfg.stt_provider,
        "tts": cfg.tts_provider,
    }


@router.post("/sessions", status_code=201, response_model=SessionResponse)
async def create_session(request: Request, services: ServiceDependency):
    session = services.sessions.create(request.client.host if request.client else "unknown")
    return {"id": session.id, "token": session.token, "epoch": session.epoch}


@router.delete("/sessions/{session_id}", response_model=ClosedSessionResponse)
async def close_session(session_id: str, services: ServiceDependency, token: Token = ""):
    await services.sessions.close(services.sessions.authenticate(session_id, token))
    return {"closed": True}


@router.post(
    "/sessions/{session_id}/turns/text", status_code=202, response_model=AcceptedTurnResponse
)
async def text_turn(
    session_id: str, body: TextInput, services: ServiceDependency, token: Token = ""
):
    session = services.sessions.authenticate(session_id, token)
    return services.interactions.submit(session, body.turn_id, text=body.text)


@router.post(
    "/sessions/{session_id}/turns/audio", status_code=202, response_model=AcceptedTurnResponse
)
async def audio_turn(
    session_id: str,
    services: ServiceDependency,
    turn_id: int = Form(..., ge=1, le=10000),
    file: UploadFile = File(...),
    token: Token = "",
):
    session = services.sessions.authenticate(session_id, token)
    try:
        data = await file.read(3_000_001)
    finally:
        await file.close()
    return services.interactions.submit(session, turn_id, audio=data)


@router.get("/sessions/{session_id}/audio/{audio_id}")
async def get_audio(session_id: str, audio_id: str, services: ServiceDependency, token: Token = ""):
    session = services.sessions.authenticate(session_id, token)
    return Response(
        services.sessions.audio(session, audio_id),
        media_type="audio/wav",
        headers={"Cache-Control": "no-store"},
    )
