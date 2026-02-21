# CLAUDE.md

## Project Overview

OpenFinance is a self-hosted personal finance and bookkeeping app for freelancers and small businesses. It processes bank statement PDFs with AI, tracks transactions, and provides financial insights via AI agents.

## Tech Stack

- **Framework**: Next.js 15 (App Router) + TypeScript (strict)
- **Database**: Prisma ORM + SQLite (`prisma/data/openfinance.db`)
- **Auth**: BetterAuth (email/password + sessions)
- **Styling**: Tailwind CSS v4 + shadcn/ui
- **Package Manager**: Yarn 4.0.0 (NEVER npm)

## Structure

Single Next.js app (no monorepo):

```
openfinance/
├── prisma/schema.prisma      # Database schema
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
yarn db:push              # Push Prisma schema to DB
yarn db:studio            # Open Prisma Studio
yarn db:generate          # Generate Prisma client
yarn db:migrate           # Run Prisma migrations
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

## Critical Rules

1. **NEVER delete the database** without explicit permission
2. **Use Yarn**, not npm
3. **Tailwind v4 syntax**: `bg-black/10` not `bg-opacity-10`
4. **Path alias**: `@/*` maps to `src/*`
