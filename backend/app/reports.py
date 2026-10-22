from .engine import analyze, solve
from .schemas import ReportRequest


def generate_report(request: ReportRequest) -> dict:
    deal = request.deal
    analysis = analyze(deal, request.scenarios)
    alternatives = solve(deal, request.options) if request.options else None
    baseline = analysis["baseline"]

    def fmt(amount):
        return f"{deal.currency} {amount:,.2f}"

    lines = [
        f"# TermWise decision report: {deal.name}",
        "",
        f"Contract value: {fmt(deal.contract_value)}",
        f"Opening cash: {fmt(deal.opening_cash)} on {deal.opening_date}",
        f"Minimum reserve target: {fmt(deal.reserve)}",
        "",
        "## Confirmed cash events",
        "",
    ]
    if deal.term_evidence:
        lines += ["## Document term evidence", ""]
        for source in deal.term_evidence:
            location = f", page {source.page}" if source.page else ", source excerpt"
            lines += [
                f"- {source.document}{location}; {source.status}.",
                f"  > {source.quote}",
            ]
        lines += ["", "## Cash schedule", ""]
    for e in deal.events:
        lines.append(f"- {e.date} | {e.kind} | {e.label}: {fmt(e.amount)}")
        if e.source:
            location = (
                f", page {e.source.page}"
                if e.source.page
                else ", paragraph/table excerpt (no page number)"
            )
            lines += [
                f"  Source: {e.source.document}{location}; {e.source.status}.",
                f"  > {e.source.quote}",
            ]
        else:
            lines.append("  Source: user input or proposed calculation input.")
    lines += [
        "",
        "## Baseline",
        "",
        f"Minimum balance: {fmt(baseline['minimum_balance'])} on {baseline['minimum_date']}.",
        f"Additional funding needed to maintain reserve: {fmt(baseline['additional_funding'])}.",
        f"Cash shortfall below zero: {fmt(baseline['cash_shortfall'])}.",
        f"Reserve target satisfied: {'yes' if baseline['reserve_met'] else 'no'}.",
        "",
        "## Event ledger",
        "",
        "| Date | Event | Change | Balance |",
        "| --- | --- | ---: | ---: |",
    ]
    for row in baseline["timeline"]:
        lines.append(
            f"| {row['date']} | {row['label'].replace('|', '/')} | {fmt(row['change'])} | {fmt(row['balance'])} |"
        )
    lines += ["", "## Reserve breach periods", ""]
    for period in baseline["reserve_breach_periods"]:
        end = period["to_date"] or "not recovered by the final modeled event"
        lines.append(
            f"- {period['from_date']} to {end}; maximum reserve gap {fmt(period['maximum_gap'])}."
        )
    if not baseline["reserve_breach_periods"]:
        lines.append("No reserve breach in the modeled event sequence.")
    lines.append(
        "Same-date start/end denotes an intraday breach under conservative ordering. No balance projection beyond the last event is implied."
    )
    lines += ["", "## Conditional stress scenarios", ""]
    for scenario in analysis["scenarios"]:
        assumptions = ", ".join(
            f"{k}={v}" for k, v in scenario["assumptions"].items() if k != "name"
        )
        lines += [
            (
                f"- {scenario['name']}: minimum {fmt(scenario['result']['minimum_balance'])}, "
                f"reserve funding gap {fmt(scenario['result']['additional_funding'])}. Assumptions: {assumptions}."
            )
        ]
    if not analysis["scenarios"]:
        lines.append("No stress scenarios requested.")
    draft = f"Hello, I would like to discuss the payment schedule for {deal.name}. "
    if alternatives and alternatives["candidates"]:
        chosen = alternatives["candidates"][0]
        lines += [
            "",
            "## Calculated alternatives",
            "",
            alternatives["objective"],
            alternatives["search"],
        ]
        for i, candidate in enumerate(alternatives["candidates"], 1):
            lines.append(
                f"### Option {i}: {candidate['advance_pct']}% advance ({fmt(candidate['advance_amount'])})"
            )
            lines.append(
                f"Verified minimum balance: {fmt(candidate['result']['minimum_balance'])}."
            )
            for e in candidate["deal"]["events"]:
                if e["kind"] in {"advance", "milestone", "final", "retention"}:
                    lines.append(f"- {e['date']} {e['label']}: {fmt(e['amount'])}")
            if candidate["stress_result"]:
                lines.append(
                    f"Protected scenario minimum: {fmt(candidate['stress_result']['minimum_balance'])}."
                )
        schedule = "; ".join(
            f"{e['label']}: {fmt(e['amount'])} on {e['date']}"
            for e in chosen["deal"]["events"]
            if e["kind"] in {"advance", "milestone", "final", "retention"}
        )
        draft += (
            f"Based on our planned costs and timing, could we consider this schedule: {schedule}? "
            f"Under our stated assumptions, it maintains a minimum balance of {fmt(chosen['result']['minimum_balance'])} "
            f"against our {fmt(deal.reserve)} reserve target. These dates and terms would need mutual agreement."
        )
    else:
        if alternatives:
            lines += [
                "",
                "## Alternative search",
                "",
                alternatives["message"],
                alternatives["search"],
            ]
        draft += (
            f"Our current assumptions indicate a reserve funding gap of {fmt(baseline['additional_funding'])}. "
            "Could we discuss an advance or revised milestone timing? We have not yet verified an alternative schedule."
        )
    lines += [
        "",
        "## Assumptions and limitations",
        "",
        baseline["ordering"],
        "Expenses moved earlier by a scenario are clamped to the opening date. Reduced advances are deferred to the final payment.",
        "No currency conversion, holiday adjustment, tax calculation, customer credit prediction, or guarantee of payment is included.",
        f"User notes / unresolved uncertainties: {deal.notes or 'No additional notes recorded; this is not proof that the source contract has no ambiguity.'}",
        "Uploaded term interpretations and all calendar dates require user confirmation. Model or parser coverage is not guaranteed.",
        "",
        "## Negotiation draft (review and edit before sending)",
        "",
        draft,
        "",
        "Decision support based on supplied inputs and conditional assumptions. Not professional financial, tax, or legal advice.",
    ]
    return {
        "markdown": "\n".join(lines),
        "draft": draft,
        "analysis": analysis,
        "alternatives": alternatives,
        "draft_mode": "Verified calculation template; not generated by a live language model.",
    }
