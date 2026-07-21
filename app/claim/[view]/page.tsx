import { ClaimFlow } from "@/components/claim-flow";
import { SiteChrome } from "@/components/site-chrome";

export default function ClaimWorkspacePage() {
  return (
    <main className="claim-page">
      <SiteChrome />
      <ClaimFlow />
    </main>
  );
}
