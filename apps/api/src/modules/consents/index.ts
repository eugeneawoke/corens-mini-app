export const consentsModule = {
  name: "consents",
  responsibilities: [
    "manage contact consent requests",
    "manage photo reveal requests",
    "enforce separate reveal channels"
  ]
} as const;
export * from "./service";
