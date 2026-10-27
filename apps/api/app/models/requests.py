from pydantic import BaseModel, Field, field_validator

from .scene_definition import SceneDefinition


class TextInput(BaseModel):
    turn_id: int = Field(ge=1, le=10000)
    text: str = Field(min_length=1, max_length=1000)


class SessionInput(BaseModel):
    scene: SceneDefinition | None = None
    model_id: str | None = Field(default=None, min_length=1, max_length=200)


class GenerateSceneInput(BaseModel):
    prompt: str = Field(min_length=10, max_length=2000)
    model_id: str | None = Field(default=None, min_length=1, max_length=200)

    @field_validator("prompt")
    @classmethod
    def not_blank(cls, value):
        if len(value.strip()) < 10:
            raise ValueError("请至少输入10个字的场景描述")
        return value.strip()
