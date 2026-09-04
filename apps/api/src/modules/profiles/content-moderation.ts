import type {
  ProfileContentCategory as ConfigProfileContentCategory,
  ProfileContentCategoryRules,
  ProfileContentModerationConfig
} from "@corens/config";

export type ProfileContentCategory = ConfigProfileContentCategory;

interface ContentViews {
  base: string;
  tokens: string[];
  compactRuns: string[];
  characterSequences: string[];
}

const categoryPrecedence: ProfileContentCategory[] = [
  "abusive",
  "contact",
  "advertising"
];

export function classifyProfileContent(
  value: string,
  config: ProfileContentModerationConfig
): ProfileContentCategory | null {
  const views = createContentViews(value, config);

  for (const category of categoryPrecedence) {
    const rules = config.categories[category];

    if (!matchesExceptions(rules, views, config) && matchesRules(rules, views, config)) {
      return category;
    }
  }

  return null;
}

function createContentViews(value: string, config: ProfileContentModerationConfig): ContentViews {
  const base = value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[\u200B-\u200D\uFEFF\u202A-\u202E]/gu, "");
  const folded = fold(base, config);
  const tokens = folded.match(/[\p{L}\p{N}]+/gu) ?? [];
  const compactRuns = base
    .split(/\s+/u)
    .map((part) => fold(part, config).replace(/[^\p{L}\p{N}]/gu, ""))
    .filter((part) => part.length > 0);

  return {
    base,
    tokens,
    compactRuns,
    characterSequences: makeCharacterSequences(tokens)
  };
}

function fold(value: string, config: ProfileContentModerationConfig): string {
  const mappings = {
    ...config.normalization.confusables,
    ...config.normalization.leetspeak
  };

  return Array.from(value, (character) => mappings[character] ?? character).join("");
}

function matchesExceptions(
  rules: ProfileContentCategoryRules,
  views: ContentViews,
  config: ProfileContentModerationConfig
): boolean {
  return rules.exceptions.some((exception) => matchesPhrase(exception, views, config));
}

function matchesRules(
  rules: ProfileContentCategoryRules,
  views: ContentViews,
  config: ProfileContentModerationConfig
): boolean {
  return (
    rules.terms.some((term) => matchesTerm(term, views, config)) ||
    rules.phrases.some((phrase) => matchesPhrase(phrase, views, config)) ||
    rules.patterns.some((pattern) => new RegExp(pattern, "iu").test(views.base))
  );
}

function matchesTerm(
  term: string,
  views: ContentViews,
  config: ProfileContentModerationConfig
): boolean {
  const normalizedTerm = fold(term.normalize("NFKC").toLowerCase(), config);

  if (normalizedTerm.includes(" ")) {
    return matchesPhrase(term, views, config);
  }

  const compactTerm = normalizedTerm.replace(/[^\p{L}\p{N}]/gu, "");
  return (
    views.tokens.includes(normalizedTerm) ||
    views.compactRuns.includes(compactTerm) ||
    views.characterSequences.includes(compactTerm)
  );
}

function matchesPhrase(
  phrase: string,
  views: ContentViews,
  config: ProfileContentModerationConfig
): boolean {
  const phraseTokens = fold(phrase.normalize("NFKC").toLowerCase(), config).match(/[\p{L}\p{N}]+/gu) ?? [];

  return phraseTokens.length > 0 && containsTokenSequence(views.tokens, phraseTokens);
}

function containsTokenSequence(tokens: string[], phraseTokens: string[]): boolean {
  return tokens.some((_, index) => phraseTokens.every((token, offset) => tokens[index + offset] === token));
}

function makeCharacterSequences(tokens: string[]): string[] {
  const sequences: string[] = [];

  for (let start = 0; start < tokens.length; start += 1) {
    if (tokens[start]?.length !== 1) {
      continue;
    }

    let sequence = "";
    for (let end = start; end < tokens.length && tokens[end]?.length === 1; end += 1) {
      sequence += tokens[end];
      sequences.push(sequence);
    }
  }

  return sequences;
}
