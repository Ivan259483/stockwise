import { LogOut, Menu, Store } from "lucide-react";
import useAuth from "../../hooks/useAuth";
import { Link } from "react-router-dom";
import { STORE_NAME } from "../../utils/constants";
import Badge from "../ui/Badge";

/**
 * Top bar: hamburger (mobile), the client store's name, signed-in user (links
 * to My Profile) with role badge, and logout.
 * @param {{ onMenuClick: () => void, menuOpen: boolean }} props
 */
export default function Topbar({ onMenuClick, menuOpen }) {
  const { user, logout } = useAuth();
  const initials = user?.name
    ?.split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-slate-200 bg-white/90 px-4 backdrop-blur sm:px-6">
      <button
        type="button"
        onClick={onMenuClick}
        className="-ml-1 rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
        aria-label="Open navigation"
        aria-controls="app-sidebar"
        aria-expanded={menuOpen}
      >
        <Menu className="size-5" aria-hidden="true" />
      </button>
      <Link to="/" className="flex min-w-0 items-center gap-2 text-slate-900" aria-label={`${STORE_NAME} home`}>
        <Store className="hidden size-5 shrink-0 text-primary-600 sm:block" aria-hidden="true" />
        <span className="truncate text-sm font-semibold sm:text-base" data-testid="store-name">
          {STORE_NAME}
        </span>
      </Link>

      <div className="ml-auto flex items-center gap-3">
        <Link
          to="/profile"
          className="flex items-center gap-2.5 rounded-lg p-1 hover:bg-slate-100"
          aria-label="My profile"
          title="My profile"
        >
          <span
            className="flex size-9 items-center justify-center rounded-full bg-primary-100 text-sm font-semibold text-primary-700"
            aria-hidden="true"
          >
            {initials}
          </span>
          <div className="hidden leading-tight md:block">
            <p className="text-sm font-semibold text-slate-900">{user?.name}</p>
            <p className="text-xs text-slate-500">{user?.email}</p>
          </div>
          <Badge tone={user?.role === "admin" ? "primary" : "neutral"} className="hidden capitalize sm:inline-flex">
            {user?.role}
          </Badge>
        </Link>
        <span className="h-6 w-px bg-slate-200" aria-hidden="true" />
        <button
          type="button"
          onClick={logout}
          className="flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
        >
          <LogOut className="size-4" aria-hidden="true" />
          <span className="hidden sm:inline">Log out</span>
          <span className="sr-only sm:hidden">Log out</span>
        </button>
      </div>
    </header>
  );
}
