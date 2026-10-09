import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CHART_COLORS } from "../../utils/constants";
import { formatCompactCurrency, formatCurrency } from "../../utils/formatters";
import ChartTooltip from "./ChartTooltip";

/**
 * Bar chart of stock value (at cost) per category.
 * @param {{ data: Array<{ category: string, value: number }> }} props
 */
export default function ValueByCategoryChart({ data }) {
  return (
    <div className="h-72" role="img" aria-label="Bar chart of stock value by category">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} vertical={false} />
          <XAxis
            dataKey="category"
            tick={{ fontSize: 11, fill: CHART_COLORS.axis }}
            tickLine={false}
            axisLine={false}
            interval={0}
            // Long names ("Construction Materials") are shortened to fit narrow screens.
            tickFormatter={(name) => (name.length > 12 ? `${name.slice(0, 11)}…` : name)}
          />
          <YAxis
            tickFormatter={formatCompactCurrency}
            tick={{ fontSize: 11, fill: CHART_COLORS.axis }}
            tickLine={false}
            axisLine={false}
            width={64}
          />
          <Tooltip cursor={{ fill: "#f1f5f9" }} content={<ChartTooltip formatValue={formatCurrency} />} />
          <Bar dataKey="value" name="Stock value" fill={CHART_COLORS.primary} radius={[6, 6, 0, 0]} maxBarSize={48} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
