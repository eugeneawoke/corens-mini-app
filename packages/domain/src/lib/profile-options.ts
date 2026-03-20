import type { SelectOption } from "./miniapp-api";

export const stateOptions: ReadonlyArray<SelectOption> = [
  {
    key: "calm",
    label: "Спокойно",
    description: "Спокойный, ненапряжённый контакт."
  },
  {
    key: "lively",
    label: "Оживлённо",
    description: "Есть энергия, хочется живого обмена."
  },
  {
    key: "playful",
    label: "Игриво",
    description: "Лёгкость, юмор и чуть больше воздуха."
  },
  {
    key: "thoughtful",
    label: "Задумчиво",
    description: "Тянет к тихому и более глубокому разговору."
  },
  {
    key: "open",
    label: "Открыто",
    description: "Есть готовность быть в контакте без защиты."
  },
  {
    key: "fragile",
    label: "Немного хрупко",
    description: "Нужна особая бережность и мягкий темп."
  },
  {
    key: "foggy",
    label: "Всё как в тумане",
    description: "Сложно собраться, хочется ясности рядом."
  },
  {
    key: "after_heavy",
    label: "После чего-то тяжёлого",
    description: "Мало ресурса, важны безопасность и деликатность."
  },
  {
    key: "tight_inside",
    label: "Тесно внутри",
    description: "Есть внутреннее напряжение, нужен аккуратный контакт."
  },
  {
    key: "anxious_quiet",
    label: "Тревожно-тихо",
    description: "Хочется спокойствия без лишнего шума."
  },
  {
    key: "lost",
    label: "Не могу найти место",
    description: "Нужен кто-то, рядом с кем станет проще выдохнуть."
  }
];

export const intentOptions: ReadonlyArray<SelectOption> = [
  {
    key: "support",
    label: "Поддержка",
    description: "Нужна поддержка или хочется поддержать."
  },
  {
    key: "talk",
    label: "Разговор",
    description: "Хочется поговорить и побыть в диалоге."
  },
  {
    key: "walk",
    label: "Прогулка",
    description: "Хочется выйти, пройтись, сменить среду."
  },
  {
    key: "light_contact",
    label: "Просто рядом",
    description: "Нужно присутствие без давления и ожиданий."
  },
  {
    key: "share",
    label: "Поделиться",
    description: "Есть что-то, чем хочется поделиться."
  }
];

export const optionalIntentOption: SelectOption = {
  key: "",
  label: "Пока без намерения",
  description: "Можно пропустить этот слой, матчинг всё равно продолжится."
};

export const trustKeyGroups = [
  {
    title: "Способ быть рядом",
    items: [
      "Тихий разговор",
      "Уважение границ",
      "Без давления",
      "Честность",
      "Мягкий темп",
      "Юмор"
    ]
  },
  {
    title: "Качество контакта",
    items: [
      "Тёплая поддержка",
      "Интеллектуальная искра",
      "Забота о безопасности",
      "Любопытство к личности",
      "Ясные намерения",
      "Осторожные слова"
    ]
  }
] as const;

export const shadowStateKeys = new Set([
  "foggy",
  "after_heavy",
  "tight_inside",
  "anxious_quiet",
  "lost"
]);

export const lightStateKeys = new Set(
  stateOptions.map((option) => option.key).filter((key) => !shadowStateKeys.has(key))
);
