"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import type { ReactNode } from "react";
import { createDocumentPdf, type DocumentLogo } from "@/lib/create-document-pdf";
import {
  useDocumentSession,
} from "@/components/document-session-provider";
import type { ProfessionalSuggestion, SavedValue, SharedDocumentData } from "@/components/document-session-provider";
import SavedDatalists, {
  SavedChips,
  findSavedByDetail,
  findSavedByValue,
  parseSavedDetail,
} from "@/components/saved-datalists";
import PrescriptionTemplateManager from "@/components/prescription-template-manager";
import SisregImportButton from "@/components/sisreg-import-button";
import MedicationAutocomplete from "@/components/medication-autocomplete";
import { medicationDisplayName, type MedicationCatalogEntry } from "@/lib/medication-catalog";

export type DocumentType = "receita" | "atestado" | "exame" | "apac";
type ApacProcedure = { codigo: string; nome: string; quantidade: string };
export type PrescriptionType = "standard" | "compounded";
export type PrescriptionMedication = {
  nome: string;
  apresentacao: string;
  posologia: string;
  quantidade: string;
};
export type MedicalDocumentForm = {
  paciente: string;
  nascimento: string;
  profissional: string;
  crm: string;
  prescriptionType: PrescriptionType;
  compoundingText: string;
  procedimento: string;
  motivo: string;
  cidadeEstado: string;
  medicamentos: PrescriptionMedication[];
  periodo: string;
  exames: string;
  observacoes: string;
  cnes: string;
  dataDocumento: string;
  nomeEstabelecimento: string;
  enderecoEstabelecimento: string;
  numeroProntuario: string;
  cns: string;
  cpf: string;
  sexo: string;
  nomeMae: string;
  telefone: string;
  enderecoPaciente: string;
  municipioResidencia: string;
  codigoIbge: string;
  uf: string;
  cep: string;
  procedimentos: ApacProcedure[];
  diagnostico: string;
  cidPrincipal: string;
  cidSecundario: string;
  cidAssociados: string;
  anamnese: string;
  examesComplementares: string;
  justificativaApac: string;
  documentoSolicitanteTipo: string;
  documentoSolicitanteNumero: string;
  profissionalAutorizador: string;
  codigoOrgaoEmissor: string;
  numeroAutorizacao: string;
  documentoAutorizadorTipo: string;
  documentoAutorizadorNumero: string;
  dataAutorizacao: string;
  validadeInicio: string;
  validadeFim: string;
  estabelecimentoExecutante: string;
  cnesExecutante: string;
};

type CnesLookup = {
  codigo: string;
  nome: string;
  endereco: string;
  cep: string;
  atualizadoEm: string;
};

const documentTitles: Record<DocumentType, string> = {
  receita: "Receita médica",
  atestado: "Atestado médico",
  exame: "Pedido de exames",
  apac: "APAC",
};

function getCurrentLocalDate() {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
}

function subscribeToLocalDate(onDateChange: () => void) {
  const timeout = window.setTimeout(onDateChange, 0);
  return () => window.clearTimeout(timeout);
}

const initialForm: MedicalDocumentForm = {
  paciente: "",
  nascimento: "",
  profissional: "",
  crm: "",
  prescriptionType: "standard",
  compoundingText: "",
  procedimento: "",
  motivo: "",
  cidadeEstado: "",
  medicamentos: [{ nome: "", apresentacao: "", posologia: "", quantidade: "" }],
  periodo: "",
  exames: "",
  observacoes: "",
  cnes: "",
  dataDocumento: "",
  nomeEstabelecimento: "",
  enderecoEstabelecimento: "",
  numeroProntuario: "",
  cns: "",
  cpf: "",
  sexo: "",
  nomeMae: "",
  telefone: "",
  enderecoPaciente: "",
  municipioResidencia: "",
  codigoIbge: "",
  uf: "",
  cep: "",
  procedimentos: [
    { codigo: "", nome: "", quantidade: "" },
    { codigo: "", nome: "", quantidade: "" },
    { codigo: "", nome: "", quantidade: "" },
  ],
  diagnostico: "",
  cidPrincipal: "",
  cidSecundario: "",
  cidAssociados: "",
  anamnese: "",
  examesComplementares: "",
  justificativaApac: "",
  documentoSolicitanteTipo: "",
  documentoSolicitanteNumero: "",
  profissionalAutorizador: "",
  codigoOrgaoEmissor: "",
  numeroAutorizacao: "",
  documentoAutorizadorTipo: "",
  documentoAutorizadorNumero: "",
  dataAutorizacao: "",
  validadeInicio: "",
  validadeFim: "",
  estabelecimentoExecutante: "",
  cnesExecutante: "",
};

function isCnesLookup(value: unknown): value is CnesLookup {
  if (typeof value !== "object" || value === null) return false;
  return (
    "codigo" in value &&
    typeof value.codigo === "string" &&
    "nome" in value &&
    typeof value.nome === "string" &&
    "endereco" in value &&
    typeof value.endereco === "string" &&
    "cep" in value &&
    typeof value.cep === "string" &&
    "atualizadoEm" in value &&
    typeof value.atualizadoEm === "string"
  );
}

