import { PublicCatalog } from "@/components/PublicCatalog";
import { SetupScreen } from "@/components/SetupScreen";
import { hasAppConfig } from "@/lib/config";

export default function HomePage() {
  if (!hasAppConfig()) return <SetupScreen />;
  return <PublicCatalog />;
}
