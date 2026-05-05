import * as React from "react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export function Field({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("grid gap-2", className)} {...props} />;
}

export function FieldLabel({
  className,
  required,
  children,
  ...props
}: React.ComponentPropsWithoutRef<typeof Label> & { required?: boolean }) {
  return (
    <Label className={cn("inline-flex items-center gap-1", className)} {...props}>
      {children}
      {required ? <span className="text-destructive" aria-hidden="true">*</span> : null}
    </Label>
  );
}

export function FieldDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("text-sm text-muted-foreground", className)} {...props} />;
}

export function FieldError({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  if (!children) return null;

  return <p className={cn("text-sm text-destructive", className)} role="alert" {...props} />;
}
