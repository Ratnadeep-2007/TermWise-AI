# Observed verification results

Run date: October 22, 2026. Local development/runtime checks only; no hosted deployment or live-model benchmark is claimed.

| Check | Observed result |
| --- | --- |
| `python -m pytest -q` | 56 passed; one Starlette HTTPX test-client deprecation warning |
| Fresh Python 3.12 virtual environment; install `backend/requirements-dev.txt`; run pytest | 56 passed; same non-failing deprecation warning |
| Fixed evaluation manifest `evaluation/cases.json` | All 15 cases passed as part of pytest |
| `python -m ruff check backend scripts` | Passed |
| `python -m ruff format --check backend scripts` | 12 files already formatted |
| `npm run build` | TypeScript and Vite production build passed |
| `npm run test:e2e` with packaged Chromium executable override | 4 passed: full workflow and invalid-total recovery on desktop and mobile |
| axe-core in the full workflow test | No violations for WCAG 2 A/AA and 2.1 AA tags on overview, extracted-terms setup, timeline, stress, counteroffer, and report, on both profiles |
| Standalone browser console/page capture | No errors observed in the captured overview-to-counteroffer/report walkthrough |
| `npm audit --omit=dev --json` | Zero known advisories reported for the checked production dependency tree; not proof of absence of vulnerabilities |
| Secret-pattern scan of intended source/docs | No matching private-key or common API-token patterns; ignored environment/profile files excluded from staging |

The browser command used in this restricted build environment was:

```bash
PLAYWRIGHT_CHROMIUM_EXECUTABLE=/tmp/termwise-browser/chromium \
PLAYWRIGHT_CHROMIUM_ARGS='["--no-sandbox","--disable-dev-shm-usage","--disable-gpu","--no-zygote"]' \
npm run test:e2e
```

This executable was independently unpacked from the npm-distributed `@sparticuz/chromium` runtime because the usual Playwright browser download returned a truncated archive. The temporary browser/runtime is not included as an app dependency. Normal development and GitHub CI use `npx playwright install chromium` (CI also installs system dependencies). A prior single-process browser configuration crashed while creating a second context; removing single-process mode resolved that environment issue.

## Financial examples actually checked

- Original supplier ledger: 80,000 → 10,000 → -40,000 → 160,000 → 110,000.
- Baseline reserve gap: 60,000. Cash shortfall: 40,000.
- Reserve breach period: November 5, 2026 to January 15, 2027; cash below zero from November 20 until that receipt.
- Earliest verified baseline advance: 30% / 60,000 before expenses; minimum balance 20,000.
- Combined delay and 20% cost overrun: minimum -114,000; protected schedule needs 67% within the configured search model.
- A maximum advance of 29% produces no candidate, with a bounded-search explanation.
- Candidate schedules are reconciled and checked with a separately written integer oracle across multiple opening balances.

## Defects found and corrected

- Provider requests in the build environment required SOCKS support; the missing extra initially hid a mocked-provider success path behind fallback. Added the HTTPX SOCKS extra and reran the provider tests.
- A schema field named `date` shadowed the imported date type during model class construction. Used a stable `CalendarDate` alias.
- The local amount regex could truncate excess decimal digits and treat equivalent textual amount formatting as conflicting. It now rejects excess precision without truncation and compares Decimal values.
- Financial-input edits invalidate all derived results; term-level evidence is marked user-corrected when the contract amount or currency changes.
- Automated contrast checks found faint secondary text. Foreground colors were darkened and all selected view checks rerun.
- The scrollable report needed keyboard focus. Added a labeled, focusable region; the ledger's scroll container is likewise focusable.
- The first browser assertion looked for a standalone `30` while the actual UI correctly rendered `30% advance`. Corrected the locator to assert the complete result text.
- Browser tests initially attempted to connect across isolated execution namespaces. The Playwright webServer configuration now owns the API/static process in the same test execution.

## Limits of these results

Model-assisted success/failure cases use explicit HTTP mocks; no live API key was available. Citation existence is checked, but semantic correctness still requires user review and real-model evaluation. Local extraction is intentionally limited to labeled fields and explicit dates; OCR is not implemented. Tests use fictional data and do not establish commercial demand, model accuracy on real contracts, global solver optimality, full accessibility conformance, or production security. Docker packaging and GitHub CI configuration are provided; this file does not claim a Docker run or a completed remote CI run. Human curriculum review, video recording, learner-written submission/exit survey, and actual submission remain pending.
