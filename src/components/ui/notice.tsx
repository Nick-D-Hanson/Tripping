import * as React from "react";
import { CheckCircle2, CircleAlert, Info } from "lucide-react";
import { cn } from "@/lib/utils";

type NoticeVariant = "success" | "error" | "info";

const noticeStyles: Record<NoticeVariant, string> = {
  success: "border-emerald-500/30 bg-emerald-500/10 text-emerald-100",
  error: "border-destructive/30 bg-destructive/10 text-destructive",
  info: "border-border bg-muted/40 text-foreground",
};

const noticeIcons: Record<NoticeVariant, React.ComponentType<{ className?: string }>> = {
  success: CheckCircle2,
  error: CircleAlert,
  info: Info,
};

export function Notice({
  variant = "info",
  title,
  children,
  className,
}: React.HTMLAttributes<HTMLDivElement> & {
  variant?: NoticeVariant;
  title?: string;
}) {
  const Icon = noticeIcons[variant];

  return (
    <div className={cn("flex items-start gap-3 rounded-lg border px-4 py-3 text-sm", noticeStyles[variant], className)} role="status">
      <Icon className="mt-0.5 size-4 shrink-0" />
      <div className="min-w-0">
        {title ? <p className="font-medium">{title}</p> : null}
        {children ? <div className={cn(title ? "mt-1" : undefined)}>{children}</div> : null}
      </div>
    </div>
  );
}
