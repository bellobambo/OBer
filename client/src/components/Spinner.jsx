import { cn } from "../utils/cn";

const SIZE_MAP = {
  xs: "h-4 w-4 border-2",
  sm: "h-6 w-6 border-2",
  md: "h-10 w-10 border-[3px]",
  lg: "h-14 w-14 border-4",
  xl: "h-20 w-20 border-4",
};

const COLOR_MAP = {
  blue: "border-blue-500/30 border-t-blue-500",
  white: "border-white/25 border-t-white",
  slate: "border-slate-300 border-t-slate-600",
  emerald: "border-emerald-200/30 border-t-emerald-500",
  amber: "border-amber-200/30 border-t-amber-500",
};

const TEXT_COLOR_MAP = {
  blue: "text-blue-600",
  white: "text-white",
  slate: "text-slate-600",
  emerald: "text-emerald-600",
  amber: "text-amber-600",
};

export function Spinner({
  size = "md",
  color = "blue",
  label = "Loading",
  showLabel = false,
  className = "",
}) {
  const sizeClasses = SIZE_MAP[size] ?? SIZE_MAP.md;
  const colorClasses = COLOR_MAP[color] ?? COLOR_MAP.blue;
  const textColorClasses = TEXT_COLOR_MAP[color] ?? TEXT_COLOR_MAP.blue;

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn("inline-flex items-center gap-3", className)}
    >
      <span
        className={cn("animate-spin rounded-full", sizeClasses, colorClasses)}
      />
      {showLabel ? (
        <span className={cn("text-sm font-medium", textColorClasses)}>
          {label}
        </span>
      ) : (
        <span className="sr-only">{label}</span>
      )}
    </div>
  );
}
