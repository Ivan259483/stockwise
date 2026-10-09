import { Suspense, useCallback, useState } from "react";
import { Outlet } from "react-router-dom";
import { PageLoader } from "../ui/Spinner";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

/** Shell for every logged-in page: sidebar + topbar + the routed page. */
export default function AppLayout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenu = useCallback(() => setMenuOpen(false), []);

  return (
    <div className="min-h-screen">
      <Sidebar open={menuOpen} onClose={closeMenu} />
      <div className="lg:pl-64">
        <Topbar onMenuClick={() => setMenuOpen(true)} menuOpen={menuOpen} />
        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {/* Pages are lazy-loaded; show a spinner while a page's code downloads. */}
          <Suspense fallback={<PageLoader />}>
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  );
}
