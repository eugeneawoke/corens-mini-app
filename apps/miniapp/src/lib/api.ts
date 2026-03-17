import type { BeaconSummary, ConnectionSummary, ConsentStatusView, ProfileSummary } from "@corens/domain";
import { getMiniAppSessionToken } from "./session.server";

export class MiniAppSessionRequiredError extends Error {
  constructor() {
    super("Mini App session is required");
  }
}

function getApiBaseUrl(): string | null {
  const baseUrl =
    process.env.CORENS_API_BASE_URL ?? process.env.NEXT_PUBLIC_CORENS_API_BASE_URL ?? null;

  return baseUrl ? baseUrl.replace(/\/$/, "") : null;
}

async function fetchFromApi<T>(path: string): Promise<T> {
  const baseUrl = getApiBaseUrl();
  const sessionToken = await getMiniAppSessionToken();

  if (!baseUrl || !sessionToken) {
    throw new MiniAppSessionRequiredError();
  }

  const response = await fetch(`${baseUrl}${path}`, {
    cache: "no-store",
    headers: {
      authorization: `Bearer ${sessionToken}`
    }
  });

  if (response.status === 401 || response.status === 403) {
    throw new MiniAppSessionRequiredError();
  }

  if (!response.ok) {
    throw new Error(`API request failed for ${path} with status ${response.status}`);
  }

  return (await response.json()) as T;
}

export async function getProfileSummary(): Promise<ProfileSummary> {
  return fetchFromApi("/api/profile/summary");
}

export async function getBeaconSummary(): Promise<BeaconSummary> {
  return fetchFromApi("/api/beacon/status");
}

export async function getCurrentConnection(): Promise<ConnectionSummary | null> {
  return fetchFromApi("/api/matching/current-connection");
}

export async function getConsentStatus(
  channel: "contact" | "photo"
): Promise<ConsentStatusView | null> {
  return fetchFromApi(`/api/consents/${channel}`);
}
