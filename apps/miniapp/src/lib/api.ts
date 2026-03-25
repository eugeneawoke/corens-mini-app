import type {
  BeaconSummary,
  ConnectionSummary,
  ConsentStatusView,
  PhotoRevealSummary,
  PhotoSummary,
  ProfileSummary
} from "@corens/domain";
import { getMiniAppSessionToken } from "./session.server";

export class MiniAppSessionRequiredError extends Error {
  constructor() {
    super("Mini App session is required");
  }
}

export class MiniAppBackendUnavailableError extends Error {
  constructor(
    public readonly path: string,
    public readonly status?: number,
    options?: { cause?: unknown }
  ) {
    super(
      status
        ? `Mini App backend request failed for ${path} with status ${status}`
        : `Mini App backend request failed for ${path}`,
      options
    );
  }
}

function getApiBaseUrl(): string | null {
  const baseUrl =
    process.env.CORENS_API_BASE_URL ?? process.env.NEXT_PUBLIC_CORENS_API_BASE_URL ?? null;

  return baseUrl ? baseUrl.replace(/\/$/, "") : null;
}

async function fetchFromApi<T>(path: string, options?: { tags: string[] }): Promise<T> {
  const baseUrl = getApiBaseUrl();
  const sessionToken = await getMiniAppSessionToken();

  if (!baseUrl || !sessionToken) {
    throw new MiniAppSessionRequiredError();
  }

  let response: Response;

  try {
    response = await fetch(`${baseUrl}${path}`, {
      ...(options?.tags
        ? { next: { tags: options.tags, revalidate: false } }
        : { cache: "no-store" }),
      headers: {
        authorization: `Bearer ${sessionToken}`
      }
    });
  } catch (cause) {
    throw new MiniAppBackendUnavailableError(path, undefined, { cause });
  }

  if (response.status === 401 || response.status === 403) {
    throw new MiniAppSessionRequiredError();
  }

  if (!response.ok) {
    throw new MiniAppBackendUnavailableError(path, response.status);
  }

  try {
    return (await response.json()) as T;
  } catch (cause) {
    throw new MiniAppBackendUnavailableError(path, response.status, { cause });
  }
}

export async function getProfileSummary(): Promise<ProfileSummary> {
  // Cached indefinitely — invalidated via revalidateTag("profile") in every mutating action
  return fetchFromApi("/api/profile/summary", { tags: ["profile"] });
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

export async function getPhotoSummary(): Promise<PhotoSummary> {
  return fetchFromApi("/api/media/photo");
}

export async function getPhotoRevealSummary(): Promise<PhotoRevealSummary> {
  return fetchFromApi("/api/media/photo-reveal");
}
