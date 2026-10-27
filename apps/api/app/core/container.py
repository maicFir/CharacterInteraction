from dataclasses import dataclass

from ..services.contracts import ModelProviders
from ..services.interaction_service import InteractionService
from ..services.model_service import ModelService
from ..services.scene_service import SceneService
from ..services.session_service import SessionService
from .config import Settings


@dataclass
class Services:
    settings: Settings
    sessions: SessionService
    interactions: InteractionService
    providers: ModelProviders
    catalog: ModelService
    scenes: SceneService
