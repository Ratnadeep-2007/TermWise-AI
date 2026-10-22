"""One auditable event ledger for baseline, scenarios, and solver verification."""

from datetime import timedelta
from decimal import ROUND_HALF_UP, Decimal

from .schemas import Deal, Event, Scenario, SolverOptions

OUTFLOWS = {"expense", "other_outflow"}
PAYMENTS = {"advance", "milestone", "final", "retention"}
CENT = Decimal("0.01")


def money(value: Decimal) -> Decimal:
    return value.quantize(CENT, rounding=ROUND_HALF_UP)


def append_candidate_event(events: list[Event], label, dt, amount, kind):
    event_id = f"candidate-{len(events)}"
    while event_id in {e.id for e in events}:
        event_id += "-new"
    events.append(Event(id=event_id, label=label, date=dt, amount=amount, kind=kind))


def breach_periods(rows: list[dict], threshold: Decimal) -> list[dict]:
    periods = []
    active = None
    for row in rows:
        if row["balance"] < threshold:
            if active is None:
                active = {"from_date": row["date"], "to_date": None, "maximum_gap": Decimal(0)}
            active["maximum_gap"] = max(active["maximum_gap"], threshold - row["balance"])
        elif active is not None:
            active["to_date"] = row["date"]
            periods.append(active)
            active = None
    if active is not None:
        periods.append(active)
    return periods


def simulate(deal: Deal) -> dict:
    balance = deal.opening_cash
    minimum = balance
    minimum_date = deal.opening_date
    rows = [
        {
            "date": str(deal.opening_date),
            "label": "Opening cash",
            "id": "opening",
            "kind": "opening",
            "change": Decimal(0),
            "balance": balance,
        }
    ]
    # Conservative intraday order: every outgoing event precedes every receipt.
    for event in sorted(deal.events, key=lambda e: (e.date, 0 if e.kind in OUTFLOWS else 1, e.id)):
        change = -event.amount if event.kind in OUTFLOWS else event.amount
        balance += change
        rows.append(
            {
                "date": str(event.date),
                "id": event.id,
                "label": event.label,
                "kind": event.kind,
                "change": change,
                "balance": balance,
            }
        )
        if balance < minimum:
            minimum, minimum_date = balance, event.date
    breaches = [
        {
            "date": row["date"],
            "label": row["label"],
            "balance": row["balance"],
            "reserve_gap": deal.reserve - row["balance"],
            "cash_shortfall": max(Decimal(0), -row["balance"]),
        }
        for row in rows
        if row["balance"] < deal.reserve
    ]
    return {
        "timeline": rows,
        "minimum_balance": minimum,
        "minimum_date": str(minimum_date),
        "closing_balance": balance,
        "additional_funding": max(Decimal(0), deal.reserve - minimum),
        "cash_shortfall": max(Decimal(0), -minimum),
        "reserve_met": minimum >= deal.reserve,
        "breaches": breaches,
        "reserve_breach_periods": breach_periods(rows, deal.reserve),
        "cash_shortfall_periods": breach_periods(rows, Decimal(0)),
        "ordering": "Outflows before inflows on the same date; opening cash is available first.",
    }


def apply_scenario(deal: Deal, scenario: Scenario) -> Deal:
    events = []
    deferred = Decimal(0)
    for original in deal.events:
        e = original.model_copy(deep=True)
        if e.kind in {"final", "retention"}:
            e.date += timedelta(days=scenario.delay_days)
        elif e.kind == "milestone":
            e.date += timedelta(days=scenario.milestone_delay_days)
        elif e.kind == "advance":
            reduction = money(e.amount * scenario.advance_reduction_pct / 100)
            deferred += reduction
            e.amount -= reduction
        if e.kind == "expense":
            e.amount = money(e.amount * (1 + scenario.expense_increase_pct / 100))
            e.date = max(
                deal.opening_date,
                e.date - timedelta(days=scenario.expense_earlier_days),
            )
        events.append(e)
    if deferred:
        finals = [e for e in events if e.kind == "final"]
        if not finals:
            raise ValueError(
                "A final payment is needed to defer the reduced advance without losing contract value."
            )
        max(finals, key=lambda e: e.date).amount += deferred
    return Deal.model_validate({**deal.model_dump(), "events": events})


