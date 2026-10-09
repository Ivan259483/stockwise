import { Inbox } from "lucide-react";

/**
 * Friendly placeholder for a list with no items, optionally with an action
 * (e.g. "Add product") so the user knows what to do next.
 *
 * @param {{ icon?: import("react").ComponentType<{ className?: string }>, title: string, description?: string, action?: import("react").ReactNode }} props
 */
export default function EmptyState({ icon: Icon = Inbox, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-slate-100">
        <Icon className="size-6 text-slate-400" aria-hidden="true" />
      </div>
      <h3 className="mt-4 text-sm font-semibold text-slate-900">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-sm text-slate-500">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
