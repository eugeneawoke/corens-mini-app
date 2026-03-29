import { timingSafeEqual } from "node:crypto";

export function verifyTelegramWebhookSecret(
  receivedSecret: string | undefined,
  expectedSecret: string
): boolean {
  if (!receivedSecret) {
    return false;
  }

  const actual = Buffer.from(receivedSecret);
  const expected = Buffer.from(expectedSecret);

  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
