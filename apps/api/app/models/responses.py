from pydantic import BaseModel


class HealthResponse(BaseModel):
    status: str
    environment: str
    llm_configured: bool
    llm_provider: str
    stt: str
    tts: str


class SessionResponse(BaseModel):
    id: str
    token: str
    epoch: str
    model_id: str


class AcceptedTurnResponse(BaseModel):
    accepted: bool
    turn_id: int


class ClosedSessionResponse(BaseModel):
    closed: bool


class ModelInfo(BaseModel):
    id: str
    name: str
    context_length: int
    input_price_per_million: str | None
    output_price_per_million: str | None
    is_free: bool
    supported_parameters: list[str]


class ModelCatalogResponse(BaseModel):
    data: list[ModelInfo]
    default_model: str
    selection_enabled: bool
