# Smoke Test Report: OpenFinance Upload-to-Insight Pipeline

**Date:** 2026-02-22
**Ticket:** NAN-455
**Status:** Analysis complete, E2E tests added, follow-up tickets created

---

## Executive Summary

The upload-to-insight pipeline **works correctly when using the Statements page**. The reported issue — documents showing "done" with no transactions — is caused by uploading via the **Documents page**, which stores files as `Document` records (storage-only) and never triggers AI extraction. This is an architecture gap, not a bug in the processing pipeline itself.

---

## Pipeline Analysis

### Working Path: Statements Page

```
User uploads PDF → StatementUploader → /api/upload (saves file to disk)
                                            ↓
                    Component calls /api/process-statement
                                            ↓
                    PDF text extracted (pdf-parse) → GPT-4o-mini extraction
                                            ↓
                    BankStatement created → Transactions saved → Balance verified
                                            ↓
                    Status: "done" with transactions, accounts linked, dashboard populated
```

**Verified working:**
- Single file upload + immediate processing
- Bulk upload (2+ files) → background Job queue → sequential processing
- Duplicate detection (by account + period)
- Balance verification (non-blocking — unbalanced statements still save)
- Reprocessing via Reprocess button
- Auto-creation of BankAccount records

### Broken Path: Documents Page

```
User uploads PDF → DocumentUploader → /api/documents/upload
                                            ↓
                    Document record created (documentType auto-classified)
                                            ↓
                    ❌ NO AI extraction, NO BankStatement, NO transactions
```

**Root cause:** `Document` and `BankStatement` are completely separate entities. The Documents page is a file library — it doesn't process anything. Users who upload bank statement PDFs to the Documents page will see them classified as "statement" but get zero transaction extraction.

### Chat Path (Working)

```
User attaches PDF in chat → asks "process this statement"
                                            ↓
                    process_statements tool → reads file → AI extraction
                                            ↓
                    BankStatement + Transactions + Auto-categorization
```

---

## Issues Found

### Critical

| # | Issue | Impact | Status |
|---|-------|--------|--------|
| 1 | Documents page can't process statements | Users upload to wrong page, get no transactions | Follow-up ticket |
| 2 | No guidance directing users to Statements page | New users may discover Documents first | Follow-up ticket |

### Medium

| # | Issue | Impact | Status |
|---|-------|--------|--------|
| 3 | `/api/statements/import` route exists but is unused | Dead code — StatementUploader uses `/api/upload` instead | Follow-up ticket |
| 4 | Single-file upload creates no BankStatement record before processing | If processing crashes before `saveStatement()`, silent failure | Low risk |
| 5 | Statement processor hardcodes `gpt-4o-mini` | Ignores user's AI model preference from settings | Follow-up ticket |

### Low

| # | Issue | Impact | Status |
|---|-------|--------|--------|
| 6 | Chat tool doesn't check for duplicate statements before processing | Duplicate detection happens inside `saveStatement()` — throws error | Acceptable |
| 7 | Bulk processing uses fire-and-forget pattern | Errors logged but not surfaced well | Acceptable for now |

---

## E2E Test Coverage Added

### `e2e/smoke.spec.ts` — Full User Journey

Tests that run in CI (no AI/API keys needed):

1. **Landing page** — renders hero, features, CTA
2. **Sign up flow** — create account, redirected to chat
3. **Navigation** — all main pages accessible (dashboard, transactions, documents, statements, settings, chat)
4. **Statements page** — renders uploader and empty state
5. **Documents page** — renders uploader and empty state
6. **Settings page** — can read and update settings
7. **Chat interface** — renders message input
8. **Terms & Privacy pages** — render correctly
9. **Logout + Login** — full auth round-trip

### What Can't Be Tested in CI

- AI-powered statement processing (requires `OPENAI_API_KEY`)
- Transaction extraction and categorization
- Dashboard with real data
- Chat AI responses

These require manual testing or a staging environment with API keys configured.

---

## Recommendations

1. **Add "Process as Statement" action to Documents page** — let users convert Document → BankStatement and trigger processing
2. **Remove or repurpose `/api/statements/import`** — it's dead code that confuses the architecture
3. **Use user's AI model for statement processing** — currently hardcodes `gpt-4o-mini` regardless of settings
4. **Add onboarding hint** — guide new users to the Statements page for bank statement uploads
5. **Add statement processing test** — a manual test script using a synthetic PDF + mock AI for CI

---

## File Reference

| File | Role |
|------|------|
| `src/components/statements/statement-uploader.tsx` | Statements page uploader (triggers processing) |
| `src/components/documents/document-uploader.tsx` | Documents page uploader (storage only) |
| `src/app/api/upload/route.ts` | Generic file upload endpoint |
| `src/app/api/process-statement/route.ts` | Single statement processing |
| `src/app/api/statements/process-bulk/route.ts` | Bulk statement processing |
| `src/app/api/statements/import/route.ts` | UNUSED — dedicated import endpoint |
| `src/lib/services/statement-processor.ts` | Core AI extraction logic (GPT-4o-mini) |
| `src/lib/services/transaction-categorizer.ts` | Auto-categorization after extraction |
| `src/lib/chat/tools.ts` | Chat tool `process_statements` |
