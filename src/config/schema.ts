import { z } from "zod";

const riskAction = z.enum([
  "none",
  "label",
  "comment",
  "label+comment",
  "quarantine",
]);

const labelsSchema = z.object({
  critical: z.string().min(1).default("prflood:critical"),
  high: z.string().min(1).default("prflood:high-risk"),
  medium: z.string().min(1).default("prflood:medium-risk"),
  low: z.string().min(1).default("prflood:low-risk"),
});

export const configSchema = z
  .object({
    version: z.literal(1).default(1),
    thresholds: z
      .object({
        critical: z.number().int().min(0).max(100).default(25),
        high: z.number().int().min(0).max(100).default(40),
        medium: z.number().int().min(0).max(100).default(65),
      })
      .prefault({}),
    actions: z
      .object({
        critical: riskAction.default("label+comment"),
        high: riskAction.default("label+comment"),
        medium: riskAction.default("label"),
        low: riskAction.default("none"),
      })
      .prefault({}),
    labels: labelsSchema.prefault({}),
    comment: z
      .object({
        enabled: z.boolean().default(true),
        style: z
          .enum(["professional", "friendly", "minimal"])
          .default("professional"),
      })
      .prefault({}),
    whitelist: z
      .object({
        users: z.array(z.string().min(1)).default([]),
        teams: z
          .array(z.string().regex(/^[^/]+\/[^/]+$/, "Use org/team-slug format"))
          .default([]),
      })
      .prefault({}),
    features: z
      .object({
        reputation: z.boolean().default(false),
        llm_analysis: z.boolean().default(false),
      })
      .prefault({}),
  })
  .superRefine((config, context) => {
    const { critical, high, medium } = config.thresholds;
    if (!(critical < high && high < medium)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["thresholds"],
        message:
          "Thresholds must be strictly increasing: critical < high < medium.",
      });
    }
  });

export type PRFloodGuardConfig = z.infer<typeof configSchema>;