export default function DocumentEditor({
  documentType,
  initialMedication,
}: {
  documentType: DocumentType;
  initialMedication?: Pick<PrescriptionMedication, "nome" | "apresentacao" | "posologia">;
}) {
  const isApac = documentType === "apac";
  const {
    sharedData,
    professionals,
    institutions,
    savedValues,
    patients,
    updateSharedData,
    rememberInstitution,
    clearSharedData,
    rememberValues,
    rememberCurrentPatient,
    applyPatient,
  } = useDocumentSession();
  const [formState, setForm] = useState<MedicalDocumentForm>(() => initialMedication
    ? {
      ...initialForm,
      prescriptionType: "standard",
      medicamentos: [{ ...initialForm.medicamentos[0], ...initialMedication, quantidade: "" }],
    }
    : initialForm);
  const form = useMemo(() => ({ ...formState, ...sharedData }), [formState, sharedData]);
  const currentDate = useSyncExternalStore(subscribeToLocalDate, getCurrentLocalDate, () => "");
  const [copied, setCopied] = useState(false);
  const [logo, setLogo] = useState<DocumentLogo | null>(null);
  const [logoError, setLogoError] = useState("");
  const [pdfError, setPdfError] = useState("");
  const [cnesStatus, setCnesStatus] = useState<"idle" | "loading" | "success" | "not-found" | "error">("idle");
  const [cnesMessage, setCnesMessage] = useState("");
  const [cnesResult, setCnesResult] = useState<CnesLookup | null>(null);
  const [executorCnesStatus, setExecutorCnesStatus] = useState<"idle" | "loading" | "success" | "not-found" | "error">("idle");
  const [executorCnesMessage, setExecutorCnesMessage] = useState("");
  const [professionalCnsStatus, setProfessionalCnsStatus] = useState<"idle" | "loading" | "success" | "not-found" | "error">("idle");
  const [professionalCnsMessage, setProfessionalCnsMessage] = useState("");
  const cnesTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cnesController = useRef<AbortController | null>(null);
  const cnesRequestId = useRef(0);
  const executorCnesTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const executorCnesController = useRef<AbortController | null>(null);
  const executorCnesRequestId = useRef(0);
  const professionalCnsTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const professionalCnsController = useRef<AbortController | null>(null);
  const professionalCnsRequestId = useRef(0);

  const updateDocumentField = (key: keyof MedicalDocumentForm, value: string) => {
    setForm((previous) => ({ ...previous, [key]: value }));
    const sharedUpdate = getSharedFieldUpdate(key, value);
    if (sharedUpdate) updateSharedData(sharedUpdate);

    if (key === "paciente" || key === "cns") {
      const wanted = key === "cns" ? value.replace(/\D/g, "") : normalizeSuggestion(value);
      const matches = patients.filter((patient) =>
        key === "cns"
          ? wanted.length === 15 && (patient.data.cns ?? "").replace(/\D/g, "") === wanted
          : normalizeSuggestion(patient.nome) === wanted,
      );
      if (matches.length === 1) applyPatient(matches[0]);
    }
  };

  const updateMedication = (index: number, key: keyof PrescriptionMedication, value: string) => {
    setForm((prev) => ({
      ...prev,
      medicamentos: prev.medicamentos.map((item, itemIndex) => {
        if (itemIndex !== index) return item;
        const next = { ...item, [key]: value };
        const saved = key === "nome" ? findSavedByValue(savedValues, "medicamento", value) : undefined;
        if (saved && !item.apresentacao && !item.posologia && !item.quantidade) {
          const detail = parseSavedDetail(saved.detail);
          return {
            ...next,
            nome: saved.value,
            apresentacao: detail.apresentacao ?? "",
            posologia: detail.posologia ?? "",
            quantidade: detail.quantidade ?? "",
          };
        }
        return next;
      }),
    }));
  };

  const updateProcedure = (index: number, key: keyof ApacProcedure, value: string) => {
    setForm((prev) => ({
      ...prev,
      procedimentos: prev.procedimentos.map((item, itemIndex) => {
        if (itemIndex !== index) return item;
        const next = { ...item, [key]: value };
        if (key === "nome") {
          const saved = findSavedByValue(savedValues, "procedimento", value);
          if (saved && !item.codigo) return { ...next, nome: saved.value, codigo: saved.detail };
        }
        if (key === "codigo") {
          const saved = findSavedByDetail(savedValues, "procedimento", value);
          if (saved && !item.nome) return { ...next, codigo: saved.detail, nome: saved.value };
        }
        return next;
      }),
    }));
  };

  const updateDiagnosis = (key: "diagnostico" | "cidPrincipal", value: string) => {
    if (key === "diagnostico") {
      const saved = findSavedByValue(savedValues, "diagnostico", value);
      if (saved && !form.cidPrincipal) {
        updateDocumentField("diagnostico", saved.value);
        updateDocumentField("cidPrincipal", saved.detail);
        return;
      }
    } else {
      const saved = findSavedByValue(savedValues, "cid", value);
      if (saved && !form.diagnostico) {
        updateDocumentField("cidPrincipal", saved.value);
        updateDocumentField("diagnostico", saved.detail);
        return;
      }
    }
    updateDocumentField(key, value);
  };

  const appendSavedLine = (key: "exames" | "examesComplementares", line: string) => {
    const current = form[key];
    const lines = current.split(/\r?\n/).map((item) => item.trim());
    if (lines.some((item) => normalizeSuggestion(item) === normalizeSuggestion(line))) return;
    setForm((prev) => ({ ...prev, [key]: current.trim() ? `${current.replace(/\s+$/, "")}\n${line}` : line }));
  };

  const commitSavedEntries = () => {
    rememberCurrentPatient();
    const entries: SavedValue[] = [];
    const addLines = (text: string) => {
      for (const line of text.split(/\r?\n|;/)) {
        const cleaned = line.replace(/^[\s\-•*\d.)]+/, "").trim();
        if (cleaned.length >= 3 && cleaned.length <= 300) entries.push({ field: "exame", value: cleaned, detail: "" });
      }
    };

    if (documentType === "receita" && form.prescriptionType === "standard") {
      for (const medication of form.medicamentos) {
        if (!medication.nome.trim()) continue;
        entries.push({
          field: "medicamento",
          value: medication.nome,
          detail: JSON.stringify({
            apresentacao: medication.apresentacao,
            posologia: medication.posologia,
            quantidade: medication.quantidade,
          }),
        });
      }
    }
    if (documentType === "exame") addLines(form.exames);
    if (isApac) {
      addLines(form.examesComplementares);
      for (const procedure of form.procedimentos) {
        if (procedure.nome.trim()) entries.push({ field: "procedimento", value: procedure.nome, detail: procedure.codigo.trim() });
      }
      if (form.diagnostico.trim()) entries.push({ field: "diagnostico", value: form.diagnostico, detail: form.cidPrincipal.trim() });
      if (form.cidPrincipal.trim()) entries.push({ field: "cid", value: form.cidPrincipal, detail: form.diagnostico.trim() });
      if (form.cidSecundario.trim()) entries.push({ field: "cid", value: form.cidSecundario, detail: "" });
    }
    rememberValues(entries);
  };

  const applyProfessional = (suggestion: ProfessionalSuggestion) => {
    const values = {
      profissional: suggestion.nome,
      crm: suggestion.crm,
      cidadeEstado: suggestion.cidadeEstado,
      documentoSolicitanteTipo: suggestion.documentoTipo,
      documentoSolicitanteNumero: suggestion.documentoNumero,
    };
    setForm((previous) => ({ ...previous, ...values }));
    updateSharedData(values);
  };

  const handleProfessionalNameChange = (value: string) => {
    const suggestion = professionals.find((item) => normalizeSuggestion(item.nome) === normalizeSuggestion(value));
    if (suggestion) {
      applyProfessional(suggestion);
      return;
    }
    const sameProfessional = normalizeSuggestion(form.profissional) === normalizeSuggestion(value);
    const crm = sameProfessional ? form.crm : "";
    setForm((previous) => ({ ...previous, profissional: value, crm }));
    updateSharedData({ profissional: value, crm });
  };

  const handleCrmChange = (value: string) => {
    const suggestion = professionals.find((item) => item.crm && normalizeSuggestion(item.crm) === normalizeSuggestion(value));
    if (suggestion) {
      applyProfessional(suggestion);
      return;
    }
    updateDocumentField("crm", value);
  };

  const handleInstitutionNameChange = (value: string) => {
    const matches = institutions.filter((item) => normalizeSuggestion(item.nome) === normalizeSuggestion(value));
    if (matches.length === 1) {
      handleCnesChange(matches[0].cnes);
      return;
    }

    handleCnesChange("");
    setForm((previous) => ({
      ...previous,
      nomeEstabelecimento: value,
    }));
    if (matches.length > 1) {
      setCnesMessage("Há mais de um CNES com esse nome. Informe o código CNES correto para confirmar o endereço.");
      setCnesStatus("idle");
    }
  };

  const handleExecutorNameChange = (value: string) => {
    const matches = institutions.filter((item) => normalizeSuggestion(item.nome) === normalizeSuggestion(value));
    if (matches.length === 1) {
      handleExecutorCnesChange(matches[0].cnes);
      return;
    }
    handleExecutorCnesChange("");
    setForm((previous) => ({ ...previous, estabelecimentoExecutante: value, cnesExecutante: "" }));
    if (matches.length > 1) {
      setExecutorCnesMessage("Há mais de um CNES com esse nome. Informe o código CNES correto.");
      setExecutorCnesStatus("idle");
    }
  };

  useEffect(() => {
    return () => {
      if (cnesTimer.current) clearTimeout(cnesTimer.current);
      cnesController.current?.abort();
      if (executorCnesTimer.current) clearTimeout(executorCnesTimer.current);
      executorCnesController.current?.abort();
      if (professionalCnsTimer.current) clearTimeout(professionalCnsTimer.current);
      professionalCnsController.current?.abort();
    };
  }, []);

  const preview = useMemo(() => {
    const documentDate = form.dataDocumento || currentDate;
    const formattedDate = documentDate ? formatDate(documentDate) : "Data não informada";
    const establishmentDetails = [
      form.nomeEstabelecimento,
      form.enderecoEstabelecimento,
      form.cnes ? `CNES: ${form.cnes}` : "",
    ].filter(Boolean);
    const establishment = establishmentDetails.length
      ? `ESTABELECIMENTO / CNES\n${establishmentDetails.join("\n")}\n\n`
      : "";
    const professional = `${documentType === "exame" ? "Solicitante" : "Profissional"}: ${form.profissional}\nCRM: ${form.crm}`;
    const patient = `Paciente: ${form.paciente}\n${form.cpf ? `CPF: ${form.cpf}\n` : ""}Data de nascimento: ${formatDate(form.nascimento)}`;

    switch (documentType) {
      case "receita":
        return `RECEITA MÉDICA\n\n${establishment}${professional}\n\n${patient}\n\n${form.prescriptionType === "compounded" ? `PRESCRIÇÃO MANIPULADA\n${form.compoundingText}` : form.medicamentos.map((medication, index) => `${index + 1}. ${[medication.nome || "Medicamento não informado", medication.apresentacao].filter(Boolean).join(" ")}${medication.quantidade ? `  ---  ${medication.quantidade}` : ""}\n   ${medication.posologia}`).join("\n\n")}\n\nObservações: ${form.observacoes.trim() || "Nada consta"}\n\nCidade/estado: ${form.cidadeEstado}\nData: ${formattedDate}\nAssinatura e carimbo do profissional.`;
      case "atestado":
        return `ATESTADO MÉDICO\n\n${establishment}${professional}\n\n${patient}\n\nDeclaro, por meio deste, que o paciente acima foi avaliado e necessita de afastamento por ${form.periodo}, em razão de ${form.motivo}.\n\nObservações: ${form.observacoes.trim() || "Nada consta"}\n\nCidade/estado: ${form.cidadeEstado}\nData: ${formattedDate}\nAssinatura e carimbo do profissional.`;
      case "exame":
        return `PEDIDO DE EXAME\n\n${establishment}${professional}\n\n${patient}\n\nMotivo da solicitação: ${form.motivo}\nExames solicitados:\n${formatList(form.exames)}\n\nObservações: ${form.observacoes.trim() || "Nada consta"}\n\nCidade/estado: ${form.cidadeEstado}\nData: ${formattedDate}\nAssinatura e carimbo do profissional.`;
      case "apac":
        return `LAUDO MÉDICO PARA PROCEDIMENTOS DE ALTA COMPLEXIDADE - APAC\n\nIDENTIFICAÇÃO DO ESTABELECIMENTO DE SAÚDE (SOLICITANTE)\n1. Nome: ${form.nomeEstabelecimento}\n2. CNES: ${form.cnes}\n\nIDENTIFICAÇÃO DO PACIENTE\n3. Nome: ${form.paciente}\n4. Nº prontuário: ${form.numeroProntuario}\n5. CNS: ${form.cns}\n6. Data de nascimento: ${form.nascimento ? formatDate(form.nascimento) : ""}\n7. Sexo: ${form.sexo}\n8. Nome da mãe: ${form.nomeMae}\n9. Telefone: ${form.telefone}\n10. Endereço: ${form.enderecoPaciente}\n11. Município: ${form.municipioResidencia}\n15. Código IBGE: ${form.codigoIbge}  16. UF: ${form.uf}  17. CEP: ${form.cep}\n\nPROCEDIMENTO SOLICITADO\n${form.procedimentos.map((item, index) => `${index + 1}. Código ${item.codigo} — ${item.nome} — Qtd. ${item.quantidade}`).join("\n")}\n\nJUSTIFICATIVA DO(S) PROCEDIMENTO(S) SOLICITADO(S)\n21. Diagnóstico: ${form.diagnostico}\n22. CID principal: ${form.cidPrincipal}  23. Secundário: ${form.cidSecundario}  24. Associados: ${form.cidAssociados}\n25. Resumo da anamnese e exame físico: ${form.anamnese}\n26. Exames complementares realizados: ${form.examesComplementares}\n27. Justificativa do procedimento: ${form.justificativaApac}\n\nSOLICITAÇÃO\n28. Profissional solicitante: ${form.profissional}\n29. Data: ${formattedDate}\nDocumento ${form.documentoSolicitanteTipo}: ${form.documentoSolicitanteNumero}\n\nAUTORIZAÇÃO\n31. Profissional autorizador: ${form.profissionalAutorizador}\n32. Código do órgão emissor: ${form.codigoOrgaoEmissor}\n33. Número da autorização APAC: ${form.numeroAutorizacao}\nDocumento ${form.documentoAutorizadorTipo}: ${form.documentoAutorizadorNumero}\n34. Data da autorização: ${form.dataAutorizacao ? formatDate(form.dataAutorizacao) : ""}\n36. Validade: ${form.validadeInicio ? formatMonth(form.validadeInicio) : ""} até ${form.validadeFim ? formatMonth(form.validadeFim) : ""}\n\nIDENTIFICAÇÃO DO ESTABELECIMENTO DE SAÚDE (EXECUTANTE)\n37. Nome: ${form.estabelecimentoExecutante}\n38. CNES: ${form.cnesExecutante}`;
    }
  }, [documentType, form, currentDate]);

  const handleCnesChange = (value: string) => {
    const codigo = value.replace(/\D/g, "").slice(0, 7);
    setForm((prev) => ({
      ...prev,
      cnes: codigo,
      nomeEstabelecimento: "",
      enderecoEstabelecimento: "",
    }));
    setCnesResult(null);
    setCnesMessage("");
    cnesRequestId.current += 1;
    const requestId = cnesRequestId.current;
    if (cnesTimer.current) clearTimeout(cnesTimer.current);
    cnesController.current?.abort();

    if (codigo.length !== 7) {
      setCnesStatus("idle");
      return;
    }

    setCnesStatus("loading");
    cnesTimer.current = setTimeout(async () => {
      const controller = new AbortController();
      cnesController.current = controller;
      try {
        const response = await fetch(`/api/cnes/${codigo}`, { signal: controller.signal });
        const data: unknown = await response.json();
        if (requestId !== cnesRequestId.current) return;
        if (!response.ok) {
          const message =
            typeof data === "object" &&
            data !== null &&
            "error" in data &&
            typeof data.error === "string"
              ? data.error
              : "Falha ao consultar o CNES.";
          setCnesMessage(message);
          setCnesStatus(response.status === 404 ? "not-found" : "error");
          return;
        }
        if (!isCnesLookup(data)) {
          setCnesMessage("O serviço CNES retornou dados incompatíveis.");
          setCnesStatus("error");
          return;
        }
        if (data.codigo !== codigo) {
          setCnesMessage("O serviço CNES retornou um estabelecimento incompatível com o código informado.");
          setCnesStatus("error");
          return;
        }

        setCnesResult(data);
        setForm((prev) => ({
          ...prev,
          cnes: data.codigo,
          nomeEstabelecimento: data.nome,
          enderecoEstabelecimento: data.endereco,
        }));
        rememberInstitution({ nome: data.nome, cnes: data.codigo, endereco: data.endereco });
        setCnesMessage(
          documentType === "apac"
            ? "Estabelecimento solicitante localizado. Confira os dados antes de usar."
            : "Estabelecimento localizado. Confira os dados antes de usar.",
        );
        setCnesStatus("success");
      } catch (error) {
        if (controller.signal.aborted || requestId !== cnesRequestId.current) return;
        setCnesMessage(error instanceof Error ? error.message : "Falha ao consultar o CNES.");
        setCnesStatus("error");
      }
    }, 350);
  };

  const handleExecutorCnesChange = (value: string) => {
    const codigo = value.replace(/\D/g, "").slice(0, 7);
    setForm((prev) => ({
      ...prev,
      cnesExecutante: codigo,
      estabelecimentoExecutante: "",
    }));
    setExecutorCnesMessage("");
    executorCnesRequestId.current += 1;
    const requestId = executorCnesRequestId.current;
    if (executorCnesTimer.current) clearTimeout(executorCnesTimer.current);
    executorCnesController.current?.abort();

    if (codigo.length !== 7) {
      setExecutorCnesStatus("idle");
      return;
    }

    setExecutorCnesStatus("loading");
    executorCnesTimer.current = setTimeout(async () => {
      const controller = new AbortController();
      executorCnesController.current = controller;
      try {
        const response = await fetch(`/api/cnes/${codigo}`, { signal: controller.signal });
        const data: unknown = await response.json();
        if (requestId !== executorCnesRequestId.current) return;
        if (!response.ok) {
          const message =
            typeof data === "object" &&
            data !== null &&
            "error" in data &&
            typeof data.error === "string"
              ? data.error
              : "Falha ao consultar o CNES do estabelecimento executante.";
          setExecutorCnesMessage(message);
          setExecutorCnesStatus(response.status === 404 ? "not-found" : "error");
          return;
        }
        if (!isCnesLookup(data)) {
          setExecutorCnesMessage("O serviço CNES retornou dados incompatíveis.");
          setExecutorCnesStatus("error");
          return;
        }
        if (data.codigo !== codigo) {
          setExecutorCnesMessage("O serviço CNES retornou um estabelecimento incompatível com o código informado.");
          setExecutorCnesStatus("error");
          return;
        }

        setForm((prev) => ({
          ...prev,
          cnesExecutante: data.codigo,
          estabelecimentoExecutante: data.nome,
        }));
        rememberInstitution({ nome: data.nome, cnes: data.codigo, endereco: data.endereco });
        setExecutorCnesMessage("Estabelecimento executante localizado. Confira os dados antes de usar.");
        setExecutorCnesStatus("success");
      } catch (error) {
        if (controller.signal.aborted || requestId !== executorCnesRequestId.current) return;
        setExecutorCnesMessage(
          error instanceof Error ? error.message : "Falha ao consultar o CNES do estabelecimento executante.",
        );
        setExecutorCnesStatus("error");
      }
    }, 350);
  };

  const handleProfessionalCnsChange = (value: string, shouldLookup: boolean) => {
    const cns = value.replace(/\D/g, "").slice(0, 15);
    setForm((prev) => ({ ...prev, documentoSolicitanteNumero: cns }));
    updateSharedData({ documentoSolicitanteNumero: cns });
    professionalCnsRequestId.current += 1;
    const requestId = professionalCnsRequestId.current;
    if (professionalCnsTimer.current) clearTimeout(professionalCnsTimer.current);
    professionalCnsController.current?.abort();
    setProfessionalCnsMessage("");

    if (!shouldLookup || cns.length !== 15) {
      setProfessionalCnsStatus("idle");
      return;
    }

    setProfessionalCnsStatus("loading");
    professionalCnsTimer.current = setTimeout(async () => {
      const controller = new AbortController();
      professionalCnsController.current = controller;
      try {
        const response = await fetch(`/api/cnes/profissionais?cns=${encodeURIComponent(cns)}`, {
          signal: controller.signal,
        });
        const data: unknown = await response.json();
        if (requestId !== professionalCnsRequestId.current) return;
        if (!response.ok) {
          const message =
            typeof data === "object" && data !== null && "error" in data && typeof data.error === "string"
              ? data.error
              : "Falha ao consultar o CNS profissional.";
          setProfessionalCnsMessage(message);
          setProfessionalCnsStatus(response.status === 404 ? "not-found" : "error");
          return;
        }
        if (
          typeof data !== "object" ||
          data === null ||
          !("nome" in data) ||
          typeof data.nome !== "string" ||
          !("cns" in data) ||
          typeof data.cns !== "string"
        ) {
          setProfessionalCnsMessage("O serviço CNES retornou dados incompatíveis.");
          setProfessionalCnsStatus("error");
          return;
        }
        const professionalName = data.nome;
        const crm = normalizeSuggestion(form.profissional) === normalizeSuggestion(professionalName)
          ? form.crm
          : "";
        setForm((prev) => ({ ...prev, profissional: professionalName, crm }));
        updateSharedData({ profissional: professionalName, crm });
        setProfessionalCnsMessage(`Profissional localizado: ${professionalName}. Confira a identificação antes de usar.`);
        setProfessionalCnsStatus("success");
      } catch (error) {
        if (controller.signal.aborted || requestId !== professionalCnsRequestId.current) return;
        setProfessionalCnsMessage(error instanceof Error ? error.message : "Falha ao consultar o CNS profissional.");
        setProfessionalCnsStatus("error");
      }
    }, 350);
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(preview);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  };

  const handleLogoChange = (file: File | undefined) => {
    setLogoError("");
    if (!file) return;
    if (file.type !== "image/png" && file.type !== "image/jpeg") {
      setLogoError("Use uma imagem PNG ou JPEG.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setLogoError("A imagem deve ter no máximo 2 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = typeof reader.result === "string" ? reader.result : "";
      const image = new window.Image();
      image.onload = () => {
        if (!image.naturalWidth || !image.naturalHeight) {
          setLogoError("Não foi possível ler a imagem.");
          return;
        }
        setLogo({
          dataUrl,
          format: file.type === "image/png" ? "PNG" : "JPEG",
          width: image.naturalWidth,
          height: image.naturalHeight,
        });
      };
      image.onerror = () => setLogoError("Não foi possível ler a imagem.");
      image.src = dataUrl;
    };
    reader.onerror = () => setLogoError("Não foi possível ler a imagem.");
    reader.readAsDataURL(file);
  };

  const handleOpenPdf = async () => {
    setPdfError("");
    const previewWindow = window.open("", "_blank");
    if (!previewWindow) {
      setPdfError("O navegador bloqueou a nova aba. Permita pop-ups para abrir a visualização em PDF.");
      return;
    }

    previewWindow.document.title = `PDF - ${documentTitles[documentType]}`;
    previewWindow.document.body.textContent = "Preparando a visualização do documento…";
    try {
      const blob = createDocumentPdf(documentType, {
        ...form,
        dataDocumento: form.dataDocumento || currentDate,
      }, logo);
      const pdfUrl = URL.createObjectURL(blob);
      previewWindow.location.replace(pdfUrl);
      window.setTimeout(() => URL.revokeObjectURL(pdfUrl), 5 * 60 * 1000);
    } catch (error) {
      previewWindow.close();
      setPdfError(error instanceof Error ? error.message : "Não foi possível gerar o PDF.");
    }
  };

  return (
    <main className="min-h-screen px-4 py-8 text-slate-900 md:px-8" onBlur={commitSavedEntries}>
      <div className="mx-auto max-w-7xl space-y-6">
        <SavedDatalists />
        <datalist id="professional-suggestions">
          {professionals.map((professional) => (
            <option key={`${professional.nome}-${professional.crm}`} value={professional.nome} label={professional.crm ? `CRM ${professional.crm}` : undefined} />
          ))}
        </datalist>
        <datalist id="institution-suggestions">
          {institutions.map((institution) => (
            <option key={`${institution.cnes}-${institution.nome}`} value={institution.nome} label={institution.cnes ? `CNES ${institution.cnes}` : undefined} />
          ))}
        </datalist>
        <datalist id="crm-suggestions">
          {professionals.filter((professional) => professional.crm).map((professional) => (
            <option key={`${professional.nome}-${professional.crm}`} value={professional.crm} label={professional.nome} />
          ))}
        </datalist>
        <datalist id="city-suggestions">
          {[...new Set(professionals.map((professional) => professional.cidadeEstado).filter(Boolean))].map((city) => (
            <option key={city} value={city} />
          ))}
        </datalist>
        <datalist id="cnes-suggestions">
          {institutions.filter((institution) => institution.cnes).map((institution) => (
            <option key={`${institution.cnes}-${institution.nome}`} value={institution.cnes} label={institution.nome} />
          ))}
        </datalist>
        <datalist id="professional-document-suggestions">
          {professionals.filter((professional) => professional.documentoNumero).map((professional) => (
            <option key={`${professional.nome}-${professional.documentoNumero}`} value={professional.documentoNumero} label={`${professional.documentoTipo} — ${professional.nome}`} />
          ))}
        </datalist>
        <header id="editor-toolbar" className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-slate-200 bg-white/85 p-5 shadow-sm">
          <div>
            <Link
              href="/"
              className="text-sm font-medium text-emerald-800 hover:underline"
            >
              ← Todos os documentos
            </Link>
            <h1 className="mt-2 text-2xl font-bold md:text-3xl">{documentTitles[documentType]}</h1>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={clearSharedData}
              className="rounded-xl border border-emerald-300 px-4 py-3 text-sm font-semibold text-emerald-900 hover:bg-emerald-50"
            >
              Limpar dados compartilhados
            </button>
            <button
              type="button"
              onClick={handleOpenPdf}
              className="rounded-xl bg-emerald-700 px-5 py-3 font-semibold text-white transition hover:bg-emerald-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600"
            >
              Abrir PDF para visualizar / imprimir
            </button>
          </div>
        </header>

        <section className="grid gap-6 xl:grid-cols-[1.05fr_1.35fr]">
          <div id="document-form" className="space-y-6">
            <div className="rounded-3xl border border-slate-200 bg-white/85 p-5 shadow-sm">
              {documentType === "apac" ? (
                <ApacFields
                  form={form}
                  currentDate={currentDate}
                  onCnesChange={handleCnesChange}
                  onExecutorCnesChange={handleExecutorCnesChange}
                  executorCnesStatus={executorCnesStatus}
                  executorCnesMessage={executorCnesMessage}
                  onProfessionalCnsChange={handleProfessionalCnsChange}
                  professionalCnsStatus={professionalCnsStatus}
                  professionalCnsMessage={professionalCnsMessage}
                  onSharedFieldChange={updateDocumentField}
                  onProfessionalNameChange={handleProfessionalNameChange}
                  onInstitutionNameChange={handleInstitutionNameChange}
                  onExecutorNameChange={handleExecutorNameChange}
                  onProcedureChange={updateProcedure}
                  onDiagnosisChange={updateDiagnosis}
                  onAppendSavedLine={appendSavedLine}
                  onImportPatient={updateSharedData}
                />
              ) : (
                <>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h2 className="text-lg font-semibold">Dados do atendimento</h2>
                    <SisregImportButton onImport={updateSharedData} />
                  </div>
                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <Field label="Paciente" value={form.paciente} list="patient-name-suggestions" onChange={(value) => updateDocumentField("paciente", value)} />
                    <Field label="Nascimento" type="date" value={form.nascimento} onChange={(value) => updateDocumentField("nascimento", value)} />
                    <Field label="CPF do paciente" value={form.cpf} onChange={(value) => updateDocumentField("cpf", formatCpf(value))} />
                    <Field label="Profissional" value={form.profissional} list="professional-suggestions" onChange={handleProfessionalNameChange} />
                    <Field label="CRM" value={form.crm} list="crm-suggestions" onChange={handleCrmChange} />
                    <Field label="Cidade/estado" list="city-suggestions" value={form.cidadeEstado} onChange={(value) => updateDocumentField("cidadeEstado", value)} />
                    <Field label="Data do documento" type="date" value={form.dataDocumento || currentDate} onChange={(value) => setForm((prev) => ({ ...prev, dataDocumento: value }))} />
                    <Field label="Estabelecimento de saúde" value={form.nomeEstabelecimento} list="institution-suggestions" onChange={handleInstitutionNameChange} />
                    <Field label="CNES" value={form.cnes} list="cnes-suggestions" onChange={handleCnesChange} />
                  </div>
                </>
              )}

              {cnesStatus !== "idle" && (
                <div
                  className={`mt-3 rounded-xl px-3 py-2 text-sm ${
                    cnesStatus === "success"
                      ? "bg-emerald-50 text-emerald-800"
                      : cnesStatus === "loading"
                        ? "bg-sky-50 text-sky-800"
                        : "bg-amber-50 text-amber-900"
                  }`}
                  role="status"
                  aria-live="polite"
                >
                  {cnesStatus === "loading"
                    ? documentType === "apac"
                      ? "Consultando cadastro público CNES do estabelecimento solicitante…"
                      : "Consultando cadastro público CNES…"
                    : cnesMessage}
                  {cnesResult?.atualizadoEm ? ` Dados atualizados em ${formatDate(cnesResult.atualizadoEm)}.` : ""}
                </div>
              )}
              {cnesResult && (
                <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-700">
                  <p className="font-semibold">{cnesResult.nome}</p>
                  {cnesResult.endereco && <p>{cnesResult.endereco}</p>}
                  {cnesResult.cep && <p>CEP {cnesResult.cep}</p>}
                  <p className="mt-1 text-xs text-slate-500">
                    Dados públicos do CNES. Confirme se correspondem ao estabelecimento pretendido.
                  </p>
                </div>
              )}

              {documentType !== "apac" && (
                <div className="mt-5 space-y-4">
                  <FormSection title="Logo do documento (opcional)">
                    <div className="flex flex-wrap items-center gap-4">
                      <label className="inline-flex cursor-pointer items-center rounded-xl bg-emerald-700 px-4 py-2.5 font-semibold text-white transition hover:bg-emerald-800 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-emerald-600">
                        Adicionar logo
                      <input
                        type="file"
                        accept="image/png,image/jpeg"
                        aria-label="Enviar logo"
                        onChange={(event) => {
                          handleLogoChange(event.target.files?.[0]);
                          event.target.value = "";
                        }}
                          className="sr-only"
                      />
                      </label>
                      {logo && (
                        <>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={logo.dataUrl} alt="Logo selecionado" className="h-12 max-w-40 rounded border border-slate-200 bg-white object-contain p-1" />
                          <button
                            type="button"
                            onClick={() => setLogo(null)}
                            className="rounded-lg border border-emerald-200 px-3 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-50"
                          >
                            Remover logo
                          </button>
                        </>
                      )}
                    </div>
                    {logoError && <p role="alert" className="mt-2 text-sm text-red-700">{logoError}</p>}
                    <p className="mt-2 text-xs text-slate-600">PNG ou JPEG, até 2 MB. A imagem fica apenas no navegador e aparece no cabeçalho do PDF.</p>
                  </FormSection>
                  {documentType === "receita" && (
                    <FormSection title="Medicamentos prescritos">
                      <div className="space-y-4">
                        <label className="block text-sm font-medium text-slate-700">
                          <span className="mb-2 block">Tipo de receituário</span>
                          <select
                            value={form.prescriptionType}
                            onChange={(event) => setForm((previous) => ({
                              ...previous,
                              prescriptionType: event.target.value === "compounded" ? "compounded" : "standard",
                            }))}
                            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-base outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
                          >
                            <option value="standard">Medicamentos com campos estruturados</option>
                            <option value="compounded">Medicamento manipulado — texto livre</option>
                          </select>
                        </label>
                        {form.prescriptionType === "compounded" ? (
                          <Field
                            label="Prescrição manipulada (todos os campos em texto livre)"
                            value={form.compoundingText}
                            onChange={(value) => setForm((previous) => ({ ...previous, compoundingText: value }))}
                            multiline
                          />
                        ) : (
                          <>
                          {form.medicamentos.map((medication, index) => (
                          <fieldset key={index} className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                            <div className="flex items-center justify-between gap-3">
                              <legend className="font-semibold text-slate-800">Medicamento {index + 1}</legend>
                              {form.medicamentos.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => setForm((prev) => ({
                                    ...prev,
                                    medicamentos: prev.medicamentos.filter((_, itemIndex) => itemIndex !== index),
                                  }))}
                                  className="rounded-lg border border-emerald-200 px-3 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-50"
                                  aria-label={`Remover medicamento ${index + 1}`}
                                >
                                  Remover
                                </button>
                              )}
                            </div>
                            <div className="grid gap-4 md:grid-cols-2">
                              <MedicationAutocomplete
                                label="Nome do medicamento"
                                value={medication.nome}
                                list="saved-medicamento"
                                onChange={(value) => updateMedication(index, "nome", value)}
                                onSelect={(entry: MedicationCatalogEntry) => {
                                  const name = medicationDisplayName(entry);
                                  const presentation = entry.source === "catmat"
                                    ? [entry.concentration, entry.pharmaceuticalForm, entry.supplyUnit]
                                      .filter(Boolean)
                                      .join(" — ")
                                    : "";
                                  const sameMedication =
                                    normalizeSuggestion(medication.nome) === normalizeSuggestion(name) &&
                                    (!presentation ||
                                      !medication.apresentacao.trim() ||
                                      normalizeSuggestion(medication.apresentacao) === normalizeSuggestion(presentation));

                                  if (sameMedication) {
                                    if (
                                      presentation &&
                                      !medication.apresentacao.trim() &&
                                      !medication.posologia.trim() &&
                                      !medication.quantidade.trim()
                                    ) {
                                      setForm((previous) => ({
                                        ...previous,
                                        medicamentos: previous.medicamentos.map((item, itemIndex) => itemIndex === index
                                          ? { ...item, apresentacao: presentation }
                                          : item),
                                      }));
                                    }
                                    return true;
                                  }

                                  const hasDetails = Boolean(
                                    medication.apresentacao.trim() ||
                                    medication.posologia.trim() ||
                                    medication.quantidade.trim(),
                                  );
                                  if (
                                    hasDetails &&
                                    !window.confirm(
                                      "Trocar o medicamento apagará a apresentação, a posologia e a quantidade preenchidas. Deseja continuar?",
                                    )
                                  ) {
                                    return false;
                                  }

                                  setForm((previous) => ({
                                    ...previous,
                                    medicamentos: previous.medicamentos.map((item, itemIndex) => itemIndex === index
                                      ? {
                                        ...item,
                                        nome: name,
                                        apresentacao: presentation,
                                        posologia: "",
                                        quantidade: "",
                                      }
                                      : item),
                                  }));
                                  return true;
                                }}
                              />
                              <Field
                                label="Apresentação / concentração (ex.: 500 mg)"
                                value={medication.apresentacao}
                                list="saved-medicamento-apresentacao"
                                onChange={(value) => updateMedication(index, "apresentacao", value)}
                              />
                              <Field
                                label="Posologia e modo de usar"
                                value={medication.posologia}
                                onChange={(value) => updateMedication(index, "posologia", value)}
                                multiline
                              />
                              <Field
                                label="Quantidade a dispensar (ex.: 1 caixa)"
                                value={medication.quantidade}
                                list="saved-medicamento-quantidade"
                                onChange={(value) => updateMedication(index, "quantidade", value)}
                              />
                            </div>
                          </fieldset>
                          ))}
                          <button
                            type="button"
                            onClick={() => setForm((prev) => ({
                              ...prev,
                              medicamentos: [...prev.medicamentos, { nome: "", apresentacao: "", posologia: "", quantidade: "" }],
                            }))}
                            className="rounded-xl border border-emerald-700 px-4 py-2 text-sm font-semibold text-emerald-800 transition hover:bg-emerald-50"
                          >
                            + Adicionar medicamento
                          </button>
                          </>
                        )}
                        <PrescriptionTemplateManager
                          prescriptionType={form.prescriptionType}
                          medications={form.medicamentos}
                          compoundingText={form.compoundingText}
                          onLoad={(template) => setForm((previous) => ({
                            ...previous,
                            prescriptionType: template.prescriptionType,
                            medicamentos: template.medications,
                            compoundingText: template.compoundingText,
                          }))}
                        />
                      </div>
                    </FormSection>
                  )}
                  {documentType === "atestado" && (
                    <>
                      <Field label="Período de afastamento" value={form.periodo} onChange={(value) => setForm((prev) => ({ ...prev, periodo: value }))} />
                      <Field label="Motivo / justificativa" value={form.motivo} onChange={(value) => setForm((prev) => ({ ...prev, motivo: value }))} multiline />
                    </>
                  )}
                  {documentType === "exame" && (
                    <>
                      <Field label="Motivo da solicitação" value={form.motivo} onChange={(value) => setForm((prev) => ({ ...prev, motivo: value }))} multiline />
                      <div>
                        <Field label="Exames solicitados" value={form.exames} onChange={(value) => setForm((prev) => ({ ...prev, exames: value }))} multiline />
                        <SavedChips field="exame" label="Exames usados antes (toque para adicionar)" onPick={(value) => appendSavedLine("exames", value)} />
                      </div>
                    </>
                  )}
                  <Field label="Observações" value={form.observacoes} onChange={(value) => setForm((prev) => ({ ...prev, observacoes: value }))} multiline />
                </div>
              )}
            </div>
          </div>

          <section
            id="print-document"
            aria-labelledby="document-preview-title"
            className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-8"
          >
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-700">Pré-visualização</p>
                <h2 id="document-preview-title" className="mt-2 text-xl font-semibold">
                  {documentTitles[documentType]}
                </h2>
              </div>
              <button
                type="button"
                onClick={handleCopy}
                id="copy-document"
                className="rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-800 transition hover:bg-slate-100"
              >
                {copied ? "Copiado" : "Copiar texto"}
              </button>
            </div>

            {documentType === "apac" ? (
              <ApacPreview form={form} currentDate={currentDate} />
            ) : (
              <div className="document-content mt-5 rounded-2xl border border-emerald-200 border-t-4 border-t-emerald-600 bg-emerald-50/70 p-5 text-sm leading-7 text-slate-800 md:p-8">
                {logo && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={logo.dataUrl} alt="Logo" className="mb-4 ml-auto h-16 max-w-48 object-contain" />
                )}
                <pre className="whitespace-pre-wrap font-sans">{preview}</pre>
              </div>
            )}

            {pdfError && (
              <div id="pdf-error" role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                {pdfError}
              </div>
            )}
            <div id="print-warning" className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
              <strong className="font-semibold">Aviso:</strong> revise o conteúdo e confirme os dados antes de
              abrir o PDF. Os dados do paciente permanecem no navegador durante a geração.
            </div>
          </section>
        </section>
      </div>
    </main>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  multiline = false,
  list,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  multiline?: boolean;
  list?: string;
}) {
  const focusClasses = "focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200";
  return (
    <label className="block text-sm font-medium text-slate-700">
      <span className="mb-2 block">{label}</span>
      {multiline ? (
        <textarea
          value={value}
          onChange={(event) => onChange(event.target.value)}
          rows={4}
          className={`w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-base text-slate-800 outline-none transition ${focusClasses}`}
        />
      ) : (
        <input
          type={type}
          value={value}
          list={list}
          onChange={(event) => onChange(event.target.value)}
          className={`w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-base text-slate-800 outline-none transition ${focusClasses}`}
        />
      )}
    </label>
  );
}

