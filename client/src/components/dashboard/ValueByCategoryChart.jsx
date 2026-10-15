import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CHART_COLORS } from "../../utils/constants";
import { formatCompactCurrency, formatCurrency } from "../../utils/formatters";
import ChartTooltip from "./ChartTooltip";

/**
 * Horizontal bar chart of stock value (at cost) per category. Horizontal bars
 * keep long category names ("Construction Materials") readable even with many
 * categories or on a phone.
 *
 * @param {{ data: Array<{ category: string, value: number }> }} props
 */
export default function ValueByCategoryChart({ data }) {
  return (
    <div
      style={{ height: Math.max(288, data.length * 34 + 40) }}
      role="img"
      aria-label="Bar chart of stock value by category"
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} horizontal={false} />
          <XAxis
            type="number"
            tickFormatter={formatCompactCurrency}
            tick={{ fontSize: 11, fill: CHART_COLORS.axis }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            type="category"
            dataKey="category"
            tick={{ fontSize: 11, fill: CHART_COLORS.axis }}
            tickLine={false}
            axisLine={false}
            width={128}
            interval={0}
            // Very long names are shortened on narrow screens.
            tickFormatter={(name) => (name.length > 22 ? `${name.slice(0, 21)}…` : name)}
          />
          <Tooltip cursor={{ fill: "#f1f5f9" }} content={<ChartTooltip formatValue={formatCurrency} />} />
          <Bar dataKey="value" name="Stock value" fill={CHART_COLORS.primary} radius={[0, 6, 6, 0]} maxBarSize={22} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
