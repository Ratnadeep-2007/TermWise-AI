---
doc: spec
status: draft
---
# TermWise AI — Technical Spec

## How This Works, In Plain Language
The browser collects a deal's amounts and dates. Python sorts the cash events and calculates each balance using exact decimal amounts. The same calculation tests what-if scenarios and candidate payment schedules. Documents supply evidence, not executable instructions. Optional AI helps interpret clauses; it never decides financial arithmetic.

## The Core Journey Through the System
Implements `prd.md > The Core Journey`. React sends documents or pasted text to `/api/extract/*`; extracted fields and source snippets return for review. Confirmed inputs go to `/api/analyze`, `/api/solve`, and `/api/report`. All financial results are computed in Python and rendered by React. No database or document storage is used.

## Stack
- React + TypeScript + Vite: interactive workspace and reproducible frontend build. https://react.dev/ and https://vite.dev/
- FastAPI + Pydantic: typed API, schemas, and validation. https://fastapi.tiangolo.com/ and https://docs.pydantic.dev/
- pdfplumber + python-docx: text PDF and Word parsing with provenance. https://github.com/jsvine/pdfplumber and https://python-docx.readthedocs.io/
- Recharts: lazy-loaded event-balance chart. https://recharts.github.io/
- Python Decimal: money and cent rounding. https://docs.python.org/3/library/decimal.html
- pytest and Playwright: deterministic tests, API tests, desktop/mobile browser workflows. https://docs.pytest.org/ and https://playwright.dev/

## Where It Runs and How Someone Tries It
Python 3.12+ and Node 22.12+ (Node 24 tested). From repository root:

```bash
python -m venv .venv
# activate .venv using your platform's command
python -m pip install -r backend/requirements-dev.txt
cd frontend
npm ci
npm run build
cd ..
python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000
```

Open http://127.0.0.1:8000. Production assets and API share an origin. For frontend development, run `npm run dev` in frontend with the API on port 8000; Vite proxies `/api`. Public repository: https://github.com/Ratnadeep-2007/TermWise-AI. Video and deployment URLs are not yet available.

## Look and Feel
Implements `prd.md > Look and Feel`. CSS tokens define the cream/forest/lime theme. Self-hosted font assets avoid external font requests. Use responsive grids, visible focus, semantic labels, reduced motion, and real error messages. Charts have an exact ledger alternative.

## Components
### Browser workspace
`frontend/src/App.tsx`: entry, editable forms, evidence, navigation, API lifecycle, stale-result invalidation, and report editing. `types.ts` defines contracts and request error handling. Implements all PRD views.

### Ledger and solver
`backend/app/engine.py`: simulate, apply_scenario, analyze, solve. Implements `prd.md > Cash-flow timeline`, `Stress tests`, and `Counteroffer Lab`. Outflows precede inflows on the same day. Opening balance is checked before all events. Finite money values and payment reconciliation are checked at the API boundary. Search ranking is lowest advance percentage, not an undefined optimality claim.

### Documents and optional AI
`backend/app/extraction.py`: in-memory parsing, limited local label rules, optional structured semantic extraction, exact source-substring checking. Implements `prd.md > Intake and evidence`. Citation existence does not prove semantic correctness; confirmation is required.

### Reports and API
`reports.py` reruns calculations and any requested solver search before composing Markdown and an editable template draft. `main.py` exposes routes, redacted validation errors, headers, upload limits, and static assets. Implements `prd.md > Decision report`.

## Data Model
Deal: name, currency, opening date/cash, contract value, reserve, events, confirmation, notes, source evidence. Event: id, label, calendar date, decimal amount, kind, optional currency and source. Source: document, page where available, original quote, confirmation/correction status. Scenario: delay/cost/advance/milestone/expense-timing adjustments. SolverOptions: advance bounds/step/date, optional milestone/final date, optional protected scenario. Request-only backend memory and in-tab browser memory; no cross-user global data.

## File Structure
| Path | Responsibility |
| --- | --- |
| backend/app/schemas.py | Validation and public contracts |
| backend/app/engine.py | Exact financial logic |
| backend/app/extraction.py | Document ingestion and provider adapter |
| backend/app/reports.py | Verifiable reports |
| backend/app/main.py | API and static server |
| backend/tests/ | Independent expected results and failure cases |
| frontend/src/ | Workspace, chart, styles, request contracts |
| frontend/tests/ | Browser workflows |
| sample_data/ | Fictional contracts and example inputs |
| devpost/ | Planning artifacts and review state |
| evaluation/ | Method and observed results |

## External Services and Dependencies
Optional AI: `TERMWISE_AI_URL` is the full operator-configured OpenAI-compatible chat-completions endpoint; `TERMWISE_AI_MODEL` and optional `TERMWISE_AI_KEY` are server-only environment variables. POST messages and JSON response_format; receive choices[0].message.content, validate it, and reject nonexistent citations. Reference protocol: https://developers.openai.com/api/reference/resources/chat . Timeout: 30 seconds, no redirects, no tools. Costs and provider retention depend on the operator's selected service; no live service or price is assumed. Without configuration, local rules/manual entry run.

## Important Failure Modes
- Unreadable/scanned/oversized document: clear error; paste text or enter manually.
- Missing/contradictory trigger: warnings, blank unresolvable dates, user confirmation, backend date validation.
- Model failure: limited local extraction with a visible fallback warning.
- Invalid cash schedule: 422 with field errors; no calculation result.
- No solver match: bounded-search explanation, no fabricated candidate.

## What Was Simplified and Why
One deal and currency, request memory, a bounded percentage search, a single added milestone slot, no agent framework, and a template-based negotiation draft keep exactness and traceability inspectable. OCR and learned payment probabilities are not implemented. LLM interpretation remains a proposed extraction, never a verified financial fact.

## Decisions and Open Issues
The user delegated reversible implementation details in the master prompt. Stack follows that prompt except plain CSS replaces optional Tailwind for a smaller styling surface. No live-model credentials or human evaluation results exist yet. Planning documents are drafts for review, not fabricated approved interviews. The official skill pack was installed and read; review/learning/submission activities not actually performed are left unchecked.
