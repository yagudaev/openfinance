-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_BankStatement" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "bankAccountId" TEXT,
    "fileName" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "contentHash" TEXT,
    "duplicateOf" TEXT,
    "bankName" TEXT NOT NULL,
    "accountNumber" TEXT,
    "statementDate" DATETIME,
    "periodStart" DATETIME,
    "periodEnd" DATETIME,
    "openingBalance" REAL,
    "closingBalance" REAL,
    "totalDeposits" REAL,
    "totalWithdrawals" REAL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "errorMessage" TEXT,
    "isProcessed" BOOLEAN NOT NULL DEFAULT false,
    "processedAt" DATETIME,
    "processingTimezone" TEXT,
    "verificationStatus" TEXT,
    "discrepancyAmount" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "BankStatement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "BankStatement_bankAccountId_fkey" FOREIGN KEY ("bankAccountId") REFERENCES "BankAccount" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_BankStatement" ("accountNumber", "bankAccountId", "bankName", "closingBalance", "contentHash", "createdAt", "discrepancyAmount", "duplicateOf", "fileName", "fileSize", "fileUrl", "id", "isProcessed", "openingBalance", "periodEnd", "periodStart", "processedAt", "processingTimezone", "statementDate", "totalDeposits", "totalWithdrawals", "updatedAt", "userId", "verificationStatus") SELECT "accountNumber", "bankAccountId", "bankName", "closingBalance", "contentHash", "createdAt", "discrepancyAmount", "duplicateOf", "fileName", "fileSize", "fileUrl", "id", "isProcessed", "openingBalance", "periodEnd", "periodStart", "processedAt", "processingTimezone", "statementDate", "totalDeposits", "totalWithdrawals", "updatedAt", "userId", "verificationStatus" FROM "BankStatement";
DROP TABLE "BankStatement";
ALTER TABLE "new_BankStatement" RENAME TO "BankStatement";
CREATE INDEX "BankStatement_userId_idx" ON "BankStatement"("userId");
CREATE INDEX "BankStatement_contentHash_idx" ON "BankStatement"("contentHash");
CREATE INDEX "BankStatement_status_idx" ON "BankStatement"("status");

-- Backfill: mark existing processed statements as "done"
UPDATE "BankStatement" SET "status" = 'done' WHERE "isProcessed" = 1;

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
