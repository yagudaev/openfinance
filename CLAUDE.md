# CLAUDE.md

## Project Overview

OpenFinance is a self-hosted personal finance and bookkeeping app for freelancers and small businesses. It processes bank statement PDFs with AI, tracks transactions, and provides financial insights via AI agents.

## Tech Stack

- **Framework**: Next.js 16 (App Router, Turbopack) + TypeScript (strict)
- **Database**: Prisma 7 ORM + SQLite via `@prisma/adapter-better-sqlite3` driver adapter
- **Auth**: BetterAuth (email/password + Google OAuth)
- **Styling**: Tailwind CSS v4 + shadcn/ui
- **Package Manager**: Yarn 4.0.0 (NEVER npm)

## Structure

Single Next.js app (no monorepo):

```
openfinance/
├── prisma/
│   ├── schema.prisma         # Database schema
│   └── migrations/           # Migration history
├── src/
│   ├── app/                  # Next.js App Router
│   │   ├── api/              # API routes
│   │   ├── auth/             # Auth pages
│   │   └── (private)/        # Protected routes
│   ├── components/           # React components
│   │   └── ui/               # shadcn/ui base components
│   ├── lib/                  # Utilities, DB client, services
│   ├── hooks/                # Custom React hooks
│   └── types/                # TypeScript types
├── public/
└── server-setup/             # Server provisioning scripts
```

## Commands

```bash
yarn dev                  # Run dev server (turbopack)
yarn build                # Production build
yarn lint                 # Lint
yarn db:migrate           # Create & apply migrations (dev)
yarn db:migrate:deploy    # Apply pending migrations (prod)
yarn db:push              # Push schema directly (no migration history)
yarn db:studio            # Open Prisma Studio
yarn db:generate          # Generate Prisma client
```

## Code Style

- No semicolons, single quotes, 2-space indent, trailing commas
- Named function declarations for components (not arrow functions)
- Named functions for event handlers inside components
- `interface` for object shapes, `type` for unions/aliases
- Clean Code: meaningful names over comments
- Import order: builtin → external → internal → relative (with blank lines between groups)
- Top-to-bottom reading order: exports first, helpers below
- See `docs/CODE_STYLE.md` for full details

## Ticket Workflow

When working through Linear tickets:

1. Check Linear for OpenFinance backlog tickets
2. Create a git worktree per ticket: `git worktree add ../openfinance-nan-XXX -b michael/nan-XXX-slug`
3. In the worktree, run `yarn install --immutable && yarn db:generate` before any work
4. After changes, verify with `npx tsc --noEmit`
5. Rebase on latest main, commit, push, create PR via `gh pr create`. For UI changes, include a screenshot or screen recording in the PR description showing the feature working. Use Playwright or the dev server to capture visuals.
6. Wait for CI (Lint, Typecheck & Build + E2E Tests must pass; Mintlify failure is external — ignore)
7. Enqueue PR in merge queue: `gh pr merge N --squash --delete-branch --auto`
8. Clean up: `git worktree remove ../openfinance-nan-XXX --force`
9. Update Linear ticket to "Done"

**Before starting work on a ticket, move it to "In Progress" immediately.** This prevents other agents from picking the same ticket.

**A ticket is NOT done until it is merged to main AND tested on main.** Opening a PR is not done. Passing CI is not done. Merged but untested is not done. After merging, pull main, run `yarn dev`, and verify the feature/fix works as expected. Only then mark the ticket "Done".

Multiple tickets can run in parallel using separate worktrees. When branches touch the same file, merge the first PR then rebase the second.

### Merge Rules

- **NEVER merge PRs directly** — all PRs go through the merge queue via `--auto`
- **NEVER use `gh pr merge` without `--auto`** — direct merges bypass the merge queue and can break main
- The merge queue runs CI checks against the PR rebased on the latest main, ensuring no broken code lands
- If CI fails in the merge queue, the PR is automatically dequeued — fix the issue, push again, and re-enqueue
- Use `gh pr merge N --squash --delete-branch --auto` to enqueue (this is the ONLY approved merge command)

## Critical Rules

1. **NEVER delete the database** without explicit permission
2. **Use Yarn**, not npm
3. **Tailwind v4 syntax**: `bg-black/10` not `bg-opacity-10`
4. **Path alias**: `@/*` maps to `src/*`
5. **NEVER commit real financial data** — This app processes bank statements and financial documents. Before staging ANY file, verify it does not contain real personal/financial data (account numbers, addresses, transaction details, balances). Use synthetic/dummy test data for tests. PDFs, CSVs, and database files are especially high-risk. When in doubt, ask the user before committing.

## Before Starting Any Ticket
1. Spawn a research sub-agent to map the existing codebase related to the task
   - Find ALL existing routes, components, and services that touch the feature area
   - Identify duplicate or legacy code that does similar things
   - List existing patterns and conventions to follow
2. Write a brief implementation plan before coding
3. Default: refactor/extend existing code. NEVER create new files that duplicate existing functionality
4. If your change replaces legacy code, DELETE the old code. No dead code.
5. This is a production app — no experiments unless explicitly told otherwise

## Definition of Done (every ticket)
A ticket is NOT done until ALL of these pass:
- [ ] `yarn build` succeeds
- [ ] No duplicate routes/components created — old ones removed
- [ ] Integration test exists for the happy path (upload file → verify DB has data)
- [ ] For upload/processing features: upload a real PDF → verify transactions exist in DB
- [ ] For UI features: manually verify the page works
- [ ] For bugs: reproduce → fix → verify fix

## Evaluator Step (before marking any ticket Done)
Spawn a separate evaluator sub-agent. Give it the ticket description and the files you changed. Ask it:
- Does this implementation fully satisfy the ticket requirements?
- Are there any duplicate routes, components, or files that should be consolidated?
- Does the test actually verify the feature works end-to-end?
Only mark the ticket Done if the evaluator approves.
