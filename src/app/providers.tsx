"use client";

import { NeonAuthUIProvider } from "@neondatabase/auth-ui";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth/client";

export function Providers({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "";
  const authRedirectPath = process.env.NODE_ENV === "development" ? "/auth-debug" : "/trips";

  return (
    <NeonAuthUIProvider
      authClient={authClient}
      navigate={router.push}
      replace={router.replace}
      onSessionChange={() => router.refresh()}
      redirectTo={authRedirectPath}
      baseURL={appUrl}
      Link={Link}
      defaultTheme="dark"
      emailOTP
      social={{ providers: ["google"] }}
    >
      {children}
    </NeonAuthUIProvider>
  );
}
