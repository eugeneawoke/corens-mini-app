export type ProfileContentCategory = "abusive" | "contact" | "advertising";
export type ProfileContentField = "displayName" | "about";

export type ProfileContentActionState = {
  error?: {
    field: ProfileContentField;
    category: ProfileContentCategory | null;
    message: string;
  };
} | null;

const safeMessages: Record<ProfileContentCategory, string> = {
  abusive: "Уберите грубые или оскорбительные выражения",
  contact: "Не добавляйте ссылки и контактные данные",
  advertising: "Описание профиля нельзя использовать для рекламы"
};

const genericMessages: Record<ProfileContentField, string> = {
  displayName: "Не удалось сохранить профиль. Попробуйте ещё раз.",
  about: "Не удалось сохранить описание. Попробуйте ещё раз."
};

export function getProfileContentActionError(
  field: ProfileContentField,
  response: unknown
): ProfileContentActionState {
  if (
    !response ||
    typeof response !== "object" ||
    (response as { statusCode?: unknown }).statusCode !== 400 ||
    (response as { code?: unknown }).code !== "profile_content_rejected"
  ) {
    return { error: { field, category: null, message: genericMessages[field] } };
  }

  const category = (response as { category?: unknown }).category;
  if (category !== "abusive" && category !== "contact" && category !== "advertising") {
    return { error: { field, category: null, message: genericMessages[field] } };
  }

  return { error: { field, category, message: safeMessages[category] } };
}

export function getProfileContentSupportHref(): string {
  return `https://t.me/eugenegusakov?text=${encodeURIComponent("Вопрос о правилах профиля")}`;
}
