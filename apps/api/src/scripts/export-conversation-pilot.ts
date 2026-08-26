import "reflect-metadata";
import { createHmac } from "node:crypto";
import {
  CONVERSATION_OBSTACLES,
  CONVERSATION_VALUES,
  NEXT_CONVERSATION_INTENTS,
  deriveConversationPairStatus,
  type ConversationObstacle,
  type ConversationOutcome,
  type ConversationPairStatus,
  type ConversationValue,
  type NextConversationIntent
} from "@corens/domain";
import type { PrismaClient } from "@corens/db";
import { PrismaService } from "../prisma.service";

const COHORT_LABEL_PATTERN = /^[a-z0-9][a-z0-9._-]{0,63}$/i;
const MINIMUM_PSEUDONYM_KEY_LENGTH = 32;

export interface ConversationPilotParticipantSource {
  userId: string;
  onboardingCompleted: boolean;
}

export interface ConversationPilotConsentSource {
  participantUserId: string;
  status: string;
}

export interface ConversationPilotFeedbackSource {
  participantUserId: string;
  contactOpenedAt: Date | null;
  outcome: ConversationOutcome | null;
  value: ConversationValue | null;
  obstacle: ConversationObstacle | null;
  nextIntent: NextConversationIntent | null;
}

export interface ConversationPilotMatchSource {
  id: string;
  createdAt: Date;
  participantUserIds: readonly [string, string];
  contactConsents: ReadonlyArray<ConversationPilotConsentSource>;
  feedback: ReadonlyArray<ConversationPilotFeedbackSource>;
}

export interface ConversationPilotExportInput {
  cohort: {
    label: string;
    from: Date;
    to: Date;
  };
  pseudonymizationKey: string;
  participants: ReadonlyArray<ConversationPilotParticipantSource>;
  matches: ReadonlyArray<ConversationPilotMatchSource>;
}

export interface ConversationPilotExportArgs {
  cohortLabel: string;
  from: Date;
  to: Date;
  pseudonymizationKey: string;
}

function emptyCounts<const T extends readonly string[]>(values: T): Record<T[number], number> {
  return Object.fromEntries(values.map((value) => [value, 0])) as Record<
    T[number],
    number
  >;
}

function utcWeekStart(value: Date): string {
  const start = new Date(
    Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate())
  );
  const daysSinceMonday = (start.getUTCDay() + 6) % 7;
  start.setUTCDate(start.getUTCDate() - daysSinceMonday);
  return start.toISOString().slice(0, 10);
}

function pseudonymizeMatchId(matchSessionId: string, key: string): string {
  const digest = createHmac("sha256", key).update(matchSessionId).digest().subarray(0, 16);
  return `m_${digest.toString("base64url")}`;
}

function validateExportBoundary(input: ConversationPilotExportInput): void {
  if (!COHORT_LABEL_PATTERN.test(input.cohort.label)) {
    throw new Error("Cohort label must be a privacy-safe slug");
  }
  if (!Number.isFinite(input.cohort.from.getTime()) || !Number.isFinite(input.cohort.to.getTime())) {
    throw new Error("--from and --to must be valid ISO dates");
  }
  if (input.cohort.from >= input.cohort.to) {
    throw new Error("--from must be earlier than --to");
  }
  if (input.pseudonymizationKey.length < MINIMUM_PSEUDONYM_KEY_LENGTH) {
    throw new Error(
      `PILOT_EXPORT_PSEUDONYM_KEY must be at least ${MINIMUM_PSEUDONYM_KEY_LENGTH} characters`
    );
  }
}

