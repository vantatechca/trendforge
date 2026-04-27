import { Card } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  icon: Icon,
  hint,
  variant = "default",
}: {
  label: string;
  value: string | number;
  icon?: LucideIcon;
  hint?: string;
  variant?: "default" | "success" | "warning" | "info" | "destructive";
}) {
  const accent =
    variant === "success"
      ? "text-success"
      : variant === "warning"
        ? "text-warning"
        : variant === "info"
          ? "text-info"
          : variant === "destructive"
            ? "text-destructive"
            : "text-primary";

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between mb-1.5">
        <span className="text-xs text-muted-foreground uppercase tracking-wider">{label}</span>
        {Icon && <Icon className={cn("w-4 h-4", accent)} />}
      </div>
      <div className="text-2xl font-bold">{value}</div>
      {hint && <div className="text-xs text-muted-foreground mt-1">{hint}</div>}
    </Card>
  );
}
