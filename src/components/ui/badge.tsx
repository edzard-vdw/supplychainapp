import { cn } from "@/lib/utils";

interface BadgeProps {
  label: string;
  bgClass?: string;
  textClass?: string;
  className?: string;
}

export function Badge({ label, bgClass, textClass, className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
        bgClass ?? "bg-badge-gray-bg",
        textClass ?? "text-badge-gray-text",
        className
      )}
    >
      {label}
    </span>
  );
}

interface StatusBadgeProps {
  display: { label: string; bgClass: string; textClass: string };
  className?: string;
}

export function StatusBadge({ display, className }: StatusBadgeProps) {
  return (
    <Badge
      label={display.label}
      bgClass={display.bgClass}
      textClass={display.textClass}
      className={className}
    />
  );
}
