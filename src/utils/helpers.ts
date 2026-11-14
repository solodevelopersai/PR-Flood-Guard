export function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

export function normalizeText(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}
