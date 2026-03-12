export const privacyModule = {
  name: "privacy",
  responsibilities: [
    "hide and restore profile participation",
    "start deletion workflow",
    "coordinate session and consent revocation"
  ]
} as const;
export * from "./service";
