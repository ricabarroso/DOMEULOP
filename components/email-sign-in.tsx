"use client";

import { FormEvent, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { createRecoveryClient } from "@/lib/supabase/recovery-client";

type Mode = "signin" | "signup" | "reset";

function getAuthErrorMessage(reason: unknown) {
  const message = reason instanceof Error ? reason.message : "";
  if (/email rate limit exceeded|rate limit.*email/i.test(message)) {
    return "O limite de envio de e-mails do projeto foi atingido. Cadastro e recuperação de senha compartilham esse limite; tentar outros endereços não resolve. Aguarde cerca de uma hora e tente novamente uma única vez.";
  }
  return message || "Não foi possível concluir a solicitação.";
}

export default function EmailSignIn() {
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const code = new URLSearchParams(window.location.search).get("error");
      const errorMessage = code === "configuration"
        ? "A autenticação ainda não foi configurada. Defina as variáveis do Supabase."
        : code === "approval-check"
          ? "Não foi possível verificar a aprovação da conta. Tente novamente ou contate um administrador."
          : code === "auth-check"
            ? "Não foi possível validar sua sessão. Entre novamente."
            : code === "recovery"
              ? "O link de recuperação expirou ou já foi usado. Solicite outro."
              : code === "password-updated"
                ? "Senha alterada. Entre com a nova senha."
            : code
                ? "O login não foi concluído. Tente novamente."
                : "";
      setError(errorMessage);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setNotice("");
    setLoading(true);
    try {
      const supabase = createClient();
      if (mode === "reset") {
        const { error: resetError } = await createRecoveryClient().auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (resetError) throw resetError;
        setNotice("Se houver uma conta com esse e-mail, enviaremos um link para redefinir a senha.");
        return;
      }

      if (mode === "signup") {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
        });
        if (signUpError) throw signUpError;
        // Com e-mail já cadastrado o Supabase devolve um usuário sem identidades.
        if (data.user && data.user.identities?.length === 0) {
          throw new Error("Este e-mail já está cadastrado. Use \"Entrar\".");
        }
        setNotice("Cadastro criado. Confirme seu e-mail pelo link enviado e depois entre com sua senha.");
        setMode("signin");
        setPassword("");
        return;
      }

      const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) throw signInError;
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("approved")
        .eq("id", data.user.id)
        .maybeSingle();
      if (profileError || !profile) {
        window.location.assign("/login?error=approval-check");
        return;
      }
      window.location.assign(profile.approved ? "/" : "/pending");
    } catch (reason) {
      setError(getAuthErrorMessage(reason));
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-950 outline-none focus:border-red-600";

  return (
    <form onSubmit={submit} className="space-y-4">
      <label className="block space-y-1 text-sm font-semibold text-slate-700">
        E-mail
        <input
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className={inputClass}
        />
      </label>
      {mode !== "reset" && (
        <label className="block space-y-1 text-sm font-semibold text-slate-700">
          Senha
          <input
            type="password"
            required
            minLength={8}
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className={inputClass}
          />
        </label>
      )}
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-xl bg-red-700 px-5 py-3 font-semibold text-white transition hover:bg-red-800 disabled:cursor-wait disabled:opacity-60"
      >
        {loading
          ? "Aguarde…"
          : mode === "signup"
            ? "Criar conta"
            : mode === "reset"
              ? "Enviar link de recuperação"
              : "Entrar"}
      </button>
      {mode === "signin" && (
        <button
          type="button"
          onClick={() => {
            setMode("reset");
            setError("");
            setNotice("");
          }}
          className="w-full text-sm font-semibold text-red-800 hover:underline"
        >
          Esqueci minha senha
        </button>
      )}
      <button
        type="button"
        onClick={() => {
          setMode(mode === "signup" ? "signin" : "signup");
          setError("");
          setNotice("");
        }}
        className="w-full text-sm font-semibold text-red-800 hover:underline"
      >
        {mode === "signup" ? "Já tenho conta" : "Voltar para entrar"}
      </button>
      {notice && (
        <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
          {notice}
        </p>
      )}
      {error && (
        <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {error}
        </p>
      )}
    </form>
  );
}
