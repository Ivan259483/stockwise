/**
 * Data table that turns into a card list on small screens.
 *
 * On `md` and up it renders a normal table (scrolling horizontally inside its
 * container if needed). If `renderMobileCard` is provided, phones get a
 * stacked card per row instead, which is far easier to read at 375px.
 *
 * @template T
 * @param {{
 *   columns: Array<{ key: string, header: string, render?: (row: T) => import("react").ReactNode, align?: "left"|"right"|"center", className?: string }>,
 *   rows: T[], rowKey?: string, caption: string,
 *   renderMobileCard?: (row: T) => import("react").ReactNode
 * }} props
 */
export default function Table({ columns, rows, rowKey = "_id", caption, renderMobileCard }) {
  const alignClass = { right: "text-right", center: "text-center", left: "text-left" };

  return (
    <>
      <div className={`overflow-x-auto ${renderMobileCard ? "hidden md:block" : ""}`}>
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <caption className="sr-only">{caption}</caption>
          <thead className="bg-slate-50">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  scope="col"
                  className={`px-4 py-3 text-xs font-semibold tracking-wide whitespace-nowrap text-slate-500 uppercase ${alignClass[column.align ?? "left"]} ${column.className ?? ""}`}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {rows.map((row) => (
              <tr key={row[rowKey]} className="transition-colors hover:bg-slate-50/70">
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={`px-4 py-3 align-middle text-slate-700 ${alignClass[column.align ?? "left"]} ${column.className ?? ""}`}
                  >
                    {column.render ? column.render(row) : row[column.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {renderMobileCard && (
        <ul className="divide-y divide-slate-100 md:hidden" aria-label={caption}>
          {rows.map((row) => (
            <li key={row[rowKey]} className="p-4">
              {renderMobileCard(row)}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

/** Placeholder rows shown while a table's first page loads. */
export function TableSkeleton({ rows = 5 }) {
  return (
    <div className="divide-y divide-slate-100" role="status">
      <span className="sr-only">Loading…</span>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex animate-pulse items-center gap-4 px-4 py-4" aria-hidden="true">
          <div className="h-4 w-1/3 rounded bg-slate-200" />
          <div className="h-4 w-1/6 rounded bg-slate-100" />
          <div className="ml-auto h-4 w-16 rounded bg-slate-100" />
        </div>
      ))}
    </div>
  );
}
