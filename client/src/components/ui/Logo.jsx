import { Layers } from "lucide-react";
import { APP_NAME } from "../../utils/constants";

/**
 * StockWise brand mark.
 * @param {{ inverted?: boolean }} props `inverted` for dark backgrounds.
 */
export default function Logo({ inverted = false }) {
  return (
    <span className="flex items-center gap-2.5">
      <span className="flex size-9 items-center justify-center rounded-lg bg-primary-600 shadow-sm">
        <Layers className="size-5 text-white" aria-hidden="true" />
      </span>
      <span className={`text-lg font-bold tracking-tight ${inverted ? "text-white" : "text-slate-900"}`}>{APP_NAME}</span>
    </span>
  );
}
