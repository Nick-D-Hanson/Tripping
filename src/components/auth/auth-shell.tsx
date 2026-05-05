import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function AuthShell({
  title,
  description,
  notice,
  children,
}: {
  title: string;
  description: string;
  notice?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-6 sm:p-6">
      <div className="grid w-full max-w-md gap-4">
        {notice}
        <Card>
          <CardHeader>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </CardHeader>
          <CardContent>{children}</CardContent>
        </Card>
      </div>
    </main>
  );
}
