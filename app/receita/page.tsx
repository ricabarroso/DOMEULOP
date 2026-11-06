import type { Metadata } from "next";
import { Suspense } from "react";
import RecipeQueryPrefill from "@/components/recipe-query-prefill";

export const metadata: Metadata = { title: "Receita médica | Gerador de Documentos Médicos" };

export default function ReceitaPage() {
  return (
    <Suspense fallback={<main className="min-h-screen px-4 py-8 text-slate-700">Preparando receita…</main>}>
      <RecipeQueryPrefill />
    </Suspense>
  );
}
