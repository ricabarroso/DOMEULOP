import Link from "next/link";
import PasswordResetForm from "@/components/password-reset-form";

export default function ResetPasswordPage() {
  return (
    <main className="min-h-screen px-4 py-10 md:px-8">
      <section className="mx-auto max-w-xl space-y-6 rounded-3xl border border-emerald-200 bg-white p-8 shadow-sm">
        <Link href="/login" className="text-sm font-semibold text-emerald-800 hover:underline">
          ← Voltar para entrar
        </Link>
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-700">Recuperação de conta</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-950">Criar nova senha</h1>
          <p className="mt-3 leading-6 text-slate-600">
            Escolha uma senha com pelo menos 8 caracteres.
          </p>
        </div>
        <PasswordResetForm />
      </section>
    </main>
  );
}
