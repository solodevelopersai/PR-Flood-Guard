import { parse as parseYaml } from "yaml";
import { configSchema, type PRFloodGuardConfig } from "./schema.js";

export function parseConfig(source: string): PRFloodGuardConfig {
  let document: unknown;
  try {
    document = parseYaml(source);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(`Invalid PRFloodGuard YAML: ${detail}`, { cause: error });
  }

  const result = configSchema.safeParse(document ?? {});
  if (!result.success) {
    const details = result.error.issues
      .map((issue) => `${issue.path.join(".") || "config"}: ${issue.message}`)
      .join("; ");
    throw new Error(`Invalid PRFloodGuard configuration: ${details}`);
  }
  return result.data;
}
