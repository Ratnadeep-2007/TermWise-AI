export interface Source {
  document: string;
  page: number | null;
  quote: string;
  status: "extracted_unconfirmed" | "user_confirmed" | "user_corrected";
}
export type Kind =
  | "advance"
  | "milestone"
  | "final"
  | "retention"
  | "expense"
  | "other_inflow"
  | "other_outflow";
export interface CashEvent {
  id: string;
  label: string;
  date: string;
  amount: string;
  kind: Kind;
  currency?: string | null;
  source?: Source | null;
}
export interface Deal {
  name: string;
  currency: string;
  opening_cash: string;
  opening_date: string;
  contract_value: string;
  reserve: string;
  events: CashEvent[];
  confirmed: boolean;
  notes: string;
  term_evidence?: Source[];
}
export interface Scenario {
  name: string;
  delay_days: number;
  expense_increase_pct: number;
  advance_reduction_pct: number;
  milestone_delay_days: number;
  expense_earlier_days: number;
}
export interface LedgerRow {
  date: string;
  id: string;
  label: string;
  kind: string;
  change: string;
  balance: string;
}
export interface Simulation {
  timeline: LedgerRow[];
  minimum_balance: string;
  minimum_date: string;
  closing_balance: string;
  additional_funding: string;
  cash_shortfall: string;
  reserve_met: boolean;
  breaches: {
    date: string;
    label: string;
    balance: string;
    reserve_gap: string;
  }[];
  ordering: string;
  reserve_breach_periods: {
    from_date: string;
    to_date: string | null;
    maximum_gap: string;
  }[];
  cash_shortfall_periods: {
    from_date: string;
    to_date: string | null;
    maximum_gap: string;
  }[];
}
export interface Analysis {
  baseline: Simulation;
  scenarios: {
    name: string;
    assumptions: Scenario;
    result: Simulation;
    minimum_delta: string;
  }[];
}
export interface Options {
  max_advance_pct: number;
  step_pct: number;
  advance_date: string;
  milestone_pct: number;
  milestone_date: string | null;
  final_date: string | null;
  protect_scenario: Scenario | null;
}
export interface Candidate {
  advance_pct: number;
  advance_amount: string;
  deal: Deal;
  result: Simulation;
  stress_result: Simulation | null;
}
export interface Solution {
  candidates: Candidate[];
  tested: number;
  feasible_count: number;
  objective: string;
  search: string;
  message: string;
}
export interface Report {
  markdown: string;
  draft: string;
  draft_mode: string;
  analysis: Analysis;
  alternatives: Solution | null;
}
export interface Extraction {
  mode: string;
  fields: { name: string; value: string; source: Source }[];
  payments: CashEvent[];
  contract_value: string | null;
  currency: string | null;
  warnings: string[];
  notice: string;
  document_name: string;
  pages: { page: number | null; text: string }[];
}

export async function api<T>(
  url: string,
  body?: unknown,
  upload?: FormData,
): Promise<T> {
  const response = await fetch(
    `/api${url}`,
    upload
      ? { method: "POST", body: upload }
      : body
        ? {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          }
        : undefined,
  );
  const data = await response.json();
  if (!response.ok)
    throw new Error(
      data.issues
        ? data.issues
            .map(
              (e: { field: string; message: string }) =>
                `${e.field}: ${e.message}`,
            )
            .join("\n")
        : data.detail || "The request could not be completed.",
    );
  return data;
}
export function money(value: string | number, currency = "INR") {
  return new Intl.NumberFormat(currency === "INR" ? "en-IN" : "en-GB", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(Number(value));
}
export const paymentKinds: Kind[] = [
  "advance",
  "milestone",
  "final",
  "retention",
];
export const emptyScenario: Scenario = {
  name: "Custom scenario",
  delay_days: 0,
  expense_increase_pct: 0,
  advance_reduction_pct: 0,
  milestone_delay_days: 0,
  expense_earlier_days: 0,
};
export const defaultScenarios: Scenario[] = [
  { ...emptyScenario, name: "15-day payment delay", delay_days: 15 },
  {
    ...emptyScenario,
    name: "20% higher project costs",
    expense_increase_pct: 20,
  },
  {
    ...emptyScenario,
    name: "Delay + cost overrun",
    delay_days: 15,
    expense_increase_pct: 20,
  },
];
