"use client";

import { useSearchParams } from "next/navigation";
import DocumentEditor from "@/components/document-editor";

export default function RecipeQueryPrefill() {
  const searchParams = useSearchParams();
  const nome = searchParams.get("medicamento")?.trim().slice(0, 200) ?? "";
  const initialMedication = nome
    ? {
      nome,
      apresentacao: searchParams.get("apresentacao")?.trim().slice(0, 300) ?? "",
      posologia: searchParams.get("posologia")?.trim().slice(0, 1000) ?? "",
    }
    : undefined;

  return <DocumentEditor documentType="receita" initialMedication={initialMedication} />;
}
