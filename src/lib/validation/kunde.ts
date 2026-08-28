import { z } from "zod";
import { fuehrerscheinKlasseSchema } from "@/lib/ocr/claude";

export const kundeEingabeSchema = z.object({
  vorname: z.string().min(1),
  nachname: z.string().min(1),
  geburtsdatum: z.string().min(1),
  geburtsort: z.string().min(1),
  adresse: z.string().min(1),
  fuehrerscheinNummer: z.string().min(1),
  ausstellendeBehoerde: z.string().min(1),
  ausstellungsdatum: z.string().min(1),
  fuehrerscheinKlassen: z.array(fuehrerscheinKlasseSchema).min(1)
});

export type KundeEingabe = z.infer<typeof kundeEingabeSchema>;
