import type { Metadata } from "next";
import DocumentEditor from "@/components/document-editor";

export const metadata: Metadata = { title: "Pedido de exames | Gerador de Documentos Médicos" };

export default function PedidoExamesPage() {
  return <DocumentEditor documentType="exame" />;
}
