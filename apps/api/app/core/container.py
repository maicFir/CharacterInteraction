from dataclasses import dataclass

from ..services.contracts import ModelProviders
from ..services.interaction_service import InteractionService
from ..services.session_service import SessionService
from .config import Settings


@dataclass
class Services:
    settings: Settings
    sessions: SessionService
    interactions: InteractionService
    providers: ModelProviders
