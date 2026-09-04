import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import type { ProfileContentModerationConfig } from "@corens/config";
import {
  classifyProfileContent,
  type ProfileContentCategory
} from "../../apps/api/src/modules/profiles/content-moderation";

const rules = JSON.parse(
  await readFile(
    resolve(process.cwd(), "config/moderation/profile-content.v1.json"),
    "utf8"
  )
) as ProfileContentModerationConfig;

describe("classifyProfileContent", () => {
  const cases: Array<[string, ProfileContentCategory | null]> = [
    ["Анна, люблю пешие прогулки", null],
    ["Alex, here to talk", null],
    ["ты дурак", "abusive"],
    ["сука", "abusive"],
    ["what the f.u.c.k", "abusive"],
    ["shіt", "abusive"],
    ["h.u.y", "abusive"],
    ["sh1t", "abusive"],
    ["не дурак", null],
    ["не дурак, идиот", "abusive"],
    ["не дурак, ду.рак", "abusive"],
    ["не дурак, д у р а к", "abusive"],
    ["classical music and Scunthorpe", null],
    ["https://example.com", "contact"],
    ["t.me/example", "contact"],
    ["@corens_help", "contact"],
    ["hello@example.com", "contact"],
    ["+375 (29) 123-45-67", "contact"],
    ["2026-09-04", null],
    ["пиши в лс", "contact"],
    ["ссылка:t.me/example", "contact"],
    ["telegram:@corens_help", "contact"],
    ["ссылка/t.me/name", "contact"],
    ["ТГ—@name", "contact"],
    ["notat.me/name", null],
    ["word@name", null],
    ["купите сейчас", "advertising"],
    ["SALE today", "advertising"],
    ["join my team", "advertising"],
    ["ты дурак, t.me/example, купите сейчас", "abusive"]
  ];

  it.each(cases)("classifies %j as %s", (value, expected) => {
    expect(classifyProfileContent(value, rules)).toBe(expected);
  });

  it("bounds spaced-character processing for long input", () => {
    const value = Array.from({ length: 10_000 }, () => "a").join(" ");

    expect(classifyProfileContent(value, rules)).toBeNull();
  });

  it("detects a configured term inside a maximal spaced-character run", () => {
    expect(classifyProfileContent("i f u c k", rules)).toBe("abusive");
  });
});
