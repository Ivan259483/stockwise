import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CHART_COLORS } from "../../utils/constants";
import { formatNumber, formatShortDay } from "../../utils/formatters";
import ChartTooltip from "./ChartTooltip";

/**
 * Line chart of units stocked in vs. out per day over the last 7 days.
 * @param {{ data: Array<{ date: string, in: number, out: number }> }} props
 */
export default function MovementTrendChart({ data }) {
  return (
    <div className="h-72" role="img" aria-label="Line chart of units stocked in and out over the last 7 days">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={formatShortDay}
            tick={{ fontSize: 11, fill: CHART_COLORS.axis }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            allowDecimals={false}
            tick={{ fontSize: 11, fill: CHART_COLORS.axis }}
            tickLine={false}
            axisLine={false}
            width={40}
          />
          <Tooltip
            content={<ChartTooltip formatLabel={formatShortDay} formatValue={(v) => `${formatNumber(v)} units`} />}
          />
          <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
          <Line
            type="monotone"
            dataKey="in"
            name="Stock in"
            stroke={CHART_COLORS.stockIn}
            strokeWidth={2.5}
            dot={{ r: 3 }}
          />
          <Line
            type="monotone"
            dataKey="out"
            name="Stock out"
            stroke={CHART_COLORS.stockOut}
            strokeWidth={2.5}
            dot={{ r: 3 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
