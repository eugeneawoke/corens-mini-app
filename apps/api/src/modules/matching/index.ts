export const matchingModule = {
  name: "matching",
  responsibilities: [
    "load compatibility config",
    "evaluate candidate filters",
    "schedule asynchronous recompute"
  ]
} as const;
export * from "./service";
