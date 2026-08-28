import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { env } from "@/lib/env";

export const fuehrerscheinKlasseSchema = z.object({
  klasse: z.string(),
  ausstellungsdatum: z.string().nullable(),
  ablaufdatum: z.string().nullable()
});

export const fuehrerscheinExtraktionSchema = z.object({
  vorname: z.string().nullable(),
  nachname: z.string().nullable(),
  geburtsdatum: z.string().nullable(),
  geburtsort: z.string().nullable(),
  adresse: z.string().nullable(),
  fuehrerscheinNummer: z.string().nullable(),
  ausstellendeBehoerde: z.string().nullable(),
  ausstellungsdatum: z.string().nullable(),
  klassen: z.array(fuehrerscheinKlasseSchema),
  hinweise: z.string().nullable()
});

export type FuehrerscheinExtraktion = z.infer<typeof fuehrerscheinExtraktionSchema>;

const EXTRAKTIONS_TOOL_NAME = "fuehrerschein_daten_erfassen";

const anthropic = new Anthropic({ apiKey: env.anthropicApiKey });

const MODEL = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-5";

type UnterstuetzterBildTyp = "image/jpeg" | "image/png" | "image/webp";

function mediaTypeAusDataUrl(dataUrl: string): { mediaType: UnterstuetzterBildTyp; base64: string } {
  const match = /^data:(image\/(?:jpeg|png|webp));base64,(.+)$/.exec(dataUrl);
  if (!match) {
    throw new Error("Ungültiges Bildformat. Erwartet wird ein JPEG/PNG/WEBP als Data-URL.");
  }
  return { mediaType: match[1] as UnterstuetzterBildTyp, base64: match[2]! };
}

/**
 * Sendet Vorder- und Rückseite des Führerscheins an die Claude Vision API
 * und liefert strukturierte Felder zurück. Die Bilder werden hier NICHT
 * gespeichert - sie existieren nur für die Dauer dieses Aufrufs im
 * Server-Speicher (siehe Löschkonzept, Abschnitt 5/8 des Briefings).
 */
export async function fuehrerscheinDatenExtrahieren(params: {
  vorderseiteDataUrl: string;
  rueckseiteDataUrl?: string;
}): Promise<FuehrerscheinExtraktion> {
  const vorderseite = mediaTypeAusDataUrl(params.vorderseiteDataUrl);
  const bilder: Anthropic.ImageBlockParam[] = [
    {
      type: "image",
      source: { type: "base64", media_type: vorderseite.mediaType, data: vorderseite.base64 }
    }
  ];
  if (params.rueckseiteDataUrl) {
    const rueckseite = mediaTypeAusDataUrl(params.rueckseiteDataUrl);
    bilder.push({
      type: "image",
      source: { type: "base64", media_type: rueckseite.mediaType, data: rueckseite.base64 }
    });
  }

  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 1024,
    tools: [
      {
        name: EXTRAKTIONS_TOOL_NAME,
        description: "Erfasst die strukturierten Felder eines deutschen/EU-Führerscheins aus den Fotos.",
        input_schema: {
          type: "object",
          properties: {
            vorname: { type: ["string", "null"] },
            nachname: { type: ["string", "null"] },
            geburtsdatum: { type: ["string", "null"], description: "ISO-8601, z.B. 1990-05-14" },
            geburtsort: { type: ["string", "null"] },
            adresse: { type: ["string", "null"], description: "Nur falls auf dem Führerschein vermerkt" },
            fuehrerscheinNummer: { type: ["string", "null"] },
            ausstellendeBehoerde: { type: ["string", "null"] },
            ausstellungsdatum: { type: ["string", "null"], description: "ISO-8601 des Dokuments (Feld 4a)" },
            klassen: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  klasse: { type: "string", description: "z.B. B, BE, A1, C1" },
                  ausstellungsdatum: { type: ["string", "null"] },
                  ablaufdatum: { type: ["string", "null"] }
                },
                required: ["klasse", "ausstellungsdatum", "ablaufdatum"]
              }
            },
            hinweise: {
              type: ["string", "null"],
              description: "Kurzer Hinweis, falls Felder unleserlich/unsicher sind"
            }
          },
          required: [
            "vorname",
            "nachname",
            "geburtsdatum",
            "geburtsort",
            "adresse",
            "fuehrerscheinNummer",
            "ausstellendeBehoerde",
            "ausstellungsdatum",
            "klassen",
            "hinweise"
          ]
        }
      }
    ],
    tool_choice: { type: "tool", name: EXTRAKTIONS_TOOL_NAME },
    messages: [
      {
        role: "user",
        content: [
          ...bilder,
          {
            type: "text",
            text:
              "Lies die Felder dieses Führerscheins aus den Fotos aus und rufe ausschließlich das " +
              "Werkzeug zur Datenerfassung auf. Erfinde keine Werte - wenn ein Feld nicht lesbar ist, " +
              "trage null ein und nenne es kurz in 'hinweise'."
          }
        ]
      }
    ]
  });

  const toolUse = response.content.find(
    (block): block is Anthropic.ToolUseBlock => block.type === "tool_use"
  );
  if (!toolUse) {
    throw new Error("Die Datenextraktion hat kein strukturiertes Ergebnis geliefert.");
  }

  return fuehrerscheinExtraktionSchema.parse(toolUse.input);
}
