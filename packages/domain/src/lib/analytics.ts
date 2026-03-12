export type AnalyticsEventName =
  | "onboarding.completed"
  | "profile.state_updated"
  | "matching.recompute_requested"
  | "beacon.activated"
  | "consent.contact_requested"
  | "privacy.delete_requested";

export interface AnalyticsEvent {
  name: AnalyticsEventName;
  actorUserId?: string;
  occurredAt: string;
  properties: Record<string, string | number | boolean | null>;
}
