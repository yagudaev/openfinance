-- CreateTable
CREATE TABLE "PlaidConnection" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "institutionName" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "cursor" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "errorMessage" TEXT,
    "lastSyncedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PlaidConnection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Transaction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "statementId" TEXT,
    "transactionDate" DATETIME NOT NULL,
    "description" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "balance" REAL,
    "transactionType" TEXT NOT NULL DEFAULT 'debit',
    "category" TEXT,
    "referenceNumber" TEXT,
    "sortOrder" INTEGER,
    "source" TEXT NOT NULL DEFAULT 'statement',
    "plaidId" TEXT,
    "isProvisional" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Transaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Transaction_statementId_fkey" FOREIGN KEY ("statementId") REFERENCES "BankStatement" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Transaction" ("amount", "balance", "category", "createdAt", "description", "id", "referenceNumber", "sortOrder", "statementId", "transactionDate", "transactionType", "updatedAt", "userId") SELECT "amount", "balance", "category", "createdAt", "description", "id", "referenceNumber", "sortOrder", "statementId", "transactionDate", "transactionType", "updatedAt", "userId" FROM "Transaction";
DROP TABLE "Transaction";
ALTER TABLE "new_Transaction" RENAME TO "Transaction";
CREATE INDEX "Transaction_userId_transactionDate_idx" ON "Transaction"("userId", "transactionDate");
CREATE INDEX "Transaction_statementId_idx" ON "Transaction"("statementId");
CREATE INDEX "Transaction_category_idx" ON "Transaction"("category");
CREATE INDEX "Transaction_plaidId_idx" ON "Transaction"("plaidId");
CREATE UNIQUE INDEX "Transaction_statementId_transactionDate_description_amount_balance_key" ON "Transaction"("statementId", "transactionDate", "description", "amount", "balance");
CREATE TABLE "new_UserSettings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "fiscalYearEndMonth" INTEGER NOT NULL DEFAULT 12,
    "fiscalYearEndDay" INTEGER NOT NULL DEFAULT 31,
    "bankTimezone" TEXT NOT NULL DEFAULT 'America/Vancouver',
    "userTimezone" TEXT NOT NULL DEFAULT 'America/Vancouver',
    "aiContext" TEXT,
    "aiModel" TEXT NOT NULL DEFAULT 'openai/gpt-4o-mini',
    "plaidClientId" TEXT,
    "plaidSecret" TEXT,
    "plaidEnvironment" TEXT NOT NULL DEFAULT 'sandbox',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "UserSettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_UserSettings" ("aiContext", "aiModel", "bankTimezone", "createdAt", "fiscalYearEndDay", "fiscalYearEndMonth", "id", "updatedAt", "userId", "userTimezone") SELECT "aiContext", "aiModel", "bankTimezone", "createdAt", "fiscalYearEndDay", "fiscalYearEndMonth", "id", "updatedAt", "userId", "userTimezone" FROM "UserSettings";
DROP TABLE "UserSettings";
ALTER TABLE "new_UserSettings" RENAME TO "UserSettings";
CREATE UNIQUE INDEX "UserSettings_userId_key" ON "UserSettings"("userId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "PlaidConnection_itemId_key" ON "PlaidConnection"("itemId");

-- CreateIndex
CREATE INDEX "PlaidConnection_userId_idx" ON "PlaidConnection"("userId");
