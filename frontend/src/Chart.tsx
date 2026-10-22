import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";
import type { Simulation } from "./types";
import { money } from "./types";

export default function CashChart({
  result,
  reserve,
  currency,
}: {
  result: Simulation;
  reserve: string;
  currency: string;
}) {
  const data = result.timeline.map((r, i) => ({
    ...r,
    index: i,
    balance: Number(r.balance),
  }));
  return (
    <div
      className="chart"
      role="img"
      aria-label="Projected cash balance after each cash event. Exact figures are in the event ledger below."
    >
      <ResponsiveContainer width="100%" height={310}>
        <LineChart
          data={data}
          margin={{ top: 18, right: 22, bottom: 10, left: 10 }}
          accessibilityLayer
        >
          <CartesianGrid
            strokeDasharray="3 6"
            vertical={false}
            stroke="#dfe4df"
          />
          <XAxis
            dataKey="index"
            tickFormatter={(i) => data[Number(i)]?.date.slice(5) || ""}
            axisLine={false}
            tickLine={false}
            minTickGap={35}
            tick={{ fill: "#5f7054", fontSize: 11 }}
          />
          <YAxis
            tickFormatter={(v) => `${Number(v) / 1000}k`}
            axisLine={false}
            tickLine={false}
            tick={{ fill: "#5f7054", fontSize: 11 }}
            width={52}
          />
          <Tooltip
            content={({ active, payload }) => {
              const row = payload?.[0]?.payload;
              return active && row ? (
                <div className="chart-tip">
                  <strong>{row.label}</strong>
                  <span>{row.date}</span>
                  <b>{money(row.balance, currency)}</b>
                </div>
              ) : null;
            }}
          />
          <ReferenceLine
            y={Number(reserve)}
            stroke="#a77637"
            strokeDasharray="5 5"
            label={{
              value: "Reserve",
              position: "insideTopRight",
              fontSize: 11,
              fill: "#97682b",
            }}
          />
          <ReferenceLine y={0} stroke="#c0c8c0" />
          <Line
            type="stepAfter"
            dataKey="balance"
            stroke="#347165"
            strokeWidth={3}
            dot={{ r: 4, fill: "#fff", strokeWidth: 2 }}
            activeDot={{ r: 6 }}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
