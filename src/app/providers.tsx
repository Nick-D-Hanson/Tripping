"use client";

import { NeonAuthUIProvider } from "@neondatabase/auth-ui";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ToastProvider } from "@/components/ui/toast-provider";
import { authClient } from "@/lib/auth/client";

function detectSafariBrowser() {
  if (typeof navigator === "undefined") return false;

  const userAgent = navigator.userAgent;
  const isSafariEngine = /Safari/i.test(userAgent);
  const isExcludedBrowser = /Chrome|CriOS|EdgiOS|Edg|OPiOS|OPR|Firefox|FxiOS|SamsungBrowser/i.test(userAgent);

  return isSafariEngine && !isExcludedBrowser;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "";
  const authRedirectPath = process.env.NODE_ENV === "development" ? "/auth-debug" : "/trips";
  const googleErrorFallbackUrl = appUrl ? `${appUrl}/auth/email-otp?authFallback=google` : "/auth/email-otp?authFallback=google";
  const [isSafari] = useState(() => detectSafariBrowser());

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
      social={
        isSafari
          ? undefined
          : {
              providers: ["google"],
              signIn: async (params) =>
                authClient.signIn.social({
                  ...params,
                  errorCallbackURL: googleErrorFallbackUrl,
                }),
            }
      }
    >
      <ToastProvider>{children}</ToastProvider>
    </NeonAuthUIProvider>
  );
}
