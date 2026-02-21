# Architecture Decisions

## 2026-02-20 Flatten Monorepo to Single App
**Context:** Current repo has apps/web and apps/marketing workspaces — over-engineered for a hackathon
**Decision:** Delete apps/, move web app to root, single Next.js app
**Alternatives:** Keep monorepo structure
**Rationale:** Lower cognitive load, simpler deployment, faster iteration. Marketing site can be a page within the main app later.

## 2026-02-20 SQLite + Prisma over Supabase
**Context:** keeping-books uses Supabase (hosted PostgreSQL + Auth + Storage). OpenFinance needs to be self-hosted.
**Decision:** Prisma ORM with SQLite for dev/self-hosting simplicity
**Alternatives:** PostgreSQL (supported but optional), Supabase (external dependency)
**Rationale:** SQLite = single file backup, zero config, perfect for self-hosting. Prisma abstracts the DB so PostgreSQL is a config change.

## 2026-02-20 Port from keeping-books, don't reinvent
**Context:** keeping-books is a working production app with PDF processing, AI categorization, transactions, dashboard
**Decision:** Port all business logic and UI patterns directly, adapting only the data layer (Supabase → Prisma)
**Alternatives:** Build from scratch using spec
**Rationale:** Working code > spec. The patterns are proven.
