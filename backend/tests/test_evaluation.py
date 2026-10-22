"""Frozen fictional evaluation inputs, with hand-calculated expected outcomes."""

import json
from decimal import Decimal
from pathlib import Path

import pytest
from pydantic import ValidationError

from backend.app.engine import apply_scenario, simulate, solve
from backend.app.extraction import rule_extract
from backend.app.schemas import Deal, Scenario, SolverOptions

CASES = json.loads((Path(__file__).parents[2] / "evaluation/cases.json").read_text())


@pytest.mark.parametrize("case", CASES, ids=lambda case: case["id"])
def test_fixed_evaluation(case, supplier):
    match case["type"]:
        case "extract":
            result = rule_extract([{"page": None, "text": case["text"]}], case["id"])
            assert [p["amount"] for p in result["payments"]] == case["amounts"]
            assert [p["date"] for p in result["payments"]] == case["dates"]
            for payment in result["payments"]:
                assert payment["source"]["quote"] in case["text"]
            if "contract_value" in case:
                assert Decimal(result["contract_value"]) == Decimal(case["contract_value"])
        case "simulate":
            result = simulate(apply_scenario(supplier, Scenario.model_validate(case["scenario"])))
            assert result["minimum_balance"] == Decimal(case["minimum"])
            assert result["additional_funding"] == Decimal(case["funding"])
        case "invalid":
            raw = supplier.model_dump()
            raw["events"][case["event_index"]].update(case["patch"])
            with pytest.raises(ValidationError):
                Deal.model_validate(raw)
        case "solve":
            result = solve(
                supplier,
                SolverOptions(advance_date="2026-11-01", max_advance_pct=case["max_advance_pct"]),
            )
            assert (
                result["candidates"][0]["advance_pct"] if result["candidates"] else None
            ) == case["first_pct"]
