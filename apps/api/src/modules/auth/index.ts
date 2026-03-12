export const authModule = {
  name: "auth",
  responsibilities: [
    "validate Telegram init data",
    "issue backend sessions",
    "revoke sessions"
  ]
} as const;
