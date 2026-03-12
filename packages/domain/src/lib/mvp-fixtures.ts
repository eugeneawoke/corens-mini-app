import { type BeaconStatus, type ConsentDecision } from "./enums";
import type { MatchingCandidate } from "./matching";
import type { VisibilityState } from "./privacy";
import { type MatchingEvaluation, evaluateMatchingCandidate } from "./matching-policy";
import { planDeletion } from "./privacy-policy";
import { resolveConsentRequest } from "./consent-policy";
import type {
  BeaconSummary,
  ConnectionSummary,
  ConsentStatusView,
  HomeSummary,
  ProfileSummary,
  SelectOption
} from "./miniapp-api";

const matchingConfig = {
  weights: {
    mood: 4,
    intent: 3,
    trustOverlap: 5,
    noConnectionsBonus: 2,
    recentMoodBonus: 1
  },
  limits: {
    activeConnections: 1
  }
} as const;

const consentConfig = {
  contact: {
    requiresMutualConsent: true,
    softWarningRequired: true,
    exposedArtifact: "telegram_deep_link" as const
  },
  photo: {
    requiresMutualConsent: true,
    exposedArtifact: "photo_asset" as const
  }
} as const;

const privacyRules = {
  hiddenProfileClosesPendingConnection: false,
  deletion: {
    revokeSessionsImmediately: true,
    expireBeaconImmediately: true,
    closeOpenConsentsImmediately: true
  }
} as const;

export const stateOptions: ReadonlyArray<SelectOption> = [
  {
    key: "calm",
    label: "Спокойствие",
    description: "Ровный, мягкий темп без перегруза."
  },
  {
    key: "reflective",
    label: "Рефлексия",
    description: "Хочется вдумчивого разговора и тишины."
  },
  {
    key: "curious",
    label: "Любопытство",
    description: "Есть энергия на знакомство и новые пересечения."
  },
  {
    key: "rest",
    label: "Отдых",
    description: "Нужен деликатный, спокойный контакт."
  }
];

export const intentOptions: ReadonlyArray<SelectOption> = [
  {
    key: "slow-dialogue",
    label: "Медленный диалог",
    description: "Без спешки, с длинными паузами и вниманием."
  },
  {
    key: "gentle-meeting",
    label: "Аккуратное знакомство",
    description: "Открыт к новому контакту, но без давления."
  },
  {
    key: "supportive-presence",
    label: "Присутствие рядом",
    description: "Важно просто быть на связи и не форсировать."
  },
  {
    key: "practical-talk",
    label: "Предметный разговор",
    description: "Хочется конкретики и понятных ожиданий."
  }
];

export const trustKeyGroups = [
  {
    title: "Ценности",
    items: ["Тишина", "Честность", "Бережность", "Доброта", "Свобода", "Уважение"]
  },
  {
    title: "Ритм взаимодействия",
    items: ["Чай", "Прогулки", "Глубокие разговоры", "Паузы", "Теплый юмор"]
  }
] as const;

export interface DemoProfileState {
  displayName: string;
  handle: string;
  stateKey: string;
  intentKey: string;
  trustKeys: string[];
  visibility: VisibilityState;
}

export interface DemoConnectionState {
  displayName: string;
  trustLevel: number;
  selfCandidate: MatchingCandidate;
  peerCandidate: MatchingCandidate;
  contactActorDecision: ConsentDecision;
  contactPeerDecision: ConsentDecision;
  photoActorDecision: ConsentDecision;
  photoPeerDecision: ConsentDecision;
}

export interface DemoBeaconState {
  status: BeaconStatus;
  remainingLabel: string;
  cooldownLabel?: string;
}

export interface DemoMvpState {
  profile: DemoProfileState;
  connection: DemoConnectionState | null;
  beacon: DemoBeaconState;
}

export function createDemoMvpState(): DemoMvpState {
  return {
    profile: {
      displayName: "Мария",
      handle: "@maria_user",
      stateKey: "calm",
      intentKey: "slow-dialogue",
      trustKeys: ["Тишина", "Честность", "Бережность"],
      visibility: {
        userId: "user-self",
        isHidden: false,
        matchingEnabled: true
      }
    },
    connection: {
      displayName: "Алексей",
      trustLevel: 2,
      selfCandidate: {
        userId: "user-self",
        stateKey: "calm",
        intentKey: "slow-dialogue",
        trustKeys: ["тишина", "честность", "бережность", "чай"],
        activeConnectionsCount: 0,
        matchingEnabled: true,
        isHidden: false
      },
      peerCandidate: {
        userId: "user-peer",
        stateKey: "calm",
        intentKey: "slow-dialogue",
        trustKeys: ["тишина", "честность", "чай"],
        activeConnectionsCount: 0,
        matchingEnabled: true,
        isHidden: false
      },
      contactActorDecision: "approved",
      contactPeerDecision: "pending",
      photoActorDecision: "pending",
      photoPeerDecision: "pending"
    },
    beacon: {
      status: "inactive",
      remainingLabel: "2:00:00"
    }
  };
}

