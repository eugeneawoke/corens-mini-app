CREATE TABLE IF NOT EXISTS "UserPhoto" (
  "userId" TEXT NOT NULL,
  "objectKey" TEXT NOT NULL,
  "objectVersionId" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "sizeBytes" INTEGER NOT NULL,
  "status" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "UserPhoto_pkey" PRIMARY KEY ("userId"),
  CONSTRAINT "UserPhoto_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "UserPhoto_objectKey_key" ON "UserPhoto"("objectKey");
CREATE INDEX IF NOT EXISTS "UserPhoto_status_updatedAt_idx" ON "UserPhoto"("status", "updatedAt");
