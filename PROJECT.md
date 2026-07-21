# ClaimSight 🏠🔥

**Gemini-powered disaster insurance claim agent — turn a walkthrough video into a complete, policy-checked, insurer-ready claim in minutes.**

Built with **Codex + Gemini 2.5 Flash** for OpenAI Build Week 2026.

- **Track:** Apps for Your Life
- **Status:** Working MVP
- **Demo video:** [YouTube link — TODO]
- **Live demo:** [Hosted URL — TODO]

---

## 1. The Problem

After a house fire, flood, or hurricane, insurance policyholders must submit an
**itemized contents inventory**: every lost possession, with description, brand,
quantity, purchase date, and replacement value.

Almost nobody has this ready. The consequences are severe:

- **Underpayment:** Disaster victims routinely recover only a fraction of their
  entitled payout because they can't document what they owned.
- **Weeks of trauma-laden work:** Reconstructing an inventory from memory while
  displaced from your home takes 20–40+ hours.
- **Hidden policy traps:** Sub-limits (e.g., $1,500 cap on jewelry), exclusions,
  and depreciation rules (ACV vs. replacement cost) silently reduce payouts.
- **Expensive alternative:** Public adjusters do this professionally — and charge
  **10–15% of the payout**.

Existing tools don't solve this:

| Existing solution | Why it fails |
|---|---|
| Home inventory apps (Encircle, Sortly, HomeZada) | Require manual, item-by-item entry *before* disaster. Near-zero adoption. |
| Insurer tools (Xactimate, CoreLogic) | Built for adjusters to estimate *structural* damage; serve the insurer, not you. |
| Public adjusters | Effective but cost 10–15% of your claim. |
| Claim-help startups | Track or dispute claims; don't generate the inventory — the actual bottleneck. |

**The gap:** nothing reconstructs a claim *after* the loss, automatically,
on the policyholder's side.

## 2. The Solution

ClaimSight works backwards from whatever evidence you already have:

1. 📹 **Upload** a casual walkthrough video of your home (pre- or post-disaster),
   photos, or even old real-estate listing images.
2. 👁️ **Gemini 2.5 Flash vision** analyzes frames room by room and extracts every visible
   item: category, brand, model (when identifiable), quantity, and condition.
3. 💰 **Pricing agent** researches current replacement cost and applies
   depreciation per item category.
4. 📄 **Policy parser** reads your actual insurance policy PDF and flags
   coverage limits, sub-limits, exclusions, and ACV vs. RCV terms against
   your inventory.
5. ✅ **Export** a claim-ready, insurer-formatted inventory (PDF + CSV) plus a
   **Coverage Gap Report** ("your electronics exceed your $2,500 sub-limit").

### Bonus: Proactive Mode

Record a 3-minute video today; ClaimSight stores a timestamped, priced inventory
so you're claim-ready *before* disaster strikes.

## 3. Unique Selling Points

1. **Post-loss reconstruction, not pre-loss logging** — works when users actually
   need it, from evidence they already have.
2. **Video-to-claim in minutes** — a 3-minute video becomes a 200+ item priced
   inventory, replacing weeks of manual work.
3. **Policy-aware output** — the only tool that cross-references your inventory
   against your real policy terms.
4. **Claimant-side advocacy** — the "free public adjuster": users keep the
   10–15% they'd otherwise pay.
5. **Insurer-ready formatting** — structured exports adjusters accept, reducing
   back-and-forth and denial risk.

## 4. How It Works (Architecture)

```text
┌────────────┐   frames    ┌──────────────────┐   items    ┌─────────────────┐
│ Video/photo │ ──────────▶ │ Gemini 2.5 Flash │ ─────────▶ │ Inventory Store │
│ upload      │  (ffmpeg)   │ item extraction  │            │ (dedup + merge) │
└────────────┘             └──────────────────┘            └───────┬─────────┘
                                                                    │
┌────────────┐             ┌──────────────────┐            ┌───────▼─────────┐
│ Policy PDF  │ ──────────▶ │ Gemini 2.5 Flash │ ─────────▶ │ Claim Engine    │
│ upload      │             │ parser (limits,  │            │ pricing agent + │
└────────────┘             │ exclusions, ACV) │            │ coverage checks │
                           └──────────────────┘            └───────┬─────────┘
                                                                    │
                                                          ┌────────▼────────┐
                                                          │ Exports: claim  │
                                                          │ PDF, CSV, gap   │
                                                          │ report          │
                                                          └─────────────────┘
```

### Pipeline detail

- **Frame extraction:** ffmpeg samples 1 frame/sec; near-duplicate frames removed
  via perceptual hashing.
- **Vision extraction:** Gemini 2.5 Flash processes frames with structured output
  (JSON schema: `item, category, brand, model, quantity, condition, room`).
- **Deduplication:** items merged across frames using embedding similarity +
  room context, so a couch seen from 3 angles counts once.
- **Pricing engine:** curated catalog estimates replacement cost per item,
  applies category depreciation tables, and flags high-value items needing receipts.
- **Policy parser:** Gemini 2.5 Flash extracts coverage type, limits, sub-limits,
  deductible, and exclusions from the uploaded policy PDF into structured data.
- **Claim engine:** joins inventory × policy → payout estimate + gap report.
- **Export:** insurer-standard inventory PDF (room-by-room), CSV, and gap report.

## 5. Tech Stack

- **Frontend:** Next.js 15, Tailwind CSS
- **Backend:** Node.js API routes / Python service for video processing
- **AI:** Google Gemini 2.5 Flash (vision, structured outputs, and guided intake)
- **Video:** ffmpeg for frame extraction
- **PDF:** pdf parsing for policies; react-pdf / pdfkit for claim export
- **Storage:** SQLite/Postgres for inventories; object storage for media

## 6. How Codex + Gemini Were Used

> This section is a judging criterion — kept explicit and honest.

- **Codex** scaffolded the full app, wrote the ffmpeg frame-sampling pipeline,
  designed the deduplication logic, and iterated on the JSON schemas for
  structured vision output. Key decisions where Codex accelerated us:
  - [TODO: e.g., "Codex proposed perceptual hashing over embedding-only dedup,
    cutting vision API costs ~70%"]
  - [TODO: session highlights]
- **Gemini 2.5 Flash** powers runtime vision item extraction, policy parsing,
  and the ClaimSight assistants.
- **/feedback Codex Session ID:** `[TODO]`

## 7. Setup & Running

```bash
git clone <repo-url>
cd claimsight
cp .env.example .env        # configure Supabase and the admin encryption secret
npm install
npm run dev                 # http://localhost:3000
```

**Requirements:** Node 20+, ffmpeg installed and on PATH.

### Judge test path (no rebuild needed)

- **Hosted demo:** [URL — TODO]
- **Sample data:** `/sample-data/` contains a staged 3-minute home walkthrough
  video and a sample homeowner's policy PDF. Upload both to see the full
  pipeline end-to-end in under 2 minutes.

## 8. Roadmap

- [ ] Receipt/email import to enrich purchase dates and prices
- [ ] Proactive mode with encrypted cloud vault
- [ ] Direct submission integrations with major insurers
- [ ] Renter-focused flow (contents-only policies)
- [ ] Multi-language support for disaster-prone regions

## 9. Privacy & Security

- Media processed transiently; users can delete all data at any time.
- Policy documents parsed locally where possible; no data used for training.
- Demo uses fully synthetic sample data.
