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
    ["Встреча 2026-09-04 в 18:30", null],
    ["04.09.2026 18.30", null],
    ["04-09-2026 18-30", null],
    ["Версия 1.2.3 уже готова", null],
    ["Идентификатор записи 1234567890", null],
    ["455", null],
    ["375291234567", null],
    ["80291234567", null],
    ["Люблю суккуленты и классическую музыку", null],
    ["Работаю рекрутером, люблю знакомиться с людьми", null],
    ["Работаю менеджером и люблю свою команду", null],
    ["Обсуждаю поиск работы и карьеру", null],
    ["This is a classic conversation about assignments", null],
    ["I would never hurt you", null],
    ["ты дурак", "abusive"],
    ["ты просто идиота", "abusive"],
    ["ты идиотка", "abusive"],
    ["вы группа дураков", "abusive"],
    ["какие же вы суки", "abusive"],
    ["они ругаются суками", "abusive"],
    ["durak", "abusive"],
    ["durakov", "abusive"],
    ["idiotka", "abusive"],
    ["d.u.r.a.k", "abusive"],
    ["suka", "abusive"],
    ["sukami", "abusive"],
    ["s-u-k-a", "abusive"],
    ["я тебя убью", "abusive"],
    ["я тебя прикончу", "abusive"],
    ["I will hurt you", "abusive"],
    ["ты чурка", "abusive"],
    ["пришли нюдсы", "abusive"],
    ["send nudes", "abusive"],
    ["you are a moron", "abusive"],
    ["what an asshole", "abusive"],
    ["сука", "abusive"],
    ["what the f.u.c.k", "abusive"],
    ["shіt", "abusive"],
    ["h.u.y", "abusive"],
    ["sh1t", "abusive"],
    ["you are 4ss", "abusive"],
    ["не дурак", null],
    ["не дурак, идиот", "abusive"],
    ["не дурак, ду.рак", "abusive"],
    ["не дурак, д у р а к", "abusive"],
    ["classical music and Scunthorpe", null],
    ["https://example.com", "contact"],
    ["t.me/example", "contact"],
    ["t.мe/name", "contact"],
    ["t . me / name", "contact"],
    ["t . м e / name", "contact"],
    ["example.org", "contact"],
    ["example.xyz", "contact"],
    ["example.info", "contact"],
    ["example.site", "contact"],
    ["@corens_help", "contact"],
    ["hello@example.com", "contact"],
    ["+375 (29) 123-45-67", "contact"],
    ["375-29-123-45-67", "contact"],
    ["8(029)1234567", "contact"],
    ["8 029 123-45-67", "contact"],
    ["(029) 123-45-67", "contact"],
    ["029 123-45-67", "contact"],
    ["123-45-67", "contact"],
    ["2026-09-04", null],
    ["пиши в лс", "contact"],
    ["напиши мне в телеграм", "contact"],
    ["ссылка:t.me/example", "contact"],
    ["telegram:@corens_help", "contact"],
    ["ссылка/t.me/name", "contact"],
    ["ТГ—@name", "contact"],
    ["notat.me/name", "contact"],
    ["notat.meant/name", "contact"],
    ["notat.m/name", null],
    ["word@name", null],
    ["купите сейчас", "advertising"],
    ["SALE today", "advertising"],
    ["join my team", "advertising"],
    ["приглашаю на работу", "advertising"],
    ["ищем сотрудников", "advertising"],
    ["ищем менеджера", "advertising"],
    ["присоединяйся к нашей команде", "advertising"],
    ["предлагаю заработок", "advertising"],
    ["buy now", "advertising"],
    ["we are hiring", "advertising"],
    ["apply now", "advertising"],
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
