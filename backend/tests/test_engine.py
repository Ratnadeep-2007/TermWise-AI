from datetime import date
from decimal import Decimal

import pytest
from pydantic import ValidationError

from backend.app.engine import analyze, apply_scenario, simulate, solve
from backend.app.schemas import Deal, Event, Scenario, SolverOptions


def options(**kw):
    return SolverOptions(advance_date=date(2026, 11, 1), **kw)


def test_known_supplier_ledger(supplier):
    result = simulate(supplier)
    assert [r["balance"] for r in result["timeline"]] == [
        80000,
        10000,
        -40000,
        160000,
        110000,
    ]
    assert result["minimum_balance"] == -40000
    assert result["additional_funding"] == 60000
    assert result["cash_shortfall"] == 40000
    assert result["minimum_date"] == "2026-11-20"
    assert result["reserve_breach_periods"] == [
        {"from_date": "2026-11-05", "to_date": "2027-01-15", "maximum_gap": Decimal("60000")}
    ]
    assert result["cash_shortfall_periods"] == [
        {"from_date": "2026-11-20", "to_date": "2027-01-15", "maximum_gap": Decimal("40000")}
    ]


@pytest.mark.parametrize(
    "scenario,expected",
    [
        (Scenario(delay_days=15), -90000),
        (Scenario(expense_increase_pct=20), -64000),
        (Scenario(delay_days=15, expense_increase_pct=20), -114000),
        (Scenario(expense_earlier_days=365), -40000),
    ],
)
def test_scenarios_have_independent_expected_minima(supplier, scenario, expected):
    assert simulate(apply_scenario(supplier, scenario))["minimum_balance"] == expected
    assert simulate(supplier)["minimum_balance"] == -40000  # immutable input


def test_baseline_and_stress_solver(supplier):
    result = solve(supplier, options())
    assert result["candidates"][0]["advance_pct"] == 30
    assert result["candidates"][0]["advance_amount"] == 60000
    assert result["candidates"][0]["result"]["minimum_balance"] == 20000
    stressed = solve(
        supplier,
        options(
            max_advance_pct=80,
            protect_scenario=Scenario(delay_days=15, expense_increase_pct=20),
        ),
    )
    assert stressed["candidates"][0]["advance_pct"] == 67
    assert stressed["candidates"][0]["stress_result"]["minimum_balance"] == 20000


def test_no_solution_is_bounded_not_universal(supplier):
    result = solve(supplier, options(max_advance_pct=29))
    assert result["candidates"] == []
    assert "tested bounds" in result["message"]


def test_outflow_before_same_day_advance(supplier):
    same_day = SolverOptions(advance_date=date(2026, 11, 20), max_advance_pct=100)
    assert solve(supplier, same_day)["candidates"] == []
    assert solve(supplier, options())["candidates"]


def test_opening_cash_reserve_breach_cannot_be_hidden(supplier):
    raw = supplier.model_dump()
    raw.update(opening_cash="10000", reserve="20000")
    assert not solve(Deal.model_validate(raw), options(max_advance_pct=100))["candidates"]


def test_reduced_advance_is_deferred_not_lost(supplier):
    improved = Deal.model_validate(solve(supplier, options())["candidates"][0]["deal"])
    scenario = apply_scenario(improved, Scenario(advance_reduction_pct=100))
    assert sum(e.amount for e in scenario.events if e.kind in {"advance", "final"}) == 200000
    assert simulate(scenario)["minimum_balance"] == -40000


def test_milestone_can_reduce_required_advance(supplier):
    result = solve(supplier, options(milestone_pct=15, milestone_date=date(2026, 11, 3)))
    assert result["candidates"][0]["advance_pct"] == 15


def test_retention_and_existing_milestone_preserved(supplier):
    raw = supplier.model_dump()
    raw["events"][0]["amount"] = "170000"
    raw["events"] += [
        {
            "id": "m1",
            "label": "Milestone",
            "date": "2026-12-01",
            "amount": "20000",
            "kind": "milestone",
        },
        {
            "id": "r1",
            "label": "Retention",
            "date": "2027-02-01",
            "amount": "10000",
            "kind": "retention",
        },
    ]
    deal = Deal.model_validate(raw)
    result = solve(deal, options())
    assert result["candidates"]
    for c in result["candidates"]:
        events = c["deal"]["events"]
        assert next(e for e in events if e["id"] == "m1")["amount"] == 20000
        assert next(e for e in events if e["id"] == "r1")["date"] == date(2027, 2, 1)


@pytest.mark.parametrize(
    "field,value",
    [
        ("opening_cash", "-1"),
        ("reserve", "NaN"),
        ("contract_value", "1.001"),
        ("currency", "CAD"),
    ],
)
def test_invalid_financial_fields(supplier, field, value):
    raw = supplier.model_dump()
    raw[field] = value
    with pytest.raises(ValidationError):
        Deal.model_validate(raw)


@pytest.mark.parametrize(
    "change",
    [
        {"amount": "199999.99"},
        {"date": "2026-10-01"},
        {"currency": "USD"},
        {"date": ""},
    ],
)
def test_invalid_event_schedule(supplier, change):
    raw = supplier.model_dump()
    raw["events"][0].update(change)
    with pytest.raises(ValidationError):
        Deal.model_validate(raw)


def test_confirmation_is_required(supplier):
    supplier.confirmed = False
    with pytest.raises(ValueError, match="confirm"):
        analyze(supplier, [])


def test_exact_decimal_cents():
    d = Deal(
        name="Cents",
        opening_cash="0.10",
        opening_date="2026-11-01",
        contract_value="0.20",
        reserve=0,
        confirmed=True,
        events=[
            Event(id="p", label="Receipt", date="2026-11-02", amount="0.20", kind="final"),
            Event(id="e", label="Cost", date="2026-11-03", amount="0.30", kind="expense"),
        ],
    )
    assert simulate(d)["closing_balance"] == Decimal("0.00")


def test_solver_against_independent_integer_oracle(supplier):
    # Independent closed-form oracle for this fixture: reserve gap = 120000 + reserve - opening.
    for opening in [20000, 30000, 80000, 140000]:
        raw = supplier.model_dump()
        raw["opening_cash"] = opening
        d = Deal.model_validate(raw)
        actual = solve(d, options(max_advance_pct=100))
        required = max(0, 120000 + 20000 - opening)
        expected_pct = (required + 1999) // 2000
        assert actual["candidates"][0]["advance_pct"] == expected_pct
        for c in actual["candidates"]:
            # Integer ledger independent from production Decimal engine.
            balance = opening * 100
            minimum = balance
            for e in sorted(
                c["deal"]["events"],
                key=lambda e: (
                    e["date"],
                    0 if e["kind"] in {"expense", "other_outflow"} else 1,
                    e["id"],
                ),
            ):
                amount = int(e["amount"] * 100)
                balance += -amount if e["kind"] in {"expense", "other_outflow"} else amount
                minimum = min(balance, minimum)
            assert minimum >= 20000 * 100
