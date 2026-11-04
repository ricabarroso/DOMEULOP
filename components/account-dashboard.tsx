"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const adminEmails = new Set([
  "ricardobarroso.med@gmail.com",
  "ricardo-barroso@hotmail.com",
  "rica_bol@hotmail.com",
]);

type PendingProfile = { id: string; email: string; created_at: string };

export default function AccountDashboard() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [approved, setApproved] = useState(false);
  const [pendingUsers, setPendingUsers] = useState<PendingProfile[]>([]);
  const [approvedUsers, setApprovedUsers] = useState<PendingProfile[]>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);

  const loadAccount = useCallback(async () => {
    try {
      const supabase = createClient();
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user?.email) {
        setEmail("");
        setApproved(false);
        setPendingUsers([]);
        setApprovedUsers([]);
        return;
      }

      const normalizedEmail = user.email.toLocaleLowerCase("en-US");
      setEmail(user.email);
      const isAdmin = adminEmails.has(normalizedEmail);
      if (isAdmin) {
        setApproved(true);
        const { data, error: listError } = await supabase
          .from("profiles")
          .select("id,email,created_at")
          .eq("approved", false)
          .order("created_at", { ascending: true });
        if (listError) throw listError;
        setPendingUsers(data);
        const { data: approvedData, error: approvedListError } = await supabase
          .from("profiles")
          .select("id,email,created_at")
          .eq("approved", true)
          .order("created_at", { ascending: true });
        if (approvedListError) throw approvedListError;
        setApprovedUsers(approvedData.filter(
          (profile) => !adminEmails.has(profile.email.toLocaleLowerCase("en-US")),
        ));
        return;
      }

      setPendingUsers([]);
      setApprovedUsers([]);
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("approved")
        .eq("id", user.id)
        .maybeSingle();
      if (profileError) throw profileError;
      setApproved(profile?.approved ?? false);
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : "Não foi possível carregar a conta.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadAccount(), 0);
    return () => window.clearTimeout(timer);
  }, [loadAccount]);

  const approve = async (userId: string) => {
    setMessage("");
    setUpdatingUserId(userId);
    try {
      const supabase = createClient();
      const { error: approvalError } = await supabase.rpc("approve_app_user", {
        target_user_id: userId,
      });
      if (approvalError) throw approvalError;
      setPendingUsers((previous) => previous.filter((user) => user.id !== userId));
      const approvedUser = pendingUsers.find((user) => user.id === userId);
      if (approvedUser) {
        setApprovedUsers((previous) => [...previous, approvedUser]);
      }
      setMessage("Cadastro aprovado.");
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : "Não foi possível aprovar o cadastro.");
    } finally {
      setUpdatingUserId(null);
    }
  };

  const revokeApproval = async (userId: string) => {
    const user = approvedUsers.find((profile) => profile.id === userId);
    if (!user || !window.confirm(`Revogar o acesso de ${user.email}?`)) return;

    setMessage("");
    setUpdatingUserId(userId);
    try {
      const supabase = createClient();
      const { error: revokeError } = await supabase.rpc("revoke_app_user", {
        target_user_id: userId,
      });
      if (revokeError) throw revokeError;
      setApprovedUsers((previous) => previous.filter((profile) => profile.id !== userId));
      setPendingUsers((previous) => [...previous, user].sort(
        (left, right) => left.created_at.localeCompare(right.created_at),
      ));
      setMessage("Acesso revogado; cadastro retornou à lista de pendentes.");
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : "Não foi possível revogar o acesso.");
    } finally {
      setUpdatingUserId(null);
    }
  };

  const signOut = async () => {
    setMessage("");
    try {
      const supabase = createClient();
      const { error: signOutError } = await supabase.auth.signOut();
      if (signOutError) throw signOutError;
      router.refresh();
      setEmail("");
      setApproved(false);
      setPendingUsers([]);
      setApprovedUsers([]);
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : "Não foi possível encerrar a sessão.");
    }
  };

  if (loading) {
    return <p className="text-sm text-slate-600" aria-live="polite">Verificando acesso…</p>;
  }

  if (!email) {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/login" className="rounded-xl bg-red-700 px-4 py-2 font-semibold text-white hover:bg-red-800">
          Entrar com Google ou Apple
        </Link>
        {message && <p role="alert" className="text-sm text-red-800">{message}</p>}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
        <div>
          <p className="font-semibold text-red-950">{email}</p>
          <p className="text-sm text-red-800">
            {approved ? "Acesso autorizado." : "Cadastro aguardando aprovação."}
          </p>
        </div>
        <button type="button" onClick={signOut} className="rounded-lg border border-red-300 px-3 py-2 text-sm font-semibold text-red-900 hover:bg-white">
          Sair
        </button>
      </div>

      {approved && (
        <nav aria-label="Documentos disponíveis" className="flex flex-wrap gap-3">
          <Link href="/receita" className="rounded-xl bg-red-700 px-4 py-2 font-semibold text-white hover:bg-red-800">Receita</Link>
          <Link href="/atestado" className="rounded-xl border border-red-300 px-4 py-2 font-semibold text-red-900 hover:bg-red-50">Atestado</Link>
          <Link href="/pedido-exames" className="rounded-xl border border-red-300 px-4 py-2 font-semibold text-red-900 hover:bg-red-50">Pedido de exames</Link>
          <Link href="/apac" className="rounded-xl border border-red-300 px-4 py-2 font-semibold text-red-900 hover:bg-red-50">APAC</Link>
        </nav>
      )}

      {adminEmails.has(email.toLocaleLowerCase("en-US")) && (
        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="text-lg font-semibold">Cadastros aguardando aprovação</h2>
          {pendingUsers.length === 0 ? (
            <p className="mt-2 text-sm text-slate-600">Não há novos cadastros pendentes.</p>
          ) : (
            <ul className="mt-3 divide-y divide-slate-200">
              {pendingUsers.map((user) => (
                <li key={user.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <span>{user.email}</span>
                  <button type="button" disabled={updatingUserId !== null} onClick={() => void approve(user.id)} className="rounded-lg bg-emerald-700 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:cursor-wait disabled:opacity-60">
                    {updatingUserId === user.id ? "Atualizando…" : "Aceitar cadastro"}
                  </button>
                </li>
              ))}
            </ul>
          )}
          <h3 className="mt-6 text-base font-semibold">Contas com acesso autorizado</h3>
          {approvedUsers.length === 0 ? (
            <p className="mt-2 text-sm text-slate-600">Não há outras contas autorizadas.</p>
          ) : (
            <ul className="mt-2 divide-y divide-slate-200">
              {approvedUsers.map((user) => (
                <li key={user.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <span>{user.email}</span>
                  <button type="button" disabled={updatingUserId !== null} onClick={() => void revokeApproval(user.id)} className="rounded-lg border border-red-300 px-3 py-2 text-sm font-semibold text-red-800 hover:bg-red-50 disabled:cursor-wait disabled:opacity-60">
                    {updatingUserId === user.id ? "Atualizando…" : "Revogar acesso"}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {message && <p role="status" className="text-sm text-slate-700">{message}</p>}
    </div>
  );
}
