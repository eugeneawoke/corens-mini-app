"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { intentOptions, stateOptions, trustKeyGroups } from "@corens/domain/profile-options";
import { MINIAPP_SESSION_COOKIE } from "../lib/session";

async function sendApiMutation(path: string, init: RequestInit): Promise<void> {
  const baseUrl = process.env.CORENS_API_BASE_URL ?? process.env.NEXT_PUBLIC_CORENS_API_BASE_URL;
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(MINIAPP_SESSION_COOKIE)?.value;

  if (!baseUrl || !sessionToken) {
    throw new Error("Mini App session is required");
  }

  const response = await fetch(`${baseUrl.replace(/\/$/, "")}${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${sessionToken}`,
      ...(init.headers ?? {})
    },
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(`API mutation failed for ${path} with status ${response.status}`);
  }
}

export async function activateBeaconAction(formData: FormData): Promise<void> {
  const durationMinutesRaw = formData.get("durationMinutes");
  const durationMinutes = durationMinutesRaw ? Number(durationMinutesRaw) : undefined;

  await sendApiMutation("/api/beacon/activate", {
    method: "POST",
    body: JSON.stringify({ durationMinutes })
  });

  revalidatePath("/");
  revalidatePath("/beacon");
  redirect("/beacon");
}

export async function deactivateBeaconAction(): Promise<void> {
  await sendApiMutation("/api/beacon/deactivate", {
    method: "POST"
  });

  revalidatePath("/");
  revalidatePath("/beacon");
  revalidatePath("/connection");
  redirect("/connection");
}

export async function approveConsentAction(channel: "contact" | "photo", connectionId: string): Promise<void> {
  await sendApiMutation(`/api/consents/${channel}?connectionId=${connectionId}`, {
    method: "POST",
    body: JSON.stringify({ decision: "approved" })
  });

  revalidatePath("/connection");
  revalidatePath(`/connection/${connectionId}`);
  redirect(`/connection/${connectionId}`);
}

export async function declineConsentAction(channel: "contact" | "photo", connectionId: string): Promise<void> {
  await sendApiMutation(`/api/consents/${channel}?connectionId=${connectionId}`, {
    method: "POST",
    body: JSON.stringify({ decision: "declined" })
  });

  revalidatePath("/connection");
  revalidatePath(`/connection/${connectionId}`);
  redirect(`/connection/${connectionId}`);
}

export async function completeOnboardingAction(formData: FormData): Promise<void> {
  const displayName = String(formData.get("displayName") ?? "")
    .trim()
    .replace(/[\x00-\x1F\x7F]/g, "")
    .replace(/[\u200B-\u200D\uFEFF\u202A-\u202E]/g, "")
    .replace(/[<>&"']/g, "");
  const stateKey = String(formData.get("stateKey") ?? "");
  const intentKey = String(formData.get("intentKey") ?? "");
  const allowedTrustKeys = new Set(trustKeyGroups.flatMap((group) => group.items));
  const trustKeys = formData
    .getAll("trustKeys")
    .map((value) => String(value))
    .filter((value): value is (typeof trustKeyGroups)[number]["items"][number] =>
      allowedTrustKeys.has(value as (typeof trustKeyGroups)[number]["items"][number])
    );

  await sendApiMutation("/api/profile/onboarding", {
    method: "POST",
    body: JSON.stringify({
      displayName,
      stateKey,
      intentKey,
      trustKeys
    })
  });

  revalidateTag("profile");
  revalidatePath("/");
  revalidatePath("/profile");
  revalidatePath("/connection");
  redirect("/");
}

export async function updateStateIntentAction(formData: FormData): Promise<void> {
  const stateKey = String(formData.get("stateKey") ?? "");
  const intentKey = String(formData.get("intentKey") ?? "");

  if (!stateOptions.some((option) => option.key === stateKey)) {
    return;
  }

  if (intentKey.length > 0 && !intentOptions.some((option) => option.key === intentKey)) {
    return;
  }

  await sendApiMutation("/api/profile/state-intent", {
    method: "PATCH",
    body: JSON.stringify({ stateKey, intentKey })
  });

  revalidateTag("profile");
  revalidatePath("/profile");
  revalidatePath("/state-intent");
  revalidatePath("/connection");
  redirect("/profile");
}

export async function updateTrustKeysAction(formData: FormData): Promise<void> {
  const allowedTrustKeys = new Set(trustKeyGroups.flatMap((group) => group.items));
  const trustKeys = formData
    .getAll("trustKeys")
    .map((value) => String(value))
    .filter((value): value is (typeof trustKeyGroups)[number]["items"][number] =>
      allowedTrustKeys.has(value as (typeof trustKeyGroups)[number]["items"][number])
    );

  await sendApiMutation("/api/profile/trust-keys", {
    method: "PATCH",
    body: JSON.stringify({ trustKeys })
  });

  revalidateTag("profile");
  revalidatePath("/profile");
  revalidatePath("/trust-keys");
  revalidatePath("/connection");
  redirect("/profile");
}

export async function updateVisibilityAction(formData: FormData): Promise<void> {
  const isHidden = String(formData.get("isHidden") ?? "") === "true";

  await sendApiMutation("/api/privacy/visibility", {
    method: "PATCH",
    body: JSON.stringify({ isHidden })
  });

  revalidateTag("profile");
  revalidatePath("/privacy");
  revalidatePath("/profile");
  revalidatePath("/connection");
  redirect("/privacy");
}

// Same mutation but without redirect — used by the client-side toggle component
// so the page updates in-place via router.refresh() rather than doing a full navigation.
export async function toggleVisibilityAction(isHidden: boolean): Promise<void> {
  await sendApiMutation("/api/privacy/visibility", {
    method: "PATCH",
    body: JSON.stringify({ isHidden })
  });

  revalidateTag("profile");
  revalidatePath("/privacy");
  revalidatePath("/profile");
  revalidatePath("/connection");
}

export async function requestDeletionAction(formData: FormData): Promise<void> {
  const confirmation = String(formData.get("confirmation") ?? "");

  await sendApiMutation("/api/privacy/delete-request", {
    method: "POST",
    body: JSON.stringify({ confirmation })
  });

  const cookieStore = await cookies();
  cookieStore.delete(MINIAPP_SESSION_COOKIE);
  revalidateTag("profile");
  revalidatePath("/connection");
  revalidatePath("/profile");
  revalidatePath("/privacy");
  redirect("/");
}

export async function devResetAction(): Promise<void> {
  await sendApiMutation("/api/privacy/dev-reset", {
    method: "POST"
  });

  const cookieStore = await cookies();
  cookieStore.delete(MINIAPP_SESSION_COOKIE);
  revalidateTag("profile");
  revalidatePath("/");
  revalidatePath("/profile");
  revalidatePath("/connection");
  redirect("/");
}

export async function reportConnectionAction(connectionId: string, formData: FormData): Promise<void> {
  const note = String(formData.get("note") ?? "");

  await sendApiMutation("/api/moderation/report", {
    method: "POST",
    body: JSON.stringify({ note, connectionId })
  });

  revalidatePath("/connection");
  redirect("/connection");
}

export async function blockConnectionAction(connectionId: string, formData: FormData): Promise<void> {
  const note = String(formData.get("note") ?? "");

  await sendApiMutation("/api/moderation/block", {
    method: "POST",
    body: JSON.stringify({ note, connectionId })
  });

  revalidatePath("/connection");
  redirect("/connection");
}
