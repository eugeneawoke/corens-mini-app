import { createHmac, timingSafeEqual } from "node:crypto";

export interface TelegramInitDataUser {
  id: number;
  username?: string;
  first_name?: string;
  last_name?: string;
  language_code?: string;
}

export interface InitDataValidationResult {
  isValid: boolean;
  reason?: string;
  authDate?: number;
  rawUser?: TelegramInitDataUser;
  userId?: string;
  username?: string | null;
}

export interface ValidateTelegramInitDataOptions {
  maxAgeSeconds?: number;
  now?: Date;
}

export function validateTelegramInitData(
  rawInitData: string,
  botToken: string,
  options: ValidateTelegramInitDataOptions = {}
): InitDataValidationResult {
  if (!rawInitData.trim()) {
    return {
      isValid: false,
      reason: "missing_init_data"
    };
  }

  const params = new URLSearchParams(rawInitData);
  const hash = params.get("hash");

  if (!hash) {
    return {
      isValid: false,
      reason: "missing_hash"
    };
  }

  const entries = Array.from(params.entries())
    .filter(([key]) => key !== "hash")
    .sort(([left], [right]) => left.localeCompare(right));
  const dataCheckString = entries.map(([key, value]) => `${key}=${value}`).join("\n");
  const secret = createHmac("sha256", "WebAppData").update(botToken).digest();
  const digest = createHmac("sha256", secret).update(dataCheckString).digest("hex");

  try {
    if (
      hash.length !== digest.length ||
      !timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(digest, "hex"))
    ) {
      return {
        isValid: false,
        reason: "invalid_hash"
      };
    }
  } catch {
    return {
      isValid: false,
      reason: "invalid_hash"
    };
  }

  const authDate = Number(params.get("auth_date"));

  if (!Number.isFinite(authDate)) {
    return {
      isValid: false,
      reason: "missing_auth_date"
    };
  }

  const nowSeconds = Math.floor((options.now ?? new Date()).getTime() / 1000);
  const maxAgeSeconds = options.maxAgeSeconds ?? 300;

  if (nowSeconds - authDate > maxAgeSeconds) {
    return {
      isValid: false,
      reason: "stale_auth_date"
    };
  }

  const rawUser = params.get("user");

  if (!rawUser) {
    return {
      isValid: false,
      reason: "missing_user"
    };
  }

  try {
    const user = JSON.parse(rawUser) as TelegramInitDataUser;

    if (!user?.id) {
      return {
        isValid: false,
        reason: "invalid_user_payload"
      };
    }

    return {
      isValid: true,
      authDate,
      rawUser: user,
      userId: String(user.id),
      username: user.username ?? null
    };
  } catch {
    return {
      isValid: false,
      reason: "invalid_user_payload"
    };
  }
}
