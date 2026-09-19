# ScopeGrade AI

**Qualify the project. Protect your price.**

ScopeGrade AI turns a client request into a graded scope, a recommended package
and a professional proposal the client can accept from a private link — so an
advanced project never gets quoted at the promotional price.

## What it does

| Area | What you get |
| --- | --- |
| **Assessment** | A three-step intake that scores project complexity and classifies the request as Promotional, Professional or Custom. |
| **Pricing engine** | A recommended price derived from the actual scope: pages, sections, integrations, rush delivery and content readiness. |
| **Clients** | A searchable directory with contact details, notes and the full assessment and proposal history per client. |
| **Proposals** | A printable proposal document generated from the assessment, editable before it is sent, with status tracking from draft to accepted. |
| **Private client links** | A share link that any client can open without an account, then accept with a typed signature or decline with a reason. |
| **Settings** | Your name and business name, printed on every proposal and shown on the client link. |

## Requirements

- Node.js `>=22.13.0`
- A free [Supabase](https://supabase.com) project
- Linux or macOS for development (the `install:ci` helper is Linux-only; `npm install` works anywhere)

## Setup

**1. Install dependencies**

```bash
npm install
```

**2. Create the database**

In the Supabase dashboard open **SQL Editor** and run each file in
`supabase/migrations/` in numerical order. See [`supabase/README.md`](supabase/README.md)
for what each migration adds and how the security model works. Then enable the
email provider under **Authentication → Providers → Email**.

**3. Add your keys**

```bash
cp .env.example .env.local
```

Fill in `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
from **Project Settings → API**. Both keys are browser-safe; the `service_role`
key is never used by this app and must not be added.

**4. Run it**

```bash
npm run dev
```

Open the printed local address, create an account, and grade your first project.

## Project layout

```
app/
  page.tsx                     workspace: assessment, clients, proposals, settings
  auth-gate.tsx                sign-in / sign-up shell around the workspace
  globals.css                  the whole design system, including print styles
  proposal/[token]/            the public, no-login proposal page
lib/
  pricing.ts                   the pricing engine — pure, shared and unit tested
utils/supabase/
  client.ts                    browser Supabase client
  workspace.ts                 every read and write the workspace performs
supabase/migrations/           the database, in order
tests/                         pricing unit tests and rendered-HTML checks
```

### Changing prices or rules

Everything that decides a package or a price lives in `lib/pricing.ts`: the
package constants, the complexity weights and the qualification rules. Edit that
file and `npm run test:unit` will tell you what moved. The pricing screen in the
app reads the same table, so the rules the client sees never drift from the
rules the engine applies.

## Security model

- Every table has row level security, and every policy matches `auth.uid()`
  against the row's `owner_id`. A signed-in user can only reach their own data.
- The public proposal page never touches a table. It calls `security definer`
  functions that return a fixed, safe payload for a link that is still enabled,
  and that record an acceptance only inside the proposal's valid window.
- Share links are random UUIDs. Revoking one disables it immediately, and
  creating a new link issues a new token, so the old URL stops working.

## Commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the development server |
| `npm run build` | Build the deployable artifact |
| `npm run start` | Serve the built application |
| `npm run test:unit` | Run the pricing engine tests (fast, no build) |
| `npm test` | Unit tests, then a build, then the rendered-HTML checks |
| `npm run lint` | ESLint over the whole project |
| `npm run install:ci` | The bounded lockfile install used by CI (Linux) |

## Deployment notes

The app builds to a Cloudflare Worker through
[vinext](https://github.com/cloudflare/vinext); `worker/index.ts` is the entry
point and `.openai/hosting.json` declares optional Sites bindings. Set the two
`NEXT_PUBLIC_SUPABASE_*` variables in your hosting environment before deploying.
`app/chatgpt-auth.ts` ships with the platform template and is unused by the
workspace, which authenticates through Supabase.

## Not included yet

Online deposit payments. A client accepts a proposal in the app today, and the
deposit is collected out of band. The proposal already stores the deposit
percentage and amount, so a Stripe Checkout step would slot in at acceptance
without a schema change.
