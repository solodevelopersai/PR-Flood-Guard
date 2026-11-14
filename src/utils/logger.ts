export interface Logger {
  info(message: string): void;
  warn(message: string): void;
  error(message: string): void;
}

export const logger: Logger = {
  info: (message) => console.info(`[PRFloodGuard] ${message}`),
  warn: (message) => console.warn(`[PRFloodGuard] ${message}`),
  error: (message) => console.error(`[PRFloodGuard] ${message}`),
};
