# Evaluation method

`cases.json` fixes 15 fictional cases before the final verification run. `backend/tests/test_evaluation.py` consumes them without model calls. Cases cover explicit net-30 terms, upfront expenses, advances/milestones, conflicting dates, unknown acceptance triggers, inconsistent totals, missing expense dates, 15-day delay, 20% cost increase, an infeasible advance bound, retention, irrelevant hostile instructions, excess amount precision, equivalent amount formatting, and the minimum baseline advance.

The financial expectations are hand calculated from `sample_data/supplier.json`: opening 80,000; delivery costs 70,000 + 50,000; final receipt 200,000; separate operating outflow 50,000 after the originally expected receipt.

| Scenario | Expected minimum | Reserve funding gap |
| --- | ---: | ---: |
| Baseline | -40,000 | 60,000 |
| 15-day final/retention delay | -90,000 | 110,000 |
| 20% delivery-cost increase | -64,000 | 84,000 |
| Both | -114,000 | 134,000 |

Baseline minimum advance: 60,000 / 200,000 = 30%, received before delivery expenses. Combined stress minimum advance: 134,000 / 200,000 = 67%. All values are INR. Other inflows/outflows and same-date ordering are preserved. A 29% upper bound has no match in this fixture.

Additional tests cover exact cents, opening reserve violations, same-date ordering, retained payment value after reducing advances, fixed retention, optional milestones, currency mismatch, invalid amount/date inputs, confirmation, API report consistency, real PDF/DOCX/TXT parsing, oversized/corrupt/unsupported uploads, provider outage, and rejection of nonexistent AI citations. An independent integer ledger checks candidates across multiple opening balances.

Provider tests are explicitly mocked. The mocked semantic schedule test verifies application handling, not actual model accuracy. Local rule extraction is evaluated only on the listed structured fixtures; results must not be generalized to arbitrary contracts or claimed as a real-world extraction accuracy rate. A source-substring match does not establish correct semantic interpretation.

Playwright exercises the production frontend served by FastAPI at desktop and mobile sizes, including full intake-to-report flow, report download, invalid-total recovery, and financial-edit invalidation. Browser console/page errors and screenshots are separately inspected. Automated axe-core checks cover WCAG 2 A/AA and 2.1 AA tags on selected rendered views; this is not a full accessibility audit or certification.

Reproduce with the README commands. Observed run outcomes, limitations, and initial failures belong in `results.md`, not fabricated benchmark percentages. No user study, competitor benchmark, customer adoption evidence, live AI benchmark, or hosted deployment has been performed.
