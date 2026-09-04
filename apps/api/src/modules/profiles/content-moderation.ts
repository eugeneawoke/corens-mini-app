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

    if (matchesRules(rules, views, config, getExceptionTokenIndexes(rules, views, config))) {
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

function getExceptionTokenIndexes(
  rules: ProfileContentCategoryRules,
  views: ContentViews,
  config: ProfileContentModerationConfig
): Set<number> {
  const indexes = new Set<number>();

  for (const exception of rules.exceptions) {
    const exceptionTokens = normalizedTokens(exception, config);

    for (let index = 0; index <= views.tokens.length - exceptionTokens.length; index += 1) {
      if (containsTokenSequenceAt(views.tokens, exceptionTokens, index)) {
        for (let offset = 0; offset < exceptionTokens.length; offset += 1) {
          indexes.add(index + offset);
        }
      }
    }
  }

  return indexes;
}

function matchesRules(
  rules: ProfileContentCategoryRules,
  views: ContentViews,
  config: ProfileContentModerationConfig,
  exceptionTokenIndexes: Set<number>
): boolean {
  return (
    rules.terms.some((term) => matchesTerm(term, views, config, exceptionTokenIndexes)) ||
    rules.phrases.some((phrase) => matchesPhrase(phrase, views, config, exceptionTokenIndexes)) ||
    rules.patterns.some((pattern) => new RegExp(pattern, "iu").test(views.base))
  );
}

function matchesTerm(
  term: string,
  views: ContentViews,
  config: ProfileContentModerationConfig,
  exceptionTokenIndexes: Set<number>
): boolean {
  const normalizedTerm = fold(term.normalize("NFKC").toLowerCase(), config);

  if (normalizedTerm.includes(" ")) {
    return matchesPhrase(term, views, config, exceptionTokenIndexes);
  }

  const compactTerm = normalizedTerm.replace(/[^\p{L}\p{N}]/gu, "");
  const hasExactToken = views.tokens.includes(normalizedTerm);
  return (
    views.tokens.some(
      (token, index) => token === normalizedTerm && !exceptionTokenIndexes.has(index)
    ) ||
    (!hasExactToken && views.compactRuns.includes(compactTerm)) ||
    views.characterSequences.includes(compactTerm)
  );
}

function matchesPhrase(
  phrase: string,
  views: ContentViews,
  config: ProfileContentModerationConfig,
  exceptionTokenIndexes: Set<number>
): boolean {
  const phraseTokens = normalizedTokens(phrase, config);

  return (
    phraseTokens.length > 0 &&
    views.tokens.some(
      (_, index) =>
        containsTokenSequenceAt(views.tokens, phraseTokens, index) &&
        phraseTokens.some((_, offset) => !exceptionTokenIndexes.has(index + offset))
    )
  );
}

function normalizedTokens(value: string, config: ProfileContentModerationConfig): string[] {
  return fold(value.normalize("NFKC").toLowerCase(), config).match(/[\p{L}\p{N}]+/gu) ?? [];
}

function containsTokenSequenceAt(tokens: string[], phraseTokens: string[], index: number): boolean {
  return phraseTokens.every((token, offset) => tokens[index + offset] === token);
}

function makeCharacterSequences(tokens: string[]): string[] {
  const sequences: string[] = [];

  for (let start = 0; start < tokens.length;) {
    if (tokens[start]?.length !== 1) {
      start += 1;
      continue;
    }

    let end = start + 1;
    while (end < tokens.length && tokens[end]?.length === 1) {
      end += 1;
    }

    sequences.push(tokens.slice(start, end).join(""));
    start = end;
  }

  return sequences;
}