export function buildConversationPilotExport(input: ConversationPilotExportInput) {
  validateExportBoundary(input);

  const cohortMatches = input.matches
    .filter(
      (match) => match.createdAt >= input.cohort.from && match.createdAt < input.cohort.to
    )
    .sort(
      (left, right) =>
        left.createdAt.getTime() - right.createdAt.getTime() ||
        left.id.localeCompare(right.id)
    );
  const cohortParticipantIds = new Set(
    cohortMatches.flatMap((match) => [...match.participantUserIds])
  );
  const pairStatuses: Record<ConversationPairStatus, number> = {
    awaiting_reports: 0,
    one_sided_report: 0,
    conflicting_reports: 0,
    mutually_confirmed: 0
  };
  const valueAnswers = emptyCounts(CONVERSATION_VALUES);
  const nextIntentAnswers = emptyCounts(NEXT_CONVERSATION_INTENTS);
  const nonConversationObstacles = emptyCounts(CONVERSATION_OBSTACLES);
  const northStarByWeek = new Map<string, number>();

  const matches = cohortMatches.map((match) => {
    const participantIds = new Set(match.participantUserIds);
    const feedback = match.feedback.filter((item) =>
      participantIds.has(item.participantUserId)
    );
    const pairStatus = deriveConversationPairStatus(
      match.id,
      feedback.map((item) => ({
        matchSessionId: match.id,
        participantUserId: item.participantUserId,
        outcome: item.outcome
      }))
    );
    const approvedParticipants = new Set(
      match.contactConsents
        .filter(
          (consent) =>
            participantIds.has(consent.participantUserId) && consent.status === "approved"
        )
        .map((consent) => consent.participantUserId)
    );
    const matchCohortWeek = utcWeekStart(match.createdAt);
    const mutuallyConfirmed = pairStatus === "mutually_confirmed";

    pairStatuses[pairStatus] += 1;
    northStarByWeek.set(
      matchCohortWeek,
      (northStarByWeek.get(matchCohortWeek) ?? 0) + (mutuallyConfirmed ? 1 : 0)
    );

    for (const item of feedback) {
      if (item.value && item.outcome === "talked") valueAnswers[item.value] += 1;
      if (item.nextIntent) nextIntentAnswers[item.nextIntent] += 1;
      if (item.obstacle && item.outcome && item.outcome !== "talked") {
        nonConversationObstacles[item.obstacle] += 1;
      }
    }

    return {
      matchId: pseudonymizeMatchId(match.id, input.pseudonymizationKey),
      matchCohortWeek,
      pairStatus,
      mutualContactApproved: approvedParticipants.size === participantIds.size,
      contactHandoffOpened: feedback.some((item) => item.contactOpenedAt !== null),
      conversationReported: feedback.some((item) => item.outcome === "talked"),
      mutuallyConfirmed,
      conversationUseful:
        mutuallyConfirmed &&
        feedback.some(
          (item) =>
            item.outcome === "talked" && (item.value === "yes" || item.value === "partly")
        ),
      anotherConversationRequested: feedback.some(
        (item) => item.nextIntent === "now" || item.nextIntent === "later"
      )
    };
  });

  return {
    schemaVersion: "conversation-pilot.v1" as const,
    cohort: {
      label: input.cohort.label,
      from: input.cohort.from.toISOString(),
      to: input.cohort.to.toISOString(),
      boundary: "match_created_at_from_inclusive_to_exclusive" as const
    },
    aggregates: {
      onboardingCompletedParticipants: input.participants.filter(
        (participant) =>
          cohortParticipantIds.has(participant.userId) && participant.onboardingCompleted
      ).length,
      matchSessions: matches.length,
      mutualContactApprovals: matches.filter((match) => match.mutualContactApproved).length,
      contactHandoffOpened: matches.filter((match) => match.contactHandoffOpened).length,
      conversationReported: matches.filter((match) => match.conversationReported).length,
      oneSidedConversationReports: pairStatuses.one_sided_report,
      conversationMutuallyConfirmed: pairStatuses.mutually_confirmed,
      conversationUseful: matches.filter((match) => match.conversationUseful).length,
      anotherConversationRequested: matches.filter(
        (match) => match.anotherConversationRequested
      ).length,
      pairStatuses,
      valueAnswers,
      nextIntentAnswers,
      nonConversationObstacles
    },
    northStarByMatchCohortWeek: [...northStarByWeek.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([weekStart, mutuallyConfirmedConversations]) => ({
        weekStart,
        mutuallyConfirmedConversations
      })),
    matches
  };
}

