CREATE TABLE IF NOT EXISTS "ConversationFeedback" (
  "id" TEXT NOT NULL,
  "matchSessionId" TEXT NOT NULL,
  "participantUserId" TEXT NOT NULL,
  "callbackToken" TEXT NOT NULL,
  "contactOpenedAt" TIMESTAMP(3),
  "promptDueAt" TIMESTAMP(3) NOT NULL,
  "promptedAt" TIMESTAMP(3),
  "promptAttempts" INTEGER NOT NULL DEFAULT 0,
  "outcome" TEXT,
  "value" TEXT,
  "obstacle" TEXT,
  "nextIntent" TEXT,
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ConversationFeedback_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ConversationFeedback_matchSessionId_fkey"
    FOREIGN KEY ("matchSessionId") REFERENCES "MatchSession"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ConversationFeedback_participantUserId_fkey"
    FOREIGN KEY ("participantUserId") REFERENCES "User"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "ConversationFeedback_callbackToken_key"
  ON "ConversationFeedback"("callbackToken");
CREATE UNIQUE INDEX IF NOT EXISTS "ConversationFeedback_matchSessionId_participantUserId_key"
  ON "ConversationFeedback"("matchSessionId", "participantUserId");
CREATE INDEX IF NOT EXISTS "ConversationFeedback_promptDueAt_promptedAt_idx"
  ON "ConversationFeedback"("promptDueAt", "promptedAt");
CREATE INDEX IF NOT EXISTS "ConversationFeedback_matchSessionId_idx"
  ON "ConversationFeedback"("matchSessionId");
