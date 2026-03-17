import type { AuthBootstrapResponse } from "@corens/domain";

export async function bootstrapMiniAppSession(initData: string): Promise<AuthBootstrapResponse> {
  const response = await fetch("/auth/bootstrap", {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    credentials: "include",
    body: JSON.stringify({ initData })
  });

  if (!response.ok) {
    throw new Error("Unable to bootstrap authenticated Mini App session");
  }

  return (await response.json()) as AuthBootstrapResponse;
}
