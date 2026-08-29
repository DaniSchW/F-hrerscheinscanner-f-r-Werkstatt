export type FuehrerscheinKlasse = {
  klasse: string;
  ausstellungsdatum: string | null;
  ablaufdatum: string | null;
};

export type KundeFormular = {
  vorname: string;
  nachname: string;
  geburtsdatum: string;
  geburtsort: string;
  adresse: string;
  plz: string;
  ort: string;
  fuehrerscheinNummer: string;
  ausstellendeBehoerde: string;
  ausstellungsdatum: string;
  fuehrerscheinKlassen: FuehrerscheinKlasse[];
};

export const leeresKundeFormular: KundeFormular = {
  vorname: "",
  nachname: "",
  geburtsdatum: "",
  geburtsort: "",
  adresse: "",
  plz: "",
  ort: "",
  fuehrerscheinNummer: "",
  ausstellendeBehoerde: "",
  ausstellungsdatum: "",
  fuehrerscheinKlassen: []
};

export type Fahrzeug = {
  id: string;
  kennzeichen: string;
  bezeichnung: string;
  benoetigte_fuehrerscheinklasse: string;
  status: string;
};
