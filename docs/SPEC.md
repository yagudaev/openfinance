# OpenFinance - Product Specification

> The next-generation personal finance and bookkeeping platform, evolved from keeping-books.

**Version:** 1.1
**Date:** February 21, 2026
**Status:** Implemented (v0.1 shipped)

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Product Vision & Goals](#2-product-vision--goals)
3. [Target Users](#3-target-users)
4. [Core Features](#4-core-features)
5. [AI Features](#5-ai-features)
6. [Technical Architecture](#6-technical-architecture)
7. [Data Models](#7-data-models)
8. [API Routes Structure](#8-api-routes-structure)
9. [Deployment Model](#9-deployment-model)
10. [Migration from keeping-books](#10-migration-from-keeping-books)
11. [UI/UX Patterns](#11-uiux-patterns)
12. [Future Roadmap](#12-future-roadmap)

---

## 1. Executive Summary

**OpenFinance** is a self-hosted personal finance and bookkeeping application designed for freelancers, small business owners, and individuals who want complete control over their financial data. It builds upon the lessons learned from **keeping-books** while introducing a new tech stack optimized for self-hosting, privacy, and AI-powered financial intelligence.

### Key Differentiators

- **Self-hosted first**: Single-file SQLite database for easy backup and migration
- **AI-native**: Built-in financial advisor chat with tool use via OpenRouter + Vercel AI SDK
- **Privacy-focused**: Your data stays on your server
- **Open source**: Transparent, community-driven development

---

## 2. Product Vision & Goals

### Vision

*Empower individuals and small businesses to understand, manage, and optimize their finances with the help of AI — all while maintaining complete ownership and privacy of their financial data.*

### Goals

1. **Simplify Financial Management**
   - Automatic bank statement parsing with AI
   - Smart transaction categorization
   - Balance verification to catch discrepancies

2. **Provide Actionable Insights**
   - AI-powered financial advisor for personalized recommendations
   - Market tracking for investment awareness
   - Cash flow projections and trend analysis

3. **Enable Self-Hosting**
   - Single-binary deployment
   - SQLite as default (PostgreSQL for managed option)
   - Docker-first deployment strategy

4. **Maintain Data Sovereignty**
   - All data stored locally
   - No third-party data sharing
   - Export everything at any time

### Non-Goals (v1)

- Real-time bank account syncing (Plaid/Finicity integration)
- Multi-user/team collaboration
- Invoicing and billing
- Tax filing integration

---

## 3. Target Users

### Primary Personas

#### 1. **The Freelancer / Solopreneur**
- Manages 2-5 bank accounts (personal + business)
- Needs to track income, expenses, and owner pay
- Wants to understand monthly cash flow
- Files own taxes, needs categorized transactions

#### 2. **The Privacy-Conscious Individual**
- Doesn't trust cloud financial apps (Mint, YNAB)
- Wants complete control over financial data
- Comfortable self-hosting on a VPS
- Values open-source software

#### 3. **The Small Business Owner**
- Has dedicated business bank accounts
- Needs to separate personal from business expenses
- Requires quarterly/annual financial reports
- May have multiple currencies (CAD/USD)

### User Requirements

| Requirement | Priority |
|-------------|----------|
| Upload bank statement PDFs | P0 |
| Automatic transaction extraction | P0 |
| Transaction categorization | P0 |
| Balance verification | P0 |
| Multi-account support | P0 |
| Dashboard with cash flow | P1 |
| AI financial advisor | P1 |
| Market tracking | P2 |
| Multi-currency support | P1 |
| Fiscal year configuration | P1 |
| Export to CSV | P1 |
| Mobile-responsive UI | P2 |

---

## 4. Core Features

### 4.1 Bank Statement Processing

**From keeping-books ✓** - Enhanced

The core workflow that powers OpenFinance:

1. **PDF Upload**: User uploads bank statement PDF
2. **Image Extraction**: Convert PDF pages to high-resolution images
3. **Text Extraction**: Extract text from PDF for accuracy
4. **AI Processing**: Send images + text to LLM for structured data extraction
5. **Iterative Verification**: Retry up to 15 times if balance doesn't match
6. **Storage**: Save statement metadata and transactions

**Improvements over keeping-books:**
- Configurable AI model via OpenRouter (any provider)
- Background job processing with progress tracking via ProcessingJob/ProcessingLog
- Support for more bank formats

### 4.2 Transaction Management

**From keeping-books ✓** - Enhanced

Features:
- **View transactions** across all accounts or filtered
- **Sort** by date, description, amount, balance, category
- **Search** by description or amount
- **Filter** by:
  - Date range (today, 7d, 30d, 90d, custom, all time)
  - Account(s)
  - Statement(s)
  - Category (expense, income, owner-pay, internal-transfer, shareholder-loan, uncategorized)
  - Transaction type (credit/debit)
- **Bulk actions**: Delete, categorize, export
- **Edit transactions**: Change category, description
- **Add manual transactions**: For cash or missed items
- **Find on statement**: Jump to PDF location of a transaction

### 4.3 Statement Verification

**From keeping-books ✓** - Retained

The "source of truth" feature:

- Side-by-side PDF viewer with transaction list
- Click-to-highlight: Match PDF text to transaction fields
- Balance verification status (balanced/unbalanced)
- Human verification flag for audit trail
- Discrepancy tracking with notes

### 4.4 Dashboard & Analytics

**From keeping-books ✓** - Enhanced

Key metrics displayed:
- **Monthly Income** (current vs. previous month with % change)
- **Monthly Expenses** (current vs. previous month with % change)
- **Cash Flow Chart** (12-month bar chart, positive/negative)
- Multi-currency support (USD converted to CAD)

**Future enhancements:**
- **Net Worth Tracking** (when connected to asset accounts)
- **Category Breakdown** (pie chart of expenses)
- **Savings Rate** calculation

### 4.5 Account Management

**From keeping-books ✓** - Enhanced

- **Account nicknames**: "Chase Checking" instead of "****1234"
- **Currency assignment**: CAD or USD per account
- **Bank name tracking**: Auto-detected from statements

**Current in OpenFinance:**
- **Account types**: Chequing, Savings, Credit Card, other
- **Ownership type**: Personal or Business

### 4.6 Settings

**From keeping-books ✓** - Retained

- **Timezone configuration**:
  - Bank timezone (for statement dates)
  - User timezone (for display)
- **Fiscal year configuration**:
  - End month and day (default: Dec 31)
  - Affects fiscal year filters in transactions

**Current in OpenFinance:**
- **AI model selection**: Configurable via OpenRouter (e.g., Cerebras, GPT-4o-mini)
- **AI context**: Free-text context for personalized AI responses

---

## 5. AI Features

### 5.1 Transaction Categorization (Existing)

**From keeping-books ✓** - Enhanced with configurable AI models

Current implementation uses AI (via OpenRouter) for batch categorization:

```
Categories:
- expense: Business expenses (supplies, services, rent, utilities)
- owner-pay: Withdrawals/payments to business owner (dividends)
- income: Revenue, sales, customer payments
- internal-transfer: Transfers between accounts (e-transfer, interac)
- shareholder-loan: Owner lending money to company
```

**Future enhancements:**
- Learn from user corrections (feedback loop)
- Subcategory suggestions
- Rule-based auto-categorization (before hitting AI)

### 5.2 AI Financial Chat (Implemented)

**Vercel AI SDK with OpenRouter and tool use**

A chat-based financial advisor built with the Vercel AI SDK (`ai` package) and OpenRouter for model access. The default model is Cerebras Llama 4 Scout for fast responses. Users can change the model in Settings.

The AI chat can:

1. **Answer questions about your finances**
   - "How much did I spend on software subscriptions last quarter?"
   - "What's my average monthly income this year?"
   - "Which category has grown the most?"

2. **Query data in real-time via tools**
   - `search_transactions` -- search and filter transactions by description, date, category, type
   - `get_account_summary` -- summary of all bank accounts with latest balances
   - `get_cashflow` -- income vs. expenses for any date range
   - `get_category_breakdown` -- spending by category for any period
   - `get_settings` -- read current user settings
   - `update_settings` -- modify user settings via chat

3. **Custom context**
   - Users can provide free-text context about their financial situation in Settings
   - This context is included in every conversation for personalized responses

**Implementation:**
- Vercel AI SDK (`ai` + `@ai-sdk/react`) for streaming chat UI
- OpenRouter provider (`@openrouter/ai-sdk-provider`) for model access
- Custom tools defined in `src/lib/chat/tools.ts` that query Prisma directly
- Chat threads and messages persisted in `ChatThread` and `ChatMessage` models
- Each conversation turn allows up to 5 tool calls

### 5.3 Statement Processing AI (Implemented)

**From keeping-books ✓** - using OpenRouter

The statement processor sends PDF pages as images + extracted text to the AI model for structured data extraction with iterative balance verification (up to 15 retries).

**Current implementation:**
- Uses OpenRouter for AI model access (configurable model)
- `pdf-parse` for text extraction from PDF
- Iterative verification: retries extraction if balance doesn't match
- Processing tracked via `ProcessingJob` and `ProcessingLog` models

### 5.4 Market Tracking (Future)

Market tracking and investment features are planned for a future release.

---

## 6. Technical Architecture

### 6.1 Tech Stack

| Component | keeping-books | OpenFinance |
|-----------|---------------|-------------|
| Framework | Next.js 16 + App Router | Next.js 16 + App Router (Turbopack) |
| Language | TypeScript | TypeScript (strict) |
| Database | Supabase (PostgreSQL) | Prisma 7 + SQLite via `@prisma/adapter-better-sqlite3` |
| Auth | Supabase Auth | BetterAuth (email/password + Google OAuth) |
| ORM | Supabase Client | Prisma 7 |
| Storage | Supabase Storage | Local filesystem |
| AI | OpenAI SDK | OpenRouter + Vercel AI SDK with tool use |
| Styling | Tailwind CSS + shadcn/ui | Tailwind CSS v4 + shadcn/ui |
| PDF | react-pdf + pdfjs-dist | pdf-parse |
| Charts | Recharts | Recharts |
| Hosting | Vercel + Supabase Cloud | Docker on Coolify (Hetzner Cloud) |
| Testing | - | Playwright E2E |
| CI | - | GitHub Actions (lint, typecheck, Playwright) |
| Package Manager | - | Yarn 4.0.0 |

### 6.2 System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        OpenFinance                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐         │
│  │   Next.js   │    │ Vercel AI   │    │   Prisma 7  │         │
│  │   Frontend  │◄──►│  SDK + Tool │◄──►│     ORM     │         │
│  │  (React 19) │    │    Use      │    │             │         │
│  └─────────────┘    └─────────────┘    └──────┬──────┘         │
│         │                  │                   │                │
│         │                  │                   ▼                │
│         │                  │           ┌─────────────┐         │
│         │                  │           │   SQLite    │         │
│         │                  │           │ (single DB) │         │
│         │                  │           └─────────────┘         │
│         │                  │                                    │
│         │                  ▼                                    │
│         │           ┌─────────────┐                             │
│         │           │ OpenRouter  │                             │
│         │           │ (Cerebras,  │                             │
│         │           │  GPT, etc.) │                             │
│         │           └─────────────┘                             │
│         │                                                        │
│         ▼                                                        │
│  ┌─────────────┐    ┌─────────────┐                             │
│  │ BetterAuth  │    │   File      │                             │
│  │  (sessions  │    │   Storage   │                             │
│  │ + OAuth)    │    │   (local)   │                             │
│  └─────────────┘    └─────────────┘                             │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 6.3 AI Chat Implementation

The AI chat uses the Vercel AI SDK with OpenRouter for model access:

```typescript
// Example: AI chat tools (simplified from src/lib/chat/tools.ts)
import { tool } from 'ai'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'

export function createChatTools(userId: string) {
  return {
    search_transactions: tool({
      description: 'Search and filter transactions',
      inputSchema: z.object({
        query: z.string().optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        category: z.string().optional(),
        limit: z.coerce.number().optional().default(20),
      }),
      execute: async (params) => {
        // Query Prisma database directly
      },
    }),
    get_account_summary: tool({ /* ... */ }),
    get_cashflow: tool({ /* ... */ }),
    get_category_breakdown: tool({ /* ... */ }),
    get_settings: tool({ /* ... */ }),
    update_settings: tool({ /* ... */ }),
  }
}
```

### 6.4 Directory Structure

```
openfinance/
├── src/
│   ├── app/                      # Next.js App Router
│   │   ├── auth/                 # Auth pages (login, sign-up)
│   │   ├── (private)/            # Protected routes
│   │   │   ├── dashboard/
│   │   │   ├── transactions/
│   │   │   ├── statements/
│   │   │   ├── chat/             # AI financial chat
│   │   │   └── settings/
│   │   ├── api/                  # API routes
│   │   │   ├── auth/             # BetterAuth handler
│   │   │   ├── chat/             # AI chat endpoint (streaming)
│   │   │   ├── process-statement/
│   │   │   └── upload/
│   │   ├── layout.tsx
│   │   └── page.tsx              # Marketing landing page
│   ├── components/
│   │   └── ui/                   # shadcn/ui components
│   ├── lib/
│   │   ├── prisma.ts             # Prisma client singleton
│   │   ├── auth.ts               # BetterAuth config
│   │   ├── auth-client.ts        # BetterAuth client
│   │   ├── openai.ts             # OpenRouter provider setup
│   │   ├── chat/                 # AI chat
│   │   │   ├── system-prompt.ts
│   │   │   └── tools.ts          # Chat tools (6 tools)
│   │   ├── services/
│   │   │   ├── statement-processor.ts
│   │   │   ├── transaction-categorizer.ts
│   │   │   ├── dashboard.ts
│   │   │   └── dashboard-types.ts
│   │   ├── constants/
│   │   └── utils/
│   ├── hooks/
│   └── types/
├── prisma/
│   ├── schema.prisma
│   ├── prisma.config.ts
│   └── migrations/
├── docs/                         # Mintlify documentation site
├── server-setup/                 # Server provisioning scripts
├── e2e/                          # Playwright E2E tests
├── .github/workflows/            # CI (lint, typecheck, Playwright)
├── Dockerfile
└── public/
```

---

## 7. Data Models

### 7.1 Prisma Schema

The actual schema uses SQLite (no enums, uses string fields instead). See `prisma/schema.prisma` for the source of truth.

```prisma
generator client {
  provider = "prisma-client"
  output   = "../src/generated/prisma"
}

datasource db {
  provider = "sqlite"
}

// BetterAuth tables (managed by better-auth)
model User {
  id            String    @id
  name          String
  email         String    @unique
  emailVerified Boolean   @default(false)
  image         String?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  sessions      Session[]
  accounts      Account[]
  bankAccounts  BankAccount[]
  statements    BankStatement[]
  transactions  Transaction[]
  settings      UserSettings?
  processingJobs ProcessingJob[]
  chatThreads   ChatThread[]
}

model Session { /* BetterAuth managed */ }
model Account { /* BetterAuth managed - OAuth providers */ }
model Verification { /* BetterAuth managed */ }

// App tables
model UserSettings {
  id                 String   @id @default(uuid())
  userId             String   @unique
  fiscalYearEndMonth Int      @default(12)
  fiscalYearEndDay   Int      @default(31)
  bankTimezone       String   @default("America/Vancouver")
  userTimezone       String   @default("America/Vancouver")
  aiContext          String?
  aiModel            String   @default("openai/gpt-4o-mini")
  createdAt          DateTime @default(now())
  updatedAt          DateTime @updatedAt
}

model BankAccount {
  id            String   @id @default(uuid())
  userId        String
  accountNumber String
  nickname      String
  bankName      String?
  currency      String   @default("CAD")
  accountType   String   @default("chequing")
  ownershipType String   @default("personal")
  @@unique([userId, accountNumber])
}

model BankStatement {
  id                 String    @id @default(uuid())
  userId             String
  bankAccountId      String?
  fileName           String
  fileUrl            String
  fileSize           Int
  contentHash        String?
  duplicateOf        String?
  bankName           String
  accountNumber      String?
  statementDate      DateTime
  periodStart        DateTime
  periodEnd          DateTime
  openingBalance     Float
  closingBalance     Float
  totalDeposits      Float?
  totalWithdrawals   Float?
  isProcessed        Boolean   @default(false)
  processedAt        DateTime?
  processingTimezone String?
  verificationStatus String?
  discrepancyAmount  Float?
}

model Transaction {
  id              String        @id @default(uuid())
  userId          String
  statementId     String
  transactionDate DateTime
  description     String
  amount          Float
  balance         Float?
  transactionType String        @default("debit")
  category        String?
  referenceNumber String?
  sortOrder       Int?
  @@unique([statementId, transactionDate, description, amount, balance])
}

model BalanceVerification {
  id                        String   @id @default(uuid())
  statementId               String   @unique
  calculatedOpeningBalance  Float
  calculatedClosingBalance  Float
  statementOpeningBalance   Float
  statementClosingBalance   Float
  isBalanced                Boolean
  discrepancyAmount         Float?
  notes                     String?
}

model ProcessingJob {
  id          String    @id @default(uuid())
  userId      String
  statementId String?
  fileName    String
  status      String    @default("pending")
  errorMessage String?
  startedAt   DateTime?
  completedAt DateTime?
  logs        ProcessingLog[]
}

model ProcessingLog {
  id             String   @id @default(uuid())
  jobId          String
  sequenceNumber Int
  logType        String
  title          String?
  content        String?
}

model ChatThread {
  id         String   @id @default(uuid())
  userId     String
  title      String?
  isArchived Boolean  @default(false)
  messages   ChatMessage[]
}

model ChatMessage {
  id         String   @id @default(uuid())
  threadId   String
  role       String
  content    String
  toolCalls  String?
  toolCallId String?
  model      String?
}
```

**Key differences from original spec:**
- SQLite does not support enums -- all enum fields are plain strings
- No `Decimal` type -- uses `Float` for monetary values
- BetterAuth manages auth tables (User, Session, Account, Verification)
- No `AdvisorChat`/`AdvisorMessage` models -- replaced by `ChatThread`/`ChatMessage`
- No `MarketWatchItem` or `AuditLog` models (not yet implemented)
- `UserSettings.aiModel` is a string (e.g., `"openai/gpt-4o-mini"`) instead of separate enum + key fields
- Generated client output goes to `src/generated/prisma/` (gitignored)
- Datasource URL is configured in `prisma.config.ts` (Prisma 7 pattern), not in schema

### 7.2 Model Relationships Diagram

```
User
├── UserSettings (1:1)
├── BankAccount[] (1:N)
│   └── BankStatement[] (1:N)
├── BankStatement[] (1:N)
│   ├── Transaction[] (1:N)
│   ├── BalanceVerification (1:1)
│   └── ProcessingJob[] (1:N)
│       └── ProcessingLog[] (1:N)
├── ChatThread[] (1:N)
│   └── ChatMessage[] (1:N)
├── Session[] (1:N)          # BetterAuth
└── Account[] (1:N)          # BetterAuth (OAuth providers)
```

---

## 8. API Routes Structure

### 8.1 Authentication Routes (BetterAuth)

```
/api/auth/**                     # BetterAuth catch-all handler
├── POST /api/auth/sign-up/email # Create account
├── POST /api/auth/sign-in/email # Sign in with email/password
├── POST /api/auth/sign-out      # Sign out
├── GET  /api/auth/get-session   # Get current session
└── POST /api/auth/sign-in/social # Google OAuth (if configured)
```

### 8.2 Core API Routes (Implemented)

```
/api/upload
└── POST   /                     # Upload bank statement PDF(s)

/api/process-statement
└── POST   /                     # Trigger AI processing of uploaded statement

/api/chat
└── POST   /                     # AI chat (streaming, Vercel AI SDK format)
```

Note: Most data operations (dashboard stats, transaction listing, settings) are handled
via Server Components and Server Actions rather than dedicated API routes.

---

## 9. Deployment Model

### 9.1 Self-Hosted with Docker (Primary)

**Current production deployment:** Docker on Coolify (Hetzner Cloud) at https://openfinance.to

The Dockerfile uses a multi-stage build:
1. **deps** -- install dependencies, generate Prisma client
2. **builder** -- build the Next.js app
3. **runner** -- production image with standalone output

```yaml
# docker-compose.yml (for self-hosters)
services:
  web:
    image: ghcr.io/yagudaev/openfinance:latest
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=file:./data/openfinance.db
      - BETTER_AUTH_URL=${BETTER_AUTH_URL}
      - BETTER_AUTH_SECRET=${BETTER_AUTH_SECRET}
      - OPENROUTER_API_KEY=${OPENROUTER_API_KEY}
    volumes:
      - openfinance-data:/app/data
    restart: unless-stopped

volumes:
  openfinance-data:
```

**Backup Strategy:**
```bash
# Single-file backup (SQLite)
docker cp openfinance-web-1:/app/data/openfinance.db ./backup-$(date +%Y%m%d).db
```

### 9.2 Production Infrastructure

- **Hosting**: Hetzner Cloud VPS
- **Orchestration**: Coolify (auto-deploy from GitHub, SSL via Traefik/Let's Encrypt)
- **VPN**: Tailscale for secure SSH access
- **Firewall**: Hetzner cloud firewall + OS-level Tailscale ACLs
- **Domain**: openfinance.to
- **CI**: GitHub Actions (lint, typecheck, Playwright E2E tests)

### 9.3 Marketing & Docs

- **Landing page**: Built into the main Next.js app at `/` (shown to unauthenticated users)
- **Documentation**: Mintlify docs site (hosted separately)
- **Domain**: openfinance.to for the app, docs.openfinance.to for documentation

---

## 10. Migration from keeping-books

### 10.1 Data Migration

For existing keeping-books users:

```typescript
// scripts/migrate-from-keeping-books.ts

import { createClient } from '@supabase/supabase-js'
import { PrismaClient } from '@prisma/client'

async function migrateData() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
  const prisma = new PrismaClient()
  
  // 1. Migrate user settings
  const { data: settings } = await supabase
    .from('user_settings')
    .select('*')
  
  for (const setting of settings) {
    await prisma.userSettings.create({
      data: {
        userId: setting.user_id,
        bankTimezone: setting.bank_timezone,
        userTimezone: setting.user_timezone,
        fiscalYearEndMonth: setting.fiscal_year_end_month,
        fiscalYearEndDay: setting.fiscal_year_end_day,
      }
    })
  }
  
  // 2. Migrate accounts
  // 3. Migrate bank statements
  // 4. Migrate transactions
  // 5. Download PDFs from Supabase storage
}
```

### 10.2 Feature Parity Checklist

| Feature | keeping-books | OpenFinance | Status |
|---------|---------------|-------------|--------|
| PDF Upload | ✓ | ✓ | Shipped |
| AI Extraction | ✓ GPT | ✓ OpenRouter (configurable) | Shipped |
| Transaction Categories | ✓ 5 categories | ✓ 5 categories | Shipped |
| Balance Verification | ✓ | ✓ | Shipped |
| Multi-account | ✓ | ✓ | Shipped |
| Multi-currency | ✓ CAD/USD | ✓ CAD/USD | Shipped |
| Fiscal Year | ✓ | ✓ | Shipped |
| Dashboard | ✓ | ✓ | Shipped |
| Transaction Filters | ✓ | ✓ | Shipped |
| AI Categorization | ✓ | ✓ | Shipped |
| AI Chat | ✗ | ✓ | Shipped |
| Self-hosted | ✗ | ✓ | Shipped |
| Google OAuth | ✗ | ✓ | Shipped |
| E2E Tests | ✗ | ✓ | Shipped |
| PDF Viewer | ✓ | ✗ | Not yet ported |
| Export CSV | ✓ | ✗ | Not yet ported |
| Market Tracking | ✗ | ✗ | Future |

---

## 11. UI/UX Patterns

### 11.1 Layout Structure

**From keeping-books ✓** - Refined

```
┌─────────────────────────────────────────────────────────┐
│  Navbar (Logo, Nav Links, User Menu)                    │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Page Content                                           │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │  Page Header (Title, Actions)                    │   │
│  ├─────────────────────────────────────────────────┤   │
│  │  Filters / Tabs                                  │   │
│  ├─────────────────────────────────────────────────┤   │
│  │  Content Area (Table, Cards, etc.)               │   │
│  │                                                   │   │
│  │                                                   │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 11.2 Navigation

```
Dashboard          - Overview + cash flow
Transactions       - All transactions + filters
Statements         - PDF viewer + verification
Accounts           - Account management
Advisor            - AI chat (new)
Market             - Watchlist + alerts (new)
Settings           - User preferences
```

### 11.3 Component Library

**shadcn/ui components used:**
- Button, Input, Label, Checkbox
- Select, Dropdown Menu, Popover
- Dialog, Alert Dialog, Sheet
- Table, Card, Badge
- Calendar, Date Picker
- Chart (Recharts wrapper)
- Tabs, Radio Group

### 11.4 Design Principles

1. **Progressive Disclosure**: Show essential info first, details on demand
2. **Consistent Patterns**: Same filter UI across all pages
3. **Keyboard Navigation**: Full keyboard support for power users
4. **Responsive Design**: Mobile-friendly (P2 priority)
5. **Dark Mode**: System-aware + manual toggle
6. **Accessibility**: WCAG 2.1 AA compliance

---

## 12. Future Roadmap

### Phase 1: MVP (v0.1) -- COMPLETE

**Core Feature Parity + Self-Hosting (shipped Feb 21, 2026)**

- [x] Prisma 7 schema + SQLite setup
- [x] BetterAuth authentication (email/password + Google OAuth)
- [x] Statement upload + AI processing
- [x] Transaction management with filters
- [x] Dashboard with cash flow chart
- [x] AI financial chat with tool use
- [x] Settings page (fiscal year, timezone, AI model)
- [x] Docker deployment on Coolify
- [x] Playwright E2E tests + GitHub Actions CI
- [x] Mintlify documentation site

### Phase 2: Polish (v0.2)

**Refinement + Missing Features**

- [ ] PDF viewer for statement verification
- [ ] CSV export
- [ ] Enhanced categorization with learning
- [ ] Mobile-responsive improvements
- [ ] Performance optimization

### Phase 3: Growth (v1.0)

**Community + Advanced Features**

- [ ] Migration tool from keeping-books
- [ ] Market tracking
- [ ] Community feedback integration

### Future Considerations (v2.0+)

1. **Bank Integrations**
   - Plaid/Finicity for automatic imports
   - Open Banking API support

2. **Multi-User Support**
   - Shared accounts/workspaces
   - Accountant access

3. **Invoicing**
   - Basic invoice generation
   - Payment tracking

4. **Tax Features**
   - Tax category mapping
   - Report generation for accountants

5. **Investments**
   - Portfolio tracking
   - Dividend tracking
   - Performance analytics

6. **Mobile App**
   - React Native companion app
   - Quick transaction entry
   - Push notifications

---

## Appendix A: keeping-books Analysis

### What Works Well

1. **AI-powered PDF extraction** - Iterative approach with balance verification
2. **Transaction filtering** - Comprehensive filter options with URL persistence
3. **PDF viewer** - Side-by-side verification with highlighting
4. **Category system** - Simple, effective for freelancers
5. **Fiscal year support** - Flexible configuration
6. **Date handling** - Timezone-aware utilities prevent common bugs

### What to Improve

1. **Authentication** - Supabase Auth is great but ties to their cloud
2. **File storage** - Vercel Blob / Supabase Storage requires cloud
3. **Database** - PostgreSQL on Supabase, not self-hostable
4. **AI provider lock-in** - Only OpenAI supported
5. **No chat interface** - Missing interactive AI experience
6. **No market awareness** - No investment/market features

### Code Quality Notes

- Clean Code style: meaningful names, minimal comments
- Good separation of concerns (services, components, types)
- Consistent error handling patterns
- Date utilities prevent timezone bugs

---

## Appendix B: Environment Variables

```bash
# Database
DATABASE_URL="file:./data/openfinance.db"

# Authentication (BetterAuth)
BETTER_AUTH_SECRET="generate-with-openssl-rand-base64-32"
BETTER_AUTH_URL="https://your-domain.com"

# AI (at least one required)
OPENAI_API_KEY="sk-..."              # For statement processing
OPENROUTER_API_KEY="sk-or-..."       # For AI chat (Cerebras, etc.)

# Optional: Google OAuth
GOOGLE_CLIENT_ID="..."
GOOGLE_CLIENT_SECRET="..."

# Optional: Server
DEPLOY_HOST="your-server-ip"
```

---

## Appendix C: References

- [keeping-books Repository](https://github.com/yagudaev/keeping-books)
- [Next.js 16 Documentation](https://nextjs.org/docs)
- [Prisma 7 Documentation](https://www.prisma.io/docs)
- [BetterAuth Documentation](https://www.better-auth.com/)
- [Vercel AI SDK Documentation](https://ai-sdk.dev/)
- [OpenRouter Documentation](https://openrouter.ai/docs)
- [shadcn/ui Components](https://ui.shadcn.com)
- [Coolify Documentation](https://coolify.io/docs)

---

*This specification is a living document. Update as requirements evolve.*
