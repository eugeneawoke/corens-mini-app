"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { trustKeyGroups } from "@corens/domain";

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