def analyze(deal: Deal, scenarios: list[Scenario]) -> dict:
    if not deal.confirmed:
        raise ValueError(
            "Review and confirm the payment terms and financial assumptions before calculating."
        )
    baseline = simulate(deal)
    comparisons = []
    for scenario in scenarios:
        result = simulate(apply_scenario(deal, scenario))
        comparisons.append(
            {
                "name": scenario.name,
                "assumptions": scenario.model_dump(),
                "result": result,
                "minimum_delta": result["minimum_balance"] - baseline["minimum_balance"],
            }
        )
    return {"baseline": baseline, "scenarios": comparisons}


def solve(deal: Deal, options: SolverOptions) -> dict:
    if not deal.confirmed:
        raise ValueError("Confirm inputs before searching for alternative terms.")
    finals = [e for e in deal.events if e.kind == "final"]
    if not finals:
        raise ValueError(
            "Add a final payment so the solver can reconcile the remaining contract balance."
        )
    final_date = options.final_date or max(e.date for e in finals)
    if options.advance_date < deal.opening_date or options.advance_date > final_date:
        raise ValueError(
            "Advance date must be between opening cash availability and final payment."
        )
    if options.milestone_pct and not (options.advance_date <= options.milestone_date <= final_date):
        raise ValueError("The added milestone must be between the advance and final payment dates.")
    fixed = [e.model_copy(deep=True) for e in deal.events if e.kind not in {"advance", "final"}]
    fixed_total = sum((e.amount for e in fixed if e.kind in PAYMENTS), Decimal(0))
    extra_milestone = money(deal.contract_value * Decimal(options.milestone_pct) / 100)
    percentages = sorted(
        set(range(0, options.max_advance_pct + 1, options.step_pct)) | {options.max_advance_pct}
    )
    candidates = []
    tested = 0
    for pct in percentages:
        advance = money(deal.contract_value * Decimal(pct) / 100)
        remainder = deal.contract_value - fixed_total - extra_milestone - advance
        if remainder < 0:
            continue
        # Assign all new IDs after the original namespace to avoid collisions.
        events = [e.model_copy(deep=True) for e in fixed]
        if advance:
            append_candidate_event(
                events, "Proposed advance", options.advance_date, advance, "advance"
            )
        if extra_milestone:
            append_candidate_event(
                events,
                "Proposed added milestone",
                options.milestone_date,
                extra_milestone,
                "milestone",
            )
        append_candidate_event(events, "Remaining final payment", final_date, remainder, "final")
        candidate = Deal.model_validate({**deal.model_dump(), "events": events})
        tested += 1
        result = simulate(candidate)
        stressed = (
            simulate(apply_scenario(candidate, options.protect_scenario))
            if options.protect_scenario
            else None
        )
        if result["reserve_met"] and (stressed is None or stressed["reserve_met"]):
            # Fresh validation and independent engine invocation before exposing feasibility.
            verified = simulate(Deal.model_validate(candidate.model_dump()))
            if not verified["reserve_met"]:
                raise RuntimeError("Candidate verification failed.")
            candidates.append(
                {
                    "advance_pct": pct,
                    "advance_amount": advance,
                    "deal": candidate.model_dump(),
                    "result": verified,
                    "stress_result": stressed,
                }
            )
    return {
        "candidates": candidates[:3],
        "tested": tested,
        "feasible_count": len(candidates),
        "objective": "Lowest advance percentage among tested candidates. Existing milestones and retention are preserved; final payments are combined on the chosen final date.",
        "search": f"Integer advances from 0 to {options.max_advance_pct}% in {options.step_pct}% steps, including the upper bound. Receipt dates and added milestone are fixed to your choices.",
        "message": "Verified alternatives found under the stated assumptions."
        if candidates
        else "No feasible candidate found within the tested bounds. This does not rule out other schedules.",
        "assumptions": options.model_dump(),
    }
