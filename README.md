# ClaimSight 🏠🔥

**AI-assisted disaster claim preparation for policyholders.**

ClaimSight turns home evidence — or a guided conversation when no evidence
exists — into a reviewable, policy-aware contents claim. It helps policyholders
organize what they owned, understand their policy's constraints, and assemble a
clear, defensible claim packet before filing.

Built with **Codex** for **OpenAI Build Week 2026** · Track: **Apps for Your Life**

> **Disclaimer:** ClaimSight is a documentation and decision-support tool. It is
> not a lawyer, licensed adjuster, insurer portal, or payment guarantee.

---

## Table of Contents

- [Overview](#overview)
- [The Problem](#the-problem)
- [How It Works](#how-it-works)
- [Features](#features)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Configuration](#configuration)
- [Deployment](#deployment)
- [Demo Path for Judges](#demo-path-for-judges)
- [How Codex Was Used](#how-codex-was-used)
- [Safety Principles](#safety-principles)
- [Privacy & Data Handling](#privacy--data-handling)
- [Testing & Validation](#testing--validation)
- [Project Structure](#project-structure)
- [MVP Boundaries & Roadmap](#mvp-boundaries--roadmap)
- [License](#license)

---

## Overview

After a disaster, insurers require an itemized inventory of lost belongings
before paying a contents claim. Almost no one has this ready. ClaimSight
reconstructs it from evidence the policyholder already has (a walkthrough
video, photos, old listing images) or through a guided, room-by-room
conversation when no evidence survived — then prices it transparently, checks
it against the actual policy wording, and exports an insurer-ready packet.

**Design philosophy:** accuracy over inflation, evidence over guesswork, and
human review at every consequential step.

## The Problem

After a fire, flood, storm, or theft, a policyholder must rebuild an itemized
list of lost belongings — while displaced and under stress. They must recall
quantities, brands, purchase details, and replacement values, then discover
policy sub-limits, deductible rules, and ACV depreciation *after* the loss.

The consequences are well documented:

- **Underpayment:** incomplete inventories mean policyholders recover only a
  fraction of entitled payouts.
- **Weeks of work:** manual reconstruction from memory takes 20–40+ hours.
- **Hidden policy traps:** sub-limits (e.g., jewelry caps), exclusions, and
  ACV depreciation silently reduce settlements.
- **Costly alternatives:** public adjusters charge 10–15% of the payout.

ClaimSight makes this process evidence-led, structured, and reviewable.

## How It Works

```
 Evidence intake                AI processing                 Claim output
┌──────────────────┐    ┌───────────────────────────┐    ┌─────────────────────┐
│ Photos / video    │──▶ │ Vision inventory extraction│──▶ │ Editable inventory   │
│ Guided no-video   │──▶ │ Conversational intake      │    │ (rooms, confidence,  │
│   conversation    │    │                            │    │  evidence refs)      │
│ Policy PDF        │──▶ │ Policy parsing w/ quotes   │──▶ │ Coverage gap report  │
└──────────────────┘    │ Catalog pricing (RCV/ACV)  │    │ CSV + PDF exports    │
                        └───────────────────────────┘    └─────────────────────┘
```

1. **Start with what you have** — upload photos/a walkthrough video and a
   policy PDF, open the synthetic sample claim, or use the guided no-video
   intake.
2. **Build the first inventory** — vision identifies visible contents frame by
   frame; the intake assistant adapts its questions conversationally and
   produces an editable, memory-based draft.
3. **Keep uncertainty honest** — unknown brands, models, quantities, and
   conditions are labeled for review, never invented.
4. **Price transparently** — a curated catalog produces replacement-cost and
   ACV (actual cash value) ranges with visible age/condition assumptions.
5. **Check coverage** — surfaced limits, exclusions, deductibles, and
   sub-limits are backed by direct policy quotes with page references.
6. **Review before filing** — track documents, receipts, correspondence, and
   next steps; confirm coverage gaps; export CSV/PDF reports.

## Features

### Inventory & Evidence
- **Vision inventory extraction** from photos and browser-sampled walkthrough
  frames (Gemini 2.5 Flash), with per-item evidence frame references
- **Conversational no-video intake**: adaptive room-by-room questioning that
  builds an editable inventory draft for users with no surviving evidence
- **Editable room-grouped inventory** with confidence levels (high/medium/low)
  and explicit unknown flags — nothing is fabricated

### Pricing & Coverage
- **Transparent pricing**: curated catalog with replacement-cost and ACV
  ranges, explicit depreciation assumptions, and high-value proof flags
- **Policy parsing with citations**: every reported limit, exclusion,
  deductible, and sub-limit is paired with the policy's exact wording and page
  reference
- **Coverage-gap report**: priced category totals compared against confirmed
  policy sub-limits

### Claim Management
- **Guided claim journey**: stepwise progress from documentation to filing
- **Receipt/document register** with cautious, user-confirmed item matches
- **Insurer correspondence assistant**: classifies incoming letters and drafts
  user-reviewed replies in English or Spanish
- **Human-review complaint drafts** and consent-recorded expert handoff
  preparation
- **Exports**: CSV inventory and insurer-style PDF report

### Privacy & Administration
- **Anonymous temporary workspaces** with explicit deletion and 24-hour expiry
- **Protected human-review console** at `/admin`: complaint queue and
  encrypted AI-key management — review only, with regulator dispatch and email
  sending intentionally disabled

## Architecture

- **Frontend:** Next.js app — claim workspace, intake assistant, admin console
- **API routes:** server-side AI calls (keys never reach the browser),
  workspace lifecycle, exports, admin endpoints
- **AI layer:** Google Gemini 2.5 Flash by default for vision extraction,
  policy parsing, the claim guide, and conversational intake. Administrators
  can optionally activate an OpenAI GPT-5.6 model after securely configuring
  its provider key; deterministic TypeScript handles all pricing math, gap
  comparisons, and exports.
- **Persistence:** Supabase (server-role only) for anonymous-job persistence;
  fully functional locally without it (sample claim + guided intake)
- **Key management:** the AI API key is verified before saving, encrypted at
  rest in Supabase, and never returned to the browser

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js (App Router), TypeScript |
| AI | Gemini 2.5 Flash by default; optional OpenAI GPT-5.6 family |
| Persistence | Supabase (Postgres, service-role server-only) |
| Exports | Server-generated CSV and PDF |
| Testing | Unit tests (pricing, guided intake), `tsc`, production build |
| Hosting | Vercel (or any Node 20+ host) |

## Getting Started

### Prerequisites

- Node.js 20+
- npm
- *(Optional, for live AI)* Supabase project + a Gemini API key managed via
  the admin console. OpenAI is optional and can be configured later.

### Local setup

```bash
git clone https://github.com/MohdAltamish/ClaimSight.git
cd ClaimSight
cp .env.example .env.local
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

> **No keys? No problem.** The sample claim and guided intake work fully
> without any environment variables — the complete flow is demoable offline.

## Configuration

| Variable | Required for | Purpose |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Hosted persistence | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Hosted persistence | Server-only anonymous-job persistence |
| `CLAIMSIGHT_CONFIG_ENCRYPTION_KEY` | AI admin settings | Base64url-encoded 32-byte server secret encrypting stored provider keys and runtime selection |
| `CRON_SECRET` | Production | Protects the workspace-expiry cleanup route |
| `CLAIMSIGHT_ADMIN_KEY` | Admin console | Protects the human-review queue and AI key controls |

**Setup order for hosted persistence:**

1. Run [`supabase/schema.sql`](supabase/schema.sql) in the Supabase SQL editor.
2. Set `CLAIMSIGHT_CONFIG_ENCRYPTION_KEY` and `CLAIMSIGHT_ADMIN_KEY` in the
   deployment environment.
3. Open `/admin`, save the Gemini API key, and activate `gemini-2.5-flash`.
   It is verified before saving, encrypted in Supabase, and never sent back to
   the browser. You can later add an OpenAI key and select an allowed GPT-5.6
   model without changing deployment variables.

Service-role credentials and encryption secrets are never exposed to the client.

## Deployment

Deploy to Vercel (recommended) or any Node 20+ host:

1. Connect the repository and set the environment variables above.
2. Configure the cron/cleanup route with `CRON_SECRET` for 24-hour workspace
   expiry.
3. Verify `/admin` access with `CLAIMSIGHT_ADMIN_KEY` and save the AI key.

### Production readiness checklist

- [x] GitHub repository connected to Vercel
- [ ] Run [`supabase/schema.sql`](supabase/schema.sql) against the production
  Supabase project.
- [ ] Add the Supabase URL, server-only service-role key, encryption key,
  admin key, and cron secret to Vercel for Production and Preview.
- [ ] Deploy, sign in at `/admin`, and confirm the protected status reads
  **“Supabase: connected and schema ready.”**
- [ ] Save and activate the Gemini key in `/admin`; live analysis remains in
  demo mode until a provider key is configured.

## Demo Path for Judges

No setup or keys required for steps 1–6:

1. Start the app and open **Try a sample claim**.
2. Review the synthetic 16-item inventory, cited policy language, and the
   jewelry sub-limit warning in the coverage-gap report.
3. Edit an item; inspect its evidence reference, replacement range, and ACV
   assumptions.
4. Advance a step in the guided claim journey.
5. Register a receipt, create a correspondence draft, and open the gap report.
6. Download the CSV and PDF exports, then use **Delete now** to clear the
   temporary workspace.
7. *(With admin key)* open `/admin` to see the human-review complaint queue.

- **Hosted demo:** [https://claimsight-delta.vercel.app](https://claimsight-delta.vercel.app)
- **Demo video:** `[YouTube link — TODO]`

## How Codex Was Used

ClaimSight was built end-to-end with **Codex (powered by GPT-5.6)** acting as
our primary engineering agent, directed through a detailed project prompt.
Add the final `PROMPT.md` spec before submission if you want to reference that
file directly here.

### Where Codex accelerated the build

- **Scaffolding & architecture:** Codex scaffolded the Next.js App Router
  workspace, the server-side AI routes, and the Supabase persistence layer
  with encrypted key storage.
- **The single-schema decision:** Codex proposed converging all intake methods
  (vision, conversational, and manual edits) on one inventory schema — the
  single most important architectural decision in the project. Pricing, gap
  analysis, and exports work unchanged across every intake mode.
- **Deterministic engines:** Codex implemented the pricing engine (catalog
  matching and ACV depreciation), the coverage-gap comparisons, and the
  CSV/PDF exporters as pure, unit-tested TypeScript.
- **Fallback design:** Codex built the zero-key demo path (a synthetic sample
  claim) so the full experience runs without any API configuration.

### Key decisions made with Codex

- Keeping **unknown** as a first-class value in vision extraction (anti-fraud)
- Requiring direct quotes and page references for every policy finding
- A human-review-only complaint queue with dispatch intentionally disabled
- Anonymous 24-hour workspaces instead of user accounts

### GPT-5.6 at runtime

Google Gemini 2.5 Flash is the default live provider for vision inventory
extraction, policy parsing, Claim Guide, and conversational intake. An
administrator can optionally activate **GPT-5.6**, **GPT-5.6 Terra**, or
**GPT-5.6 Luna** in the protected admin panel; the selected OpenAI model then
powers those same four structured-output workflows. Gemini remains available
and requires no OpenAI key.

### Codex session

- **/feedback session ID:** `<PASTE-YOUR-SESSION-ID>`

## Safety Principles

- **Accuracy over inflation:** the app never encourages exaggerated
  quantities, conditions, or values.
- **Evidence first:** every visible-evidence inventory item keeps its frame
  reference.
- **Unknown stays unknown:** brands, models, and policy terms are never
  fabricated.
- **Quotes required:** reported policy findings require a direct quote and
  page reference.
- **Human review everywhere it matters:** receipt matches, reply letters,
  complaint drafts, and expert handoffs all require explicit user review;
  complaints additionally pass a protected human-review queue.
- **No hidden filing:** ClaimSight never submits a claim, emails an expert,
  contacts a regulator, or guarantees payment.

## Privacy & Data Handling

- Workspaces are **anonymous and temporary**: designed to expire after 24
  hours, deletable immediately by the user.
- The sample claim uses fully **synthetic data**.
- AI keys are encrypted at rest; service-role credentials and secrets never
  reach the browser.
- In production, configure Supabase and hosting environment variables before
  accepting real user data.

## Testing & Validation

```bash
npx tsc --noEmit    # type safety
npm run test        # pricing + guided-intake unit tests
npm run build       # production build
```

## Project Structure

```text
app/          Next.js pages and API routes
components/   Claim workspace, intake assistant, and UI
lib/          Inventory, pricing, policy, export, and temporary-job logic
supabase/     Hosted persistence schema
tests/        Pricing and guided-intake tests
```

## MVP Boundaries & Roadmap

This prototype delivers a focused vertical slice with temporary anonymous
workspaces. The following intentionally require dedicated production
integrations and are **not simulated as complete**:

- Direct insurer submission or portal access
- Regulator complaint dispatch
- Legal deadline calculation or legal advice
- Inbound email connection and permanent raw document storage
- User accounts, long-term storage, expert booking, and live retail pricing

**Roadmap:** insurer portal (structured claim delivery to registered
insurers), receipt/email import, live retail pricing, expert booking,
multi-language expansion.

> For a denied claim, disputed valuation, or possible bad-faith concern,
> consult a licensed public adjuster or attorney in the relevant jurisdiction.

## License

MIT — see [LICENSE](LICENSE).
