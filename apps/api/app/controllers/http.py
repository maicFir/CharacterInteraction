from typing import Annotated

from fastapi import APIRouter, Body, Depends, File, Form, Header, Request, UploadFile
from fastapi.responses import Response

from ..core.container import Services
from ..models.requests import GenerateSceneInput, SessionInput, TextInput
from ..models.responses import (
    AcceptedTurnResponse,
    ClosedSessionResponse,
    HealthResponse,
    ModelCatalogResponse,
    SessionResponse,
)
from ..models.scene_definition import SceneDefinition
from .dependencies import get_services

router = APIRouter(prefix="/api")
ServiceDependency = Annotated[Services, Depends(get_services)]
Token = Annotated[str, Header(alias="X-Session-Token")]


@router.get("/health", response_model=HealthResponse)
async def health(services: ServiceDependency):
    cfg = services.settings
    return {
        "status": "ok",
        "environment": cfg.app_env,
        "llm_configured": cfg.llm_ready,
        "llm_provider": cfg.llm_provider,
        "stt": cfg.stt_provider,
        "tts": cfg.tts_provider,
    }


@router.post("/sessions", status_code=201, response_model=SessionResponse)
async def create_session(
    request: Request, services: ServiceDependency, body: SessionInput | None = Body(default=None)
):
    session = await services.sessions.create(
        request.client.host if request.client else "unknown",
        body.model_id if body else None,
        body.scene if body else None,
    )
    return {
        "id": session.id,
        "token": session.token,
        "epoch": session.epoch,
        "model_id": session.model_id,
    }


@router.get("/models/openrouter", response_model=ModelCatalogResponse)
async def list_models(services: ServiceDependency):
    return {
        "data": await services.catalog.list_models(),
        "default_model": services.settings.default_model,
        "selection_enabled": services.settings.llm_provider == "openrouter",
    }


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


@router.post("/scenes/generate", response_model=SceneDefinition)
async def generate_scene(request: Request, body: GenerateSceneInput, services: ServiceDependency):
    return await services.scenes.generate(
        request.client.host if request.client else "unknown", body.prompt, body.model_id
    )
