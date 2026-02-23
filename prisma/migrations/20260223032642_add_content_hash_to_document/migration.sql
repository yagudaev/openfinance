-- AlterTable
ALTER TABLE "Document" ADD COLUMN "contentHash" TEXT;

-- CreateIndex
CREATE INDEX "Document_contentHash_idx" ON "Document"("contentHash");
