"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

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
