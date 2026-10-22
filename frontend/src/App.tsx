import { useEffect, useRef, useState, lazy, Suspense } from "react";
import {
  ArrowUpRight,
  ArrowRight,
  Check,
  ChevronRight,
  CircleHelp,
  FileText,
  FlaskConical,
  LayoutDashboard,
  Plus,
  ShieldCheck,
  SlidersHorizontal,
  Trash2,
  Upload,
  Wallet,
  X,
  Download,
  Copy,
  LoaderCircle,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import {
  api,
  money,
  defaultScenarios,
  emptyScenario,
  paymentKinds,
} from "./types";
import type {
  Analysis,
  CashEvent,
  Deal,
  Extraction,
  Kind,
  Options,
  Report,
  Scenario,
  Solution,
} from "./types";
const CashChart = lazy(() => import("./Chart"));
type View =
  "overview" | "setup" | "timeline" | "stress" | "counteroffer" | "report";
const today = () => new Intl.DateTimeFormat("en-CA").format(new Date());
const blankDeal = (): Deal => ({
  name: "Untitled deal",
  currency: "INR",
  opening_cash: "",
  opening_date: today(),
  contract_value: "",
  reserve: "",
  events: [],
  confirmed: false,
  notes: "",
});
const blankOptions = (date = today()): Options => ({
  max_advance_pct: 60,
  step_pct: 1,
  advance_date: date,
  milestone_pct: 0,
  milestone_date: null,
  final_date: null,
  protect_scenario: null,
});
const links = [
  { id: "overview", icon: LayoutDashboard, label: "Overview" },
  { id: "setup", icon: FileText, label: "Deal & inputs" },
  { id: "timeline", icon: Wallet, label: "Cash-flow timeline" },
  { id: "stress", icon: FlaskConical, label: "Stress tests" },
  { id: "counteroffer", icon: SlidersHorizontal, label: "Counteroffer Lab" },
  { id: "report", icon: ShieldCheck, label: "Decision report" },
] as const;

function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
      {hint ? <small>{hint}</small> : null}
    </label>
  );
}
function Empty({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="panel empty">
      <div className="empty-icon">
        <FileText size={28} />
      </div>
      <h2>{title}</h2>
      <p>{children}</p>
    </section>
  );
}

