# Keeping-Books Codebase Reference

This is a comprehensive reference document for the keeping-books bank statement processing application. It covers every aspect of how statements are processed, transactions extracted, accounts created, and data verified.

---

## Table of Contents

1. [Overall Architecture](#1-overall-architecture)
2. [Tech Stack](#2-tech-stack)
3. [Database Schema](#3-database-schema)
4. [Statement Processing Pipeline](#4-statement-processing-pipeline)
5. [PDF Processing (Client-Side)](#5-pdf-processing-client-side)
6. [AI/LLM Prompts (Verbatim)](#6-aillm-prompts-verbatim)
7. [Account Creation Logic](#7-account-creation-logic)
8. [Balance Verification Logic](#8-balance-verification-logic)
9. [Transaction Categorization](#9-transaction-categorization)
10. [Duplicate Detection](#10-duplicate-detection)
11. [Reprocessing Flow](#11-reprocessing-flow)
12. [Date Handling](#12-date-handling)
13. [Chat / AI Agent](#13-chat--ai-agent)
14. [Dashboard & Filtering](#14-dashboard--filtering)
15. [File Storage](#15-file-storage)
16. [Constants & Enums](#16-constants--enums)
17. [Key Files Index](#17-key-files-index)

---

## 1. Overall Architecture

Keeping-Books is a Next.js 16 app using the App Router. It processes bank statement PDFs by:

1. **Client-side**: Converting PDFs to high-resolution page images + extracting raw text using `pdfjs-dist`
2. **Uploading**: Storing the PDF and page images to Vercel Blob storage
3. **Server-side**: Sending images + extracted text to OpenAI's API for structured data extraction
4. **Verification**: Running a balance verification loop that retries up to 15 times if the extracted transactions don't balance
5. **Storage**: Saving to Supabase (PostgreSQL) with Row Level Security

### Data Flow

```
User uploads PDF
    |
    v
[Client: pdf-processor.ts]
    - Render each page to PNG at 3x scale
    - Extract text using pdfjs-dist getTextContent()
    - Group text items into lines
    |
    v
[Client: statement-upload.ts]
    - Upload PDF to Vercel Blob (/api/upload)
    - Upload each page image to Vercel Blob (/api/upload)
    |
    v
[Server: /api/process-statement-stream OR /api/process-statement]
    - Create processing_job record
    - Instantiate StreamingStatementProcessor (or StatementProcessor)
    |
    v
[Server: streaming-statement-processor.ts]
    - Send images + extracted text to OpenAI (gpt-5-nano)
    - Parse JSON response
    - Validate dates, amounts
    - Save statement + transactions to Supabase
    - Verify balance (opening + sum of transactions == closing)
    - If not balanced: add feedback message, retry (up to 15 iterations)
    |
    v
[Supabase Tables]
    - bank_statements
    - transactions
    - balance_verifications
    - accounts
    - processing_jobs + processing_logs
```

---

## 2. Tech Stack

- **Framework**: Next.js 16 (App Router, Turbopack)
- **Language**: TypeScript (strict)
- **Database**: Supabase (PostgreSQL with RLS)
- **Auth**: Supabase Auth (cookie-based sessions)
- **Styling**: Tailwind CSS v3 + shadcn/ui
- **PDF Processing**: `pdfjs-dist` 5.4.296 (client-side)
- **AI/LLM**: OpenAI API (`openai` npm package v6.7.0, model: `gpt-5-nano`)
- **Chat LLM**: OpenRouter (`@openrouter/ai-sdk-provider`) with multiple models
- **File Storage**: Vercel Blob (`@vercel/blob`)
- **Package Manager**: Yarn
- **Deployment**: Vercel

### Key Dependencies
- `pdfjs-dist` - PDF rendering and text extraction
- `openai` - OpenAI API client for statement processing
- `@openrouter/ai-sdk-provider` - Chat interface LLM routing
- `ai` (Vercel AI SDK v6) - Chat streaming and tool calling
- `@vercel/blob` - File storage
- `@supabase/supabase-js` + `@supabase/ssr` - Database and auth
- `zod` - Schema validation (chat tools)
- `date-fns` - Date manipulation
- `react-pdf` - PDF viewer in browser
- `ag-grid-react` - Transaction data grid

---

## 3. Database Schema

### `bank_statements` table

```sql
CREATE TABLE bank_statements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  bank_name TEXT NOT NULL,
  account_number TEXT,
  account_id UUID,                          -- FK to accounts table
  account_type TEXT DEFAULT 'Checking',     -- legacy, now always set to null by processor
  account_nickname TEXT,
  statement_date DATE NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  opening_balance DECIMAL(10,2) NOT NULL,
  closing_balance DECIMAL(10,2) NOT NULL,
  total_deposits DECIMAL(10,2) DEFAULT 0,
  total_withdrawals DECIMAL(10,2) DEFAULT 0,
  is_processed BOOLEAN DEFAULT FALSE,
  processed_at TIMESTAMPTZ,
  processing_timezone TEXT DEFAULT 'America/Toronto',
  verification_status TEXT CHECK (verification_status IN ('verified', 'unbalanced', NULL)),
  discrepancy_amount DECIMAL,               -- set during verification
  human_verified BOOLEAN DEFAULT false,
  human_verified_at TIMESTAMPTZ,
  content_hash TEXT,                         -- for duplicate detection
  duplicate_of UUID REFERENCES bank_statements(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### `transactions` table

```sql
CREATE TABLE transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  statement_id UUID NOT NULL REFERENCES bank_statements(id) ON DELETE CASCADE,
  transaction_date DATE NOT NULL,
  description TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,             -- positive for credits, negative for debits
  balance DECIMAL(10,2),                     -- running balance if available
  transaction_type TEXT CHECK (transaction_type IN ('debit', 'credit')),
  category TEXT,                             -- 'expense', 'owner-pay', 'income', 'internal-transfer', 'shareholder-loan'
  reference_number TEXT,
  sort_order INTEGER,                        -- for manual reordering
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (statement_id, transaction_date, description, amount, balance)
);
```

### `balance_verifications` table

```sql
CREATE TABLE balance_verifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  statement_id UUID NOT NULL REFERENCES bank_statements(id) ON DELETE CASCADE,
  calculated_opening_balance DECIMAL(10,2) NOT NULL,
  calculated_closing_balance DECIMAL(10,2) NOT NULL,
  statement_opening_balance DECIMAL(10,2) NOT NULL,
  statement_closing_balance DECIMAL(10,2) NOT NULL,
  is_balanced BOOLEAN NOT NULL,
  discrepancy_amount DECIMAL(10,2),
  verification_date TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT
);
```

### `accounts` table

```sql
CREATE TABLE accounts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  account_number TEXT NOT NULL,
  nickname TEXT NOT NULL,
  bank_name TEXT,
  currency TEXT DEFAULT 'CAD' NOT NULL,
  ownership_type ownership_type,             -- ENUM: 'personal' | 'business'
  account_type account_type,                 -- ENUM: 'chequing' | 'savings' | 'credit_card' | 'line_of_credit' | 'mortgage' | 'investment'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, account_number)
);
```

### `user_settings` table

```sql
CREATE TABLE user_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  bank_timezone TEXT DEFAULT 'America/Toronto',
  user_timezone TEXT DEFAULT 'America/Vancouver',
  ai_context TEXT,                           -- custom context for chat AI
  ai_model TEXT,                             -- preferred chat model
  fiscal_year_end_month INTEGER DEFAULT 11,  -- 0-11 (Jan-Dec)
  fiscal_year_end_day INTEGER DEFAULT 31,    -- 1-31
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### `processing_jobs` table

```sql
CREATE TABLE processing_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  statement_id UUID REFERENCES bank_statements(id) ON DELETE SET NULL,
  file_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'uploading', 'processing', 'completed', 'failed')),
  error_message TEXT,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### `processing_logs` table

```sql
CREATE TABLE processing_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES processing_jobs(id) ON DELETE CASCADE,
  sequence_number INTEGER NOT NULL,
  log_type TEXT NOT NULL
    CHECK (log_type IN ('info', 'progress', 'ai_request', 'ai_response', 'ai_thinking', 'iteration', 'warning', 'error', 'success')),
  title TEXT NOT NULL,
  content JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Database Enums

```sql
CREATE TYPE ownership_type AS ENUM ('personal', 'business');
CREATE TYPE account_type AS ENUM ('chequing', 'savings', 'credit_card', 'line_of_credit', 'mortgage', 'investment');
```

---

## 4. Statement Processing Pipeline

### Two processor implementations

There are two processor classes that share identical logic:

1. **`StatementProcessor`** (`lib/services/statement-processor.ts`) -- Original, no streaming
2. **`StreamingStatementProcessor`** (`lib/services/streaming-statement-processor.ts`) -- Emits Server-Sent Events for real-time progress

Both follow the same algorithm:

### Processing Algorithm

```
processStatement(pdfUrl, imageUrls, fileName, fileSize, userId, pdfText?, existingStatementId?)
  1. Load user settings (bank_timezone from user_settings table, default: 'America/Toronto')
  2. Call extractAndVerify()

extractAndVerify():
  MAX_ITERATIONS = 15
  prevMessages = []  // conversation history for correction loop

  for i = 0 to MAX_ITERATIONS:
    3. Call extractDataFromImages(imageUrls, bankTimezone, prevMessages, pdfText)
       - Build user prompt with page images + extracted PDF text
       - Call OpenAI gpt-5-nano with system prompt + conversation history
       - Parse JSON response
       - Validate required fields (periodStart, periodEnd, openingBalance, closingBalance)
       - Format all dates to YYYY-MM-DD
       - Filter out transactions with invalid dates

    4. Save statement to bank_statements table (create or update)
       - If existingStatementId provided: UPDATE that record
       - Otherwise: check for duplicates by (user_id, account_number, period_start, period_end)
         - If found AND is_processed=true: throw "Duplicate statement detected"
         - If found AND is_processed=false: UPDATE (it's a reprocess)
         - If not found: INSERT new record

    5. If iteration > 0: delete existing transactions for this statement

    6. Save all transactions to transactions table

    7. Verify balance:
       calculatedClosing = openingBalance + sum(all transaction amounts)
       isBalanced = abs(calculatedClosing - closingBalance) < 0.01
       - Save balance_verifications record
       - Update bank_statements.verification_status

    8. Check success:
       isSuccessful = isBalanced AND no filtered transactions (invalid dates)

       If successful: RETURN { statement, extractedData, verification }

       If NOT successful: build feedback message and add to prevMessages:
         - If not balanced: "There is a {discrepancy} discrepancy..."
         - If invalid dates: "N transaction(s) had invalid or missing dates..."
         - "Please try again. Do your best to extract the data even from slightly blurry images."
         - "Respond in JSON format like in the system prompt."

  9. If all iterations exhausted: throw error
```

### Key Design Decisions

- **Images are always sent** even when extracted text is available, so the LLM can understand document structure/layout
- **Extracted PDF text takes priority** over image OCR for numeric values
- **The correction loop** accumulates the full conversation history, so each retry has context of previous attempts
- **Tolerance for balance matching** is 0.01 (one cent)
- **Transaction amounts** are positive for credits/deposits, negative for debits/withdrawals

---

## 5. PDF Processing (Client-Side)

File: `lib/client/pdf-processor.ts`

The PDF is processed entirely client-side in the browser before uploading.

### Page Rendering

```typescript
// Each page is rendered to a canvas at 3x scale for high-quality images
const viewport = page.getViewport({ scale: 3.0 })
const canvas = document.createElement('canvas')
canvas.width = viewport.width
canvas.height = viewport.height
// ... render and export as PNG data URL
return canvas.toDataURL('image/png')
```

### Text Extraction

Text is extracted from the PDF using `pdfjs-dist`'s `getTextContent()` API, then grouped into lines.

```typescript
async function extractPageText(page, pageNum) {
  const textContent = await page.getTextContent()
  const textItems = textContent.items as TextItem[]
  const lines = groupTextItemsIntoLines(textItems)
  return `--- Page ${pageNum} ---\n${lines.join('\n')}`
}
```

### Line Grouping Algorithm

Text items from pdfjs-dist have transforms with x/y positions. The algorithm:

1. Sort items by Y position (descending, top to bottom) then X position (ascending, left to right)
2. Group items into lines using a Y-threshold of 5 pixels
3. Insert blank lines for section gaps > 15 pixels
4. Join items within a line with spaces

```typescript
const LINE_THRESHOLD = 5
const SECTION_GAP_THRESHOLD = 15

function groupTextItemsIntoLines(textItems: TextItem[]): string[] {
  // Sort by Y descending (top to bottom), then X ascending (left to right)
  const sortedItems = [...textItems].sort((a, b) => {
    const yDiff = b.transform[5] - a.transform[5]
    if (Math.abs(yDiff) > LINE_THRESHOLD) return yDiff
    return a.transform[4] - b.transform[4]
  })

  // Group into lines based on Y proximity
  for (const item of sortedItems) {
    const yDiff = Math.abs(item.transform[5] - currentY)
    const isNewLine = yDiff > LINE_THRESHOLD
    const isSectionBreak = yDiff > SECTION_GAP_THRESHOLD
    // ... group items, insert section breaks
  }
}
```

### Upload Flow

File: `lib/client/statement-upload.ts`

```
1. Upload original PDF to /api/upload (type='pdf')
   -> Stored at: statements/{userId}/{timestamp}_{filename}

2. Process PDF client-side:
   a. Render all pages to PNG images at 3x scale
   b. Extract text from all pages

3. Upload each page image to /api/upload (type='image')
   -> Stored at: statement-images/{userId}/{timestamp}_{filename}-page-{N}.png

4. Send to /api/process-statement-stream:
   {
     pdfUrl: string,        // Vercel Blob URL of original PDF
     imageUrls: string[],   // Array of Vercel Blob URLs for page images
     fileName: string,
     fileSize: number,
     pdfText: string,        // Concatenated extracted text from all pages
     statementId?: string    // For reprocessing
   }
```

---

## 6. AI/LLM Prompts (Verbatim)

### System Prompt for Statement Extraction

This prompt is identical in both `StatementProcessor` and `StreamingStatementProcessor`:

```
You are a financial data extraction expert. Extract all transaction data from the bank statement and return it as structured JSON.

    CRITICAL: When extracted PDF text is provided within <bk-extracted-pdf-text></bk-extracted-pdf-text> tags, you MUST use the exact numeric values from that text for all financial figures (amounts, balances, totals). The extracted text contains the precise values - do NOT estimate, round, or interpret numbers from the images. Your job is to structure the provided text data into JSON format.

    IMPORTANT: The bank operates in the ${timezone} timezone. All dates and times in the statement should be interpreted as being in this timezone.

    Return the data in this exact format:
    {
      "bankName": "string",
      "accountNumber": "string (full account number as shown on statement)",
      "statementDate": "YYYY-MM-DD (optional - if not clearly visible, omit this field)",
      "periodStart": "YYYY-MM-DD",
      "periodEnd": "YYYY-MM-DD",
      "openingBalance": number,
      "closingBalance": number,
      "totalDeposits": number,
      "totalWithdrawals": number,
      "transactions": [
        {
          "date": "YYYY-MM-DD",
          "description": "string",
          "amount": number (positive for credits, negative for debits),
          "balance": number (if available),
          "type": "credit" or "debit",
          "referenceNumber": "string (if available)"
        }
      ]
    }

    Important extraction rules:
    - The extracted PDF text will be provided within <bk-extracted-pdf-text></bk-extracted-pdf-text> tags
    - Use ONLY the exact values from the extracted PDF text for all numbers (amounts, balances, dates)
    - Do NOT infer, estimate, or OCR numbers from images when text is provided
    - Extract ALL transactions visible in the statement
    - Ensure dates are in YYYY-MM-DD format
    - All dates should be interpreted as being in the ${timezone} timezone
    - Amount should be positive for credits/deposits and negative for debits/withdrawals
    - If statementDate is not clearly visible, omit it (periodEnd will be used as fallback)
    - Calculate totals if not explicitly stated
    - Ensure the transactions balance correctly
    - Include the full account number as shown on the statement
    - Use images only to understand document structure and layout, not to read numeric values
```

### User Prompt for Statement Extraction

```
Please extract all transaction data from these bank statement pages.
The bank is in the ${bankTimezone} timezone, so please interpret all dates as being in that timezone.

EXTRACTED PDF TEXT (use these exact values for all amounts, dates, and numbers):

<bk-extracted-pdf-text>
${pdfText}
</bk-extracted-pdf-text>
```

The user message also includes all page images as `image_url` content parts with `detail: 'high'`.

### Correction Feedback Prompt (on balance failure)

When the balance verification fails, this feedback is appended to the conversation:

```
The statement transactions are not balanced. There is a ${discrepancy.toFixed(2)} discrepancy between the closing balance and the calculated closing balance from adding up all the transactions.

${filteredTransactions.count} transaction(s) had invalid or missing dates and were filtered out. The affected transactions were: ${descriptions}. Please ensure ALL transactions have valid dates in YYYY-MM-DD format.

              Please try again. Do your best to extract the data even from slightly blurry images.
              Focus on the transactions specifically, ensuring each has a valid date.

              Respond in JSON format like in the system prompt.
```

### Transaction Categorization Prompt

File: `lib/services/transaction-categorizer.ts`

System message:

```
You are a financial transaction categorization assistant. Categorize each transaction into one of these categories:

- expense: Business expense
- owner-pay: Dividend payment to business owner
- income: Business income
- internal-transfer: Transfer from one account to another
- shareholder-loan: Owner lends money to the company

Rules for categorization:
- "expense" - for costs like supplies, services, rent, utilities, etc.
- "owner-pay" - for withdrawals/payments to the business owner (dividends)
- "income" - for revenue, sales, customer payments, etc.
- "internal-transfer" - for transfers between accounts (look for keywords like "transfer", "e-transfer", "interac", account numbers)
- "shareholder-loan" - for when the owner lends money to the company (typically a deposit/credit from owner to business account)

Analyze the description, amount, type (credit/debit), date, and account information to determine the most appropriate category.

e.g.
"Online Banking foreign exchange" -> "internal-transfer"
"e-Transfer sent Natalia" -> "expense"
"e-Transfer received MICHAELYAGUDAEV" -> "shareholder-loan"

Respond with a JSON object with this structure:
{
  "categorizations": [
    {
      "transactionId": "uuid",
      "category": "expense" | "owner-pay" | "income" | "internal-transfer" | "shareholder-loan",
      "confidence": 0.0-1.0
    }
  ]
}
```

User message:

```
Categorize these transactions:

${JSON.stringify(transactions, null, 2)}
```

The transactions sent to the categorizer include: `id`, `description`, `amount`, `transaction_type`, `transaction_date`, `account_number`, `account_nickname`.

### Chat System Prompt

File: `lib/chat/system-prompt.ts`

```
You are a knowledgeable financial fiduciary advisor embedded in KeepingBooks, a personal and business bookkeeping application. You have access to the user's complete transaction history and account information.

## Current Date
Today is ${today}. Use this to interpret relative date references like "last month", "this year", etc.

## Your Role
- Act as a trusted financial advisor with fiduciary responsibility
- Provide accurate, helpful analysis of the user's financial data
- Help users understand their spending patterns and financial health
- Answer questions about specific transactions or time periods
- Offer insights but never provide specific investment advice or tax advice (recommend they consult a professional)

## Available Tools
- **search_transactions**: Search transaction history by description, amount, date range, category, or type. Returns transaction details including links to view each transaction.

## Guidelines
1. Always use tools to find specific data - don't guess or make up numbers
2. Format amounts as currency (e.g., $1,234.56 CAD)
3. Be concise but thorough
4. If you can't find relevant data, say so clearly
5. Dates in the database are in YYYY-MM-DD format
6. When showing multiple transactions, use a table format for readability
7. Include links to individual transactions using the viewUrl from search results
8. At the end of search results, provide the searchUrl so users can explore the results on the transactions page

## User Context
The user has provided the following context about themselves and their financial situation:
${userContext}
```

---

## 7. Account Creation Logic

File: `lib/services/statement-processor.ts` and `lib/services/streaming-statement-processor.ts`

### How accounts are created

Accounts in keeping-books represent **real bank accounts** (identified by account number), NOT payees. There is no payee concept in this system.

The `getOrCreateAccountId()` method is called during statement saving:

```typescript
private async getOrCreateAccountId(
  supabase, userId, accountNumber, bankName
): Promise<string | null> {
  // If no account number extracted, return null
  if (!accountNumber) return null

  // Try to find existing account by (user_id, account_number)
  const { data: existing } = await supabase
    .from('accounts')
    .select('id')
    .eq('user_id', userId)
    .eq('account_number', accountNumber)
    .single()

  if (existing) return existing.id

  // Create new account if it doesn't exist
  const { data: created } = await supabase
    .from('accounts')
    .insert({
      user_id: userId,
      account_number: accountNumber,   // from LLM extraction
      nickname: accountNumber,          // defaults to account number
      bank_name: bankName,              // from LLM extraction (e.g., "RBC Royal Bank")
      currency: 'CAD',                  // hardcoded default
    })
    .select('id')
    .single()

  return created?.id || null
}
```

### Key Points about Account Creation

1. **Account number comes from the LLM** -- the system prompt asks for `"accountNumber": "string (full account number as shown on statement)"`
2. **One account per unique (user_id, account_number)** -- enforced by UNIQUE constraint
3. **Nickname defaults to account number** -- users can change it in settings
4. **Currency defaults to CAD** -- users can change it in settings
5. **Bank name comes from the LLM** -- e.g., "RBC Royal Bank", "TD Canada Trust"
6. **ownership_type** (personal/business) and **account_type** (chequing/savings/credit_card/etc.) are set manually by the user in settings, not by the LLM
7. **account_id is linked** to bank_statements for querying

### Account Properties (user-configurable)

- `nickname` -- display name for the account
- `currency` -- CAD, USD, or other ISO 4217 codes
- `ownership_type` -- 'personal' or 'business' (used for dashboard filtering)
- `account_type` -- 'chequing', 'savings', 'credit_card', 'line_of_credit', 'mortgage', 'investment'

---

## 8. Balance Verification Logic

Balance verification happens automatically after each extraction attempt and can also be triggered manually.

### Automatic Verification (during processing)

```typescript
private async verifyBalance(data: BankStatementData, statementId: string) {
  // Calculate what closing balance should be
  const calculatedTotal = this.calculateClosingBalance(
    data.openingBalance,
    data.transactions
  )

  // Check if it matches within 1 cent
  const isBalanced = Math.abs(calculatedTotal - data.closingBalance) < 0.01
  const discrepancy = isBalanced ? 0 : calculatedTotal - data.closingBalance
  const verificationStatus = isBalanced ? 'verified' : 'unbalanced'

  // Save verification record
  await supabase.from('balance_verifications').insert({
    statement_id: statementId,
    calculated_opening_balance: data.openingBalance,
    calculated_closing_balance: calculatedTotal,
    statement_opening_balance: data.openingBalance,
    statement_closing_balance: data.closingBalance,
    is_balanced: isBalanced,
    discrepancy_amount: discrepancy,
    notes: isBalanced
      ? 'Statement balanced successfully'
      : `Discrepancy of ${discrepancy.toFixed(2)} detected`,
  })

  // Update statement status
  await supabase.from('bank_statements').update({
    verification_status: verificationStatus,
    discrepancy_amount: discrepancy,
  }).eq('id', statementId)

  return { isBalanced, discrepancy }
}

private calculateClosingBalance(openingBalance, transactions) {
  if (!transactions) return openingBalance
  return transactions.reduce((sum, tx) => sum + tx.amount, openingBalance)
}
```

### Formula

```
calculatedClosing = openingBalance + SUM(transaction.amount for all transactions)
isBalanced = |calculatedClosing - closingBalance| < 0.01
```

### Manual Verification (server action)

File: `app/(private)/statements/actions.ts`

The `verifyStatement()` server action re-calculates the balance from current transactions in the database:

```typescript
function calculateBalance(statement, transactions) {
  const transactionSum = transactions.reduce(
    (sum, transaction) => sum + transaction.amount, 0
  )
  const calculatedClosing = statement.opening_balance + transactionSum
  const discrepancy = Math.abs(calculatedClosing - statement.closing_balance)
  return { calculatedClosing, discrepancy }
}

// Tolerance is 0.01
const TOLERANCE = 0.01
const verificationStatus = discrepancy < TOLERANCE ? 'verified' : 'unbalanced'
```

### Human Verification

There is also a `human_verified` flag that users can toggle manually via `markStatementHumanVerified()`. This is independent of the automated balance check.

### Editable Statement Fields

Users can manually edit these statement fields to correct extraction errors:

- `opening_balance`
- `closing_balance`
- `period_start`
- `period_end`

---

## 9. Transaction Categorization

File: `lib/services/transaction-categorizer.ts`

### Categories

```typescript
export const TRANSACTION_CATEGORIES = [
  { value: 'expense', label: 'Expense', description: 'Business expense' },
  { value: 'owner-pay', label: 'Owner Pay', description: 'Dividend payment to business owner' },
  { value: 'income', label: 'Income', description: 'Business income' },
  { value: 'internal-transfer', label: 'Internal Transfer', description: 'Transfer from one account to another' },
  { value: 'shareholder-loan', label: 'Shareholder Loan', description: 'Owner lends money to the company' },
]
```

### How Categorization Works

1. User selects transactions and triggers categorization via `/api/categorize-transactions`
2. Server fetches full transaction details including account numbers and nicknames
3. Sends batch to OpenAI `gpt-5-nano` with the categorization system prompt
4. Updates each transaction's `category` field individually
5. On LLM failure, falls back to 'expense' with confidence 0.1

### Transaction Data Sent to Categorizer

```typescript
interface TransactionToCategorize {
  id: string
  description: string
  amount: number
  transaction_type: string
  transaction_date: string
  account_number?: string
  account_nickname?: string
}
```

---

## 10. Duplicate Detection

### Statement-Level Duplicate Detection

Duplicates are detected by matching on these four fields:

```
(user_id, account_number, period_start, period_end)
```

When a match is found:
- If `is_processed = true`: Throw error "Duplicate statement detected" with HTTP 409
- If `is_processed = false`: This is a reprocess -- update the existing record

The HTTP 409 response includes `isDuplicate: true` so the client can show a specific message.

### Transaction-Level Duplicate Prevention

A database constraint prevents duplicate transactions within a statement:

```sql
UNIQUE (statement_id, transaction_date, description, amount, balance)
```

### Content Hash

There is a `content_hash` column on bank_statements and an index on `(user_id, content_hash)`, but it is not currently populated by the processor code.

---

## 11. Reprocessing Flow

File: `app/(private)/statements/actions.ts`

### Server Action: `reprocessStatement(statementId)`

1. Fetch the statement (verify ownership)
2. Delete all transactions for this statement
3. Set `is_processed = false` on the statement
4. Return statement data (id, file_url, file_name, file_size) to client

### Client-Side Reprocessing

File: `lib/client/statement-upload.ts`

```typescript
export async function reprocessStatement(
  pdfUrl, fileName, fileSize, statementId, onProgress?
) {
  // Download the PDF from its existing URL
  // Re-process it (render to images, extract text)
  // Re-upload page images
  // Call /api/process-statement with statementId parameter
}
```

The `statementId` parameter is passed through to the processor, which uses it as `existingStatementId` to UPDATE instead of INSERT.

---

## 12. Date Handling

File: `lib/utils/date.ts`

### The Problem

Bank statement dates are calendar dates (e.g., "August 4, 2025") without a specific time. When JavaScript parses "2025-08-04" with `new Date()`, it interprets it as UTC midnight. In western timezones like EST, this becomes "August 3, 2025" -- off by one day.

### The Solution

All date handling goes through timezone-agnostic utilities:

```typescript
// Parse YYYY-MM-DD without timezone conversion
export function parseDate(dateString): Date | null {
  const datePart = dateString.split('T')[0]
  const [year, month, day] = datePart.split('-').map(Number)
  return new Date(year, month - 1, day)  // Local time, not UTC
}

// Format for display
export function formatDate(dateString, formatStr): string {
  const date = parseDate(dateString)
  return dateFnsFormat(date, formatStr)
}
```

### Date Processing in Statement Processor

```typescript
private formatDateWithTimezone(dateString, _timezone): string | null {
  if (!dateString || dateString.trim() === '') return null

  // Validate YYYY-MM-DD format
  const datePattern = /^\d{4}-\d{2}-\d{2}/
  if (!datePattern.test(dateString)) return null

  // Strip time component, keep only YYYY-MM-DD
  const datePart = dateString.split('T')[0]

  // Validate components
  const [year, month, day] = datePart.split('-').map(Number)
  if (isNaN(year) || isNaN(month) || isNaN(day) ||
      month < 1 || month > 12 || day < 1 || day > 31) return null

  // Return just the date portion without time/timezone
  return datePart
}
```

Note: The `_timezone` parameter is accepted but currently unused -- dates are stored as plain YYYY-MM-DD strings, not timezone-aware timestamps.

---

## 13. Chat / AI Agent

### Architecture

- **Chat Route**: `/api/chat/route.ts`
- **Provider**: OpenRouter (supports multiple LLM providers)
- **Framework**: Vercel AI SDK v6 (`ai` package)
- **Tools**: `search_transactions` -- searches the user's transaction history

### Available Chat Models

```typescript
export const AVAILABLE_MODELS = [
  { id: 'anthropic/claude-opus-4.5', name: 'Claude Opus 4.5', provider: 'Anthropic' },
  { id: 'anthropic/claude-sonnet-4', name: 'Claude Sonnet 4', provider: 'Anthropic' },
  { id: 'openai/gpt-5.1', name: 'GPT-5.1', provider: 'OpenAI' },
  { id: 'google/gemini-2.5-pro', name: 'Gemini 2.5 Pro', provider: 'Google' },
  { id: 'google/gemini-2.5-flash', name: 'Gemini 2.5 Flash', provider: 'Google' },
  { id: 'x-ai/grok-4', name: 'Grok 4', provider: 'xAI' },
]

export const DEFAULT_MODEL = 'openai/gpt-5.1'
```

### Tool: search_transactions

Schema (Zod):

```typescript
z.object({
  query: z.string().optional(),         // Search term for description
  minAmount: z.coerce.number().optional(),
  maxAmount: z.coerce.number().optional(),
  startDate: z.string().optional(),     // YYYY-MM-DD
  endDate: z.string().optional(),       // YYYY-MM-DD
  transactionType: z.enum(['credit', 'debit']).optional(),
  category: z.string().optional(),
  accountNumber: z.string().optional(),
  limit: z.coerce.number().optional().default(20),
})
```

### Claude Model Workaround

Claude models have issues with tool call streaming via OpenRouter (JSON property order changes between chunks). For Claude models, the chat route uses `generateText()` (non-streaming) instead of `streamText()`, then manually constructs an SSE stream response.

---

## 14. Dashboard & Filtering

### Dashboard

File: `lib/services/dashboard/combined.ts`

The dashboard shows:
- Monthly income (last month vs previous month)
- Monthly expenses (last month vs previous month)
- 12-month cashflow chart (income CAD, income USD converted, expenses)

Income = transactions with category 'income'
Expenses = transactions with categories 'expense' or 'owner-pay'

USD to CAD conversion uses a hardcoded rate:
```typescript
export const USD_TO_CAD_RATE = 1.37
```

Three dashboard views: combined, business-only, personal-only (based on account ownership_type).

### Transaction Filtering

File: `lib/services/transactions-filter.ts`

Supports filtering by:
- Selected statements
- Selected accounts
- Date range (today, last 7 days, last 30 days, last 3 months, all time, custom)
- Transaction type (credit/debit/all)
- Categories (including 'uncategorized' which matches NULL)
- Search term (ilike on description)
- Transaction ID (exact match)
- Ownership filter (combined/business/personal)
- Sort column + direction

All filters are URL-serializable for shareable links.

---

## 15. File Storage

### Vercel Blob Storage

File: `app/api/upload/route.ts`

- PDFs stored at: `statements/{userId}/{timestamp}_{sanitizedFileName}`
- Page images stored at: `statement-images/{userId}/{timestamp}_{sanitizedFileName}`
- PDFs: max 10MB
- Images: max 5MB
- Allowed PDF types: `application/pdf`
- Allowed image types: `image/jpeg`, `image/png`, `image/gif`, `image/webp`
- All blobs are `public` access

### Statement Deletion

When a statement is deleted via the `deleteStatement()` server action:
1. The PDF file is deleted from Vercel Blob via `del(fileUrl)`
2. The bank_statements record is deleted (cascades to transactions and balance_verifications)
3. Note: Page images are NOT explicitly deleted (they remain as orphans in Vercel Blob)

---

## 16. Constants & Enums

### Supported Currencies

```typescript
export const SUPPORTED_CURRENCIES = [
  { code: 'CAD', name: 'Canadian Dollar', symbol: '$' },
  { code: 'USD', name: 'US Dollar', symbol: '$' },
]
```

### Transaction Categories

```typescript
export const TRANSACTION_CATEGORIES = [
  { value: 'expense', label: 'Expense', description: 'Business expense' },
  { value: 'owner-pay', label: 'Owner Pay', description: 'Dividend payment to business owner' },
  { value: 'income', label: 'Income', description: 'Business income' },
  { value: 'internal-transfer', label: 'Internal Transfer', description: 'Transfer from one account to another' },
  { value: 'shareholder-loan', label: 'Shareholder Loan', description: 'Owner lends money to the company' },
]
```

### Fiscal Year Start Months

```typescript
export const FISCAL_YEAR_START_MONTHS = [
  { value: 0, label: 'January' },
  { value: 1, label: 'February' },
  // ... through December (11)
]
```

### Account Types (database enum)

```
chequing, savings, credit_card, line_of_credit, mortgage, investment
```

### Ownership Types (database enum)

```
personal, business
```

### Processing Job Statuses

```
pending, uploading, processing, completed, failed
```

### Processing Log Types

```
info, progress, ai_request, ai_response, ai_thinking, iteration, warning, error, success
```

### Highlight Colors (for PDF viewer)

```typescript
export const HIGHLIGHT_COLORS = {
  date:            { bg: 'rgba(59, 130, 246, 0.3)',  border: '#3b82f6' },
  description:     { bg: 'rgba(16, 185, 129, 0.3)',  border: '#10b981' },
  amount:          { bg: 'rgba(249, 115, 22, 0.3)',  border: '#f97316' },
  balance:         { bg: 'rgba(139, 92, 246, 0.3)',  border: '#8b5cf6' },
  opening_balance: { bg: 'rgba(236, 72, 153, 0.3)',  border: '#ec4899' },
  closing_balance: { bg: 'rgba(14, 165, 233, 0.3)',  border: '#0ea5e9' },
  period_start:    { bg: 'rgba(234, 179, 8, 0.3)',   border: '#eab308' },
  period_end:      { bg: 'rgba(168, 85, 247, 0.3)',  border: '#a855f7' },
}
```

---

## 17. Key Files Index

### Core Processing

| File | Purpose |
|------|---------|
| `lib/services/statement-processor.ts` | Non-streaming statement processor (original) |
| `lib/services/streaming-statement-processor.ts` | Streaming processor with SSE events |
| `lib/client/pdf-processor.ts` | Client-side PDF to images + text extraction |
| `lib/client/statement-upload.ts` | Client-side upload orchestration |
| `lib/openai.ts` | OpenAI client + BankStatementData/Transaction interfaces |
| `lib/services/transaction-categorizer.ts` | AI-powered transaction categorization |

### API Routes

| File | Purpose |
|------|---------|
| `app/api/upload/route.ts` | File upload to Vercel Blob |
| `app/api/process-statement/route.ts` | Non-streaming statement processing |
| `app/api/process-statement-stream/route.ts` | Streaming statement processing (SSE) |
| `app/api/categorize-transactions/route.ts` | Transaction categorization |
| `app/api/processing-jobs/route.ts` | Query processing job status/logs |
| `app/api/chat/route.ts` | Chat with AI (OpenRouter) |

### Server Actions

| File | Purpose |
|------|---------|
| `app/(private)/statements/actions.ts` | Statement CRUD, reprocess, verify, human-verify |
| `app/(private)/transactions/actions.ts` | Transaction CRUD, reorder |

### Types

| File | Purpose |
|------|---------|
| `lib/openai.ts` | `BankStatementData`, `Transaction` (LLM response shape) |
| `types/statements.ts` | `Statement`, `Transaction` (database row types) |
| `types/processing.ts` | `ProcessingJob`, `ProcessingLog`, `ProcessingEvent` |
| `types/settings.ts` | `UserSettings`, `AccountNickname` |
| `lib/supabase/database.types.ts` | Auto-generated Supabase types |

### Services

| File | Purpose |
|------|---------|
| `lib/services/transactions-filter.ts` | Transaction filtering, URL building, Supabase query building |
| `lib/services/dashboard/` | Dashboard stats and cashflow data |
| `lib/services/pdf-search.ts` | Search for transactions within PDF text |
| `lib/services/pdf-text-finder.ts` | Find text positions in PDF viewer for highlighting |
| `lib/chat/system-prompt.ts` | Chat system prompt builder |
| `lib/chat/tools/search-transactions.ts` | Chat tool for searching transactions |
| `lib/chat/models.ts` | Available chat models |

### Configuration

| File | Purpose |
|------|---------|
| `lib/constants.ts` | Categories, currencies, fiscal year months |
| `lib/constants/highlight-colors.ts` | PDF viewer highlight colors |
| `lib/api-errors.ts` | Centralized error handling |
| `lib/utils/date.ts` | Timezone-agnostic date utilities |

---

## How It Handles RBC, Credit Cards, and Different Formats

### Format-Agnostic Approach

The system does NOT have any format-specific logic for RBC, credit cards, or other statement types. Instead, it relies entirely on the LLM to understand any bank statement format. Key design decisions:

1. **No format-specific parsers** -- There are no regex patterns, no bank-specific templates, no special handling for RBC vs TD vs credit card statements.

2. **Vision + Text dual input** -- The LLM receives both high-resolution page images AND extracted PDF text. The images help it understand layout/structure, while the extracted text provides precise numeric values.

3. **The LLM determines everything**:
   - Bank name (e.g., "RBC Royal Bank", "TD Canada Trust")
   - Account number (full number as shown on statement)
   - Statement period dates
   - Opening and closing balances
   - Whether something is a credit or debit
   - Whether it's a checking account, credit card, etc.

4. **Account type is user-assigned** -- The `account_type` field (chequing, credit_card, etc.) is set by the user in settings, not by the LLM. The processor actually sets `account_type: null` on every statement it processes.

5. **Credit card handling** -- Credit cards work the same as any other statement. The LLM extracts opening balance, closing balance, and transactions. The sign convention (positive for credits, negative for debits) and the balance verification formula (`opening + sum(amounts) = closing`) apply universally. For credit cards, payments to the card would be credits (positive) and purchases would be debits (negative).

6. **Multi-currency** -- The account's currency (CAD/USD) is user-configured, not extracted. The dashboard has a hardcoded USD-to-CAD conversion rate of 1.37 for reporting.

### What Makes This Work

The key insight is that the LLM handles all the complexity of different statement formats. The system's robustness comes from:

- High-quality images (3x scale rendering)
- Extracted text taking priority over OCR
- The iterative correction loop (up to 15 attempts)
- Specific feedback about what went wrong (balance discrepancy amount, invalid dates)
- Full conversation history maintained across retries

---

## OpenAI Configuration

### Model Used

Statement processing uses `gpt-5-nano` (hardcoded in both processor implementations).

### API Configuration

```typescript
import OpenAI from 'openai'

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})
```

### Request Format

```typescript
const completion = await openai.chat.completions.create({
  model: 'gpt-5-nano',
  messages: [
    { role: 'system', content: systemPrompt },
    {
      role: 'user',
      content: [
        { type: 'text', text: userPrompt },
        ...images.map(url => ({
          type: 'image_url',
          image_url: { url, detail: 'high' }
        }))
      ]
    },
    ...prevMessages  // conversation history for correction loop
  ],
  response_format: { type: 'json_object' },
})
```

### LLM Response Shape

```typescript
export interface BankStatementData {
  bankName: string
  accountNumber: string
  statementDate: string
  periodStart: string
  periodEnd: string
  openingBalance: number
  closingBalance: number
  totalDeposits: number
  totalWithdrawals: number
  transactions: Transaction[]
}

export interface Transaction {
  date: string
  description: string
  amount: number          // positive for credits, negative for debits
  balance?: number        // running balance if available
  type: 'credit' | 'debit'
  referenceNumber?: string
}
```

### Error Handling

If the LLM returns `{ "status": "error", "message": "..." }`, the processor throws with a descriptive error message.

### Validation After LLM Response

Required fields that cause immediate failure if missing:
- `periodStart`
- `periodEnd`
- `openingBalance`
- `closingBalance`

Optional fields:
- `statementDate` (falls back to `periodEnd`)
- `bankName` (falls back to "Unknown Bank")
- `accountNumber`
- `totalDeposits`, `totalWithdrawals`
- Individual transaction `balance`, `referenceNumber`

Transactions with invalid dates (not matching `/^\d{4}-\d{2}-\d{2}/`) are filtered out and their count is reported back in the correction loop.

---

## Environment Variables

```
OPENAI_API_KEY              -- OpenAI API key for statement processing
OPENROUTER_API_KEY          -- OpenRouter API key for chat
NEXT_PUBLIC_SUPABASE_URL    -- Supabase project URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY -- Supabase publishable key
BLOB_READ_WRITE_TOKEN       -- Vercel Blob storage token (implicit from @vercel/blob)
NEXT_PUBLIC_APP_URL          -- App URL (for internal API calls, e.g., thread title generation)
```
