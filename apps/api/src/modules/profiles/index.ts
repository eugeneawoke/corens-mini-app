export const profilesModule = {
  name: "profiles",
  responsibilities: [
    "serve profile summary",
    "apply state/intention/trust-key changes",
    "manage profile visibility metadata"
  ]
} as const;
export * from "./service";
