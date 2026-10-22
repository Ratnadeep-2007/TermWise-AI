import json
from pathlib import Path

import pytest

from backend.app.schemas import Deal


@pytest.fixture(autouse=True)
def no_live_model_calls(monkeypatch):
    for key in ("TERMWISE_AI_URL", "TERMWISE_AI_MODEL", "TERMWISE_AI_KEY"):
        monkeypatch.delenv(key, raising=False)


@pytest.fixture
def supplier():
    raw = json.loads((Path(__file__).parents[2] / "sample_data/supplier.json").read_text())["deal"]
    raw["confirmed"] = True
    return Deal.model_validate(raw)
