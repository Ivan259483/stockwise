import { AlertCircle, RotateCw } from "lucide-react";
import { getErrorMessage } from "../../utils/errors";
import Button from "./Button";

/**
 * Shown when data failed to load, with a retry button.
 * @param {{ error: unknown, onRetry?: () => void, title?: string }} props
 */
export default function ErrorState({ error, onRetry, title = "Couldn't load this data" }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-12 text-center" role="alert">
      <div className="flex size-12 items-center justify-center rounded-full bg-red-50">
        <AlertCircle className="size-6 text-red-500" aria-hidden="true" />
      </div>
      <h3 className="mt-4 text-sm font-semibold text-slate-900">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-slate-500">{getErrorMessage(error)}</p>
      {onRetry && (
        <Button variant="secondary" icon={RotateCw} onClick={onRetry} className="mt-5">
          Try again
        </Button>
      )}
    </div>
  );
}
