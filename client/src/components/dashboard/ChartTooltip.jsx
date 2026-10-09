/**
 * Styled tooltip content for Recharts charts.
 * @param {{ active?: boolean, payload?: Array<{ name: string, value: number, color: string }>, label?: string, formatLabel?: (label: string) => string, formatValue?: (value: number) => string }} props
 */
export default function ChartTooltip({ active, payload, label, formatLabel = (l) => l, formatValue = (v) => v }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-lg">
      <p className="mb-1 font-semibold text-slate-900">{formatLabel(label)}</p>
      {payload.map((entry) => (
        <p key={entry.name} className="flex items-center gap-2 text-slate-600">
          <span className="size-2 rounded-full" style={{ backgroundColor: entry.color }} aria-hidden="true" />
          {entry.name}: <span className="font-semibold text-slate-900">{formatValue(entry.value)}</span>
        </p>
      ))}
    </div>
  );
}
