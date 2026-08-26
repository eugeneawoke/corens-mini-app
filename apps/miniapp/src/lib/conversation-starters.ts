export const UNIVERSAL_CONVERSATION_STARTERS = [
  "Привет. Хочешь немного поговорить? Можем начать с любой темы. Можно не подбирать правильные слова.",
  "Привет. Хочешь немного поговорить? С чего тебе было бы проще начать? Я готов тебя послушать.",
  "Привет. Хочешь немного поговорить? Можешь просто рассказать, что сейчас происходит.",
  "Привет. Если хочешь, можем немного поговорить. Необязательно сразу объяснять всё."
] as const;

type ClipboardWriter = {
  writeText(text: string): Promise<void>;
};

export function selectConversationStarter(connectionId: string): string {
  let hash = 2166136261;

  for (let index = 0; index < connectionId.length; index += 1) {
    hash ^= connectionId.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return UNIVERSAL_CONVERSATION_STARTERS[(hash >>> 0) % UNIVERSAL_CONVERSATION_STARTERS.length]!;
}

export async function copyConversationStarter(
  text: string,
  clipboard: ClipboardWriter | undefined
): Promise<boolean> {
  if (!clipboard) {
    return false;
  }

  try {
    await clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
