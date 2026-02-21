-- CreateTable
CREATE TABLE "ChatTrace" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "threadId" TEXT,
    "model" TEXT NOT NULL,
    "inputTokens" INTEGER,
    "outputTokens" INTEGER,
    "totalTokens" INTEGER,
    "latencyMs" INTEGER,
    "finishReason" TEXT,
    "steps" TEXT NOT NULL,
    "userMessage" TEXT,
    "assistantText" TEXT,
    "error" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ChatTrace_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "ChatTrace_userId_idx" ON "ChatTrace"("userId");

-- CreateIndex
CREATE INDEX "ChatTrace_threadId_idx" ON "ChatTrace"("threadId");

-- CreateIndex
CREATE INDEX "ChatTrace_createdAt_idx" ON "ChatTrace"("createdAt");