export function createProfileSummary(state: DemoMvpState): ProfileSummary {
  const selectedState = findOption(stateOptions, state.profile.stateKey);
  const selectedIntent = findOption(intentOptions, state.profile.intentKey);

  return {
    profile: {
      displayName: state.profile.displayName,
      handle: state.profile.handle
    },
    state: {
      current: selectedState,
      options: stateOptions,
      cooldownLabel: "Изменение станет доступно через 12:00"
    },
    intent: {
      current: selectedIntent,
      options: intentOptions
    },
    trustKeys: {
      selected: state.profile.trustKeys,
      groups: trustKeyGroups,
      limitLabel: `Выбрано ${state.profile.trustKeys.length} из 5`,
      cooldownLabel: "Следующее изменение через 13 дней"
    },
    privacy: {
      visibility: state.profile.visibility,
      privacyCopy:
        "Скрытый профиль исключается из новых подборов, но не ломает уже найденную pending-связь.",
      switches: [
        {
          title: "Участвовать в автоматическом matching",
          description: "Когда выключено, новые автоматические связи не создаются.",
          checked: state.profile.visibility.matchingEnabled
        },
        {
          title: "Скрыть профиль из новых подборов",
          description: "Beacon и открытые consent flow остаются под вашим контролем.",
          checked: state.profile.visibility.isHidden
        }
      ],
      deletionPlan: planDeletion(state.profile.visibility, privacyRules)
    }
  };
}

export function createConnectionSummary(state: DemoMvpState): ConnectionSummary | null {
  if (!state.connection) {
    return null;
  }

  const evaluation = evaluateMatching(state.connection.selfCandidate, state.connection.peerCandidate);

  if (!evaluation.isEligible) {
    return null;
  }

  return {
    displayName: state.connection.displayName,
    matchScore: evaluation.score,
    trustLevel: state.connection.trustLevel,
    sharedKeys: ["Тишина", "Честность", "Чай"],
    sharedState: "Спокойный ритм",
    statusCopy: "Совпадение подтверждено backend matching policy.",
    contactConsent: createConsentStatus(
      "contact",
      state.connection.contactActorDecision,
      state.connection.contactPeerDecision
    ),
    photoConsent: createConsentStatus(
      "photo",
      state.connection.photoActorDecision,
      state.connection.photoPeerDecision
    )
  };
}

export function createBeaconSummary(state: DemoMvpState): BeaconSummary {
  return {
    status: state.beacon.status,
    remainingLabel: state.beacon.remainingLabel,
    description:
      "Режим ручного поиска включается на фиксированное время и не заменяет автоматический matching.",
    durationLabel: "2 часа",
    cooldownLabel: state.beacon.cooldownLabel
  };
}

export function createHomeSummary(state: DemoMvpState): HomeSummary {
  const profileSummary = createProfileSummary(state);

  return {
    profile: profileSummary.profile,
    state: profileSummary.state.current,
    intent: profileSummary.intent.current,
    beacon: createBeaconSummary(state),
    connection: createConnectionSummary(state)
  };
}

export function createConsentStatus(
  channel: "contact" | "photo",
  actorDecision: ConsentDecision,
  peerDecision: ConsentDecision
): ConsentStatusView {
  const resolution = resolveConsentRequest(
    {
      matchSessionId: "match-001",
      requestedByUserId: "user-self",
      channel,
      decisionByActor: actorDecision,
      decisionByPeer: peerDecision
    },
    consentConfig
  );

  return {
    channel,
    status: resolution.status,
    warnings: resolution.warnings,
    artifactType: resolution.artifact?.artifactType
  };
}

function evaluateMatching(self: MatchingCandidate, candidate: MatchingCandidate): MatchingEvaluation {
  return evaluateMatchingCandidate(
    {
      self,
      candidate,
      moodScore: 1,
      intentScore: 1,
      moodUpdatedRecently: true,
      hasPairExclusion: false,
      hasActivePairMatch: false
    },
    matchingConfig
  );
}

function findOption(options: ReadonlyArray<SelectOption>, key: string): SelectOption {
  return options.find((option) => option.key === key) ?? options[0];
}
