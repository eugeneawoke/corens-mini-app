import type {
  BeaconSummary,
  ConnectionSummary,
  ConsentStatusView,
  HomeSummary,
  ProfileSummary
} from "@corens/domain";
import { getMvpSnapshot } from "./mvp-data";

function getApiBaseUrl(): string | null {
  const baseUrl =
    process.env.CORENS_API_BASE_URL ?? process.env.NEXT_PUBLIC_CORENS_API_BASE_URL ?? null;

  return baseUrl ? baseUrl.replace(/\/$/, "") : null;
}

async function fetchFromApi<T>(path: string, fallback: T): Promise<T> {
  const baseUrl = getApiBaseUrl();

  if (!baseUrl) {
    return fallback;
  }

  try {
    const response = await fetch(`${baseUrl}${path}`, { cache: "no-store" });

    if (!response.ok) {
      return fallback;
    }

    return (await response.json()) as T;
  } catch {
    return fallback;
  }
}

export async function getHomeSummary(): Promise<HomeSummary> {
  return fetchFromApi("/api/home/summary", getMvpSnapshot().home);
}

export async function getProfileSummary(): Promise<ProfileSummary> {
  return fetchFromApi("/api/profile/summary", getMvpSnapshot().profile);
}

export async function getBeaconSummary(): Promise<BeaconSummary> {
  return fetchFromApi("/api/beacon/status", getMvpSnapshot().beacon);
}

export async function getCurrentConnection(): Promise<ConnectionSummary | null> {
  return fetchFromApi("/api/matching/current-connection", getMvpSnapshot().connection);
}

export async function getConsentStatus(
  channel: "contact" | "photo"
): Promise<ConsentStatusView | null> {
  const fallback =
    channel === "contact"
      ? getMvpSnapshot().connection?.contactConsent ?? null
      : getMvpSnapshot().connection?.photoConsent ?? null;

  return fetchFromApi(`/api/consents/${channel}`, fallback);
}
