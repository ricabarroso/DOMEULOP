import { jsPDF } from "jspdf";
import type { DocumentType, MedicalDocumentForm } from "@/components/document-editor";

const margin = 12;

export function createDocumentPdf(type: DocumentType, form: MedicalDocumentForm) {
  const pdf = new jsPDF({ format: "a4", unit: "mm" });
  pdf.setProperties({ title: `${type.toUpperCase()} - ${form.paciente || "Documento médico"}` });
  if (type === "apac") {
    drawApac(pdf, form);
    return pdf.output("blob");
  }

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const contentWidth = pageWidth - margin * 2;
  const title = type === "receita" ? "RECEITA MÉDICA" : type === "atestado" ? "ATESTADO MÉDICO" : "PEDIDO DE EXAMES";
  const ink: [number, number, number] = [21, 48, 71];
  const accent: [number, number, number] = [18, 105, 120];
  const pale: [number, number, number] = [239, 246, 248];
  let y = 0;

  const pageHeader = (continuation = false) => {
    pdf.setFillColor(...ink);
    pdf.rect(0, 0, pageWidth, 30, "F");
    pdf.setFillColor(...accent);
    pdf.rect(0, 30, pageWidth, 2, "F");
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(15);
    pdf.setTextColor(255, 255, 255);
    pdf.text(title, margin, 17);
    if (continuation) {
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(8);
      pdf.text("CONTINUAÇÃO", pageWidth - margin, 17, { align: "right" });
    }
    pdf.setTextColor(...ink);
    y = 40;
  };

  const ensureSpace = (height: number) => {
    if (y + height <= pageHeight - 18) return;
    pdf.addPage();
    pageHeader(true);
    if (form.paciente) {
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(8);
      pdf.text(`Paciente: ${form.paciente}`, margin, y);
      y += 7;
    }
  };

  const section = (heading: string) => {
    ensureSpace(12);
    pdf.setFillColor(...pale);
    pdf.roundedRect(margin, y, contentWidth, 7, 1.5, 1.5, "F");
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(8);
    pdf.setTextColor(...accent);
    pdf.text(heading.toLocaleUpperCase("pt-BR"), margin + 3, y + 4.8);
    pdf.setTextColor(...ink);
    y += 10;
  };

  const infoRow = (fields: { label: string; value: string; ratio: number }[]) => {
    const height = 14;
    ensureSpace(height + 2);
    let x = margin;
    for (const item of fields) {
      const cellWidth = contentWidth * item.ratio;
      pdf.setDrawColor(202, 215, 222);
      pdf.setFillColor(255, 255, 255);
      pdf.roundedRect(x, y, cellWidth - 1.5, height, 1, 1, "FD");
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(7);
      pdf.setTextColor(91, 111, 125);
      pdf.text(item.label.toLocaleUpperCase("pt-BR"), x + 2.5, y + 4);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(9);
      pdf.setTextColor(...ink);
      const valueLines = pdf.splitTextToSize(item.value || " ", cellWidth - 5);
      pdf.text(valueLines[0], x + 2.5, y + 10);
      x += cellWidth;
    }
    pdf.setTextColor(...ink);
    y += height + 3;
  };

  const textBlock = (label: string, value: string, options: { indent?: number; fontSize?: number } = {}) => {
    const indent = options.indent ?? 0;
    const fontSize = options.fontSize ?? 10;
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(fontSize);
    const lines = pdf.splitTextToSize(value || " ", contentWidth - indent);
    const height = Math.max(5, lines.length * 4.8);
    ensureSpace(height + (label ? 7 : 2));
    if (label) {
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(8);
      pdf.setTextColor(91, 111, 125);
      pdf.text(label.toLocaleUpperCase("pt-BR"), margin + indent, y);
      y += 4.5;
    }
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(fontSize);
    pdf.setTextColor(...ink);
    pdf.text(lines, margin + indent, y);
    y += height + 3;
    pdf.setTextColor(...ink);
  };

  pageHeader();
  section("Identificação do paciente");
  infoRow([
    { label: "Paciente", value: form.paciente, ratio: 0.7 },
    { label: "Data de nascimento", value: form.nascimento ? formatDate(form.nascimento) : "", ratio: 0.3 },
  ]);
  section(type === "exame" ? "Profissional solicitante" : "Profissional responsável");
  infoRow([
    { label: type === "exame" ? "Solicitante" : "Profissional", value: form.profissional, ratio: 0.68 },
    { label: "CRM", value: form.crm, ratio: 0.32 },
  ]);
  if (form.nomeEstabelecimento || form.enderecoEstabelecimento || form.cnes) {
    textBlock(
      "Estabelecimento / CNES",
      [form.nomeEstabelecimento, form.enderecoEstabelecimento, form.cnes ? `CNES ${form.cnes}` : ""]
        .filter(Boolean)
        .join(" — "),
    );
  }

  if (type === "receita") {
    section("Prescrição");
    form.medicamentos.forEach((medication, index) => {
      const identity = [
        medication.nome || "Medicamento não informado",
        medication.apresentacao,
      ].filter(Boolean).join(" ");
      const firstLine = `${index + 1}. ${identity}${medication.quantidade ? `  ---  ${medication.quantidade}` : ""}`;
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(10);
      const nameLines = pdf.splitTextToSize(firstLine, contentWidth - 7);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(9);
      const posologyLines = pdf.splitTextToSize(medication.posologia || "Posologia não informada", contentWidth - 12);
      const cardHeight = 8 + nameLines.length * 4.5 + posologyLines.length * 4.2;
      ensureSpace(cardHeight + 3);
      pdf.setFillColor(249, 251, 252);
      pdf.setDrawColor(222, 231, 235);
      pdf.roundedRect(margin, y, contentWidth, cardHeight, 1.5, 1.5, "FD");
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(10);
      pdf.setTextColor(...ink);
      pdf.text(nameLines, margin + 4, y + 5);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(9);
      pdf.text(posologyLines, margin + 9, y + 5 + nameLines.length * 4.5 + 1);
      y += cardHeight + 3;
    });
    if (form.observacoes) textBlock("Observações", form.observacoes);
  } else if (type === "atestado") {
    section("Atestado");
    infoRow([{ label: "Período de afastamento", value: form.periodo, ratio: 1 }]);
    textBlock("Motivo / justificativa", form.motivo, { fontSize: 10 });
    textBlock(
      "",
      "Declaro que o(a) paciente acima identificado(a) foi avaliado(a) e necessita de afastamento pelo período informado.",
      { fontSize: 10 },
    );
    if (form.observacoes) textBlock("Observações", form.observacoes);
  } else {
    section("Solicitação de exames");
    textBlock("Motivo / indicação clínica", form.motivo, { fontSize: 10 });
    const exams = form.exames.split(/\r?\n/).map((item) => item.trim()).filter(Boolean);
    exams.forEach((exam, index) => {
      textBlock(`${index + 1}. EXAME SOLICITADO`, exam, { fontSize: 10 });
    });
    if (form.observacoes) textBlock("Observações", form.observacoes);
  }

  const footerHeight = 31;
  ensureSpace(footerHeight);
  y += 6;
  if (form.cidadeEstado || form.dataDocumento) {
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9);
    pdf.setTextColor(...ink);
    const placeAndDate = [form.cidadeEstado, form.dataDocumento ? formatDate(form.dataDocumento) : ""]
      .filter(Boolean)
      .join(", ");
    pdf.text(placeAndDate, pageWidth - margin, y, { align: "right" });
    y += 11;
  }
  pdf.setDrawColor(...ink);
  pdf.line(margin + 28, y + 7, pageWidth - margin - 28, y + 7);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(9);
  pdf.setTextColor(...ink);
  pdf.text(form.profissional || "Profissional responsável", pageWidth / 2, y + 12, { align: "center" });
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8);
  pdf.text(`CRM ${form.crm}`.trim(), pageWidth / 2, y + 17, { align: "center" });
  pdf.setFontSize(7);
  pdf.setTextColor(91, 111, 125);
  pdf.text("Assinatura e carimbo", pageWidth / 2, y + 22, { align: "center" });
  return pdf.output("blob");
}

