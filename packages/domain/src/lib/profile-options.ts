import type { SelectOption } from "./miniapp-api";

export const stateOptions: ReadonlyArray<SelectOption> = [
  {
    key: "calm",
    label: "Спокойствие",
    description: "Ровный, мягкий темп без перегруза."
  },
  {
    key: "reflective",
    label: "Рефлексия",
    description: "Хочется вдумчивого разговора и тишины."
  },
  {
    key: "curious",
    label: "Любопытство",
    description: "Есть энергия на знакомство и новые пересечения."
  },
  {
    key: "rest",
    label: "Отдых",
    description: "Нужен деликатный, спокойный контакт."
  }
];

export const intentOptions: ReadonlyArray<SelectOption> = [
  {
    key: "slow-dialogue",
    label: "Медленный диалог",
    description: "Без спешки, с длинными паузами и вниманием."
  },
  {
    key: "gentle-meeting",
    label: "Аккуратное знакомство",
    description: "Открыт к новому контакту, но без давления."
  },
  {
    key: "supportive-presence",
    label: "Присутствие рядом",
    description: "Важно просто быть на связи и не форсировать."
  },
  {
    key: "practical-talk",
    label: "Предметный разговор",
    description: "Хочется конкретики и понятных ожиданий."
  }
];

export const trustKeyGroups = [
  {
    title: "Ценности",
    items: ["Тишина", "Честность", "Бережность", "Доброта", "Свобода", "Уважение"]
  },
  {
    title: "Ритм взаимодействия",
    items: ["Чай", "Прогулки", "Глубокие разговоры", "Паузы", "Теплый юмор"]
  }
] as const;
