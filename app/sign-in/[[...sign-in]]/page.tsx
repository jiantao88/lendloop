import { SignIn } from "@clerk/nextjs";
import { SetupScreen } from "@/components/SetupScreen";
import { hasAppConfig } from "@/lib/config";

export default function SignInPage() {
  if (!hasAppConfig()) return <SetupScreen />;
  return (
    <main className="auth-screen">
      <SignIn />
    </main>
  );
}
