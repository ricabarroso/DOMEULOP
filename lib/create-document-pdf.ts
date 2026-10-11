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

  const width = pdf.internal.pageSize.getWidth();
  const contentWidth = width - margin * 2;
  let y = 24;
  const title = type === "receita" ? "RECEITA MÉDICA" : type === "atestado" ? "ATESTADO MÉDICO" : "PEDIDO DE EXAME";

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(16);
  pdf.text(title, margin, y);
  y += 10;
  pdf.setDrawColor(120);
  pdf.line(margin, y, width - margin, y);
  y += 8;

  const write = (label: string, value: string, multiline = false) => {
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(10);
    pdf.text(label, margin, y);
    y += 5;
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(11);
    const lines = pdf.splitTextToSize(value || " ", contentWidth);
    const height = Math.max(6, lines.length * 5);
    if (y + height > 275) {
      pdf.addPage();
      y = 20;
    }
    pdf.text(lines, margin, y);
    y += height + (multiline ? 5 : 3);
  };

  write("Paciente", form.paciente);
  if (form.nascimento) write("Data de nascimento", formatDate(form.nascimento));
  write(type === "exame" ? "Profissional solicitante" : "Profissional", form.profissional);
  write("CRM", form.crm);
  if (form.especialidade) write("Especialidade", form.especialidade);
  if (form.nomeEstabelecimento || form.cnes) {
    write("Estabelecimento / CNES", [form.nomeEstabelecimento, form.enderecoEstabelecimento, form.cnes].filter(Boolean).join(" — "));
  }

  if (type === "receita") {
    form.medicamentos.forEach((medication, index) => {
      write(`Medicamento ${index + 1}`, medication.nome);
      write("Apresentação / concentração", medication.apresentacao);
      write("Posologia e modo de usar", medication.posologia, true);
      write("Quantidade a dispensar", medication.quantidade);
      y += 3;
    });
    write("Observações", form.observacoes, true);
  } else if (type === "atestado") {
    write("Período de afastamento", form.periodo);
    write("Motivo", form.motivo, true);
    write("Observações", form.observacoes, true);
    write("Declaração", `Declaro que o(a) paciente acima identificado(a) foi avaliado(a) e necessita de afastamento pelo período informado.`);
  } else {
    write("Motivo / indicação clínica", form.motivo, true);
    write("Exames solicitados", form.exames, true);
    write("Observações", form.observacoes, true);
  }
  if (form.cidadeEstado) write("Cidade/estado", form.cidadeEstado);
  write("Data", form.dataDocumento ? formatDate(form.dataDocumento) : "Não informada");
  y += 14;
  pdf.setDrawColor(80);
  pdf.line(margin + 25, y, width - margin - 25, y);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  pdf.text("Assinatura e carimbo do profissional", width / 2, y + 5, { align: "center" });
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
