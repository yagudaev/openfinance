-- CreateTable
CREATE TABLE "DailyAccountBalance" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "date" DATETIME NOT NULL,
    "accountId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "balance" REAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DailyAccountBalance_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "NetWorthAccount" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DailyAccountBalance_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DailyNetWorth" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "date" DATETIME NOT NULL,
    "userId" TEXT NOT NULL,
    "totalAssets" REAL NOT NULL,
    "totalLiabilities" REAL NOT NULL,
    "netWorth" REAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DailyNetWorth_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "DailyAccountBalance_userId_date_idx" ON "DailyAccountBalance"("userId", "date");

-- CreateIndex
CREATE INDEX "DailyAccountBalance_accountId_idx" ON "DailyAccountBalance"("accountId");

-- CreateIndex
CREATE UNIQUE INDEX "DailyAccountBalance_date_accountId_key" ON "DailyAccountBalance"("date", "accountId");

-- CreateIndex
CREATE INDEX "DailyNetWorth_userId_date_idx" ON "DailyNetWorth"("userId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "DailyNetWorth_userId_date_key" ON "DailyNetWorth"("userId", "date");
