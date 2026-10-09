import { BarChart3, Bell, ShieldCheck } from "lucide-react";
import Logo from "../ui/Logo";

const HIGHLIGHTS = [
  { icon: BarChart3, text: "Real-time stock levels and value in pesos" },
  { icon: Bell, text: "Low-stock alerts before you run out" },
  { icon: ShieldCheck, text: "Every stock change recorded with who and when" },
];

/**
 * Two-column frame for Login and Register: a brand panel on large screens and
 * a centered form card everywhere.
 *
 * @param {{ title: string, subtitle: string, children: import("react").ReactNode, footer: import("react").ReactNode }} props
 */
export default function AuthLayout({ title, subtitle, children, footer }) {
  return (
    <div className="flex min-h-screen">
      <aside className="relative hidden w-[42%] flex-col justify-between overflow-hidden bg-slate-900 p-12 lg:flex">
        <div className="absolute -top-24 -right-24 size-96 rounded-full bg-primary-600/30 blur-3xl" aria-hidden="true" />
        <div className="absolute -bottom-32 -left-16 size-96 rounded-full bg-primary-400/20 blur-3xl" aria-hidden="true" />
        <div className="relative">
          <Logo inverted />
        </div>
        <div className="relative">
          <h2 className="text-3xl leading-tight font-bold text-white">
            Stop guessing what&apos;s on your shelves.
          </h2>
          <p className="mt-3 max-w-md text-slate-300">
            StockWise replaces the paper logbook for hardware stores, sari-sari stores and supply shops.
          </p>
          <ul className="mt-8 space-y-4">
            {HIGHLIGHTS.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3 text-slate-200">
                <span className="flex size-9 items-center justify-center rounded-lg bg-white/10">
                  <Icon className="size-5 text-primary-300" aria-hidden="true" />
                </span>
                {text}
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-sm text-slate-500">Integrative Programming and Technologies · INF238</p>
      </aside>

      <main className="flex flex-1 items-center justify-center px-4 py-10 sm:px-6">
        <div className="w-full max-w-md">
          <div className="mb-8 lg:hidden">
            <Logo />
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">{title}</h1>
            <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
            <div className="mt-6">{children}</div>
          </div>
          <div className="mt-6 text-center text-sm text-slate-600">{footer}</div>
        </div>
      </main>
    </div>
  );
}
