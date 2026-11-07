import Link from "next/link";
import AccountDashboard from "@/components/account-dashboard";
import MedicationSearch from "@/components/medication-search";

const documents = [
  {
    href: "/receita",
    title: "Receita médica",
    description: "Preencha medicamentos, dosagem e orientações de uso.",
    accent: "from-emerald-700 to-green-500",
  },
  {
    href: "/atestado",
    title: "Atestado médico",
    description: "Prepare o período de afastamento e as observações clínicas.",
    accent: "from-green-700 to-emerald-500",
  },
  {
    href: "/pedido-exames",
    title: "Pedido de exames",
    description: "Informe a justificativa clínica e os exames solicitados.",
    accent: "from-emerald-800 to-green-600",
  },
  {
    href: "/apac",
    title: "APAC",
    description: "Estruture procedimento, justificativa e dados do estabelecimento.",
    accent: "from-green-800 to-emerald-500",
  },
  {
    href: "/atendimento-antirrabico",
    title: "Ficha de atendimento antirrábico",
    description: "Preencha os dados e gere uma cópia do formulário original em PDF.",
    accent: "from-emerald-500 to-green-600",
  },
];

export default function Home() {
  return (
    <main className="min-h-screen px-4 py-10 text-slate-900 md:px-8">
      <div className="mx-auto max-w-6xl space-y-8">
        <header className="rounded-3xl border border-slate-200 bg-white/85 p-8 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-emerald-700">
            Gerador de documentos médicos
          </p>
          <h1 className="mt-3 max-w-3xl text-3xl font-bold md:text-5xl">
            Escolha um documento para preencher ou gerar em PDF
          </h1>
          <p className="mt-4 max-w-2xl leading-7 text-slate-600">
            Preencha os documentos na aplicação e gere PDFs; a ficha antirrábica mantém o formulário original.
          </p>
        </header>

        <section aria-label="Conta e acesso" className="rounded-3xl border border-slate-200 bg-white/85 p-6 shadow-sm">
          <AccountDashboard />
        </section>

        <MedicationSearch />

        <section aria-label="Tipos de documentos" className="grid gap-5 md:grid-cols-2">
          {documents.map((document) => (
            <Link
              key={document.href}
              href={document.href}
              className="group rounded-3xl border border-slate-200 bg-white/85 p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-600"
            >
              <span className={`mb-5 block h-2 rounded-full bg-gradient-to-r ${document.accent}`} />
              <h2 className="text-xl font-semibold">{document.title}</h2>
              <p className="mt-2 text-slate-600">{document.description}</p>
              <span className="mt-5 inline-flex font-semibold text-emerald-800 group-hover:underline">
                Abrir documento <span aria-hidden="true" className="ml-2">→</span>
              </span>
            </Link>
          ))}
        </section>

        <aside className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm leading-6 text-emerald-950">
          Privacidade: modelos de prescrição são armazenados na conta autenticada. Os dados
          de pacientes e profissionais ficam apenas na memória desta sessão e não são enviados
          ao Supabase. A busca de medicamentos envia somente o termo pesquisado ao servidor
          para consultar o catálogo, sem dados do paciente. Na ficha antirrábica, o preenchimento
          e o PDF permanecem no navegador.
        </aside>
      </div>
    </main>
  );
}
