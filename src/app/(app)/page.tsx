import Link from "next/link";

export default function Startmaske() {
  return (
    <div className="flex flex-col gap-5 pt-8">
      <Link href="/vermietung/neu" className="btn-primary">
        Neue Vermietung
      </Link>
      <Link href="/vermietung/rueckgabe" className="btn-secondary">
        Rückgabe erfassen
      </Link>
      <Link href="/kunden" className="btn-secondary">
        Kundensuche
      </Link>
    </div>
  );
}
