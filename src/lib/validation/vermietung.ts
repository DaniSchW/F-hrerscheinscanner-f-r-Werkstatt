import { z } from "zod";
import { kundeEingabeSchema } from "@/lib/validation/kunde";

export const neueVermietungSchema = z.object({
  kunde: z.union([
    z.object({ modus: z.literal("bestehend"), kundeId: z.string().min(1) }),
    z.object({ modus: z.literal("neu") }).merge(kundeEingabeSchema)
  ]),
  fahrzeugId: z.string().min(1),
  kmStandAusgabe: z.number().int().nonnegative(),
  tankfuellungAusgabe: z.string().min(1),
  zustandsfotosAusgabe: z.array(z.string().startsWith("data:image/")).default([]),
  unterschriftKundeDataUrl: z.string().startsWith("data:image/").nullable(),
  fuehrerscheinKlassePassend: z.boolean()
});

export type NeueVermietungEingabe = z.infer<typeof neueVermietungSchema>;

export const ruecknahmeSchema = z.object({
  kmStandRueckgabe: z.number().int().nonnegative(),
  tankfuellungRueckgabe: z.string().min(1),
  zustandsfotosRueckgabe: z.array(z.string().startsWith("data:image/")).default([])
});
