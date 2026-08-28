/** Build-Zeit-Konfiguration für den (statisch exportierten) Client. */
export const INACTIVITY_TIMEOUT_MINUTES = Number.parseInt(
  process.env.NEXT_PUBLIC_INACTIVITY_TIMEOUT_MINUTES ?? "45",
  10
);
