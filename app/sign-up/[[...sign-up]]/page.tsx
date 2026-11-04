import { SignUp } from "@clerk/nextjs";
import { SetupScreen } from "@/components/SetupScreen";
import { hasAppConfig } from "@/lib/config";

export default function SignUpPage() {
  if (!hasAppConfig()) return <SetupScreen />;
  return (
    <main className="auth-screen">
      <SignUp />
    </main>
  );
}
