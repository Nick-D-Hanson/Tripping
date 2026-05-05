import * as React from "react";
import { cn } from "@/lib/utils";

export function SectionHeader({
  title,
  description,
  actions,
  className,
  titleClassName,
  descriptionClassName,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
  titleClassName?: string;
  descriptionClassName?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between", className)}>
      <div className="min-w-0">
        <div className={cn("flex flex-wrap items-center gap-2", titleClassName)}>{title}</div>
        {description ? <div className={cn("mt-2 text-sm text-muted-foreground", descriptionClassName)}>{description}</div> : null}
      </div>
      {actions ? <div className="shrink-0">{actions}</div> : null}
    </div>
  );
}