function ApacFields({
  form,
  currentDate,
  onCnesChange,
  onExecutorCnesChange,
  executorCnesStatus,
  executorCnesMessage,
  onProfessionalCnsChange,
  professionalCnsStatus,
  professionalCnsMessage,
  onSharedFieldChange,
  onProfessionalNameChange,
  onInstitutionNameChange,
  onExecutorNameChange,
  onProcedureChange,
  onDiagnosisChange,
  onAppendSavedLine,
  onImportPatient,
}: {
  form: MedicalDocumentForm;
  currentDate: string;
  onCnesChange: (value: string) => void;
  onExecutorCnesChange: (value: string) => void;
  executorCnesStatus: "idle" | "loading" | "success" | "not-found" | "error";
  executorCnesMessage: string;
  onProfessionalCnsChange: (value: string, shouldLookup: boolean) => void;
  professionalCnsStatus: "idle" | "loading" | "success" | "not-found" | "error";
  professionalCnsMessage: string;
  onSharedFieldChange: (key: keyof MedicalDocumentForm, value: string) => void;
  onProfessionalNameChange: (value: string) => void;
  onInstitutionNameChange: (value: string) => void;
  onExecutorNameChange: (value: string) => void;
  onProcedureChange: (index: number, key: keyof ApacProcedure, value: string) => void;
  onDiagnosisChange: (key: "diagnostico" | "cidPrincipal", value: string) => void;
  onAppendSavedLine: (key: "exames" | "examesComplementares", line: string) => void;
  onImportPatient: (data: Partial<SharedDocumentData>) => void;
}) {
  const update = (key: keyof MedicalDocumentForm, value: string) => {
    onSharedFieldChange(key, value);
  };

  return (
    <div className="space-y-5">
      <h2 className="text-lg font-semibold">Laudo médico para procedimentos de alta complexidade — APAC</h2>
      <FormSection title="Identificação do estabelecimento de saúde (solicitante)">
        <div className="grid gap-4 md:grid-cols-[2fr_1fr]">
          <Field label="1. Nome do estabelecimento solicitante" value={form.nomeEstabelecimento} list="institution-suggestions" onChange={onInstitutionNameChange} />
          <Field label="2. CNES" value={form.cnes} list="cnes-suggestions" onChange={onCnesChange} />
        </div>
        <p className="mt-2 text-xs text-slate-500">Digite o CNES para consultar o cadastro público. A busca envia somente esse código.</p>
      </FormSection>

      <FormSection title="Identificação do paciente">
        <div className="mb-3"><SisregImportButton onImport={onImportPatient} /></div>
        <div className="grid gap-4 md:grid-cols-3">
          <div className="md:col-span-2"><Field label="3. Nome do paciente" value={form.paciente} list="patient-name-suggestions" onChange={(value) => update("paciente", value)} /></div>
          <Field label="4. Nº do prontuário" value={form.numeroProntuario} onChange={(value) => update("numeroProntuario", value)} />
          <Field label="5. Cartão Nacional de Saúde (CNS)" value={form.cns} list="patient-cns-suggestions" onChange={(value) => update("cns", value)} />
          <Field label="6. Data de nascimento" type="date" value={form.nascimento} onChange={(value) => update("nascimento", value)} />
          <label className="block text-sm font-medium text-slate-700">
            <span className="mb-2 block">7. Sexo</span>
            <select value={form.sexo} onChange={(event) => update("sexo", event.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-base outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200">
              <option value="">Selecione</option>
              <option value="F">Feminino</option>
              <option value="M">Masculino</option>
              <option value="I">Ignorado</option>
            </select>
          </label>
          <div className="md:col-span-2"><Field label="8. Nome da mãe" value={form.nomeMae} onChange={(value) => update("nomeMae", value)} /></div>
          <Field label="9. Telefone de contato" type="tel" value={form.telefone} onChange={(value) => update("telefone", value)} />
          <div className="md:col-span-3"><Field label="10. Endereço (rua, número e bairro)" value={form.enderecoPaciente} onChange={(value) => update("enderecoPaciente", value)} /></div>
          <Field label="11. Município de residência" value={form.municipioResidencia} onChange={(value) => update("municipioResidencia", value)} />
          <Field label="15. Código IBGE do município" value={form.codigoIbge} onChange={(value) => update("codigoIbge", value)} />
          <Field label="16. UF" value={form.uf} onChange={(value) => update("uf", value)} />
          <Field label="17. CEP" value={form.cep} onChange={(value) => update("cep", value)} />
        </div>
      </FormSection>

      <FormSection title="Procedimento solicitado">
        <div className="space-y-4">
          {form.procedimentos.map((procedure, index) => (
            <div key={index} className="grid gap-3 rounded-xl border border-slate-200 p-3 md:grid-cols-[1fr_2fr_0.5fr]">
              <Field label={`18. Código do procedimento ${index + 1}`} value={procedure.codigo} list="saved-procedimento-codigo" onChange={(value) => onProcedureChange(index, "codigo", value)} />
              <Field label={`19. Nome do procedimento ${index + 1}`} value={procedure.nome} list="saved-procedimento-nome" onChange={(value) => onProcedureChange(index, "nome", value)} />
              <Field label={`20. Quantidade ${index + 1}`} type="number" value={procedure.quantidade} onChange={(value) => onProcedureChange(index, "quantidade", value)} />
            </div>
          ))}
        </div>
      </FormSection>

      <FormSection title="Justificativa do(s) procedimento(s) solicitado(s)">
        <div className="grid gap-4 md:grid-cols-4">
          <div className="md:col-span-4"><Field label="21. Descrição do diagnóstico" value={form.diagnostico} list="saved-diagnostico" onChange={(value) => onDiagnosisChange("diagnostico", value)} /></div>
          <Field label="22. CID principal" value={form.cidPrincipal} list="saved-cid" onChange={(value) => onDiagnosisChange("cidPrincipal", value)} />
          <Field label="23. CID secundário" value={form.cidSecundario} list="saved-cid" onChange={(value) => update("cidSecundario", value)} />
          <div className="md:col-span-2"><Field label="24. CID causas associadas" value={form.cidAssociados} list="saved-cid" onChange={(value) => update("cidAssociados", value)} /></div>
          <div className="md:col-span-4"><Field label="25. Resumo da anamnese e exame físico" value={form.anamnese} onChange={(value) => update("anamnese", value)} multiline /></div>
          <div className="md:col-span-4">
            <Field label="26. Exames complementares realizados" value={form.examesComplementares} onChange={(value) => update("examesComplementares", value)} multiline />
            <SavedChips field="exame" label="Exames usados antes (toque para adicionar)" onPick={(value) => onAppendSavedLine("examesComplementares", value)} />
          </div>
          <div className="md:col-span-4"><Field label="27. Justificativa do procedimento" value={form.justificativaApac} onChange={(value) => update("justificativaApac", value)} multiline /></div>
        </div>
      </FormSection>

      <FormSection title="Solicitação">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="md:col-span-2"><Field label="28. Nome do profissional solicitante" value={form.profissional} list="professional-suggestions" onChange={onProfessionalNameChange} /></div>
          <Field label="29. Data da solicitação" type="date" value={form.dataDocumento || currentDate} onChange={(value) => update("dataDocumento", value)} />
          <SelectField label="Documento do solicitante" value={form.documentoSolicitanteTipo} onChange={(value) => {
            update("documentoSolicitanteTipo", value);
            onProfessionalCnsChange(form.documentoSolicitanteNumero, value === "CNS");
          }} />
          <div className="md:col-span-2"><Field label="Número do documento (CNS/CPF)" value={form.documentoSolicitanteNumero} list="professional-document-suggestions" onChange={(value) => onProfessionalCnsChange(value, form.documentoSolicitanteTipo === "CNS")} /></div>
          {professionalCnsStatus !== "idle" && (
            <p
              className={`md:col-span-3 rounded-lg px-3 py-2 text-sm ${
                professionalCnsStatus === "success"
                  ? "bg-emerald-50 text-emerald-800"
                  : professionalCnsStatus === "loading"
                    ? "bg-sky-50 text-sky-800"
                    : "bg-amber-50 text-amber-900"
              }`}
              role="status"
              aria-live="polite"
            >
              {professionalCnsStatus === "loading" ? "Consultando profissionais na base pública do CNES…" : professionalCnsMessage}
            </p>
          )}
          <div className="md:col-span-3"><SignatureLine label="30. Assinatura e carimbo do profissional solicitante" /></div>
        </div>
      </FormSection>

      <FormSection title="Autorização">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="md:col-span-2"><Field label="31. Nome do profissional autorizador" value={form.profissionalAutorizador} onChange={(value) => update("profissionalAutorizador", value)} /></div>
          <Field label="32. Código do órgão emissor" value={form.codigoOrgaoEmissor} onChange={(value) => update("codigoOrgaoEmissor", value)} />
          <div className="md:col-span-3"><Field label="33. Número da autorização (APAC)" value={form.numeroAutorizacao} onChange={(value) => update("numeroAutorizacao", value)} /></div>
          <SelectField label="Documento do autorizador" value={form.documentoAutorizadorTipo} onChange={(value) => update("documentoAutorizadorTipo", value)} />
          <div className="md:col-span-2"><Field label="Número do documento (CNS/CPF)" value={form.documentoAutorizadorNumero} onChange={(value) => update("documentoAutorizadorNumero", value)} /></div>
          <Field label="34. Data da autorização" type="date" value={form.dataAutorizacao} onChange={(value) => update("dataAutorizacao", value)} />
          <Field label="36. Validade da APAC — início" type="month" value={form.validadeInicio} onChange={(value) => update("validadeInicio", value)} />
          <Field label="Validade da APAC — fim" type="month" value={form.validadeFim} onChange={(value) => update("validadeFim", value)} />
          <div className="md:col-span-3"><SignatureLine label="35. Assinatura e carimbo do profissional autorizador" /></div>
        </div>
      </FormSection>

      <FormSection title="Identificação do estabelecimento de saúde (executante)">
        <div className="grid gap-4 md:grid-cols-[2fr_1fr]">
          <Field label="37. Nome do estabelecimento executante" value={form.estabelecimentoExecutante} list="institution-suggestions" onChange={onExecutorNameChange} />
          <Field label="38. CNES do estabelecimento executante" value={form.cnesExecutante} list="cnes-suggestions" onChange={onExecutorCnesChange} />
        </div>
        <p className="mt-2 text-xs text-slate-500">Informe o CNES do estabelecimento que executará o procedimento. Esta consulta é independente da consulta do estabelecimento solicitante.</p>
        {executorCnesStatus !== "idle" && (
          <p
            className={`mt-3 rounded-lg px-3 py-2 text-sm ${
              executorCnesStatus === "success"
                ? "bg-emerald-50 text-emerald-800"
                : executorCnesStatus === "loading"
                  ? "bg-sky-50 text-sky-800"
                  : "bg-amber-50 text-amber-900"
            }`}
            role="status"
            aria-live="polite"
          >
            {executorCnesStatus === "loading" ? "Consultando CNES do estabelecimento executante…" : executorCnesMessage}
          </p>
        )}
      </FormSection>
    </div>
  );
}

function FormSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-t border-slate-200 pt-4">
      <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-800">{title}</h3>
      {children}
    </section>
  );
}

