from pydantic import BaseModel, Field

class TextInput(BaseModel):
    turn_id: int = Field(ge=1, le=10000)
    text: str = Field(min_length=1, max_length=1000)
