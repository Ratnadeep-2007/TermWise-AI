---
doc: prd
status: draft
---
# TermWise AI — Product Requirements

Source: `scope.md > The Core Loop`, `scope.md > The Unique Kernel`, and the user-supplied master build brief.

## The Core Journey
1. Open the overview and start a new deal or load the labeled fictional supplier example.
2. Upload PDF/DOCX/TXT/Markdown or paste terms; inspect original passages and extraction warnings.
3. Correct payments and enter opening cash, currency, reserve, dated costs, and other cash events.
4. Resolve material ambiguities and explicitly confirm inputs before calculation.
5. Inspect balances after each event, minimum cash, reserve funding gap, and the ledger.
6. Test payment delay, cost increase, and custom scenario combinations.
7. Set advance bounds, receipt date, search increment, optional added milestone, and optional final date; search and verify alternatives.
8. Generate a report and editable draft. Download the report. No message is sent.

## Screens and Layout
An overview and connected workspace views: Deal & inputs, Cash-flow timeline, Stress tests, Counteroffer Lab, Decision report. Persistent navigation on desktop, scrollable navigation on mobile. All views refer to the same in-memory deal.

## Look and Feel
User direction: restrained fintech experience, consistent typography, responsive forms, actual charts, useful errors, loading and empty states, accessible controls, and no decorative scores. Derived implementation: Manrope headings, DM Sans body, cream canvas, green navigation, understated lime details; self-hosted fonts. No gradients or excessive motion.

## Features and Behavior
### Intake and evidence
Source: `scope.md > The Core Loop`. Support text PDFs, DOCX, TXT, Markdown, and pasted text. Limit file size to 10 MB and extracted text to 60,000 characters. Retain page references for PDFs, excerpts for DOCX/text. All extractions remain unconfirmed. Provider failures fall back to limited local rules with clear disclosure. Material missing dates remain empty.

### Confirmed financial inputs
Payments must add up exactly to contract value; all events must use the deal currency and valid calendar dates. Changing a financial input clears results and confirmation. Other incoming/outgoing events remain separate from the contract's receipts. Amounts use two decimal places.

### Cash-flow timeline
Source: `scope.md > What "Working" Looks Like`. Show the minimum balance, its date, reserve funding gap, cash shortfall, and balances after each event. Disclose outflows-before-inflows ordering on a shared date. Show exact values in a table alongside the chart.

### Stress tests
Default comparisons: final/retention payment delayed 15 days, delivery expenses increased 20%, and both. Custom controls also support advance reduction, milestone delay, and earlier project expenses. Reduced advances move to the final payment. These are assumptions, not forecasts.

### Counteroffer Lab
Source: `scope.md > The Unique Kernel`. Search advance percentages from zero to a configured maximum, with an explicit step. Preserve existing milestones and retention; combine final receipts on their latest or user-chosen final date. Optionally add one milestone and protect against the combined stress scenario. Return up to three smallest verified advances. Never claim global infeasibility from a bounded search.

### Decision report
Source evidence, current confirmed inputs, ledger, scenarios, calculated alternatives, ordering, limitations, notes, and an editable negotiation draft based on verified results. Drafts are calculation templates, not falsely labeled as live AI output. Edited text appears in downloaded Markdown.

## States and Boundaries
- Empty: explain how to begin; no fake financial result cards.
- Loading: status text and disabled input fieldsets during requests.
- Invalid input: backend rejects with field-level errors without echoing sensitive request bodies.
- Parsing/provider failure: local/manual entry remains available.
- No feasible candidate: explain tested bounds and possible need to change constraints.
- Persistence: tab memory only. Refresh discards inputs. Reports can be explicitly downloaded.
- Source text: never rendered as executable HTML or treated as a tool instruction.

## Product Decisions
The user chose the name/repository, target audience, complete workflow, exact arithmetic, no automatic communications, and autonomous engineering. UI palette, component boundaries, and bounded search are delegated implementation details, not claims about choices made in an interview.

## What We're Building
The connected journey above plus financial, API, parser, failure-path, and desktop/mobile browser verification.

## Deferred From the POC
OCR, account storage, enterprise permissions, automatic tax/holiday rules, lending, bank integrations, and actual negotiation sending.

## Open Questions
Live model credentials and representative private contracts are unavailable. No live extraction quality benchmark is claimed. User review of this derived document, hands-on feedback, and learner-written submission remain outstanding. No invented curriculum completion.
