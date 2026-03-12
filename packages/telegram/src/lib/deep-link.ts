export function createTelegramDeepLink(usernameOrBotPath: string): string {
  return `https://t.me/${usernameOrBotPath}`;
}
