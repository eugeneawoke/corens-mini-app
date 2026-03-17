ALTER TABLE "MatchSession"
ADD COLUMN "pairKey" TEXT;

UPDATE "MatchSession"
SET "pairKey" = CASE
  WHEN "userAId" <= "userBId" THEN "userAId" || ':' || "userBId"
  ELSE "userBId" || ':' || "userAId"
END
WHERE "pairKey" IS NULL;

ALTER TABLE "MatchSession"
ALTER COLUMN "pairKey" SET NOT NULL;

CREATE UNIQUE INDEX "MatchSession_pairKey_status_key" ON "MatchSession"("pairKey", "status");
CREATE INDEX "MatchSession_userAId_status_idx" ON "MatchSession"("userAId", "status");
CREATE INDEX "MatchSession_userBId_status_idx" ON "MatchSession"("userBId", "status");

CREATE TABLE "Session" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "revokedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Session_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "Session_userId_expiresAt_idx" ON "Session"("userId", "expiresAt");
