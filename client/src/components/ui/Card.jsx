/**
 * White rounded panel used for every content section.
 * @param {{ title?: string, description?: string, actions?: import("react").ReactNode, children: import("react").ReactNode, className?: string, bodyClassName?: string }} props
 */
export default function Card({ title, description, actions, children, className = "", bodyClassName = "" }) {
  return (
    <section className={`overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm ${className}`}>
      {(title || actions) && (
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
          <div>
            {title && <h2 className="text-base font-semibold text-slate-900">{title}</h2>}
            {description && <p className="mt-0.5 text-sm text-slate-500">{description}</p>}
          </div>
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </header>
      )}
      <div className={bodyClassName}>{children}</div>
    </section>
  );
}
