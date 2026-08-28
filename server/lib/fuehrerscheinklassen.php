<?php
/* Vereinfachte Abbildung, welche Fahrzeugklassen eine Führerscheinklasse
 * abdeckt (deutsches/EU-Klassensystem). Dient nur als Warnhinweis im UI -
 * keine rechtsverbindliche Prüfung; der Mitarbeiter kann den Vorgang mit
 * Bestätigung trotzdem fortsetzen.
 */

function fs_fuehrerschein_abdeckung(): array {
  return [
    'AM' => ['AM'],
    'A1' => ['A1', 'AM'],
    'A2' => ['A2', 'A1', 'AM'],
    'A' => ['A', 'A2', 'A1', 'AM'],
    'B' => ['B', 'AM'],
    'BE' => ['BE', 'B', 'AM'],
    'C1' => ['C1', 'B', 'AM'],
    'C1E' => ['C1E', 'C1', 'BE', 'B', 'AM'],
    'C' => ['C', 'C1', 'B', 'AM'],
    'CE' => ['CE', 'C', 'C1E', 'C1', 'BE', 'B', 'AM'],
    'D1' => ['D1', 'B', 'AM'],
    'D1E' => ['D1E', 'D1', 'BE', 'B', 'AM'],
    'D' => ['D', 'D1', 'B', 'AM'],
    'DE' => ['DE', 'D', 'D1E', 'D1', 'BE', 'B', 'AM'],
    'T' => ['T', 'AM'],
  ];
}

function fs_fuehrerschein_passt_zu_fahrzeug(array $vorhandeneKlassen, string $benoetigteKlasse): bool {
  $abdeckung = fs_fuehrerschein_abdeckung();
  $ziel = strtoupper(trim($benoetigteKlasse));
  foreach ($vorhandeneKlassen as $klasse) {
    $key = strtoupper(trim((string) $klasse));
    if (isset($abdeckung[$key]) && in_array($ziel, $abdeckung[$key], true)) {
      return true;
    }
  }
  return false;
}
