"use client";

import { NeonAuthUIProvider } from "@neondatabase/auth-ui";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth/client";

export function Providers({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "";
  const authRedirectPath = process.env.NODE_ENV === "development" ? "/auth-debug" : "/trips";
  const googleErrorFallbackUrl = appUrl ? `${appUrl}/auth/email-otp?authFallback=google` : "/auth/email-otp?authFallback=google";

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
      social={{
        providers: ["google"],
        signIn: async (params) =>
          authClient.signIn.social({
            ...params,
            errorCallbackURL: googleErrorFallbackUrl,
          }),
      }}
    >
      {children}
    </NeonAuthUIProvider>
  );
}
