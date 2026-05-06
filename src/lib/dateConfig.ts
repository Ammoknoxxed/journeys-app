const DEFAULT_STATS_START_DATE = "2026-05-01T00:00:00.000Z";

export function getStatsStartDate() {
  const configured = process.env.STATS_START_DATE;
  const candidate = configured ? new Date(configured) : new Date(DEFAULT_STATS_START_DATE);
  if (Number.isNaN(candidate.getTime())) {
    return new Date(DEFAULT_STATS_START_DATE);
  }
  return candidate;
}
