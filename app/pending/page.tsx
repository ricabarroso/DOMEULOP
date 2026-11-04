import Link from "next/link";

export default function PendingPage() {
  return (
    <main className="min-h-screen px-4 py-10 md:px-8">
      <section className="mx-auto max-w-xl space-y-4 rounded-3xl border border-amber-300 bg-amber-50 p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-amber-800">Acesso pendente</p>
        <h1 className="text-3xl font-bold text-amber-950">Aguardando aprovação</h1>
        <p className="leading-6 text-amber-950">
          Sua conta foi cadastrada. Um dos administradores precisa aceitar o cadastro antes de liberar os documentos.
        </p>
        <Link href="/" className="inline-flex rounded-xl bg-amber-800 px-4 py-2 font-semibold text-white hover:bg-amber-900">
          Voltar à página inicial
        </Link>
      </section>
    </main>
  );
}
