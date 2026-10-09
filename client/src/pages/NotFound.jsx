import { Home, SearchX } from "lucide-react";
import Button from "../components/ui/Button";

/** 404 page for unknown URLs. */
export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <div className="flex size-16 items-center justify-center rounded-full bg-primary-50">
        <SearchX className="size-8 text-primary-600" aria-hidden="true" />
      </div>
      <p className="mt-6 text-sm font-semibold text-primary-600">404</p>
      <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">Page not found</h1>
      <p className="mt-2 max-w-sm text-slate-500">
        The page you are looking for doesn&apos;t exist or may have been moved.
      </p>
      <Button to="/" icon={Home} className="mt-8">
        Back to dashboard
      </Button>
    </main>
  );
}
