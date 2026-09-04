import type {
  ProfileContentCategory as ConfigProfileContentCategory,
  ProfileContentCategoryRules,
  ProfileContentModerationConfig
} from "@corens/config";

export type ProfileContentCategory = ConfigProfileContentCategory;

interface ContentViews {
  base: string;
  patternInputs: string[];
  tokens: string[];
  compactRuns: TokenRange[];
  characterSequences: TokenRange[];
}

interface TokenRange {
  value: string;
  start: number;
  end: number;
}

const categoryPrecedence: ProfileContentCategory[] = [
  "abusive",
  "contact",
  "advertising"
];
const MAX_PROFILE_CONTENT_CODE_UNITS = 1_024;

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
    .slice(0, MAX_PROFILE_CONTENT_CODE_UNITS)
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[\u200B-\u200D\uFEFF\u202A-\u202E]/gu, "");
  const folded = fold(base, config);
  const delimiterCompacted = folded.replace(/\s*([./:@()+-])\s*/gu, "$1");
  const whitespaceCompacted = folded.replace(/\s+/gu, "");
  const tokens = folded.match(/[\p{L}\p{N}]+/gu) ?? [];
  const compactRuns = makeCompactRuns(base, config);

  return {
    base,
    patternInputs: [...new Set([base, folded, delimiterCompacted, whitespaceCompacted])],
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
    rules.patterns.some((pattern) => matchesPattern(pattern, views.patternInputs))
  );
}

function matchesPattern(pattern: string, inputs: string[]): boolean {
  const expression = new RegExp(pattern, "iu");
  return inputs.some((input) => expression.test(input));
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
  return (
    views.tokens.some(
      (token, index) => token === normalizedTerm && !exceptionTokenIndexes.has(index)
    ) ||
    views.compactRuns.some(
      (run) => run.value === compactTerm && hasAllowedTokenRange(run, exceptionTokenIndexes)
    ) ||
    views.characterSequences.some((run) =>
      containsAllowedSpacedTerm(run, compactTerm, exceptionTokenIndexes)
    )
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

function makeCompactRuns(value: string, config: ProfileContentModerationConfig): TokenRange[] {
  const runs: TokenRange[] = [];
  let tokenIndex = 0;

  for (const part of value.split(/\s+/u)) {
    const partTokens = normalizedTokens(part, config);
    const compact = partTokens.join("");
    const start = tokenIndex;
    tokenIndex += partTokens.length;

    if (compact.length > 0) {
      runs.push({ value: compact, start, end: tokenIndex });
    }
  }

  return runs;
}

function makeCharacterSequences(tokens: string[]): TokenRange[] {
  const sequences: TokenRange[] = [];

  for (let start = 0; start < tokens.length;) {
    if (tokens[start]?.length !== 1) {
      start += 1;
      continue;
    }

    let end = start + 1;
    while (end < tokens.length && tokens[end]?.length === 1) {
      end += 1;
    }

    sequences.push({ value: tokens.slice(start, end).join(""), start, end });
    start = end;
  }

  return sequences;
}

function hasAllowedTokenRange(range: TokenRange, exceptionTokenIndexes: Set<number>): boolean {
  for (let index = range.start; index < range.end; index += 1) {
    if (!exceptionTokenIndexes.has(index)) {
      return true;
    }
  }

  return false;
}

function containsAllowedSpacedTerm(
  sequence: TokenRange,
  term: string,
  exceptionTokenIndexes: Set<number>
): boolean {
  for (let start = sequence.value.indexOf(term); start !== -1; start = sequence.value.indexOf(term, start + 1)) {
    if (
      hasAllowedTokenRange(
        { value: term, start: sequence.start + start, end: sequence.start + start + term.length },
        exceptionTokenIndexes
      )
    ) {
      return true;
    }
  }

  return false;
}