function drawApac(pdf: jsPDF, form: MedicalDocumentForm) {
  const pageWidth = pdf.internal.pageSize.getWidth();
  const left = 8;
  const width = pageWidth - left * 2;
  let y = 8;

  const section = (title: string) => {
    pdf.setFillColor(20, 20, 20);
    pdf.rect(left, y, width, 5.5, "F");
    pdf.setTextColor(255, 255, 255);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(7);
    pdf.text(title.toLocaleUpperCase("pt-BR"), pageWidth / 2, y + 3.8, { align: "center" });
    pdf.setTextColor(0, 0, 0);
    y += 5.5;
  };

  const field = (x: number, fieldY: number, fieldWidth: number, height: number, label: string, value: string) => {
    pdf.setDrawColor(90);
    pdf.setLineWidth(0.2);
    pdf.rect(x, fieldY, fieldWidth, height);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(4.8);
    pdf.text(label.toLocaleUpperCase("pt-BR"), x + 1.2, fieldY + 2.3);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(7.2);
    const lines = pdf.splitTextToSize(value || "", Math.max(5, fieldWidth - 2.5));
    if (lines.length) pdf.text(lines.slice(0, Math.max(1, Math.floor((height - 3) / 3))).join("\n"), x + 1.2, fieldY + 5.6);
  };

  const row = (height: number, values: { label: string; value: string; width: number }[]) => {
    let x = left;
    for (const item of values) {
      const fieldWidth = width * item.width;
      field(x, y, fieldWidth, height, item.label, item.value);
      x += fieldWidth;
    }
    y += height;
  };

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(7);
  pdf.text("SUS  •  MINISTÉRIO DA SAÚDE", left, y + 3);
  pdf.setFontSize(11);
  pdf.text("LAUDO MÉDICO PARA PROCEDIMENTOS DE ALTA COMPLEXIDADE — APAC", pageWidth / 2, y + 9, { align: "center" });
  y += 12;

  section("Identificação do estabelecimento de saúde solicitante");
  row(9, [
    { label: "1. Nome do estabelecimento de saúde solicitante", value: form.nomeEstabelecimento, width: 0.82 },
    { label: "2. CNES", value: form.cnes, width: 0.18 },
  ]);

  section("Identificação do paciente");
  row(9, [
    { label: "3. Nome do paciente", value: form.paciente, width: 0.72 },
    { label: "4. Nº do prontuário", value: form.numeroProntuario, width: 0.28 },
  ]);
  row(9, [
    { label: "5. Cartão Nacional de Saúde (CNS)", value: form.cns, width: 0.52 },
    { label: "6. Data de nascimento", value: form.nascimento ? formatDate(form.nascimento) : "", width: 0.28 },
    { label: "7. Sexo", value: form.sexo, width: 0.2 },
  ]);
  row(9, [
    { label: "8. Nome da mãe", value: form.nomeMae, width: 0.68 },
    { label: "9. Telefone de contato", value: form.telefone, width: 0.32 },
  ]);
  row(9, [{ label: "10. Endereço (rua, número e bairro)", value: form.enderecoPaciente, width: 1 }]);
  row(9, [
    { label: "11. Município de residência", value: form.municipioResidencia, width: 0.48 },
    { label: "15. Código IBGE", value: form.codigoIbge, width: 0.2 },
    { label: "16. UF", value: form.uf, width: 0.1 },
    { label: "17. CEP", value: form.cep, width: 0.22 },
  ]);

  section("Procedimento solicitado");
  form.procedimentos.forEach((procedure, index) => {
    row(9, [
      { label: `18. Código do procedimento ${index + 1}`, value: procedure.codigo, width: 0.24 },
      { label: `19. Nome do procedimento ${index + 1}`, value: procedure.nome, width: 0.62 },
      { label: `20. Qtd. ${index + 1}`, value: procedure.quantidade, width: 0.14 },
    ]);
  });

  section("Justificativa do(s) procedimento(s) solicitado(s)");
  row(9, [
    { label: "21. Descrição do diagnóstico", value: form.diagnostico, width: 0.52 },
    { label: "22. CID principal", value: form.cidPrincipal, width: 0.16 },
    { label: "23. CID secundário", value: form.cidSecundario, width: 0.16 },
    { label: "24. CID causas associadas", value: form.cidAssociados, width: 0.16 },
  ]);
  row(20, [{ label: "25. Resumo da anamnese e exame físico", value: form.anamnese, width: 1 }]);
  row(17, [{ label: "26. Exames complementares realizados", value: form.examesComplementares, width: 1 }]);
  row(17, [{ label: "27. Justificativa do procedimento", value: form.justificativaApac, width: 1 }]);

  section("Solicitação");
  row(10, [
    { label: "28. Nome do profissional solicitante", value: form.profissional, width: 0.58 },
    { label: "29. Data da solicitação", value: form.dataDocumento ? formatDate(form.dataDocumento) : "", width: 0.2 },
    { label: "30. Assinatura e carimbo", value: "", width: 0.22 },
  ]);
  row(9, [
    { label: "Documento do solicitante (CNS/CPF)", value: form.documentoSolicitanteTipo, width: 0.34 },
    { label: "Número do documento", value: form.documentoSolicitanteNumero, width: 0.66 },
  ]);

  section("Autorização");
  row(9, [
    { label: "31. Nome do profissional autorizador", value: form.profissionalAutorizador, width: 0.48 },
    { label: "32. Cód. órgão emissor", value: form.codigoOrgaoEmissor, width: 0.2 },
    { label: "33. Número da autorização (APAC)", value: form.numeroAutorizacao, width: 0.32 },
  ]);
  row(9, [
    { label: "Documento do autorizador (CNS/CPF)", value: form.documentoAutorizadorTipo, width: 0.34 },
    { label: "Número do documento", value: form.documentoAutorizadorNumero, width: 0.66 },
  ]);
  row(10, [
    { label: "34. Data da autorização", value: form.dataAutorizacao ? formatDate(form.dataAutorizacao) : "", width: 0.22 },
    { label: "35. Assinatura e carimbo", value: "", width: 0.36 },
    { label: "36. Período de validade (de / até)", value: `${form.validadeInicio ? formatMonth(form.validadeInicio) : ""} / ${form.validadeFim ? formatMonth(form.validadeFim) : ""}`, width: 0.42 },
  ]);

  section("Identificação do estabelecimento de saúde executante");
  row(9, [
    { label: "37. Nome do estabelecimento de saúde executante", value: form.estabelecimentoExecutante, width: 0.82 },
    { label: "38. CNES", value: form.cnesExecutante, width: 0.18 },
  ]);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(5.5);
  pdf.text("Documento para preenchimento e conferência. A autorização e validade dependem do fluxo oficial do SUS.", left, Math.min(293, y + 3));
}

function formatDate(value: string) {
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString("pt-BR");
}

function formatMonth(value: string) {
  const [year, month] = value.split("-");
  return year && month ? `${month}/${year}` : value;
}
