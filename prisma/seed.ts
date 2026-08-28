import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? "admin@example.com";
  const adminPasswort = process.env.SEED_ADMIN_PASSWORT ?? "bitte-aendern-123";

  const admin = await prisma.mitarbeiter.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      name: "Admin",
      email: adminEmail,
      passwortHash: await bcrypt.hash(adminPasswort, 12),
      rolle: "admin"
    }
  });
  console.log(`Admin-Account: ${admin.email} (Passwort ${adminPasswort} - bitte nach dem ersten Login ändern)`);

  await prisma.fahrzeug.upsert({
    where: { kennzeichen: "AA-BC 123" },
    update: {},
    create: {
      kennzeichen: "AA-BC 123",
      bezeichnung: "VW Golf",
      benoetigteFuehrerscheinklasse: "B"
    }
  });

  await prisma.fahrzeug.upsert({
    where: { kennzeichen: "AA-BC 456" },
    update: {},
    create: {
      kennzeichen: "AA-BC 456",
      bezeichnung: "VW Transporter T6",
      benoetigteFuehrerscheinklasse: "BE"
    }
  });

  console.log("Beispiel-Fahrzeuge angelegt.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
