"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type OAuthProvider = "google" | "apple";

export default function OAuthSignIn() {
  const [error, setError] = useState("");
  const [loadingProvider, setLoadingProvider] = useState<OAuthProvider | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const code = new URLSearchParams(window.location.search).get("error");
      const errorMessage = code === "configuration"
        ? "A autenticação ainda não foi configurada. Defina as variáveis do Supabase."
        : code === "approval-check"
          ? "Não foi possível verificar a aprovação da conta. Tente novamente ou contate um administrador."
          : code === "auth-check"
            ? "Não foi possível validar sua sessão. Entre novamente."
            : code
              ? "O login não foi concluído. Tente novamente."
              : "";
      setError(errorMessage);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const signIn = async (provider: OAuthProvider) => {
    setError("");
    setLoadingProvider(provider);
    try {
      const supabase = createClient();
      const { error: signInError } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo: `${window.location.origin}/auth/callback` },
      });
      if (signInError) throw signInError;
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível iniciar o login.");
      setLoadingProvider(null);
    }
  };

  return (
    <div className="space-y-4">
      <button
        type="button"
        disabled={loadingProvider !== null}
        onClick={() => signIn("google")}
        className="w-full rounded-xl bg-red-700 px-5 py-3 font-semibold text-white transition hover:bg-red-800 disabled:cursor-wait disabled:opacity-60"
      >
        {loadingProvider === "google" ? "Conectando…" : "Continuar com Google"}
      </button>
      <button
        type="button"
        disabled={loadingProvider !== null}
        onClick={() => signIn("apple")}
        className="w-full rounded-xl bg-slate-950 px-5 py-3 font-semibold text-white transition hover:bg-black disabled:cursor-wait disabled:opacity-60"
      >
        {loadingProvider === "apple" ? "Conectando…" : "Continuar com Apple"}
      </button>
      {error && (
        <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {error}
        </p>
      )}
    </div>
  );
}
