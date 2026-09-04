import {
  getProfileContentActionError,
  type ProfileContentActionState,
  type ProfileContentField
} from "./profile-content-errors";

type ProfileContentMutationOptions = {
  field: ProfileContentField;
  baseUrl: string;
  sessionToken: string;
  path: string;
  init: RequestInit;
  fetchImpl?: typeof fetch;
};

export async function executeProfileContentMutation({
  field,
  baseUrl,
  sessionToken,
  path,
  init,
  fetchImpl = fetch
}: ProfileContentMutationOptions): Promise<ProfileContentActionState> {
  try {
    const response = await fetchImpl(`${baseUrl.replace(/\/$/, "")}${path}`, {
      ...init,
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${sessionToken}`,
        ...(init.headers ?? {})
      },
      cache: "no-store"
    });

    if (response.ok) {
      return null;
    }

    return getProfileContentActionError(field, await response.json().catch(() => null));
  } catch {
    return getProfileContentActionError(field, null);
  }
}
