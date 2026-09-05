"use client";

import { SignIn } from "@clerk/nextjs";
import { AuthShell } from "@/components/auth/AuthShell";

export function SignInCard() {
  return (
    <AuthShell>
      {(appearance) => (
        <SignIn appearance={appearance} fallbackRedirectUrl="/" />
      )}
    </AuthShell>
  );
}