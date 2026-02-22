-- AlterTable
ALTER TABLE "Document" ADD COLUMN "googleDriveFileId" TEXT;

-- CreateTable
CREATE TABLE "GoogleDriveConnection" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "email" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "GoogleDriveConnection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "GoogleDriveConnection_userId_key" ON "GoogleDriveConnection"("userId");

-- CreateIndex
CREATE INDEX "Document_googleDriveFileId_idx" ON "Document"("googleDriveFileId");
