import type { Metadata } from "next";
import DocumentEditor from "@/components/document-editor";

export const metadata: Metadata = { title: "APAC | Gerador de Documentos Médicos" };

export default function ApacPage() {
  return <DocumentEditor documentType="apac" />;
}
