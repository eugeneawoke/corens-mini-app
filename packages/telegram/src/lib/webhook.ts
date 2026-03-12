export function verifyTelegramWebhookSecret(
  receivedSecret: string | undefined,
  expectedSecret: string
): boolean {
  return Boolean(receivedSecret) && receivedSecret === expectedSecret;
}
