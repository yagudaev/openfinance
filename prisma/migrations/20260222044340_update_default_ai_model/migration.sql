-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_UserSettings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "fiscalYearEndMonth" INTEGER NOT NULL DEFAULT 12,
    "fiscalYearEndDay" INTEGER NOT NULL DEFAULT 31,
    "bankTimezone" TEXT NOT NULL DEFAULT 'America/Vancouver',
    "userTimezone" TEXT NOT NULL DEFAULT 'America/Vancouver',
    "aiContext" TEXT,
    "aiModel" TEXT NOT NULL DEFAULT 'openrouter/cerebras/zai-glm-4.7',
    "plaidClientId" TEXT,
    "plaidSecret" TEXT,
    "plaidEnvironment" TEXT NOT NULL DEFAULT 'sandbox',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "UserSettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_UserSettings" ("aiContext", "aiModel", "bankTimezone", "createdAt", "fiscalYearEndDay", "fiscalYearEndMonth", "id", "plaidClientId", "plaidEnvironment", "plaidSecret", "updatedAt", "userId", "userTimezone") SELECT "aiContext", "aiModel", "bankTimezone", "createdAt", "fiscalYearEndDay", "fiscalYearEndMonth", "id", "plaidClientId", "plaidEnvironment", "plaidSecret", "updatedAt", "userId", "userTimezone" FROM "UserSettings";
DROP TABLE "UserSettings";
ALTER TABLE "new_UserSettings" RENAME TO "UserSettings";
CREATE UNIQUE INDEX "UserSettings_userId_key" ON "UserSettings"("userId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