function SelectField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="block text-sm font-medium text-slate-700">
      <span className="mb-2 block">{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-base outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200">
        <option value="">Selecione</option>
        <option value="CNS">CNS</option>
        <option value="CPF">CPF</option>
      </select>
    </label>
  );
}

function SignatureLine({ label }: { label: string }) {
  return (
    <div className="flex min-h-14 items-end rounded-xl border border-dashed border-slate-300 px-3 py-2 text-xs text-slate-500">
      {label}
    </div>
  );
}

function ApacPreview({ form, currentDate }: { form: MedicalDocumentForm; currentDate: string }) {
  return (
    <div className="document-content apac-paper mt-5 space-y-1 rounded border border-slate-400 bg-white p-3 text-slate-900">
      <div className="mb-2 flex items-center justify-between border-b-2 border-slate-900 pb-2">
        <div className="font-bold">SUS<br /><span className="text-[9px] font-normal">Ministério da Saúde</span></div>
        <h3 className="max-w-[75%] text-center text-sm font-bold uppercase">Laudo médico para procedimentos de alta complexidade — APAC</h3>
      </div>
      <ApacPreviewSection title="Identificação do estabelecimento de saúde (solicitante)">
        <ApacPreviewRow fields={[
          ["1. Nome do estabelecimento solicitante", form.nomeEstabelecimento, "grow"],
          ["2. CNES", form.cnes, "w-24"],
        ]} />
      </ApacPreviewSection>
      <ApacPreviewSection title="Identificação do paciente">
        <ApacPreviewRow fields={[
          ["3. Nome do paciente", form.paciente, "grow"],
          ["4. Nº prontuário", form.numeroProntuario, "w-28"],
        ]} />
        <ApacPreviewRow fields={[
          ["5. CNS", form.cns, "grow"],
          ["6. Data de nascimento", form.nascimento ? formatDate(form.nascimento) : "", "w-32"],
          ["7. Sexo", form.sexo, "w-16"],
        ]} />
        <ApacPreviewRow fields={[
          ["8. Nome da mãe", form.nomeMae, "grow"],
          ["9. Telefone", form.telefone, "w-32"],
        ]} />
        <ApacPreviewRow fields={[["10. Endereço (rua, número e bairro)", form.enderecoPaciente, "w-full"]]} />
        <ApacPreviewRow fields={[
          ["11. Município de residência", form.municipioResidencia, "grow"],
          ["15. Código IBGE", form.codigoIbge, "w-24"],
          ["16. UF", form.uf, "w-14"],
          ["17. CEP", form.cep, "w-28"],
        ]} />
      </ApacPreviewSection>
      <ApacPreviewSection title="Procedimento solicitado">
        {form.procedimentos.map((procedure, index) => (
          <ApacPreviewRow key={index} fields={[
            [`18. Código ${index + 1}`, procedure.codigo, "w-28"],
            [`19. Nome do procedimento ${index + 1}`, procedure.nome, "grow"],
            [`20. Qtd. ${index + 1}`, procedure.quantidade, "w-16"],
          ]} />
        ))}
      </ApacPreviewSection>
      <ApacPreviewSection title="Justificativa do(s) procedimento(s) solicitado(s)">
        <ApacPreviewRow fields={[
          ["21. Descrição do diagnóstico", form.diagnostico, "grow"],
          ["22. CID principal", form.cidPrincipal, "w-24"],
          ["23. CID secundário", form.cidSecundario, "w-24"],
          ["24. CID causas associadas", form.cidAssociados, "w-28"],
        ]} />
        <ApacPreviewRow fields={[["25. Resumo da anamnese e exame físico", form.anamnese, "w-full"]]} tall />
        <ApacPreviewRow fields={[["26. Exames complementares realizados", form.examesComplementares, "w-full"]]} tall />
        <ApacPreviewRow fields={[["27. Justificativa do procedimento", form.justificativaApac, "w-full"]]} tall />
      </ApacPreviewSection>
      <ApacPreviewSection title="Solicitação">
        <ApacPreviewRow fields={[
          ["28. Profissional solicitante", form.profissional, "grow"],
          ["29. Data da solicitação", form.dataDocumento || currentDate ? formatDate(form.dataDocumento || currentDate) : "", "w-32"],
          ["30. Assinatura e carimbo", "", "w-40"],
        ]} />
        <ApacPreviewRow fields={[
          ["Documento", form.documentoSolicitanteTipo, "w-24"],
          ["Número CNS/CPF do solicitante", form.documentoSolicitanteNumero, "grow"],
        ]} />
      </ApacPreviewSection>
      <ApacPreviewSection title="Autorização">
        <ApacPreviewRow fields={[
          ["31. Profissional autorizador", form.profissionalAutorizador, "grow"],
          ["32. Órgão emissor", form.codigoOrgaoEmissor, "w-28"],
          ["33. Nº autorização APAC", form.numeroAutorizacao, "w-32"],
        ]} />
        <ApacPreviewRow fields={[
          ["Documento", form.documentoAutorizadorTipo, "w-24"],
          ["Número CNS/CPF do autorizador", form.documentoAutorizadorNumero, "grow"],
        ]} />
        <ApacPreviewRow fields={[
          ["34. Data autorização", form.dataAutorizacao ? formatDate(form.dataAutorizacao) : "", "w-32"],
          ["35. Assinatura e carimbo", "", "grow"],
          ["36. Validade (de / até)", `${form.validadeInicio ? formatMonth(form.validadeInicio) : ""} / ${form.validadeFim ? formatMonth(form.validadeFim) : ""}`, "w-36"],
        ]} />
      </ApacPreviewSection>
      <ApacPreviewSection title="Identificação do estabelecimento de saúde (executante)">
        <ApacPreviewRow fields={[
          ["37. Estabelecimento executante", form.estabelecimentoExecutante, "grow"],
          ["38. CNES", form.cnesExecutante, "w-24"],
        ]} />
      </ApacPreviewSection>
    </div>
  );
}

function ApacPreviewSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border border-slate-400">
      <h4 className="bg-slate-900 px-2 py-1 text-center text-[9px] font-bold uppercase tracking-wide text-white">{title}</h4>
      <div className="space-y-1 p-1">{children}</div>
    </section>
  );
}

function ApacPreviewRow({ fields, tall = false }: { fields: [string, string, string][]; tall?: boolean }) {
  return (
    <div className="flex gap-1">
      {fields.map(([label, value, width]) => (
        <div key={label} className={`min-h-9 ${tall ? "min-h-16" : ""} ${width} min-w-0 border border-slate-300 px-1.5 py-1`}>
          <p className="truncate text-[8px] text-slate-500">{label}</p>
          <p className="whitespace-pre-wrap break-words text-[10px] leading-4">{value || "\u00a0"}</p>
        </div>
      ))}
    </div>
  );
}

function getSharedFieldUpdate(
  key: keyof MedicalDocumentForm,
  value: string,
): Partial<SharedDocumentData> | null {
  switch (key) {
    case "paciente":
    case "nascimento":
    case "numeroProntuario":
    case "cns":
    case "cpf":
    case "sexo":
    case "nomeMae":
    case "telefone":
    case "enderecoPaciente":
    case "municipioResidencia":
    case "codigoIbge":
    case "uf":
    case "cep":
    case "profissional":
    case "crm":
    case "cidadeEstado":
    case "documentoSolicitanteTipo":
    case "documentoSolicitanteNumero":
      return { [key]: value };
    default:
      return null;
  }
}

function normalizeSuggestion(value: string) {
  return value.trim().toLocaleLowerCase("pt-BR");
}

function formatList(value: string) {
  return value
    .split(/\n/)
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => `- ${item}`)
    .join("\n");
}

function formatDate(value: string) {
  if (!value) return "Não informado";
  const parsed = new Date(`${value}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleDateString("pt-BR");
}

function formatCpf(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  return digits
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1-$2");
}

function formatMonth(value: string) {
  const [year, month] = value.split("-");
  return year && month ? `${month}/${year}` : value;
}
