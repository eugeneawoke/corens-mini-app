ALTER TABLE "ConversationFeedback"
  ADD COLUMN IF NOT EXISTS "promptClaimedAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "ConversationFeedback_promptDueAt_promptedAt_promptClaimedAt_idx"
  ON "ConversationFeedback"("promptDueAt", "promptedAt", "promptClaimedAt");
