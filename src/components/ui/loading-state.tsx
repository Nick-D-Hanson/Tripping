import * as React from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export function PageHeaderSkeleton({
  className,
  withActions = false,
}: {
  className?: string;
  withActions?: boolean;
}) {
  return (
    <div className={cn("flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between", className)}>
      <div className="min-w-0 space-y-3">
        <Skeleton className="h-9 w-40 sm:w-56" />
        <Skeleton className="h-4 w-full max-w-2xl" />
        <Skeleton className="h-4 w-4/5 max-w-xl" />
      </div>
      {withActions ? (
        <div className="flex flex-col gap-2 sm:flex-row">
          <Skeleton className="h-10 w-full sm:w-28" />
          <Skeleton className="h-10 w-full sm:w-28" />
        </div>
      ) : null}
    </div>
  );
}

export function SectionCardSkeleton({
  lines = 3,
  withActions = false,
  className,
}: {
  lines?: number;
  withActions?: boolean;
  className?: string;
}) {
  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-3">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-72 max-w-full" />
          </div>
          {withActions ? (
            <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
              <Skeleton className="h-10 w-full sm:w-24" />
              <Skeleton className="h-10 w-full sm:w-24" />
              <Skeleton className="h-10 w-full sm:w-24" />
              <Skeleton className="h-10 w-full sm:w-24" />
            </div>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="grid gap-3">
        {Array.from({ length: lines }).map((_, index) => (
          <Skeleton key={index} className="h-16 w-full" />
        ))}
      </CardContent>
    </Card>
  );
}
