import type { PRFloodGuardConfig } from "./schema.js";

export const defaultConfig: PRFloodGuardConfig = {
  version: 1,
  thresholds: { critical: 25, high: 40, medium: 65 },
  actions: {
    critical: "label+comment",
    high: "label+comment",
    medium: "label",
    low: "none",
  },
  labels: {
    critical: "prflood:critical",
    high: "prflood:high-risk",
    medium: "prflood:medium-risk",
    low: "prflood:low-risk",
  },
  comment: { enabled: true, style: "professional" },
  whitelist: { users: [], teams: [] },
  features: { reputation: false, llm_analysis: false },
};
