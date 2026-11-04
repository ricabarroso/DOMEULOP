import Link from "next/link";
import EmailSignIn from "@/components/email-sign-in";

export default function LoginPage() {
  return (
    <main className="min-h-screen px-4 py-10 md:px-8">
      <section className="mx-auto max-w-xl space-y-6 rounded-3xl border border-red-200 bg-white p-8 shadow-sm">
        <Link href="/" className="text-sm font-semibold text-red-800 hover:underline">← Página inicial</Link>
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-red-700">Acesso à conta</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-950">Entrar no gerador</h1>
          <p className="mt-3 leading-6 text-slate-600">
            Entre com e-mail e senha (o cadastro exige confirmar o e-mail). Os três emails administradores informados têm acesso imediato.
            Novos cadastros ficam pendentes até um administrador aprová-los.
          </p>
        </div>
        <EmailSignIn />
        <p className="text-xs leading-5 text-slate-500">
          Os modelos de prescrição salvos ficam vinculados à sua conta. Dados de pacientes e profissionais
          não são enviados ao Supabase e permanecem apenas na sessão desta página.
        </p>
      </section>
    </main>
  );
}
