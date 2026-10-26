from pydantic import BaseModel

class HealthResponse(BaseModel):
    status: str
    llm_configured: bool
    llm_provider: str
    stt: str
    tts: str

class SessionResponse(BaseModel):
    id: str
    token: str
    epoch: str

class AcceptedTurnResponse(BaseModel):
    accepted: bool
    turn_id: int

class ClosedSessionResponse(BaseModel):
    closed: bool
