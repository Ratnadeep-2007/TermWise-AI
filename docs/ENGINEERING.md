# Engineering record

## Starting point and authorization

The target public repository was inspected through the GitHub connector on October 22, 2026 and was empty. The user supplied the TermWise AI master build brief and authorized autonomous implementation, testing, commits, and repository updates. No Synora code or existing app implementation was reused.

## Implemented and exercised

The React/TypeScript workspace connects real upload/manual intake to FastAPI validation, a Decimal event ledger, scenario transformations, bounded payment-term search, and a recalculated decision report. Desktop and mobile browser tests exercise text extraction, PDF upload, corrected totals, confirmed inputs, actual financial results, custom stress assumptions, a 30% counteroffer, report download, and stale-result invalidation. API tests additionally read real DOCX and TXT fixtures and simulate provider failures/invalid citations.

Financial calculations use one engine. Solver outputs are not free-form LLM recommendations. Payment totals reconcile; preserved milestones and retention are explicit; optional added milestones and stress protection are part of the tested search contract. Opening and intraday reserve violations remain visible. Reports contain source evidence and assumptions, not invented legal conclusions.

## Validation and repairs

See `evaluation/results.md` for actual commands, outcomes, initial failures, and fixes. The final observed local suite is 56 backend tests and 4 browser tests. The latter includes axe-core checks in both profiles. A fresh virtual environment install also passed the backend suite. Original distributed dependency notices and an installed runtime inventory are included under `licenses/`.

## Current limitations and next useful work

1. Configure a live compatible AI endpoint/model/key server-side and evaluate semantic extraction on representative, consented contract excerpts. Do not call mocked provider tests a live integration.
2. Have the user review the draft scope/PRD/spec and try the core journey. Their explicit autonomous-build request was followed; required human activities were not fabricated or marked complete.
3. Complete a real Learn Skill Pack hands-on review and learning wrap-up with the user, using the reference app map if useful.
4. Record and publish the user's own under-three-minute demo, then complete their own submission copy and survey. No Devpost submission or public messaging has been sent.
5. If hosting is wanted, test the provided container on the chosen platform, configure secrets and access controls, and verify the deployed URL. No hosted deployment has been made.

## Security and privacy boundaries

No uploaded documents, keys, financial cases, or user accounts are persisted. Original filenames never become filesystem paths. Content is parsed in memory, constrained by size/text/page limits, and never executed. DOCX expanded sizes are checked. Backend validation errors avoid echoing financial input bodies. Server headers restrict framing, content sniffing, caching, and external page resources. A separately configured AI provider receives document text and has its own retention policies.

This remains a single-user local demonstration, not a public multi-user service: authentication, production rate limiting, isolated parser workers, sensitive-data retention policies, and load testing are not implemented. Upload limits and source handling are useful defenses, not a claim that arbitrary hostile files are safe. The exported report and deterministic calculations remain conditional on confirmed inputs and assumptions.

## Publication

The repository's `main` branch receives the verified implementation and documentation after a staged-file audit. Actual commit/push verification is reported in the final handoff rather than invented here. A public repository is not a deployed website. GitHub Actions is configured to run the same checks; remote completion must be checked separately.
