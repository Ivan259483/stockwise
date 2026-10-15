import { Archive, ArchiveRestore, Ban, CheckCircle2, FilePlus2, PackageCheck, XCircle } from "lucide-react";
import { formatDateTime } from "../../utils/formatters";

/** Icon, color and wording for each timeline event. */
const EVENTS = {
  Requested: { icon: FilePlus2, color: "bg-amber-100 text-amber-700", verb: "Requested by" },
  Approved: { icon: CheckCircle2, color: "bg-sky-100 text-sky-700", verb: "Approved by" },
  Rejected: { icon: XCircle, color: "bg-red-100 text-red-700", verb: "Rejected by" },
  Received: { icon: PackageCheck, color: "bg-emerald-100 text-emerald-700", verb: "Received into stock by" },
  Cancelled: { icon: Ban, color: "bg-slate-200 text-slate-700", verb: "Cancelled by" },
  Archived: { icon: Archive, color: "bg-slate-200 text-slate-700", verb: "Archived by" },
  Restored: { icon: ArchiveRestore, color: "bg-primary-100 text-primary-700", verb: "Restored by" },
};

/**
 * Vertical timeline of a purchase order's history: who did what, and when.
 * @param {{ history: Array<{ action: string, by?: { name: string, role: string }, at: string, note?: string }> }} props
 */
export default function PoTimeline({ history }) {
  return (
    <ol className="relative space-y-5 p-5" aria-label="Purchase order timeline">
      {history.map((event, index) => {
        const config = EVENTS[event.action] ?? EVENTS.Requested;
        const Icon = config.icon;
        const isLast = index === history.length - 1;
        return (
          <li key={`${event.action}-${event.at}`} className="relative flex gap-3">
            {!isLast && (
              <span className="absolute top-9 bottom-[-1.25rem] left-4 w-px bg-slate-200" aria-hidden="true" />
            )}
            <span className={`relative flex size-8 shrink-0 items-center justify-center rounded-full ${config.color}`}>
              <Icon className="size-4" aria-hidden="true" />
            </span>
            <div className="min-w-0 pt-0.5">
              <p className="text-sm font-semibold text-slate-900">{event.action}</p>
              <p className="text-sm text-slate-600">
                {config.verb} <span className="font-medium text-slate-900">{event.by?.name ?? "Unknown user"}</span>
                {event.by?.role && <span className="text-slate-500"> ({event.by.role})</span>}
              </p>
              <p className="text-xs text-slate-500">{formatDateTime(event.at)}</p>
              {event.note && (
                <p className="mt-1.5 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700 ring-1 ring-slate-200">
                  {event.note}
                </p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
