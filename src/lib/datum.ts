/**
 * Wandelt einen MySQL-DATETIME-String ("2026-08-28 21:24:04", UTC laut
 * UTC_TIMESTAMP()) in ein Date-Objekt. `new Date(...)` allein ist dafür
 * nicht zuverlässig browserübergreifend, da das Format ohne "T"/"Z" nicht
 * einheitlich als UTC interpretiert wird - deshalb hier explizit als ISO
 * mit Z-Suffix geparst. Für reine DATE-Spalten (YYYY-MM-DD, z.B.
 * geburtsdatum) ist das nicht nötig, die parst jeder Browser korrekt.
 */
export function parseMysqlDatetime(wert: string): Date {
  return new Date(wert.replace(" ", "T") + "Z");
}
