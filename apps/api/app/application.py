from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .controllers import http, realtime
from .core.config import load_settings
from .core.container import Services
from .core.errors import BusinessError
from .infrastructure.providers import Providers
from .repositories.session_repository import SessionRepository
from .services.events import EventPublisher
from .services.interaction_service import InteractionService
from .services.session_service import SessionService

ERROR_STATUS = {
    "not_found": 404,
    "expired": 410,
    "busy": 429,
    "unconfigured": 503,
    "invalid_input": 422,
    "invalid_audio": 413,
    "not_connected": 409,
    "too_fast": 429,
    "stale_turn": 409,
}


def create_app(settings=None, providers=None) -> FastAPI:
    cfg = settings or load_settings()
    models = providers or Providers(cfg)
    sessions = SessionService(cfg, SessionRepository(cfg))
    services = Services(cfg, sessions, InteractionService(cfg, models, EventPublisher()), models)

    @asynccontextmanager
    async def lifespan(app):
        sessions.start_cleanup()
        try:
            yield
        finally:
            await sessions.shutdown()
            await models.close()

    app = FastAPI(title="After Rain API", lifespan=lifespan)
    app.state.services = services
    app.add_middleware(
        CORSMiddleware,
        allow_origins=cfg.origins,
        allow_methods=["GET", "POST", "DELETE"],
        allow_headers=["Content-Type", "X-Session-Token"],
        max_age=600,
    )

    @app.exception_handler(BusinessError)
    async def business_error(request: Request, error: BusinessError):
        return JSONResponse(
            {"detail": error.message, "code": error.code}, status_code=ERROR_STATUS[error.code]
        )

    app.include_router(http.router)
    app.include_router(realtime.router)
    return app
