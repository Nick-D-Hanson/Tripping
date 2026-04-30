"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type SessionResult = {
  loading: boolean;
  status?: number;
  body?: unknown;
  error?: string;
};

export function AuthDebugClient() {
  const [sessionResult, setSessionResult] = useState<SessionResult>({ loading: true });

  useEffect(() => {
    let cancelled = false;

    fetch("/api/auth/get-session", { credentials: "include" })
      .then(async (response) => {
        const text = await response.text();
        let body: unknown = text;

        try {
          body = text ? JSON.parse(text) : null;
        } catch {
          body = text;
        }

        if (!cancelled) {
          setSessionResult({
            loading: false,
            status: response.status,
            body,
          });
        }
      })
      .catch((error: Error) => {
        if (!cancelled) {
          setSessionResult({
            loading: false,
            error: error.message,
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="grid gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Browser session probe</CardTitle>
          <CardDescription>Direct browser call to `/api/auth/get-session`.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm">
          <p>
            <span className="font-medium">Current URL:</span>{" "}
            {typeof window !== "undefined" ? window.location.href : "Unavailable"}
          </p>
          <p>
            <span className="font-medium">User agent:</span>{" "}
            {typeof window !== "undefined" ? window.navigator.userAgent : "Unavailable"}
          </p>
          <div>
            <p className="font-medium">Auth response</p>
            <pre className="mt-2 overflow-x-auto rounded-md border bg-muted p-3 text-xs">
              {JSON.stringify(sessionResult, null, 2)}
            </pre>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild>
              <Link href="/trips">Continue to trips</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/login">Back to login</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
