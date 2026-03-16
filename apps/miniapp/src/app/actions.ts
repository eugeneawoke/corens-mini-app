"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { intentOptions, stateOptions, trustKeyGroups } from "@corens/domain";

async function sendApiMutation(path: string, init: RequestInit): Promise<void> {
  const baseUrl = process.env.CORENS_API_BASE_URL ?? process.env.NEXT_PUBLIC_CORENS_API_BASE_URL;

  if (!baseUrl) {
    return;
  }

  await fetch(`${baseUrl.replace(/\/$/, "")}${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(init.headers ?? {})
    },
    cache: "no-store"
  });
}

export async function activateBeaconAction(): Promise<void> {
  await sendApiMutation("/api/beacon/activate", {
    method: "POST"
  });

  revalidatePath("/");
  revalidatePath("/beacon");
  redirect("/beacon");
}

export async function approveConsentAction(channel: "contact" | "photo"): Promise<void> {
  await sendApiMutation(`/api/consents/${channel}`, {
    method: "POST",
    body: JSON.stringify({ decision: "approved" })
  });

  revalidatePath("/connection");
  revalidatePath(`/${channel === "contact" ? "contact-consent" : "photo-reveal"}`);
  redirect("/connection");
}

export async function completeOnboardingAction(formData: FormData): Promise<void> {
  const displayName = String(formData.get("displayName") ?? "").trim();
  const stateKey = String(formData.get("stateKey") ?? "");
  const intentKey = String(formData.get("intentKey") ?? "");
  const allowedTrustKeys = new Set(trustKeyGroups.flatMap((group) => group.items));
  const trustKeys = formData
    .getAll("trustKeys")
    .map((value) => String(value))
    .filter((value): value is (typeof trustKeyGroups)[number]["items"][number] =>
      allowedTrustKeys.has(value as (typeof trustKeyGroups)[number]["items"][number])
    )
    .slice(0, 5);

  await sendApiMutation("/api/profile/onboarding", {
    method: "POST",
    body: JSON.stringify({
      displayName,
      stateKey,
      intentKey,
      trustKeys
    })
  });

  revalidatePath("/");
  revalidatePath("/profile");
  redirect("/");
}

export async function updateStateIntentAction(formData: FormData): Promise<void> {
  const stateKey = String(formData.get("stateKey") ?? "");
  const intentKey = String(formData.get("intentKey") ?? "");

  if (!stateOptions.some((option) => option.key === stateKey)) {
    return;
  }

  if (!intentOptions.some((option) => option.key === intentKey)) {
    return;
  }

  await sendApiMutation("/api/profile/state-intent", {
    method: "PATCH",
    body: JSON.stringify({ stateKey, intentKey })
  });

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
    )
    .slice(0, 5);

  if (trustKeys.length === 0) {
    return;
  }

  await sendApiMutation("/api/profile/trust-keys", {
    method: "PATCH",
    body: JSON.stringify({ trustKeys })
  });

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

  revalidatePath("/privacy");
  revalidatePath("/profile");
  revalidatePath("/connection");
  redirect("/privacy");
}
