import { ChevronLeft, ChevronRight } from "lucide-react";
import { formatNumber } from "../../utils/formatters";
import Button from "./Button";

/**
 * Previous/next pager with a "Showing x–y of z" summary.
 * @param {{ page: number, totalPages: number, total: number, limit: number, onPageChange: (page: number) => void }} props
 */
export default function Pagination({ page, totalPages, total, limit, onPageChange }) {
  if (total === 0) return null;
  const first = (page - 1) * limit + 1;
  const last = Math.min(page * limit, total);

  return (
    <nav
      className="flex items-center justify-between gap-3 border-t border-slate-200 px-4 py-3"
      aria-label="Pagination"
    >
      <p className="text-sm text-slate-600">
        <span className="font-medium">{formatNumber(first)}</span>–<span className="font-medium">{formatNumber(last)}</span>{" "}
        of <span className="font-medium">{formatNumber(total)}</span>
      </p>
      <div className="flex items-center gap-2">
        <span className="hidden text-sm text-slate-500 sm:inline">
          Page {page} of {totalPages}
        </span>
        <Button
          variant="secondary"
          size="icon"
          icon={ChevronLeft}
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          aria-label="Previous page"
        />
        <Button
          variant="secondary"
          size="icon"
          icon={ChevronRight}
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          aria-label="Next page"
        />
      </div>
    </nav>
  );
}
