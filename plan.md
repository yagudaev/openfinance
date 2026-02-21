# OpenFinance — Weekend Hackathon Plan

Read this carefully and execute all tasks until completed. Michael is going to bed. Work autonomously overnight.

## The Project

OpenFinance is the open-source evolution of keeping-books (a private working app built on Next.js + Supabase). We're re-platforming it as a self-hosted app with SQLite + Prisma. The goal this weekend is to ship a working v0.1 deployed at openfinance.to.

## Reference Material

- **keeping-books repo** — located at ~/code/keeping-books. This is the WORKING predecessor. It has PDF parsing, AI categorization, transaction management, statement verification, cashflow charts, settings — everything. **Port from this, don't invent.**
- **specs/openfinance-spec.md** — full product spec in this repo
- **specs/openfinance-code-style.md** — Michael's code style (READ THIS CAREFULLY)
- **specs/openfinance-brand-identity.md** — brand guidelines

## Architecture Decisions (NON-NEGOTIABLE)

### Flatten the structure
The current monorepo with packages/* is over-engineered. **Delete it all.** Single Next.js app, Rails-style:

```
openfinance/
├── prisma/
│   └── schema.prisma
├── src/
│   ├── app/              # Next.js App Router
│   │   ├── api/          # API routes
│   │   ├── auth/         # Auth pages
│   │   └── (private)/    # Protected routes (dashboard, transactions, etc.)
│   ├── components/       # React components
│   │   ├── ui/           # shadcn/ui base components
│   │   └── ...           # Feature components
│   ├── lib/              # Utilities, DB client, helpers
│   │   ├── db.ts         # Prisma client
│   │   ├── auth.ts       # Auth helpers
│   │   └── services/     # Business logic (statement processor, categorizer, etc.)
│   ├── hooks/            # Custom React hooks
│   └── types/            # TypeScript types
├── public/
├── server-setup/         # Server provisioning scripts
├── .env                  # Secrets (gitignored)
├── .env.example          # Template
├── PROGRESS.md           # Your running progress log
├── DECISIONS.md          # Architecture decisions log
├── PLAN.md               # Your execution plan
├── package.json          # Single package, no workspaces
└── docker-compose.yml    # Optional for self-hosters
```

**No packages/, no apps/, no workspaces.** One app. Low cognitive load.

### Database: SQLite + Prisma
- Prisma schema lives at `prisma/schema.prisma` in the app root
- SQLite for self-hosting simplicity (single file backup)
- The keeping-books Supabase schema maps closely — port it

### Auth: BetterAuth
Research BetterAuth (https://www.better-auth.com/). If it works well with Next.js 16 + Prisma + SQLite, use it. Requirements:
- Email/password signup + login
- Session management
- Password reset
- No third-party providers needed for v0.1 (but nice to have Google OAuth)
- Must be self-contained — no external auth services

If BetterAuth doesn't work out, document why in DECISIONS.md and roll simple auth: bcrypt + JWT + httpOnly cookies + middleware.

### Tech Stack
- Next.js 16 (App Router)
- React 19
- Prisma + SQLite
- Tailwind CSS 4
- shadcn/ui components
- Yarn (NEVER npm)

## Code Style (CRITICAL — read specs/openfinance-code-style.md)

Summary of key rules:
- **No semicolons**
- **Single quotes**
- **2-space indentation**
- **Trailing commas**
- `function foo()` for module-level functions and components
- Arrow functions only for callbacks/handlers inside components
- `interface` for object shapes, `type` for unions
- Clean Code philosophy — meaningful names over comments
- Top-to-bottom reading order: exports first, helpers below
- `@/` import alias for src/

Look at the keeping-books codebase and AudiowaveAI (if available on this machine, check ~/repos/audiowaveai) for real examples of Michael's style. **Match the existing patterns.**

## Server Setup

The production server is at the IP in your .env file (`DEPLOY_HOST`). It's a fresh Ubuntu Hetzner box with only root SSH access and DNS pointed (openfinance.to).

Create a `./ssh` script in the repo root:
```bash
#!/bin/bash
source .env
ssh root@$DEPLOY_HOST "$@"
```

Put all server setup in `server-setup/` as reproducible scripts:

### server-setup/01-base.sh
- apt update && upgrade
- Install essential packages (curl, git, build-essential, etc.)
- Set up 2GB swap
- Set timezone to UTC

### server-setup/02-tailscale.sh
- Install Tailscale: `curl -fsSL https://tailscale.com/install.sh | sh && tailscale up`
- **IMPORTANT:** This will print an auth URL. Print it VERY CLEARLY in your output so Michael can approve it in the morning. Also save it to PROGRESS.md.

### server-setup/03-coolify.sh
- Install Coolify: `curl -fsSL https://cdn.coollabs.io/coolify/install.sh | bash`
- Coolify dashboard will be at http://<DEPLOY_HOST>:8000

### server-setup/04-firewall-notes.md
- Document the Hetzner firewall rules to apply manually:
  - Allow TCP 22 from 100.64.0.0/10 (Tailscale)
  - Allow TCP 80, 443 from 0.0.0.0/0
  - Deny all else

SSH into the server and run these scripts. Document everything in PROGRESS.md.

## Feature Porting Priority (from keeping-books)

### Phase 1 — Foundation (do this first)
1. Flatten repo structure
2. Set up Prisma schema (port from keeping-books Supabase migrations)
3. Auth (BetterAuth or custom)
4. Basic layout + navbar + theme

### Phase 2 — Core Features
5. Dashboard with real stats (port cashflow chart, summary cards)
6. Bank statement upload + AI processing (port statement-processor.ts, pdf-text-finder.ts)
7. Transaction list with filters (port transaction-table, filters components)
8. Statement verification view (port statement-sidebar, verification-layout)

### Phase 3 — AI Chat
9. AI financial advisor chat using VoltAgent (@voltagent/core)
   - Chat UI: simple conversational interface in the app (sidebar or dedicated page)
   - VoltAgent agent with tools that query the Prisma DB (transactions, accounts, summaries)
   - Tools: queryTransactions, getAccountSummary, getCashFlow, getCategoryBreakdown
   - Use OpenAI as default provider, make it configurable
   - The agent should be able to answer questions like "how much did I spend last month?" or "what's my biggest expense category?"
   - Use the AI SDK (Vercel) for streaming chat UI + VoltAgent for the agent logic
   - Keep it simple: one agent, a few tools, streaming responses

### Phase 4 — Polish
10. Settings page (accounts, fiscal year, timezone)
11. Mobile responsive
12. Deploy to Coolify with SSL

## Tracking

### PROGRESS.md
Update this file as you complete each step. Format:
```markdown
# OpenFinance Build Progress

## Completed
- [x] Task — timestamp — notes

## In Progress
- [ ] Task — what's happening

## Blocked
- [ ] Task — why it's blocked

## Next Up
- [ ] Task
```

### DECISIONS.md
Log every significant decision:
```markdown
# Architecture Decisions

## [Date] Decision Title
**Context:** Why this came up
**Decision:** What we chose
**Alternatives:** What we considered
**Rationale:** Why this option
```

### PLAN.md
Write your full execution plan BEFORE writing any code. Include time estimates.

### Linear
Use the Linear MCP to create and track tasks in the OpenFinance project. Create issues for each phase/task, move them as you progress.

### Git
- Commit after every meaningful change
- Clear commit messages: "feat: add transaction list with filters" not "update code"
- Work on main branch (it's a hackathon, no need for feature branches tonight)

## Testing (MANDATORY after each phase)

You have Playwright MCP and full access to this machine. Use them.

### After every feature:
1. `yarn build` — must pass with zero errors
2. `yarn dev` — start the dev server
3. **Use Playwright MCP to actually open the app in a browser and verify:**
   - Pages render correctly
   - Navigation works
   - Forms submit properly
   - Data displays as expected
4. Take screenshots of working features and save to `docs/screenshots/`

### Phase-specific tests:

**Phase 1 (Foundation):**
- Verify app starts with `yarn dev`
- Playwright: visit /, /auth/login, /auth/sign-up — all render
- Sign up a test user, log in, verify redirect to dashboard
- Verify Prisma DB file gets created with tables

**Phase 2 (Core Features):**
- Playwright: log in → dashboard shows stats cards and chart
- Upload a sample bank statement PDF → verify it processes and transactions appear
- Navigate to transactions page → verify filters work (click each filter type)
- Navigate to statements page → verify statement list and detail view
- Test with a real PDF from keeping-books test fixtures if available

**Phase 3 (AI Chat):**
- Playwright: open chat interface → send "What are my top expense categories?" → verify streaming response
- Verify the agent can query actual transaction data from the DB

**Phase 4 (Deploy):**
- SSH into server, verify Coolify is running
- Push to repo → verify Coolify auto-builds
- Playwright: visit https://openfinance.to → verify SSL + app loads
- Test full flow on production: sign up → log in → upload statement → view transactions → chat

### If a test fails:
Fix it before moving on. Don't accumulate broken features.

## Anti-Slop Rules

1. **Port, don't generate.** The keeping-books code IS the implementation. Adapt Supabase calls to Prisma, but keep the same component structure, same UX patterns, same business logic.
2. **Don't over-abstract.** No factory patterns, no dependency injection, no "service registries." Direct function calls.
3. **Don't add features not in keeping-books.** We're porting, not inventing.
4. **If you're writing more than 200 lines of new logic that doesn't exist in keeping-books, stop and reconsider.**
5. **Test with Playwright after every phase.** Don't just build — verify visually.
6. **Match Michael's style exactly.** Read the code style spec and the keeping-books source. If in doubt, copy the pattern from keeping-books.

## .env Setup

Create `.env` from `.env.example`:
```
DATABASE_URL="file:./dev.db"
DEPLOY_HOST=5.78.176.218
OPENAI_API_KEY=  # Needed for AI categorization - check if there's one in keeping-books .env
```

## Start

1. Write PLAN.md
2. Create Linear issues
3. Restructure the repo
4. Set up the server
5. Build features
6. Deploy

Go.
