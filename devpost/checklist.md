---
doc: checklist
status: draft
---
# Build Checklist

Build mode: autonomous as explicitly requested in the user's supplied brief. Derived planning documents await user review; no hands-on curriculum completion is claimed. Implementation continues under the user's direct instruction to avoid repeated approvals.

## Slices

- [x] **1. Confirm a deal, inspect its cash gap, and calculate a verified advance**
  Becomes usable: A real browser-to-API workflow with editable cash events and a functioning reserve-constrained solver.
  Why now: Proves the unique kernel before extra extraction sophistication.
  PRD ref: `prd.md > Cash-flow timeline`, `prd.md > Counteroffer Lab`
  Spec ref: `spec.md > Ledger and solver`, `spec.md > Browser workspace`
  Build: Shared Decimal engine, validated API, connected form, timeline, bounded solver, sample.
  Verify (mechanical): Backend independent arithmetic/oracle tests; frontend type/build; desktop/mobile full workflow.
  Learner check: Load the fictional example, calculate, and compare the 30% advance with a maximum of 29%.
  Commit: `Build verified cash-flow and counteroffer workspace`

- [x] **2. Upload evidence, stress the timing, and export a decision record**
  Becomes usable: Source-linked inputs, error recovery, scenario comparisons, report, editable draft, and download.
  Why now: Tests the real user journey around the proven financial kernel.
  PRD ref: `prd.md > Intake and evidence`, `prd.md > Stress tests`, `prd.md > Decision report`
  Spec ref: `spec.md > Documents and optional AI`, `spec.md > Reports and API`
  Build: PDF/DOCX/text ingestion, cited local/provider extraction, custom scenarios, report export, provenance.
  Verify (mechanical): Parser/provider-failure tests, API integration, desktop/mobile upload and error recovery, report download.
  Learner check: Upload the fictional contract, correct a value, and confirm that earlier results are invalidated.
  Commit: `Verify document intake, stress tests and decision reports`

## Hands-on Checkpoints
- [ ] User explores a usable workflow and supplies observations.
- [ ] Final kick-the-tires exploration and feedback completed.

## Final Review
- [ ] Final review complete — feedback resolved and learner confirms ready to ship.

## Code Tour and App Map
- [ ] Learning activity complete with user participation or explicit recap choice.
- [ ] Optional edit and transfer reflection addressed.
- [ ] App map generated, checked, and shared.

Activity and evidence: Agent mechanical verification is recorded in evaluation/results.md; no user practice has been inferred from it.
Route and stops: Reference route: App.tsx findTerms → engine.py solve/simulate → Chart.tsx or report output.
Edit outcome: Not attempted by the user.
Reflection: Not yet offered in a learning wrap-up.
Activity mode: Reference-only map; hands-on review pending.

## Revisions
- The user supplied a detailed build brief and explicitly requested autonomous development; draft artifacts record those supplied choices without inventing planning interviews or approval exchanges.

Mechanical verification: 56 backend tests and 4 browser tests passed; see evaluation/results.md. Completed slice boxes describe implementation/agent checks only. Human review boxes remain open.
