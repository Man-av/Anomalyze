import { redirect } from "next/navigation";
import { SignUpCard } from "./SignUpCard";

// Server component — guards when Clerk isn't configured. The actual UI is a
// client component so AuthShell can use hooks for live theme observation.
export default function SignUpPage() {
  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) redirect("/");
  return <SignUpCard />;
}

