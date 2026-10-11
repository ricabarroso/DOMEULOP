import type { Metadata } from "next";
import DocumentEditor from "@/components/document-editor";

export const metadata: Metadata = { title: "Receita médica | Gerador de Documentos Médicos" };

export default function ReceitaPage() {
  return <DocumentEditor documentType="receita" />;
}
