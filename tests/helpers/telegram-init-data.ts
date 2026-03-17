import { createHmac } from "node:crypto";

interface InitDataUser {
  id: number;
  username?: string;
}

export function createTelegramInitData(params: {
  authDate?: number;
  botToken: string;
  queryId?: string;
  user: InitDataUser;
}): string {
  const authDate = params.authDate ?? Math.floor(Date.now() / 1000);
  const values = new URLSearchParams();

  values.set("auth_date", String(authDate));
  values.set("query_id", params.queryId ?? "AAEAAAE");
  values.set("user", JSON.stringify(params.user));

  const sortedEntries = Array.from(values.entries()).sort(([left], [right]) =>
    left.localeCompare(right)
  );
  const dataCheckString = sortedEntries.map(([key, value]) => `${key}=${value}`).join("\n");
  const secret = createHmac("sha256", "WebAppData").update(params.botToken).digest("hex");
  const hash = createHmac("sha256", Buffer.from(secret, "hex"))
    .update(dataCheckString)
    .digest("hex");

  values.set("hash", hash);

  return values.toString();
}
