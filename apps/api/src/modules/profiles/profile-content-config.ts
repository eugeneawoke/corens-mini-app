import type {
  ProfileContentCategory,
  ProfileContentCategoryRules,
  ProfileContentModerationConfig
} from "@corens/config";

const categories: ProfileContentCategory[] = ["abusive", "contact", "advertising"];
const ruleLists: Array<keyof ProfileContentCategoryRules> = [
  "terms",
  "phrases",
  "patterns",
  "exceptions"
];

export class ProfileContentConfigurationError extends Error {
  constructor(detail: string) {
    super(`Invalid profile content moderation configuration: ${detail}`);
    this.name = "ProfileContentConfigurationError";
  }
}

export function validateProfileContentModerationConfig(
  value: unknown
): ProfileContentModerationConfig {
  const config = expectRecord(value, "root must be an object");

  if (typeof config.version !== "string" || config.version.length === 0) {
    invalid("version must be a non-empty string");
  }

  const normalization = expectRecord(
    config.normalization,
    "normalization must be an object"
  );
  validateStringRecord(normalization.confusables, "normalization.confusables");
  validateStringRecord(normalization.leetspeak, "normalization.leetspeak");

  const configuredCategories = expectRecord(
    config.categories,
    "categories must be an object"
  );

  for (const category of categories) {
    const rules = expectRecord(
      configuredCategories[category],
      `categories.${category} must be an object`
    );

    for (const list of ruleLists) {
      validateStringArray(rules[list], `categories.${category}.${list}`);
    }

    if (rules.obfuscatedPatterns !== undefined) {
      validateStringArray(
        rules.obfuscatedPatterns,
        `categories.${category}.obfuscatedPatterns`
      );
    }

    for (const list of ["patterns", "obfuscatedPatterns"] as const) {
      const patterns = rules[list];

      if (patterns === undefined) {
        continue;
      }

      for (const [index, pattern] of (patterns as string[]).entries()) {
        try {
          new RegExp(pattern, "iu");
        } catch {
          invalid(
            `categories.${category}.${list}[${index}] is not a valid regular expression`
          );
        }
      }
    }
  }

  return value as ProfileContentModerationConfig;
}

function expectRecord(value: unknown, detail: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    invalid(detail);
  }

  return value as Record<string, unknown>;
}

function validateStringRecord(value: unknown, path: string): void {
  const record = expectRecord(value, `${path} must be an object of strings`);

  if (Object.values(record).some((entry) => typeof entry !== "string")) {
    invalid(`${path} must be an object of strings`);
  }
}

function validateStringArray(value: unknown, path: string): void {
  if (!Array.isArray(value) || value.some((entry) => typeof entry !== "string")) {
    invalid(`${path} must be an array of strings`);
  }
}

function invalid(detail: string): never {
  throw new ProfileContentConfigurationError(detail);
}
