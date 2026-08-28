-- CreateEnum
CREATE TYPE "Rolle" AS ENUM ('mitarbeiter', 'admin');

-- CreateEnum
CREATE TYPE "FahrzeugStatus" AS ENUM ('verfuegbar', 'verliehen', 'wartung');

-- CreateTable
CREATE TABLE "mitarbeiter" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwort_hash" TEXT NOT NULL,
    "rolle" "Rolle" NOT NULL DEFAULT 'mitarbeiter',
    "aktiv" BOOLEAN NOT NULL DEFAULT true,
    "erstellt_am" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deaktiviert_am" TIMESTAMP(3),

    CONSTRAINT "mitarbeiter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session" (
    "id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "mitarbeiter_id" TEXT NOT NULL,
    "geraet_label" TEXT,
    "ip_adresse" TEXT,
    "erstellt_am" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "zuletzt_aktiv_am" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ablauf_am" TIMESTAMP(3) NOT NULL,
    "widerrufen_am" TIMESTAMP(3),

    CONSTRAINT "session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kunde" (
    "id" TEXT NOT NULL,
    "vorname" TEXT NOT NULL,
    "nachname" TEXT NOT NULL,
    "geburtsdatum" TIMESTAMP(3) NOT NULL,
    "geburtsort" TEXT NOT NULL,
    "adresse" TEXT NOT NULL,
    "fuehrerschein_nummer" TEXT NOT NULL,
    "ausstellende_behoerde" TEXT NOT NULL,
    "ausstellungsdatum" TIMESTAMP(3) NOT NULL,
    "fuehrerschein_klassen" JSONB NOT NULL,
    "erstellt_am" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "zuletzt_aktualisiert_am" TIMESTAMP(3) NOT NULL,
    "anonymisiert_am" TIMESTAMP(3),

    CONSTRAINT "kunde_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fahrzeug" (
    "id" TEXT NOT NULL,
    "kennzeichen" TEXT NOT NULL,
    "bezeichnung" TEXT NOT NULL,
    "benoetigte_fuehrerscheinklasse" TEXT NOT NULL,
    "status" "FahrzeugStatus" NOT NULL DEFAULT 'verfuegbar',

    CONSTRAINT "fahrzeug_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vermietung" (
    "id" TEXT NOT NULL,
    "kunde_id" TEXT NOT NULL,
    "fahrzeug_id" TEXT NOT NULL,
    "mitarbeiter_id_ausgabe" TEXT NOT NULL,
    "mitarbeiter_id_rueckgabe" TEXT,
    "ausgabe_datum" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ruecknahme_datum" TIMESTAMP(3),
    "kmStandAusgabe" INTEGER NOT NULL,
    "kmStandRueckgabe" INTEGER,
    "tankfuellung_ausgabe" TEXT,
    "tankfuellung_rueckgabe" TEXT,
    "zustandsfotos_ausgabe" JSONB NOT NULL DEFAULT '[]',
    "zustandsfotos_rueckgabe" JSONB NOT NULL DEFAULT '[]',
    "unterschrift_kunde" TEXT,
    "fuehrerschein_geprueft_von" TEXT,
    "fuehrerschein_klasse_passend" BOOLEAN,
    "loeschen_am" TIMESTAMP(3),
    "rechtsstreit_hold" BOOLEAN NOT NULL DEFAULT false,
    "rechtsstreit_hold_grund" TEXT,
    "rechtsstreit_hold_bis" TIMESTAMP(3),
    "anonymisiert_am" TIMESTAMP(3),
    "erstellt_am" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vermietung_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_log" (
    "id" TEXT NOT NULL,
    "mitarbeiter_id" TEXT,
    "aktion" TEXT NOT NULL,
    "betroffene_entitaet_id" TEXT,
    "detail" JSONB,
    "zeitstempel" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "mitarbeiter_email_key" ON "mitarbeiter"("email");

-- CreateIndex
CREATE UNIQUE INDEX "session_token_hash_key" ON "session"("token_hash");

-- CreateIndex
CREATE INDEX "session_mitarbeiter_id_idx" ON "session"("mitarbeiter_id");

-- CreateIndex
CREATE INDEX "kunde_nachname_vorname_idx" ON "kunde"("nachname", "vorname");

-- CreateIndex
CREATE INDEX "kunde_fuehrerschein_nummer_idx" ON "kunde"("fuehrerschein_nummer");

-- CreateIndex
CREATE UNIQUE INDEX "fahrzeug_kennzeichen_key" ON "fahrzeug"("kennzeichen");

-- CreateIndex
CREATE INDEX "vermietung_kunde_id_idx" ON "vermietung"("kunde_id");

-- CreateIndex
CREATE INDEX "vermietung_fahrzeug_id_idx" ON "vermietung"("fahrzeug_id");

-- CreateIndex
CREATE INDEX "vermietung_loeschen_am_idx" ON "vermietung"("loeschen_am");

-- CreateIndex
CREATE INDEX "audit_log_mitarbeiter_id_idx" ON "audit_log"("mitarbeiter_id");

-- CreateIndex
CREATE INDEX "audit_log_zeitstempel_idx" ON "audit_log"("zeitstempel");

-- AddForeignKey
ALTER TABLE "session" ADD CONSTRAINT "session_mitarbeiter_id_fkey" FOREIGN KEY ("mitarbeiter_id") REFERENCES "mitarbeiter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vermietung" ADD CONSTRAINT "vermietung_kunde_id_fkey" FOREIGN KEY ("kunde_id") REFERENCES "kunde"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vermietung" ADD CONSTRAINT "vermietung_fahrzeug_id_fkey" FOREIGN KEY ("fahrzeug_id") REFERENCES "fahrzeug"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vermietung" ADD CONSTRAINT "vermietung_mitarbeiter_id_ausgabe_fkey" FOREIGN KEY ("mitarbeiter_id_ausgabe") REFERENCES "mitarbeiter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vermietung" ADD CONSTRAINT "vermietung_mitarbeiter_id_rueckgabe_fkey" FOREIGN KEY ("mitarbeiter_id_rueckgabe") REFERENCES "mitarbeiter"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vermietung" ADD CONSTRAINT "vermietung_fuehrerschein_geprueft_von_fkey" FOREIGN KEY ("fuehrerschein_geprueft_von") REFERENCES "mitarbeiter"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_mitarbeiter_id_fkey" FOREIGN KEY ("mitarbeiter_id") REFERENCES "mitarbeiter"("id") ON DELETE SET NULL ON UPDATE CASCADE;
