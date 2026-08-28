function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Umgebungsvariable ${name} ist nicht gesetzt.`);
  }
  return value;
}

export const env = {
  get databaseUrl() {
    return required("DATABASE_URL");
  },
  get anthropicApiKey() {
    return required("ANTHROPIC_API_KEY");
  },
  get cronSecret() {
    return required("CRON_SECRET");
  },
  get retentionMonths() {
    const raw = process.env.RETENTION_MONTHS;
    const parsed = raw ? Number.parseInt(raw, 10) : 12;
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 12;
  },
  get inactivityTimeoutMinutes() {
    const raw = process.env.INACTIVITY_TIMEOUT_MINUTES;
    const parsed = raw ? Number.parseInt(raw, 10) : 45;
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 45;
  }
};
