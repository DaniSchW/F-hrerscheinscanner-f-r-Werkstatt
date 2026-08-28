/**
 * Vereinfachte Abbildung, welche Fahrzeugklassen eine Führerscheinklasse
 * abdeckt (deutsches/EU-Klassensystem). Dient nur als Warnhinweis im UI -
 * keine rechtsverbindliche Prüfung; der Mitarbeiter kann den Vorgang laut
 * Briefing (Abschnitt 4.3 Schritt 6) mit Bestätigung trotzdem fortsetzen.
 */
const ABDECKUNG: Record<string, string[]> = {
  AM: ["AM"],
  A1: ["A1", "AM"],
  A2: ["A2", "A1", "AM"],
  A: ["A", "A2", "A1", "AM"],
  B: ["B", "AM"],
  BE: ["BE", "B", "AM"],
  C1: ["C1", "B", "AM"],
  C1E: ["C1E", "C1", "BE", "B", "AM"],
  C: ["C", "C1", "B", "AM"],
  CE: ["CE", "C", "C1E", "C1", "BE", "B", "AM"],
  D1: ["D1", "B", "AM"],
  D1E: ["D1E", "D1", "BE", "B", "AM"],
  D: ["D", "D1", "B", "AM"],
  DE: ["DE", "D", "D1E", "D1", "BE", "B", "AM"],
  T: ["T", "AM"]
};

export function fuehrerscheinPasstZuFahrzeug(
  vorhandeneKlassen: string[],
  benoetigteKlasse: string
): boolean {
  const ziel = benoetigteKlasse.trim().toUpperCase();
  return vorhandeneKlassen.some((klasse) => ABDECKUNG[klasse.trim().toUpperCase()]?.includes(ziel));
}
