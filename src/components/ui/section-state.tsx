import type { LucideIcon } from "lucide-react";
import { CircleAlert, Info } from "lucide-react";
import * as React from "react";
import { cn } from "@/lib/utils";

type SectionStateVariant = "default" | "info" | "warning";

const variantStyles: Record<SectionStateVariant, string> = {
  default: "border-dashed text-muted-foreground",
  info: "bg-muted/30 text-foreground",
  warning: "border-destructive/20 bg-destructive/5 text-foreground",
};

const variantIconStyles: Record<SectionStateVariant, string> = {
  default: "bg-muted text-muted-foreground",
  info: "bg-primary/10 text-primary",
  warning: "bg-destructive/10 text-destructive",
};

export function SectionState({
  title,
  description,
  icon: Icon = Info,
  variant = "default",
  action,
  className,
}: {
  title: string;
  description: string;
  icon?: LucideIcon;
  variant?: SectionStateVariant;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("rounded-lg border px-5 py-5", variantStyles[variant], className)}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <span className={cn("mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-md", variantIconStyles[variant])}>
            <Icon className="size-4" />
          </span>
          <div className="min-w-0">
            <p className="font-medium text-foreground">{title}</p>
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          </div>
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
    </div>
  );
}

export function SectionErrorState({
  title = "Something needs attention",
  description,
  className,
}: {
  title?: string;
  description: string;
  className?: string;
}) {
  return <SectionState title={title} description={description} icon={CircleAlert} variant="warning" className={className} />;
}
