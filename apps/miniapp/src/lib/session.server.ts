import { cookies } from "next/headers";
import { MINIAPP_SESSION_COOKIE } from "./session";

export async function getMiniAppSessionToken(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(MINIAPP_SESSION_COOKIE)?.value ?? null;
}