export default function App() {
  const [view, setView] = useState<View>("overview");
  const [deal, setDeal] = useState<Deal>(blankDeal);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [solution, setSolution] = useState<Solution | null>(null);
  const [report, setReport] = useState<Report | null>(null);
  const [draft, setDraft] = useState("");
  const [extraction, setExtraction] = useState<Extraction | null>(null);
  const [text, setText] = useState("");
  const [options, setOptions] = useState<Options>(blankOptions);
  const [custom, setCustom] = useState<Scenario>({ ...emptyScenario });
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [aiConfigured, setAIConfigured] = useState(false);
  const [sample, setSample] = useState(false);
  const upload = useRef<HTMLInputElement>(null);
  useEffect(() => {
    api<{ ai_configured: boolean }>("/health")
      .then((r) => setAIConfigured(r.ai_configured))
      .catch(() =>
        setError(
          "The backend is unavailable. Start the API server using the README instructions.",
        ),
      );
  }, []);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(""), 4000);
    return () => clearTimeout(timer);
  }, [notice]);
  const currency = deal.currency;
  const fmt = (v: string | number) => money(v, currency);
  function clearResults() {
    setAnalysis(null);
    setSolution(null);
    setReport(null);
    setDraft("");
  }
  function edit(next: Partial<Deal>) {
    setDeal((prev) => ({
      ...prev,
      ...next,
      confirmed: false,
      term_evidence:
        next.term_evidence ||
        (next.contract_value !== undefined || next.currency !== undefined
          ? prev.term_evidence?.map((source) => ({
              ...source,
              status: "user_corrected" as const,
            }))
          : prev.term_evidence),
    }));
    clearResults();
    setError("");
  }
  function changeOptions(next: Partial<Options>) {
    setOptions((prev) => ({ ...prev, ...next }));
    setSolution(null);
    setReport(null);
  }
  function patchEvent(id: string, next: Partial<CashEvent>) {
    edit({
      events: deal.events.map((e) =>
        e.id === id
          ? {
              ...e,
              ...next,
              source: e.source
                ? { ...e.source, status: "user_corrected" }
                : undefined,
            }
          : e,
      ),
    });
  }
  async function perform(label: string, fn: () => Promise<void>) {
    setBusy(label);
    setError("");
    try {
      await fn();
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Something went wrong. Please try again.",
      );
    } finally {
      setBusy("");
    }
  }
  async function loadSample() {
    await perform("Loading fictional example", async () => {
      const data = await api<{ deal: Deal; contract_text: string }>("/sample");
      setDeal(data.deal);
      setText(data.contract_text);
      setOptions(blankOptions(data.deal.opening_date));
      setExtraction(null);
      clearResults();
      setSample(true);
      setView("setup");
      setNotice(
        "Fictional supplier example loaded. Review the terms and confirm your inputs.",
      );
    });
  }
  function startNew() {
    setDeal(blankDeal());
    setText("");
    setExtraction(null);
    clearResults();
    setOptions(blankOptions());
    setSample(false);
    setView("setup");
    setError("");
  }
  function useExtraction(result: Extraction) {
    setExtraction(result);
    edit({
      contract_value: result.contract_value || deal.contract_value,
      currency: result.currency || deal.currency,
      term_evidence: result.fields.map((f) => f.source),
      events: [
        ...result.payments,
        ...deal.events.filter((e) => !paymentKinds.includes(e.kind)),
      ],
      notes: result.warnings.join("\n"),
    });
    setNotice(
      "Extracted terms are ready for review. Resolve missing values and confirm before calculating.",
    );
  }
  async function extractText() {
    await perform("Reading payment terms", async () =>
      useExtraction(
        await api<Extraction>("/extract/text", {
          text,
          name: "Pasted payment terms",
        }),
      ),
    );
  }
  async function extractFile(file: File) {
    const form = new FormData();
    form.append("file", file);
    await perform("Reading your document", async () =>
      useExtraction(await api<Extraction>("/extract/upload", undefined, form)),
    );
  }
  async function calculate(target: View = "timeline") {
    await perform("Calculating the dated ledger", async () => {
      const data = await api<Analysis>("/analyze", {
        deal,
        scenarios: defaultScenarios,
      });
      setAnalysis(data);
      setView(target);
    });
  }
  async function runCustom() {
    await perform("Testing your assumptions", async () => {
      setAnalysis(
        await api<Analysis>("/analyze", {
          deal,
          scenarios: [...defaultScenarios, custom],
        }),
      );
    });
  }
  async function findTerms() {
    await perform("Searching and verifying schedules", async () => {
      setSolution(await api<Solution>("/solve", { deal, options }));
    });
  }
  async function buildReport() {
    await perform("Preparing evidence and calculations", async () => {
      const data = await api<Report>("/report", {
        deal,
        scenarios:
          analysis?.scenarios.map((s) => s.assumptions) || defaultScenarios,
        options: solution ? options : null,
      });
      setReport(data);
      setDraft(data.draft);
    });
  }
  function download(name: string, content: string, type = "text/markdown") {
    const url = URL.createObjectURL(new Blob([content], { type }));
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  function addEvent(kind: Kind) {
    edit({
      events: [
        ...deal.events,
        {
          id: crypto.randomUUID(),
          label:
            kind === "expense"
              ? "Project expense"
              : kind === "other_inflow"
                ? "Other receipt"
                : "Payment",
          date: deal.opening_date,
          amount: "",
          kind,
        },
      ],
    });
  }
  function confirm(checked: boolean) {
    setDeal((prev) => ({
      ...prev,
      confirmed: checked,
      term_evidence: prev.term_evidence?.map((s) => ({
        ...s,
        status:
          s.status === "user_corrected" ? "user_corrected" : "user_confirmed",
      })),
      events: prev.events.map((e) => ({
        ...e,
        source: e.source
          ? {
              ...e.source,
              status:
                e.source.status === "user_corrected"
                  ? "user_corrected"
                  : "user_confirmed",
            }
          : null,
      })),
    }));
    clearResults();
  }
  const titles: Record<View, { eyebrow: string; title: string; sub: string }> =
    {
      overview: {
        eyebrow: "PAYMENT-TERM INTELLIGENCE",
        title: "A good deal should work\nfor your cash flow, too.",
        sub: "See the cash impact before you commit. Test the unexpected. Find terms you can work with.",
      },
      setup: {
        eyebrow: "01 / DEFINE THE DEAL",
        title: "Start with the terms.",
        sub: "Bring your contract. Add the costs. Keep every assumption in view.",
      },
      timeline: {
        eyebrow: "02 / UNDERSTAND THE TIMING",
        title: "Follow the money.",
        sub: "A dated view of what arrives, what leaves, and where your reserve needs support.",
      },
      stress: {
        eyebrow: "03 / TEST THE UNEXPECTED",
        title: "Give the deal a stress test.",
        sub: "Change the assumptions. See what happens to your cash, event by event.",
      },
      counteroffer: {
        eyebrow: "04 / FIND A WAY FORWARD",
        title: "Make the terms work.",
        sub: "Calculate alternative payment schedules within the limits you choose.",
      },
      report: {
        eyebrow: "05 / DECIDE WITH CONTEXT",
        title: "Your numbers. Your next move.",
        sub: "A traceable report and an editable negotiation draft, grounded in your inputs.",
      },
    };

  function eventTable(events: CashEvent[], payments: boolean) {
    return (
      <div className="event-list">
        {events.map((event, i) => (
          <div className="event-edit" key={event.id}>
            <span className="row-number">{String(i + 1).padStart(2, "0")}</span>
            <Field label="Description">
              <input
                aria-label={`${payments ? "Payment" : "Cost"} ${i + 1} description`}
                value={event.label}
                onChange={(e) =>
                  patchEvent(event.id, { label: e.target.value })
                }
                required
                maxLength={200}
              />
            </Field>
            <Field label="Type">
              <select
                aria-label={`${payments ? "Payment" : "Cost"} ${i + 1} type`}
                value={event.kind}
                onChange={(e) =>
                  patchEvent(event.id, { kind: e.target.value as Kind })
                }
              >
                {(payments
                  ? paymentKinds
                  : ["expense", "other_inflow", "other_outflow"]
                ).map((k) => (
                  <option value={k} key={k}>
                    {k.replaceAll("_", " ")}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={`Amount (${currency})`}>
              <input
                aria-label={`${payments ? "Payment" : "Cost"} ${i + 1} amount`}
                type="number"
                min="0"
                step="0.01"
                value={event.amount}
                onChange={(e) =>
                  patchEvent(event.id, { amount: e.target.value })
                }
                required
              />
            </Field>
            <Field label="Calendar date">
              <input
                aria-label={`${payments ? "Payment" : "Cost"} ${i + 1} date`}
                type="date"
                value={event.date}
                onChange={(e) => patchEvent(event.id, { date: e.target.value })}
                required
              />
            </Field>
            <button
              className="icon-button delete"
              aria-label={`Remove ${event.label}`}
              onClick={() =>
                edit({ events: deal.events.filter((e) => e.id !== event.id) })
              }
              type="button"
            >
              <Trash2 size={16} />
            </button>
            {event.source ? (
              <details className="row-source">
                <summary>
                  Source evidence · {event.source.document}
                  {event.source.page
                    ? ` · page ${event.source.page}`
                    : ""} · {event.source.status.replaceAll("_", " ")}
                </summary>
                <blockquote>{event.source.quote}</blockquote>
                {event.source.status === "user_corrected" ? (
                  <small>
                    The current value was edited by you; the original passage is
                    preserved.
                  </small>
                ) : null}
              </details>
            ) : null}
          </div>
        ))}
        {!events.length ? (
          <p className="muted">
            {payments
              ? "Add the customer’s payment schedule. Its total must equal the contract value."
              : "Add delivery costs and any other known cash movements."}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main">
        Skip to workspace
      </a>
      <aside className="sidebar">
        <button
          className="brand"
          disabled={!!busy}
          onClick={() => setView("overview")}
          aria-label="TermWise overview"
        >
          <span className="brand-mark">
            tw<span>↗</span>
          </span>
          <span>
            TermWise<span className="brand-ai">AI</span>
          </span>
        </button>
        <div className="workspace-label">
          YOUR WORKSPACE <span>01</span>
        </div>
        <nav aria-label="Workspace">
          {links.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              className={`nav-link ${view === id ? "active" : ""}`}
              disabled={!!busy}
              onClick={() => setView(id)}
            >
              <Icon size={18} />
              <span>{label}</span>
              {view === id ? <span className="active-dot" /> : null}
            </button>
          ))}
        </nav>
        <div className="sidebar-note">
          <div className="tiny-label">BUILT FOR THE BEFORE</div>
          <p>Better terms start with a clearer picture.</p>
          <div className="note-line" />
          <span>
            <ShieldCheck size={15} /> Your decision, always.
          </span>
        </div>
        <div className="sidebar-footer">
          <span className="avatar">TW</span>
          <div>
            Local workspace<small>No account required</small>
          </div>
          <CircleHelp size={17} />
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <div>
            Workspace <ChevronRight size={14} />
            <strong>{links.find((l) => l.id === view)?.label}</strong>
          </div>
          <span className="privacy">
            <span className="status-dot" /> Documents processed in memory
          </span>
        </header>
        <main id="main" tabIndex={-1}>
          {error ? (
            <div className="alert error" role="alert">
              <AlertTriangle size={19} />
              <div>
                <strong>Let’s check that input.</strong>
                <pre>{error}</pre>
              </div>
              <button onClick={() => setError("")} aria-label="Dismiss error">
                <X size={18} />
              </button>
            </div>
          ) : null}
          {notice ? (
            <div className="toast" role="status">
              <CheckCircle2 size={17} />
              {notice}
            </div>
          ) : null}
          {busy ? (
            <div className="progress" role="status">
              <LoaderCircle size={16} className="spin" />
              {busy}…
            </div>
          ) : null}
          <div className="page-heading">
            <div>
              <p className="eyebrow">{titles[view].eyebrow}</p>
              <h1>{titles[view].title}</h1>
              <p className="subtitle">{titles[view].sub}</p>
            </div>
            {view !== "overview" ? (
              <button
                className="button secondary compact"
                onClick={startNew}
                disabled={!!busy}
              >
                <Plus size={16} />
                New deal
              </button>
            ) : (
              <span className="edition">
                THE PRE-DEAL WORKSPACE
                <br />
                <b>Know before you agree.</b>
              </span>
            )}
          </div>

          {view === "overview" ? (
            <>
              <section className="hero-panel">
                <div className="hero-copy">
                  <span className="pill">
                    <span className="status-dot" /> FROM CONTRACT TO
                    COUNTEROFFER
                  </span>
                  <h2>
                    Profit on paper.
                    <br />
                    <em>Clarity in practice.</em>
                  </h2>
                  <p>
                    A profitable order can still leave you short of cash. Put
                    payment dates and delivery costs on the same timeline, then
                    calculate a better way forward.
                  </p>
                  <div className="actions">
                    <button
                      className="button primary"
                      onClick={startNew}
                      disabled={!!busy}
                    >
                      Analyze a new deal <ArrowUpRight size={18} />
                    </button>
                    <button
                      className="text-button"
                      onClick={loadSample}
                      disabled={!!busy}
                    >
                      Try the supplier example <ArrowRight size={16} />
                    </button>
                  </div>
                  <div className="hero-foot">
                    <Check size={14} /> No bank connection <Check size={14} />{" "}
                    No money movement
                  </div>
                </div>
                <div className="deal-preview">
                  <div className="preview-head">
                    <span className="preview-icon">
                      <FileText size={20} />
                    </span>
                    <span>
                      One deal. A clearer picture.
                      <small>ILLUSTRATIVE WORKFLOW · NOT A LIVE RESULT</small>
                    </span>
                    <ArrowUpRight size={20} />
                  </div>
                  <div className="mini-ledger">
                    <span>01</span>
                    <div>
                      Read the terms
                      <small>Source passages, not guesswork</small>
                    </div>
                    <CheckCircle2 size={20} />
                  </div>
                  <div className="mini-ledger">
                    <span>02</span>
                    <div>
                      See the cash timing
                      <small>Expenses and receipts, together</small>
                    </div>
                    <Wallet size={20} />
                  </div>
                  <div className="mini-ledger">
                    <span>03</span>
                    <div>
                      Find workable terms
                      <small>Calculated. Verified. Explained.</small>
                    </div>
                    <SlidersHorizontal size={20} />
                  </div>
                  <div className="preview-bottom">
                    <span>YOUR CASH RESERVE</span>
                    <strong>
                      A constraint worth protecting.<span>↗</span>
                    </strong>
                  </div>
                </div>
              </section>
              <div className="section-heading">
                <h2>A little more foresight. A better conversation.</h2>
                <span>HOW IT WORKS</span>
              </div>
              <div className="feature-grid">
                {[
                  {
                    n: "01",
                    icon: FileText,
                    t: "Understand what you’re agreeing to.",
                    p: "Review payment clauses alongside their source. Correct the terms before they become assumptions.",
                  },
                  {
                    n: "02",
                    icon: FlaskConical,
                    t: "Plan for the less convenient version.",
                    p: "What if the customer pays late? What if costs rise? Test those changes against your cash reserve.",
                  },
                  {
                    n: "03",
                    icon: SlidersHorizontal,
                    t: "Bring numbers to the negotiation.",
                    p: "Explore advance and milestone schedules that satisfy your reserve target under stated assumptions.",
                  },
                ].map(({ n, icon: Icon, t, p }) => (
                  <article className="feature" key={n}>
                    <div>
                      <Icon size={22} />
                      <span>{n}</span>
                    </div>
                    <h3>{t}</h3>
                    <p>{p}</p>
                  </article>
                ))}
              </div>
              <div className="bottom-note">
                <ShieldCheck size={17} />
                <p>
                  Made for freelancers, agencies, and small suppliers. Decision
                  support based on your inputs, with every assumption in view.
                </p>
              </div>
            </>
          ) : null}

          {view === "setup" ? (
            <fieldset className="page-fieldset" disabled={!!busy}>
              {sample ? (
                <div className="sample-banner">
                  <FlaskConical size={17} />
                  <span>
                    Fictional supplier example. All dates and figures are for
                    demonstration.
                  </span>
                  <button className="text-button" onClick={startNew}>
                    Clear example <X size={14} />
                  </button>
                </div>
              ) : null}
              <div className="setup-grid">
                <section className="panel intake">
                  <div className="panel-heading">
                    <div>
                      <p className="eyebrow">SOURCE DOCUMENT</p>
                      <h2>Bring the details.</h2>
                    </div>
                    <FileText size={22} />
                  </div>
                  <button
                    className="upload-zone"
                    onClick={() => upload.current?.click()}
                  >
                    <Upload size={26} />
                    <strong>Choose a contract or purchase order</strong>
                    <span>PDF, DOCX, TXT or Markdown · up to 10 MB</span>
                  </button>
                  <input
                    ref={upload}
                    type="file"
                    accept=".pdf,.docx,.txt,.md"
                    hidden
                    onChange={(e) => {
                      if (e.target.files?.[0])
                        void extractFile(e.target.files[0]);
                      e.target.value = "";
                    }}
                  />
                  <p className="small muted">
                    Text PDFs supported. Scans need manual entry. Document text
                    is sent to your configured AI provider only when one is
                    configured.
                  </p>
                  <div className="or-divider">OR PASTE THE TERMS</div>
                  <label className="field">
                    <span>Payment clauses</span>
                    <textarea
                      aria-label="Payment clauses"
                      rows={6}
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                      placeholder={
                        "Contract value: INR 200000\nFinal: INR 200000 on 2027-01-15"
                      }
                      maxLength={60000}
                    />
                  </label>
                  <button
                    className="button secondary full"
                    onClick={extractText}
                    disabled={!text.trim() || !!busy}
                  >
                    Extract & review terms <ArrowRight size={16} />
                  </button>
                  <div className="provider-note">
                    <span className="status-dot" />
                    {aiConfigured
                      ? "Semantic AI configured; manual confirmation required."
                      : "Local rule-based extraction · no AI key configured"}
                  </div>
                </section>
                <section className="panel">
                  <div className="panel-heading">
                    <div>
                      <p className="eyebrow">YOUR ASSUMPTIONS</p>
                      <h2>The financial picture.</h2>
                    </div>
                    <span className="pill soft">Editable inputs</span>
                  </div>
                  <div className="form-grid">
                    <Field label="Deal name">
                      <input
                        value={deal.name}
                        onChange={(e) => edit({ name: e.target.value })}
                        required
                        maxLength={200}
                      />
                    </Field>
                    <Field label="Currency">
                      <select
                        value={currency}
                        onChange={(e) => edit({ currency: e.target.value })}
                      >
                        {["INR", "USD", "EUR", "GBP"].map((c) => (
                          <option key={c}>{c}</option>
                        ))}
                      </select>
                    </Field>
                    <Field label={`Contract value (${currency})`}>
                      <input
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={deal.contract_value}
                        onChange={(e) =>
                          edit({ contract_value: e.target.value })
                        }
                        placeholder="200000"
                      />
                    </Field>
                    <Field label="Opening cash available on">
                      <input
                        type="date"
                        value={deal.opening_date}
                        onChange={(e) => {
                          edit({ opening_date: e.target.value });
                          changeOptions({ advance_date: e.target.value });
                        }}
                      />
                    </Field>
                    <Field label={`Opening cash (${currency})`}>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={deal.opening_cash}
                        onChange={(e) => edit({ opening_cash: e.target.value })}
                        placeholder="80000"
                      />
                    </Field>
                    <Field
                      label={`Minimum cash reserve (${currency})`}
                      hint="The balance you want to preserve throughout delivery."
                    >
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={deal.reserve}
                        onChange={(e) => edit({ reserve: e.target.value })}
                        placeholder="20000"
                      />
                    </Field>
                  </div>
                  <div className="insight-box">
                    <ShieldCheck size={20} />
                    <p>
                      <strong>Dates matter as much as amounts.</strong>Use
                      confirmed calendar dates. A clause like “60 days after
                      acceptance” needs an acceptance date before it can be
                      modeled.
                    </p>
                  </div>
                </section>
              </div>
              {extraction ? (
                <section className="panel evidence">
                  <div className="panel-heading">
                    <div>
                      <p className="eyebrow">EXTRACTION REVIEW</p>
                      <h2>Keep the source in sight.</h2>
                    </div>
                    <span className="pill soft">
                      {extraction.mode.replaceAll("_", " ")}
                    </span>
                  </div>
                  <p className="small muted">{extraction.notice}</p>
                  {extraction.warnings.length ? (
                    <div className="alert warning">
                      <AlertTriangle size={19} />
                      <ul>
                        {extraction.warnings.map((w, i) => (
                          <li key={i}>{w}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                  <div className="evidence-grid">
                    {extraction.fields.map((f, i) => (
                      <article className="evidence-card" key={i}>
                        <div>
                          <strong>{f.name}</strong>
                          <span>
                            {f.source.page
                              ? `PAGE ${f.source.page}`
                              : "SOURCE EXCERPT"}
                          </span>
                        </div>
                        <p>{f.value}</p>
                        <blockquote>{f.source.quote}</blockquote>
                      </article>
                    ))}
                  </div>
                  <details>
                    <summary>Read the extracted document</summary>
                    {extraction.pages.map((p, i) => (
                      <pre className="source-text" key={i}>
                        {p.page ? `Page ${p.page}\n` : ""}
                        {p.text}
                      </pre>
                    ))}
                  </details>
                </section>
              ) : null}
              <section className="panel">
                <div className="panel-heading">
                  <div>
                    <p className="eyebrow">CUSTOMER RECEIPTS</p>
                    <h2>When will you get paid?</h2>
                  </div>
                  <button
                    className="button secondary compact"
                    onClick={() => addEvent("final")}
                  >
                    <Plus size={16} />
                    Add payment
                  </button>
                </div>
                {eventTable(
                  deal.events.filter((e) => paymentKinds.includes(e.kind)),
                  true,
                )}
                <p className="small muted">
                  Include advances, milestones, final payments, and retention.
                  Payments must reconcile exactly to the contract value.
                </p>
              </section>
              <section className="panel">
                <div className="panel-heading">
                  <div>
                    <p className="eyebrow">COSTS & OTHER CASH EVENTS</p>
                    <h2>What needs funding?</h2>
                  </div>
                  <button
                    className="button secondary compact"
                    onClick={() => addEvent("expense")}
                  >
                    <Plus size={16} />
                    Add cash event
                  </button>
                </div>
                {eventTable(
                  deal.events.filter((e) => !paymentKinds.includes(e.kind)),
                  false,
                )}
              </section>
              <section className="panel">
                <Field label="Assumptions, resolved questions & remaining uncertainty">
                  <textarea
                    rows={3}
                    value={deal.notes}
                    onChange={(e) => edit({ notes: e.target.value })}
                    placeholder="Record your chosen interpretation of payment triggers, deductions, and other assumptions."
                    maxLength={4000}
                  />
                </Field>
                <div className="confirm-row">
                  <label>
                    <input
                      type="checkbox"
                      checked={deal.confirmed}
                      onChange={(e) => confirm(e.target.checked)}
                    />
                    <span>
                      I have reviewed the source, resolved material ambiguities,
                      and confirmed these amounts, dates, and financial
                      assumptions.
                    </span>
                  </label>
                  <button
                    className="button primary"
                    disabled={!deal.confirmed || !!busy}
                    onClick={() => calculate()}
                  >
                    Calculate cash flow <ArrowRight size={17} />
                  </button>
                </div>
              </section>
            </fieldset>
          ) : null}

          {["timeline", "stress", "counteroffer", "report"].includes(view) &&
          !analysis ? (
            <Empty title="Your timeline starts with the inputs.">
              Review a deal and confirm its payment schedule first.
              <br />
              <button
                className="button primary"
                onClick={() => setView("setup")}
              >
                Go to deal & inputs <ArrowRight size={16} />
              </button>
            </Empty>
          ) : null}

          {view === "timeline" && analysis ? (
            <>
              <div className="metrics">
                <article>
                  <span>LOWEST PROJECTED BALANCE</span>
                  <strong
                    className={
                      Number(analysis.baseline.minimum_balance) <
                      Number(deal.reserve)
                        ? "negative"
                        : ""
                    }
                  >
                    {fmt(analysis.baseline.minimum_balance)}
                  </strong>
                  <small>On {analysis.baseline.minimum_date}</small>
                </article>
                <article>
                  <span>FUNDING TO MEET RESERVE</span>
                  <strong>{fmt(analysis.baseline.additional_funding)}</strong>
                  <small>Reserve target: {fmt(deal.reserve)}</small>
                </article>
                <article>
                  <span>RESERVE CONSTRAINT</span>
                  <strong className="metric-status">
                    {analysis.baseline.reserve_met ? (
                      <CheckCircle2 size={23} />
                    ) : (
                      <AlertTriangle size={23} />
                    )}
                    {analysis.baseline.reserve_met
                      ? "Satisfied"
                      : "Not satisfied"}
                  </strong>
                  <small>Conditional on confirmed inputs</small>
                </article>
              </div>
              <section className="panel">
                <div className="panel-heading">
                  <div>
                    <p className="eyebrow">PROJECTED CASH BALANCE</p>
                    <h2>The timing tells the story.</h2>
                  </div>
                  <span className="chart-legend">
                    <span />
                    Baseline <i />
                    Reserve
                  </span>
                </div>
                <Suspense fallback={<p>Loading chart…</p>}>
                  <CashChart
                    result={analysis.baseline}
                    reserve={deal.reserve}
                    currency={currency}
                  />
                </Suspense>
                <p className="small muted">
                  {analysis.baseline.ordering} Chart points follow event order,
                  not evenly spaced calendar days.
                </p>
              </section>
              <section className="panel">
                <div className="panel-heading">
                  <h2>The event ledger</h2>
                  <span className="pill soft">Exact calculation</span>
                </div>
                <details className="periods">
                  <summary>
                    Reserve breach periods ·{" "}
                    {analysis.baseline.reserve_breach_periods.length}
                  </summary>
                  {analysis.baseline.reserve_breach_periods.map((period, i) => (
                    <p className="small" key={i}>
                      {period.from_date} to{" "}
                      {period.to_date ||
                        "not recovered by the last modeled event"}{" "}
                      · maximum gap {fmt(period.maximum_gap)}
                    </p>
                  ))}
                  <p className="small muted">
                    A same-date start and end indicates a possible intraday
                    breach. No projection beyond the final event is implied.
                  </p>
                </details>
                <div
                  className="table-wrap"
                  tabIndex={0}
                  role="region"
                  aria-label="Cash event ledger"
                >
                  <table>
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Cash event</th>
                        <th>Movement</th>
                        <th>Balance after event</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analysis.baseline.timeline.map((row) => (
                        <tr key={row.id}>
                          <td>{row.date}</td>
                          <td>
                            {row.label}
                            <small>{row.kind.replaceAll("_", " ")}</small>
                          </td>
                          <td
                            className={
                              Number(row.change) < 0 ? "negative" : "positive"
                            }
                          >
                            {Number(row.change) > 0 ? "+" : ""}
                            {fmt(row.change)}
                          </td>
                          <td
                            className={
                              Number(row.balance) < Number(deal.reserve)
                                ? "negative"
                                : ""
                            }
                          >
                            {fmt(row.balance)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
              <div className="actions end">
                <button
                  className="button secondary"
                  onClick={() => setView("stress")}
                >
                  Test a scenario <FlaskConical size={17} />
                </button>
                <button
                  className="button primary"
                  onClick={() => setView("counteroffer")}
                >
                  Find workable terms <ArrowUpRight size={17} />
                </button>
              </div>
            </>
          ) : null}

          {view === "stress" && analysis ? (
            <>
              <div className="scenario-grid">
                {analysis.scenarios.map((s, i) => (
                  <article
                    className={`scenario-card ${s.result.reserve_met ? "" : "breach"}`}
                    key={i}
                  >
                    <div>
                      <span className="scenario-number">0{i + 1}</span>
                      <FlaskConical size={20} />
                    </div>
                    <h2>{s.name}</h2>
                    <p>Lowest projected balance</p>
                    <strong>{fmt(s.result.minimum_balance)}</strong>
                    <small>{fmt(s.minimum_delta)} vs baseline</small>
                    <div className="scenario-footer">
                      <span>
                        {s.result.reserve_met
                          ? "Reserve maintained"
                          : "Reserve breached"}
                      </span>
                      <b>
                        {fmt(s.result.additional_funding)}
                        <small>funding gap</small>
                      </b>
                    </div>
                    <details>
                      <summary>Scenario assumptions & breaches</summary>
                      <p className="small">
                        Final/retention delay: {s.assumptions.delay_days} days.
                        Expense increase: {s.assumptions.expense_increase_pct}%.
                        Advance reduction: {s.assumptions.advance_reduction_pct}
                        %. Milestone delay: {
                          s.assumptions.milestone_delay_days
                        }{" "}
                        days. Costs earlier:{" "}
                        {s.assumptions.expense_earlier_days} days.
                      </p>
                      {s.result.breaches.map((b, j) => (
                        <p className="small" key={j}>
                          {b.date} · {b.label}: {fmt(b.reserve_gap)} below
                          reserve.
                        </p>
                      ))}
                    </details>
                  </article>
                ))}
              </div>
              <section className="panel">
                <div className="panel-heading">
                  <div>
                    <p className="eyebrow">YOUR WHAT-IF</p>
                    <h2>Test a different assumption.</h2>
                  </div>
                  <span className="pill soft">Scenario, not a prediction</span>
                </div>
                <fieldset className="page-fieldset" disabled={!!busy}>
                  <div className="form-grid three">
                    <Field label="Final/retention payment delay (days)">
                      <input
                        type="number"
                        min="0"
                        max="365"
                        value={custom.delay_days}
                        onChange={(e) =>
                          setCustom({
                            ...custom,
                            delay_days: Number(e.target.value),
                          })
                        }
                      />
                    </Field>
                    <Field label="Project expense increase (%)">
                      <input
                        type="number"
                        min="0"
                        max="200"
                        value={custom.expense_increase_pct}
                        onChange={(e) =>
                          setCustom({
                            ...custom,
                            expense_increase_pct: Number(e.target.value),
                          })
                        }
                      />
                    </Field>
                    <Field label="Advance reduction (%)">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={custom.advance_reduction_pct}
                        onChange={(e) =>
                          setCustom({
                            ...custom,
                            advance_reduction_pct: Number(e.target.value),
                          })
                        }
                      />
                    </Field>
                    <Field label="Milestone delay (days)">
                      <input
                        type="number"
                        min="0"
                        max="365"
                        value={custom.milestone_delay_days}
                        onChange={(e) =>
                          setCustom({
                            ...custom,
                            milestone_delay_days: Number(e.target.value),
                          })
                        }
                      />
                    </Field>
                    <Field label="Project expenses earlier (days)">
                      <input
                        type="number"
                        min="0"
                        max="365"
                        value={custom.expense_earlier_days}
                        onChange={(e) =>
                          setCustom({
                            ...custom,
                            expense_earlier_days: Number(e.target.value),
                          })
                        }
                      />
                    </Field>
                  </div>
                  <p className="small muted">
                    A reduced advance is moved to the final payment. Earlier
                    costs stop at the opening date. Other cash events stay
                    unchanged.
                  </p>
                  <button className="button primary" onClick={runCustom}>
                    Run custom stress test <ArrowRight size={17} />
                  </button>
                </fieldset>
              </section>
            </>
          ) : null}

          {view === "counteroffer" && analysis ? (
            <>
              <div className="lab-layout">
                <section className="panel">
                  <div className="panel-heading">
                    <div>
                      <p className="eyebrow">SEARCH CONSTRAINTS</p>
                      <h2>Set your boundaries.</h2>
                    </div>
                    <SlidersHorizontal size={22} />
                  </div>
                  <fieldset className="page-fieldset" disabled={!!busy}>
                    <div className="range-heading">
                      <label htmlFor="max-advance">Maximum advance</label>
                      <strong>{options.max_advance_pct}%</strong>
                    </div>
                    <input
                      id="max-advance"
                      className="slider"
                      type="range"
                      min="0"
                      max="100"
                      value={options.max_advance_pct}
                      onChange={(e) =>
                        changeOptions({
                          max_advance_pct: Number(e.target.value),
                        })
                      }
                    />
                    <div className="form-grid">
                      <Field label="Advance received on">
                        <input
                          type="date"
                          value={options.advance_date}
                          onChange={(e) =>
                            changeOptions({ advance_date: e.target.value })
                          }
                        />
                      </Field>
                      <Field label="Search increment (%)">
                        <select
                          value={options.step_pct}
                          onChange={(e) =>
                            changeOptions({ step_pct: Number(e.target.value) })
                          }
                        >
                          <option value={1}>1% · finer search</option>
                          <option value={5}>5% · coarser search</option>
                          <option value={10}>10% · coarser search</option>
                        </select>
                      </Field>
                      <Field label="Added milestone (%)">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={options.milestone_pct}
                          onChange={(e) =>
                            changeOptions({
                              milestone_pct: Number(e.target.value),
                            })
                          }
                        />
                      </Field>
                      <Field label="Added milestone date">
                        <input
                          type="date"
                          value={options.milestone_date || ""}
                          onChange={(e) =>
                            changeOptions({
                              milestone_date: e.target.value || null,
                            })
                          }
                        />
                      </Field>
                      <Field label="Final payment date (optional)">
                        <input
                          type="date"
                          value={options.final_date || ""}
                          onChange={(e) =>
                            changeOptions({
                              final_date: e.target.value || null,
                            })
                          }
                        />
                      </Field>
                      <Field label="Also protect against">
                        <select
                          value={
                            options.protect_scenario ? "stress" : "baseline"
                          }
                          onChange={(e) =>
                            changeOptions({
                              protect_scenario:
                                e.target.value === "stress"
                                  ? defaultScenarios[2]
                                  : null,
                            })
                          }
                        >
                          <option value="baseline">
                            Baseline assumptions only
                          </option>
                          <option value="stress">
                            15-day delay + 20% higher costs
                          </option>
                        </select>
                      </Field>
                    </div>
                    <button className="button primary full" onClick={findTerms}>
                      Find workable terms <ArrowUpRight size={17} />
                    </button>
                  </fieldset>
                </section>
                <aside className="lab-note">
                  <span className="eyebrow">WHAT WE OPTIMIZE</span>
                  <h2>
                    A smaller advance.
                    <br />A workable balance.
                  </h2>
                  <p>
                    We test advance percentages within your bounds and return
                    the lowest ones that maintain your reserve.
                  </p>
                  <div>
                    <CheckCircle2 size={18} />
                    <p>
                      Each result is rerun through the exact cash-flow engine
                      before it is shown.
                    </p>
                  </div>
                  <div>
                    <ShieldCheck size={18} />
                    <p>
                      Existing milestones and retention stay fixed. Final
                      payments are combined on the chosen final date.
                    </p>
                  </div>
                  <p className="small">
                    These are calculated options for discussion. A customer’s
                    agreement and actual payment timing are not guaranteed.
                  </p>
                </aside>
              </div>
              {solution ? (
                <section className="panel">
                  <div className="panel-heading">
                    <div>
                      <p className="eyebrow">SEARCH RESULTS</p>
                      <h2>
                        {solution.candidates.length
                          ? "A few ways forward."
                          : "No match within these bounds."}
                      </h2>
                    </div>
                    <span className="pill soft">
                      {solution.tested} schedules tested
                    </span>
                  </div>
                  <p>{solution.message}</p>
                  <p className="small muted">{solution.search}</p>
                  <div className="candidate-grid">
                    {solution.candidates.map((c, i) => (
                      <article className="candidate" key={c.advance_pct}>
                        <div>
                          <span>OPTION {String(i + 1).padStart(2, "0")}</span>
                          <span className="verified">
                            <CheckCircle2 size={14} />
                            Verified
                          </span>
                        </div>
                        <strong>
                          {c.advance_pct}
                          <small>% advance</small>
                        </strong>
                        <p>
                          {fmt(c.advance_amount)} received on{" "}
                          {options.advance_date}
                        </p>
                        <div className="candidate-min">
                          <span>Minimum balance</span>
                          <b>{fmt(c.result.minimum_balance)}</b>
                        </div>
                        {c.stress_result ? (
                          <p className="small">
                            Stress minimum:{" "}
                            {fmt(c.stress_result.minimum_balance)}
                          </p>
                        ) : null}
                        <details>
                          <summary>See proposed payment schedule</summary>
                          {c.deal.events
                            .filter((e) => paymentKinds.includes(e.kind))
                            .map((e) => (
                              <p className="small" key={e.id}>
                                {e.date} · {e.label}: {fmt(e.amount)}
                              </p>
                            ))}
                        </details>
                      </article>
                    ))}
                  </div>
                  <p className="small muted">{solution.objective}</p>
                  <button
                    className="button primary"
                    onClick={() => setView("report")}
                  >
                    Prepare decision report <ArrowRight size={17} />
                  </button>
                </section>
              ) : null}
            </>
          ) : null}

          {view === "report" && analysis ? (
            <>
              <section className="panel report-intro">
                <div>
                  <p className="eyebrow">
                    EVIDENCE. ASSUMPTIONS. CALCULATIONS.
                  </p>
                  <h2>Keep the reasoning with the result.</h2>
                  <p>
                    Generate a report from your current confirmed inputs
                    {solution
                      ? " and a fresh verification of the counteroffer search"
                      : ""}
                    . The first verified option is used in the draft.
                  </p>
                </div>
                <button
                  className="button primary"
                  disabled={!!busy}
                  onClick={buildReport}
                >
                  {report ? "Regenerate report" : "Generate report"}
                  <FileText size={17} />
                </button>
              </section>
              {report ? (
                <>
                  <section className="panel">
                    <div className="panel-heading">
                      <div>
                        <p className="eyebrow">NEGOTIATION DRAFT</p>
                        <h2>Start the conversation.</h2>
                      </div>
                      <button
                        className="button secondary compact"
                        onClick={() =>
                          perform("Copying draft", async () => {
                            await navigator.clipboard.writeText(draft);
                            setNotice("Draft copied. Review before sending.");
                          })
                        }
                      >
                        <Copy size={15} />
                        Copy draft
                      </button>
                    </div>
                    <label className="field">
                      <span>
                        Editable message · nothing is sent automatically
                      </span>
                      <textarea
                        rows={7}
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                      />
                    </label>
                    <p className="small muted">{report.draft_mode}</p>
                  </section>
                  <section className="panel">
                    <div className="panel-heading">
                      <h2>Full decision record</h2>
                      <button
                        className="button secondary compact"
                        onClick={() =>
                          download(
                            "TermWise-Decision-Report.md",
                            report.markdown.replace(report.draft, draft),
                          )
                        }
                      >
                        <Download size={16} />
                        Download report
                      </button>
                    </div>
                    <pre
                      className="report-text"
                      tabIndex={0}
                      role="region"
                      aria-label="Decision report content"
                    >
                      {report.markdown.replace(report.draft, draft)}
                    </pre>
                  </section>
                </>
              ) : (
                <Empty title="Ready when you are.">
                  Your report will include the source passages, event ledger,
                  stress scenarios, assumptions, and an editable draft.
                </Empty>
              )}
            </>
          ) : null}

          <footer className="footer">
            <span>
              TermWise AI <span className="footer-dot">·</span> Know before you
              agree.
            </span>
            <p>
              Conditional decision support. No guarantee of payment. Not
              financial, tax, or legal advice.
            </p>
          </footer>
        </main>
      </div>
    </div>
  );
}
