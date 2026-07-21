# ClaimSight 🏠🔥

**AI-assisted disaster claim preparation for policyholders.**

ClaimSight turns home evidence—or a guided conversation when no evidence is available—into a reviewable, policy-aware contents claim. It helps a policyholder organize what they owned, understand policy constraints, and create a clear claim packet before filing.

Built for **OpenAI Build Week** · Track: **Apps for Your Life**

> ClaimSight is a documentation and decision-support tool. It is not a lawyer, licensed adjuster, insurer portal, or payment guarantee.

## The problem

After a fire, flood, storm, or theft, a policyholder is asked to rebuild an itemized list of lost belongings while displaced and under stress. They must recall quantities, brands, purchase details, replacement values, and receipts—then discover policy sub-limits, deductible rules, and ACV depreciation after the loss.

ClaimSight makes that process evidence-led, structured, and easier to review.

## How it works

1. **Start with what you have** — upload photos/a walkthrough and a policy PDF, open a synthetic sample, or use the guided no-video intake.
2. **Build the first inventory** — vision identifies visible contents; the AI intake assistant adapts its questions from the conversation and prepares an editable memory-based draft.
3. **Keep uncertainty honest** — unknown brands, models, quantities, and conditions are clearly labeled for review rather than invented.
4. **Price transparently** — a curated catalog calculates replacement-cost and ACV (actual cash value) ranges with visible assumptions.
5. **Check coverage** — direct policy quotes and page references support surfaced limits, exclusions, deductibles, and sub-limits.
6. **Review before filing** — track documents, receipts, correspondence, next steps, and confirmed coverage gaps, then export CSV/PDF reports.

## Features

- Gemini 2.5 Flash vision inventory extraction from photos and browser-sampled walkthrough frames
- Server-side Gemini 2.5 Flash claim guide and conversational, room-by-room no-video intake with an editable agent-built inventory preview
- Editable room-grouped inventory with evidence references and confidence levels
- Transparent replacement-cost and ACV ranges, including high-value proof flags
- Policy parsing with direct quotes and source pages for reported terms
- Coverage-gap report that compares priced categories against confirmed policy sub-limits
- Temporary receipt/document register with cautious possible item matches
- Insurer correspondence classification and user-reviewed reply drafts in English or Spanish
- Human-review-only complaint drafts and consent-recorded expert handoff preparation
- CSV inventory and insurer-style PDF report exports
- Anonymous temporary workspaces, explicit deletion, and 24-hour expiry
- Protected human-review complaint queue at `/admin`

## Quick demo path

1. Start the app and open **Try a sample claim**.
2. Review the synthetic 16-item inventory, cited policy language, and jewelry sub-limit warning.
3. Edit an item and inspect its evidence, replacement range, and ACV assumptions.
4. Use the guided claim journey to mark a step complete.
5. Register a receipt, create a correspondence draft, and inspect the coverage gap report.
6. Download the CSV and PDF, then use **Delete now** to clear the temporary workspace.

## Run locally

### Requirements

- Node.js 20+
- npm
- Supabase plus an admin-managed Gemini API key for live image/video and policy analysis, the ClaimSight guide, and memory-intake chat

```bash
cp .env.example .env.local
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The sample claim and guided intake work without environment variables.

## Environment variables

| Variable | Required | Purpose |
|---|---:|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Hosted persistence | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Hosted persistence | Server-only anonymous-job persistence |
| `CLAIMSIGHT_CONFIG_ENCRYPTION_KEY` | Gemini admin settings | Base64url-encoded 32-byte server secret used to encrypt the stored Gemini API key |
| `CRON_SECRET` | Production | Protects the expiration cleanup route |
| `CLAIMSIGHT_ADMIN_KEY` | Admin | Protects the human-review complaint queue and Gemini key controls |

Run [`supabase/schema.sql`](supabase/schema.sql) in the Supabase SQL editor before enabling hosted storage. Set `CLAIMSIGHT_CONFIG_ENCRYPTION_KEY` and `CLAIMSIGHT_ADMIN_KEY` in the deployment environment, then open `/admin` and save a Gemini API key. The Gemini key is verified before saving, encrypted in Supabase, and never sent back to the browser. Service-role credentials and encryption secrets are never sent to the browser.

## ClaimSight safety principles

- **Accuracy over inflation:** The app does not encourage exaggerated quantities, conditions, or values.
- **Evidence first:** Every visible-evidence inventory item keeps its frame reference.
- **Unknown stays unknown:** Brands, models, and policy terms are not fabricated.
- **Quotes required:** Reported policy findings require a direct quote and page reference.
- **Human review matters:** Receipt matches, reply letters, complaint drafts, and handoffs all require user review.
- **No hidden filing:** ClaimSight does not submit an insurer claim, email an expert, contact a regulator, or guarantee payment.

## Current MVP boundaries

This prototype supports temporary anonymous workspaces and a focused vertical slice of the claim process. The following require dedicated production integrations and are intentionally not simulated as complete:

- Direct insurer submission or portal access
- Regulator complaint dispatch
- Legal deadline calculation or legal advice
- Inbound email connection and permanent raw document storage
- User accounts, long-term storage, expert booking, and live retail price search

For a denied claim, disputed valuation, or possible bad-faith concern, consult a licensed public adjuster or attorney in the relevant jurisdiction.

## Validation

```bash
npx tsc --noEmit
npm run test
npm run build
```

## Project structure

```text
app/          Next.js pages and API routes
components/   Claim workspace, intake assistant, and user interface
lib/          Inventory, pricing, policy, export, and temporary-job logic
supabase/     Hosted persistence schema
tests/        Pricing and guided-intake tests
```

## Privacy

Workspaces are designed to expire after 24 hours and can be deleted immediately by the user. The sample claim uses synthetic data. In a production deployment, configure Supabase and Vercel environment variables before accepting real user data.
