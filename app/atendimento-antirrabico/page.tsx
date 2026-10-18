import type { Metadata } from "next";
import AntirabicoEditor from "@/components/antirabico-editor";

export const metadata: Metadata = {
  title: "Atendimento Anti-Rábico Humano | Gerador de Documentos Médicos",
  description: "Preencha a ficha original de Atendimento Anti-Rábico Humano e gere uma cópia em PDF.",
};

export default function AtendimentoAntirrabicoPage() {
  return <AntirabicoEditor />;
}
