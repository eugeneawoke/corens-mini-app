DROP INDEX IF EXISTS "MatchSession_pairKey_status_key";

CREATE UNIQUE INDEX "MatchSession_pairKey_active_key"
ON "MatchSession"("pairKey")
WHERE "status" = 'active';
