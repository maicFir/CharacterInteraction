import asyncio

import pytest

from app.models.scene import Reply, constrain
from app.models.session import Session, StaleTurn


@pytest.mark.asyncio
async def test_new_turn_cancels_and_rejects_late_results():
    s = Session()
    s.begin(1)
    s.task = asyncio.create_task(asyncio.sleep(20))
    old = s.task
    s.begin(2)
    await asyncio.sleep(0)
    assert old.cancelled()
    assert not s.current(1)
    assert s.current(2)
    with pytest.raises(StaleTurn):
        s.begin(1)


def test_interrupt_arriving_after_new_upload_does_not_cancel_new_turn():
    s = Session()
    s.begin(2)
    s.interrupt(1)
    assert s.current(2)


def test_cancelled_reply_never_commits_history():
    s = Session()
    s.begin(1)
    s.begin(2)
    assert not s.commit(1, "old", "old reply")
    assert s.history == []


def test_model_cannot_trigger_photo_without_relevant_input():
    result = constrain(Reply(text="你好", event="reveal_photo", action="offer_photo"), "你好")
    assert result.event == "none"
    assert result.action == "none"


def test_related_dialogue_can_trigger_environment_change():
    result = constrain(Reply(text="窗外雨还在下"), "这场雨真大")
    assert result.environment == "rain_window"
    assert result.action == "look_window"


def test_interrupted_played_reply_is_marked_partial_in_history():
    s = Session()
    s.begin(1)
    s.pending = (1, "你好", "这是一段还没说完的话")
    s.started = True
    s.interrupt(1)
    assert len(s.history) == 2
    assert "被打断" in s.history[-1]["content"]
