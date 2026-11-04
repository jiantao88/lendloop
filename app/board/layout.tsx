import { BoardShell } from "@/components/board/Shell";
import { SetupScreen } from "@/components/SetupScreen";
import { hasAppConfig } from "@/lib/config";

export default function BoardLayout({ children }: { children: React.ReactNode }) {
  if (!hasAppConfig()) return <SetupScreen />;
  return <BoardShell>{children}</BoardShell>;
}
