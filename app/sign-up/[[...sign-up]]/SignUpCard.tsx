"use client";

import { SignUp } from "@clerk/nextjs";
import { AuthShell } from "@/components/auth/AuthShell";

export function SignUpCard() {
  return (
    <AuthShell>
      {(appearance) => (
        <SignUp appearance={appearance} fallbackRedirectUrl="/" />
      )}
    </AuthShell>
  );
}