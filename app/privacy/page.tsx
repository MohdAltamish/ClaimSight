import Link from "next/link";

export const metadata = {
  title: "Privacy Policy | ClaimSight",
  description: "How ClaimSight handles temporary claim workspaces and uploaded evidence."
};

export default function PrivacyPage() {
  return (
    <main className="legal-page shell">
      <Link className="legal-back" href="/">← ClaimSight home</Link>
      <article>
        <p className="eyebrow">Legal</p>
        <h1>Privacy Policy</h1>
        <p className="legal-effective">Effective date: July 22, 2026</p>

        <p>ClaimSight is a temporary, anonymous workspace for organizing a property-contents insurance claim. This policy explains how ClaimSight handles information when you use the app.</p>

        <h2>Information you provide</h2>
        <p>Depending on the features you use, ClaimSight may process photos or sampled video frames; text-based policy PDFs; inventory details; item edits; document names, categories, summaries, and receipt details; claim profile details such as state or province, insurer, claim number, and loss date; correspondence, complaint, or expert-handoff drafts; and messages sent to the in-app assistants.</p>
        <p>Do not include payment-card details, account passwords, Social Security numbers, or other information that is not needed to organize your claim.</p>

        <h2>How information is used</h2>
        <p>We use this information only to create and improve your temporary claim workspace, including extracting an editable inventory, reading policy language, generating price ranges and coverage-gap summaries, preparing drafts, and creating CSV or PDF exports. ClaimSight does not file claims, contact an insurer, send email, submit a complaint, or contact an expert on your behalf.</p>

        <h2>AI processing</h2>
        <p>If live analysis is enabled for a deployment, selected image frames, extracted policy text, and in-app assistant messages are sent from ClaimSight&apos;s server to Google Gemini to provide the requested AI feature. The app sends only the content needed for that feature. The sample claim uses synthetic data. Review Google&apos;s Gemini privacy terms before choosing to upload real claim information.</p>

        <h2>Storage and retention</h2>
        <p>ClaimSight does not require an account. Each workspace is protected by a randomly generated access secret that is kept in your browser&apos;s session storage. Workspace data may be kept in temporary server memory or, when configured by the deployment operator, in Supabase. The app stores the workspace record and structured results, such as inventory, policy findings, profile details, drafts, and audit entries. It does not retain the original uploaded media or policy-PDF file as a workspace file.</p>
        <p>Workspaces expire after 24 hours. You can use <strong>Delete now</strong> in the app to delete a workspace earlier. Expired workspaces are removed by the deployment&apos;s scheduled cleanup process. Closing the browser does not itself delete server-side workspace data, but it may remove your local access secret.</p>

        <h2>Service providers and disclosures</h2>
        <p>ClaimSight may use Google Gemini for live AI features, Supabase for temporary hosted workspace storage, and a hosting provider to operate the app. Those providers process information only to provide their services to ClaimSight. We do not sell personal information, use it for targeted advertising, or share it with insurers, regulators, adjusters, or experts unless you independently export or share it yourself. We may disclose information if required by law or to protect the security of the app and its users.</p>

        <h2>Security</h2>
        <p>ClaimSight uses a secret-based workspace credential and keeps service credentials server-side. No system can guarantee absolute security, so please use care when uploading sensitive claim materials and delete the workspace when you are finished.</p>

        <h2>Your choices</h2>
        <p>You can choose not to provide optional claim-profile details, review and correct workspace information before exporting, download your records, and delete the workspace at any time while you still have its access secret. If you lose the secret, ClaimSight cannot restore access to an anonymous workspace.</p>

        <h2>Children</h2>
        <p>ClaimSight is not directed to children under 13. Do not use the app to submit personal information about a child.</p>

        <h2>International use and changes</h2>
        <p>Information may be processed in countries where ClaimSight or its service providers operate. We may update this policy as the app changes; the effective date above will be updated when we do.</p>

        <h2>Contact</h2>
        <p>For privacy questions or requests, contact the ClaimSight deployment operator through the support or repository contact information provided with this app.</p>
      </article>
    </main>
  );
}
