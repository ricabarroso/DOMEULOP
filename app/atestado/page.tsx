import type { Metadata } from "next";
import DocumentEditor from "@/components/document-editor";

export const metadata: Metadata = { title: "Atestado médico | Gerador de Documentos Médicos" };

export default function AtestadoPage() {
  return <DocumentEditor documentType="atestado" />;
}
