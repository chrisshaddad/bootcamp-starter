// Mock AI insight generator. There is no network call: each preset Action reads the
// figures computed in lib/metrics.ts and renders an Insight (headline tied to a real
// number + suggested action + caveat). This mirrors the proposal's rule that the model
// only interprets figures computed in code.

import type { Metrics } from "./metrics";
import { formatCurrency, formatPercent, formatNumber } from "./format";

export type AiActionKey =
  | "least-selling"
  | "top-performer"
  | "recommend-sales"
  | "recommend-expenses";

export interface AiAction {
  key: AiActionKey;
  /** Chip label shown in the chat. */
  label: string;
  /** The user-bubble text when the chip is clicked. */
  question: string;
}

export const AI_ACTIONS: AiAction[] = [
  {
    key: "least-selling",
    label: "Least-selling item",
    question: "What's my least-selling item?",
  },
  {
    key: "top-performer",
    label: "Top performer",
    question: "What's my top-performing item?",
  },
  {
    key: "recommend-sales",
    label: "Advice on sales",
    question: "What do you recommend based on my sales?",
  },
  {
    key: "recommend-expenses",
    label: "Advice on expenses",
    question: "What do you recommend based on my expenses?",
  },
];

export type ChipTone = "primary" | "accent" | "success" | "warning" | "error";

export interface FigureChip {
  label: string;
  value: string;
  tone?: ChipTone;
}

export interface Insight {
  headline: string;
  body: string;
  figures: FigureChip[];
  action: string;
  caveat: string;
}

const PERIOD_CAVEAT =
  "Based on the last 3 months of sample sales — seasonality and one-off effects aren't modeled.";

export function generateInsight(action: AiActionKey, m: Metrics): Insight {
  switch (action) {
    case "least-selling": {
      const it = m.leastSelling;
      if (!it) {
        return {
          headline: "No sales recorded yet.",
          body: "Once there are sales, I can point to the item bringing in the least revenue.",
          figures: [],
          action: "Add a few sales (or import them) to unlock this insight.",
          caveat: PERIOD_CAVEAT,
        };
      }
      const highMargin = it.marginPct >= 0.5;
      return {
        headline: `${it.item.name} brings in the least revenue.`,
        body: `It generated ${formatCurrency(it.revenue)} across ${formatNumber(
          it.units,
        )} units, the lowest of any ${it.item.type.toLowerCase()} or product you sell. Its unit margin is ${formatPercent(
          it.marginPct,
        )}.`,
        figures: [
          { label: "Revenue", value: formatCurrency(it.revenue), tone: "accent" },
          { label: "Units", value: formatNumber(it.units) },
          {
            label: "Unit margin",
            value: formatPercent(it.marginPct),
            tone: highMargin ? "success" : "warning",
          },
        ],
        action: highMargin
          ? `It's actually high-margin, so don't cut it — a small promo, bundle, or better shelf placement could lift volume with little margin risk.`
          : `Low revenue and a thin margin: consider repricing, bundling it with a popular item, or phasing it out.`,
        caveat: PERIOD_CAVEAT,
      };
    }

    case "top-performer": {
      const it = m.topPerformer;
      if (!it) {
        return {
          headline: "No top performer yet.",
          body: "Add some sales and I'll rank your items by contribution margin.",
          figures: [],
          action: "Seed or import sales to unlock this insight.",
          caveat: PERIOD_CAVEAT,
        };
      }
      return {
        headline: `${it.item.name} is your top performer by contribution margin.`,
        body: `It contributed ${formatCurrency(
          it.contributionMarginTotal,
        )} toward covering your expenses — ${formatCurrency(
          it.contributionMarginUnit,
        )} per unit across ${formatNumber(it.units)} units (${formatPercent(
          it.marginPct,
        )} margin).`,
        figures: [
          {
            label: "Total contribution",
            value: formatCurrency(it.contributionMarginTotal),
            tone: "primary",
          },
          { label: "Per unit", value: formatCurrency(it.contributionMarginUnit) },
          { label: "Margin", value: formatPercent(it.marginPct), tone: "success" },
        ],
        action: `Protect its availability and feature it up front. A premium or "plus" version could capture more of this demand.`,
        caveat: PERIOD_CAVEAT,
      };
    }

    case "recommend-sales": {
      const best = m.topPerformer;
      const worst = m.bottomItems[0];
      const figures: FigureChip[] = [
        { label: "Gross margin", value: formatPercent(m.grossMargin.pct), tone: "primary" },
        { label: "Revenue", value: formatCurrency(m.revenue), tone: "accent" },
      ];
      if (best)
        figures.push({
          label: `${best.item.name} margin`,
          value: formatPercent(best.marginPct),
          tone: "success",
        });
      return {
        headline: `Shift the mix toward your high-margin items.`,
        body: `Your overall gross margin is ${formatPercent(
          m.grossMargin.pct,
        )} on ${formatCurrency(m.revenue)} of revenue.${
          best ? ` ${best.item.name} is your strongest earner at ${formatPercent(best.marginPct)} margin.` : ""
        }${
          worst
            ? ` ${worst.item.name} is the weakest contributor and dilutes the average.`
            : ""
        }`,
        figures,
        action: best
          ? `Upsell and bundle around ${best.item.name}${
              worst ? `, and de-emphasize or reprice ${worst.item.name}` : ""
            }. Services tend to carry the highest margins — book more of them.`
          : `Lean into your services — they usually carry the highest margins.`,
        caveat: PERIOD_CAVEAT,
      };
    }

    case "recommend-expenses": {
      const cat = m.topExpenseCategory;
      const figures: FigureChip[] = [
        { label: "Total expenses", value: formatCurrency(m.totalExpenses), tone: "error" },
        { label: "Net margin", value: formatPercent(m.netMargin.pct), tone: m.netMargin.amount >= 0 ? "success" : "error" },
      ];
      if (cat)
        figures.push({
          label: `${cat.category.name}`,
          value: `${formatPercent(cat.pct)} of spend`,
          tone: "warning",
        });
      const beLine = m.breakEven.covered
        ? `You're ${formatCurrency(m.breakEven.distance)} above break-even (${formatCurrency(
            m.breakEven.revenue,
          )}).`
        : `You're ${formatCurrency(Math.abs(m.breakEven.distance))} short of break-even (${formatCurrency(
            m.breakEven.revenue,
          )}).`;
      return {
        headline: cat
          ? `${cat.category.name} is your biggest cost lever.`
          : `Watch your largest expense categories.`,
        body: `${
          cat
            ? `${cat.category.name} is ${formatPercent(cat.pct)} of total spend (${formatCurrency(
                cat.total,
              )}). `
            : ""
        }Net margin sits at ${formatPercent(m.netMargin.pct)}. ${beLine}`,
        figures,
        action: cat
          ? `A ${cat.category.name.toLowerCase()} reduction flows straight to net margin. Renegotiate or trim it before touching pricing — even a 10% cut adds ${formatCurrency(
              cat.total * 0.1,
            )} back over the period.`
          : `Trim your largest recurring categories first — those cuts flow straight to net margin.`,
        caveat: PERIOD_CAVEAT,
      };
    }
  }
}
