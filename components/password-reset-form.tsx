"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function PasswordResetForm() {
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const [completionWarning, setCompletionWarning] = useState("");
  const [ready, setReady] = useState(false);
  const [updated, setUpdated] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;
    const checkRecoverySession = async () => {
      try {
        const { data, error: sessionError } = await createClient().auth.getSession();
        if (sessionError) throw sessionError;
        if (active) {
          setReady(Boolean(data.session));
          if (!data.session) setError("O link de recuperação expirou ou já foi usado. Solicite outro.");
        }
      } catch {
        if (active) {
          setReady(false);
          setError("Não foi possível validar o link de recuperação. Solicite outro.");
        }
      }
    };
    void checkRecoverySession();
    return () => {
      active = false;
    };
  }, []);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    if (password !== confirmation) {
      setError("As senhas não coincidem.");
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      if (!sessionData.session) {
        throw new Error("O link de recuperação expirou ou já foi usado. Solicite outro.");
      }

      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;

      const { error: signOutError } = await supabase.auth.signOut({ scope: "local" });
      setUpdated(true);
      if (signOutError) {
        setCompletionWarning("A senha foi alterada, mas não foi possível encerrar esta sessão. Saia da conta depois de entrar com a nova senha.");
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível alterar a senha.");
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-950 outline-none focus:border-red-600";

  if (updated) {
    return (
      <div className="space-y-4">
        <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
          Senha alterada. Entre usando a nova senha.
        </p>
        {completionWarning && (
          <p role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            {completionWarning}
          </p>
        )}
        <Link
          href="/login"
          className="block w-full rounded-xl bg-red-700 px-5 py-3 text-center font-semibold text-white transition hover:bg-red-800"
        >
          Voltar para entrar
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <label className="block space-y-1 text-sm font-semibold text-slate-700">
        Nova senha
        <input
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className={inputClass}
        />
      </label>
      <label className="block space-y-1 text-sm font-semibold text-slate-700">
        Confirme a nova senha
        <input
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          value={confirmation}
          onChange={(event) => setConfirmation(event.target.value)}
          className={inputClass}
        />
      </label>
      <button
        type="submit"
        disabled={!ready || loading}
        className="w-full rounded-xl bg-red-700 px-5 py-3 font-semibold text-white transition hover:bg-red-800 disabled:cursor-wait disabled:opacity-60"
      >
        {loading ? "Aguarde…" : "Alterar senha"}
      </button>
      {error && (
        <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {error}
        </p>
      )}
    </form>
  );
}
