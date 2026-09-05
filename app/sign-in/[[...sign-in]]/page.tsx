import { redirect } from "next/navigation";
import { SignInCard } from "./SignInCard";

// Server component — guards when Clerk isn't configured. The actual UI is a
// client component so AuthShell can use hooks for live theme observation.
export default function SignInPage() {
  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) redirect("/");
  return <SignInCard />;
}

