import * as React from "react";
import { cn } from "@/lib/utils";

export const EntityRow = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("rounded-md border p-3 sm:p-4", className)} {...props} />
  ),
);
EntityRow.displayName = "EntityRow";

export function EntityRowBody({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("min-w-0 flex-1", className)} {...props} />;
}

export function EntityRowHeader({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between", className)} {...props} />;
}

export function EntityRowTitle({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex flex-wrap items-center gap-2", className)} {...props} />;
}

export function EntityRowMeta({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("text-sm text-muted-foreground", className)} {...props} />;
}

export function EntityRowNotes({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("mt-2 text-sm text-muted-foreground", className)} {...props} />;
}

export function EntityRowActions({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex shrink-0 flex-wrap items-center gap-2", className)} {...props} />;
}

export function EntityRowAvatar({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn("flex size-8 items-center justify-center rounded-full border text-xs font-semibold text-muted-foreground", className)}
      aria-label={label}
      title={label}
    >
      {children}
    </span>
  );
}