function getArgument(argv: string[], name: string): string {
  const inline = argv.find((argument) => argument.startsWith(`${name}=`));
  if (inline) return inline.slice(name.length + 1);

  const index = argv.indexOf(name);
  return index >= 0 ? (argv[index + 1] ?? "") : "";
}

export function parseConversationPilotExportArgs(
  argv: string[],
  pseudonymizationKey: string | undefined
): ConversationPilotExportArgs {
  const cohortLabel = getArgument(argv, "--cohort");
  const from = new Date(getArgument(argv, "--from"));
  const to = new Date(getArgument(argv, "--to"));
  const parsed = {
    cohort: { label: cohortLabel, from, to },
    pseudonymizationKey: pseudonymizationKey ?? "",
    participants: [],
    matches: []
  } satisfies ConversationPilotExportInput;

  validateExportBoundary(parsed);
  return { cohortLabel, from, to, pseudonymizationKey: parsed.pseudonymizationKey };
}

export async function loadConversationPilotExport(
  client: PrismaClient,
  args: ConversationPilotExportArgs
) {
  const rawMatches = await client.matchSession.findMany({
    where: { createdAt: { gte: args.from, lt: args.to } },
    select: { id: true, createdAt: true, userAId: true, userBId: true },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }]
  });
  const matchSessionIds = rawMatches.map((match) => match.id);
  const participantUserIds = [
    ...new Set(rawMatches.flatMap((match) => [match.userAId, match.userBId]))
  ];
  const [participants, contactConsents, feedback] = await Promise.all([
    client.profile.findMany({
      where: { userId: { in: participantUserIds } },
      select: { userId: true, onboardingCompleted: true }
    }),
    client.contactConsent.findMany({
      where: { matchSessionId: { in: matchSessionIds } },
      select: { matchSessionId: true, requestedBy: true, requestStatus: true }
    }),
    client.conversationFeedback.findMany({
      where: { matchSessionId: { in: matchSessionIds } },
      select: {
        matchSessionId: true,
        participantUserId: true,
        contactOpenedAt: true,
        outcome: true,
        value: true,
        obstacle: true,
        nextIntent: true
      }
    })
  ]);

  return buildConversationPilotExport({
    cohort: { label: args.cohortLabel, from: args.from, to: args.to },
    pseudonymizationKey: args.pseudonymizationKey,
    participants,
    matches: rawMatches.map((match) => ({
      id: match.id,
      createdAt: match.createdAt,
      participantUserIds: [match.userAId, match.userBId],
      contactConsents: contactConsents
        .filter((consent) => consent.matchSessionId === match.id)
        .map((consent) => ({
          participantUserId: consent.requestedBy,
          status: consent.requestStatus
        })),
      feedback: feedback
        .filter((item) => item.matchSessionId === match.id)
        .map((item) => ({
          participantUserId: item.participantUserId,
          contactOpenedAt: item.contactOpenedAt,
          outcome: item.outcome as ConversationOutcome | null,
          value: item.value as ConversationValue | null,
          obstacle: item.obstacle as ConversationObstacle | null,
          nextIntent: item.nextIntent as NextConversationIntent | null
        }))
    }))
  });
}

async function main(): Promise<void> {
  const prisma = new PrismaService();
  try {
    const args = parseConversationPilotExportArgs(
      process.argv.slice(2),
      process.env.PILOT_EXPORT_PSEUDONYM_KEY
    );
    const result = await loadConversationPilotExport(prisma.clientInstance, args);
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  } finally {
    await prisma.onModuleDestroy();
  }
}

if (require.main === module) {
  void main().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`${message}\n`);
    process.exitCode = 1;
  });
}
