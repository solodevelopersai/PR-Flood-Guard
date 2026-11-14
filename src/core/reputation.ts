export interface ReputationSignals {
  accountAgeDays?: number;
  previousPullRequests?: number;
  mergedPullRequests?: number;
}

export function isNewAccount(accountAgeDays: number | undefined): boolean {
  return accountAgeDays !== undefined && accountAgeDays < 30;
}

export function hasLowPublicReputation(signals: ReputationSignals): boolean {
  const previous = signals.previousPullRequests;
  const merged = signals.mergedPullRequests;
  return (
    previous !== undefined &&
    previous >= 3 &&
    merged !== undefined &&
    merged / previous < 0.2
  );
}
