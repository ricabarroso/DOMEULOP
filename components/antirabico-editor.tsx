"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useDocumentSession } from "@/components/document-session-provider";
import SavedDatalists, { findSavedByValue, normalizeSaved, parseSavedDetail } from "@/components/saved-datalists";
import {
  antirabicoSections,
  initialAntirabicoValues,
  type AntirabicoField,
  type AntirabicoValue,
  type AntirabicoValues,
} from "@/lib/antirabico-form";
import { createAntirabicoPdf } from "@/lib/create-antirabico-pdf";

const originalPdfUrl = "/atendimento-antirrabico.pdf";

export default function AntirabicoEditor() {
  const {
    sharedData,
    institutions,
    patients,
    savedValues,
    updateSharedData,
    rememberValues,
    rememberCurrentPatient,
    applyPatient,
  } = useDocumentSession();
  const [localValues, setValues] = useState<AntirabicoValues>(initialAntirabicoValues);
  const values: AntirabicoValues = useMemo(() => ({
    ...localValues,
    patientName: sharedData.paciente,
    birthDate: sharedData.nascimento,
    patientCns: sharedData.cns,
    sex: sharedData.sexo,
    motherName: sharedData.nomeMae,
    phone: sharedData.telefone,
    street: sharedData.ruaPaciente,
    streetNumber: sharedData.numeroEnderecoPaciente,
    complement: sharedData.complementoEnderecoPaciente,
    neighborhood: sharedData.bairroPaciente,
    district: sharedData.distritoPaciente,
    residenceCity: sharedData.municipioResidencia,
    residenceIbge: sharedData.codigoIbge,
    residenceState: sharedData.uf,
    cep: sharedData.cep,
    notificationUnit: sharedData.nomeEstabelecimento,
    notificationCnes: sharedData.cnes,
  }), [localValues, sharedData]);
  const [filledPdfUrl, setFilledPdfUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cnesMessage, setCnesMessage] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    return () => {
      if (filledPdfUrl) URL.revokeObjectURL(filledPdfUrl);
    };
  }, [filledPdfUrl]);

  const cnes = typeof values.notificationCnes === "string" ? values.notificationCnes : "";
  useEffect(() => {
    if (!/^\d{7}$/.test(cnes)) return;
    const controller = new AbortController();
    const lookupInstitution = async () => {
      try {
        const response = await fetch(`/api/cnes/${cnes}`, { signal: controller.signal });
        const data: unknown = await response.json();
        if (controller.signal.aborted) return;
        if (!response.ok) {
          const message =
            typeof data === "object" && data !== null && "error" in data && typeof data.error === "string"
              ? data.error
              : "Não foi possível consultar o estabelecimento no CNES.";
          setCnesMessage(message);
          return;
        }

        if (typeof data !== "object" || data === null || !("nome" in data) || typeof data.nome !== "string") {
          setCnesMessage("O serviço CNES retornou dados incompatíveis.");
          return;
        }

        const nome = data.nome.slice(0, 80);
        setValues((current) => ({ ...current, notificationUnit: nome }));
        updateSharedData({ nomeEstabelecimento: nome, cnes });
        setFilledPdfUrl(null);
        setCnesMessage("Estabelecimento localizado. Confira os dados da unidade.");
      } catch (lookupError) {
        if (controller.signal.aborted) return;
        setCnesMessage(
          lookupError instanceof Error
            ? lookupError.message
            : "Não foi possível consultar o estabelecimento no CNES.",
        );
      }
    };
    void lookupInstitution();
    return () => controller.abort();
  }, [cnes, updateSharedData]);

  const updateValue = (key: string, value: AntirabicoValue) => {
    if (key === "notificationUnit" && typeof value === "string") {
      const suggestion = institutions.find((item) =>
        item.nome.trim().toLocaleLowerCase("pt-BR") === value.trim().toLocaleLowerCase("pt-BR"),
      );
      if (suggestion) {
        setValues((current) => ({
          ...current,
          notificationUnit: suggestion.nome,
          notificationCnes: suggestion.cnes,
        }));
        updateSharedData({
          nomeEstabelecimento: suggestion.nome,
          cnes: suggestion.cnes,
          enderecoEstabelecimento: suggestion.endereco,
        });
      } else {
        setValues((current) => ({ ...current, notificationUnit: value, notificationCnes: "" }));
        updateSharedData({ nomeEstabelecimento: value, cnes: "", enderecoEstabelecimento: "" });
      }
      setFilledPdfUrl(null);
      setError(null);
      return;
    }

    if (key === "notificationCnes") setCnesMessage("");
    setValues((current) => ({ ...current, [key]: value }));

    if ((key === "patientName" || key === "patientCns") && typeof value === "string") {
      const wanted = key === "patientCns" ? value.replace(/\D/g, "") : normalizeSaved(value);
      const matches = patients.filter((patient) =>
        key === "patientCns"
          ? wanted.length === 15 && (patient.data.cns ?? "").replace(/\D/g, "") === wanted
          : normalizeSaved(patient.nome) === wanted,
      );
      if (matches.length === 1) applyPatient(matches[0]);
    }

    if (key === "investigatorName" && typeof value === "string") {
      const saved = findSavedByValue(savedValues, "investigador", value);
      if (saved) {
        const detail = parseSavedDetail(saved.detail);
        setValues((current) => ({
          ...current,
          investigatorName: saved.value,
          investigatorRole: detail.role ?? current.investigatorRole,
          investigatorUnit: detail.unit ?? current.investigatorUnit,
          investigatorUnitCode: detail.code ?? current.investigatorUnitCode,
        }));
      }
    }
    if (typeof value === "string") {
      switch (key) {
        case "patientName":
          updateSharedData({ paciente: value });
          break;
        case "birthDate":
          updateSharedData({ nascimento: value });
          break;
        case "patientCns":
          updateSharedData({ cns: value });
          break;
        case "sex":
          updateSharedData({ sexo: value });
          break;
        case "motherName":
          updateSharedData({ nomeMae: value });
          break;
        case "phone":
          updateSharedData({ telefone: value });
          break;
        case "street":
          updateSharedData({ ruaPaciente: value });
          break;
        case "streetNumber":
          updateSharedData({ numeroEnderecoPaciente: value });
          break;
        case "complement":
          updateSharedData({ complementoEnderecoPaciente: value });
          break;
        case "neighborhood":
          updateSharedData({ bairroPaciente: value });
          break;
        case "district":
          updateSharedData({ distritoPaciente: value });
          break;
        case "residenceCity":
          updateSharedData({ municipioResidencia: value });
          break;
        case "residenceIbge":
          updateSharedData({ codigoIbge: value });
          break;
        case "residenceState":
          updateSharedData({ uf: value });
          break;
        case "cep":
          updateSharedData({ cep: value });
          break;
        case "notificationCnes":
          updateSharedData({ cnes: value, nomeEstabelecimento: "" });
          setValues((current) => ({ ...current, notificationUnit: "" }));
          break;
      }
    }
    setFilledPdfUrl(null);
    setError(null);
  };

  const generatePdf = async () => {
    setIsGenerating(true);
    setError(null);
    try {
      const bytes = await createAntirabicoPdf(values);
      const pdfBuffer = new ArrayBuffer(bytes.byteLength);
      new Uint8Array(pdfBuffer).set(bytes);
      const blob = new Blob([pdfBuffer], { type: "application/pdf" });
      setFilledPdfUrl(URL.createObjectURL(blob));
    } catch (generationError) {
      setError(
        generationError instanceof Error
          ? generationError.message
          : "Não foi possível gerar o PDF preenchido.",
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const commitSavedEntries = () => {
    rememberCurrentPatient();
    const name = typeof values.investigatorName === "string" ? values.investigatorName.trim() : "";
    if (name.length >= 3) {
      const text = (key: string) => (typeof values[key] === "string" ? (values[key] as string).trim() : "");
      rememberValues([
        {
          field: "investigador",
          value: name,
          detail: JSON.stringify({
            role: text("investigatorRole"),
            unit: text("investigatorUnit"),
            code: text("investigatorUnitCode"),
          }),
        },
      ]);
    }
  };

  const savedListFor = (key: string) => {
    switch (key) {
      case "notificationUnit":
        return "antirabico-institution-suggestions";
      case "patientName":
        return "patient-name-suggestions";
      case "patientCns":
        return "patient-cns-suggestions";
      case "investigatorName":
        return "saved-investigador";
      case "investigatorRole":
        return "saved-investigador-funcao";
      case "investigatorUnit":
        return "saved-investigador-unidade";
      case "investigatorUnitCode":
        return "saved-investigador-codigo";
      default:
        return undefined;
    }
  };

  return (
    <main className="min-h-screen px-4 py-8 text-slate-900 md:px-8" onBlur={commitSavedEntries}>
      <SavedDatalists />
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm">
          <Link href="/" className="text-sm font-semibold text-red-800 hover:underline">
            ← Todos os documentos
          </Link>
          <h1 className="mt-3 text-2xl font-bold md:text-3xl">Atendimento Anti-Rábico Humano</h1>
          <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-700">
            Preencha os campos conforme a ficha original. Ao gerar, os dados são colocados sobre o PDF original,
            preservando o formulário para visualizar, imprimir ou baixar. O PDF é gerado localmente no navegador
            e o CNS do paciente não é enviado ao CNES. Paciente, unidade e investigador ficam salvos na sua conta
            para preenchimento rápido.
          </p>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            A ficha informa “2 — Individual” e o código CID-10 “W64”. O arquivo original indica SVS — 27/09/2005;
            confirme a versão e as orientações vigentes antes de usar.
          </p>
        </header>

        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(420px,0.9fr)]">
          <div className="space-y-5">
            <datalist id="antirabico-institution-suggestions">
              {institutions.map((institution) => (
                <option key={`${institution.cnes}-${institution.nome}`} value={institution.nome} label={institution.cnes ? `CNES ${institution.cnes}` : undefined} />
              ))}
            </datalist>
            {cnesMessage && (
              <p role="status" aria-live="polite" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-900">
                {cnesMessage}
              </p>
            )}
            {antirabicoSections.map((section) => (
              <section key={section.title} className="rounded-2xl border border-slate-200 bg-white/90 p-5 shadow-sm">
                <h2 className="mb-4 text-lg font-semibold">{section.title}</h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  {section.fields.map((field) => (
                    <FieldInput
                      key={field.key}
                      field={field}
                      value={values[field.key] ?? (field.type === "checkboxes" ? [] : "")}
                      disabled={isGenerating}
                      list={savedListFor(field.key)}
                      onChange={(value) => updateValue(field.key, value)}
                    />
                  ))}
                </div>
              </section>
            ))}

            {error && (
              <p role="alert" className="rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-900">
                {error}
              </p>
            )}

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={generatePdf}
                disabled={isGenerating}
                className="rounded-xl bg-red-700 px-5 py-3 font-semibold text-white hover:bg-red-800 disabled:cursor-wait disabled:opacity-60"
              >
                {isGenerating ? "Gerando PDF..." : "Gerar ficha preenchida"}
              </button>
              <a
                href={originalPdfUrl}
                target="_blank"
                rel="noreferrer"
                className="rounded-xl border border-slate-300 bg-white px-5 py-3 font-semibold text-slate-800 hover:bg-slate-50"
              >
                Abrir ficha original
              </a>
              {filledPdfUrl && (
                <>
                  <a
                    href={filledPdfUrl}
                    download="atendimento-antirrabico-preenchido.pdf"
                    className="rounded-xl border border-slate-300 bg-white px-5 py-3 font-semibold text-slate-800 hover:bg-slate-50"
                  >
                    Baixar PDF preenchido
                  </a>
                  <a
                    href={filledPdfUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-xl border border-slate-300 bg-white px-5 py-3 font-semibold text-slate-800 hover:bg-slate-50"
                  >
                    Abrir para imprimir
                  </a>
                </>
              )}
            </div>
          </div>

          <section className="space-y-3 lg:sticky lg:top-4">
            <h2 className="text-lg font-semibold">{filledPdfUrl ? "Pré-visualização preenchida" : "Ficha original"}</h2>
            <iframe
              title={filledPdfUrl ? "Pré-visualização da ficha antirrábica preenchida" : "Ficha original de Atendimento Anti-Rábico Humano"}
              src={`${filledPdfUrl ?? originalPdfUrl}#view=FitH`}
              className="h-[82vh] min-h-[640px] w-full rounded-2xl border border-slate-300 bg-white shadow-sm"
            />
          </section>
        </div>
      </div>
    </main>
  );
}

function FieldInput({
  field,
  value,
  disabled,
  onChange,
  list,
}: {
  field: AntirabicoField;
  value: AntirabicoValue;
  disabled: boolean;
  onChange: (value: AntirabicoValue) => void;
  list?: string;
}) {
  const id = `antirabico-${field.key}`;
  const controlClassName =
    "mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700";

  if (field.type === "checkboxes") {
    const selected = Array.isArray(value) ? value : [];
    return (
      <fieldset className="sm:col-span-2">
        <legend className="text-sm font-medium">{field.label}</legend>
        <div className="mt-2 flex flex-wrap gap-x-5 gap-y-2">
          {field.options.map((option) => (
            <label key={option.value} className="inline-flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                disabled={disabled}
                checked={selected.includes(option.value)}
                onChange={(event) =>
                  onChange(
                    event.target.checked
                      ? [...selected, option.value]
                      : selected.filter((current) => current !== option.value),
                  )
                }
                className="size-4 accent-red-700"
              />
              {option.label}
            </label>
          ))}
        </div>
      </fieldset>
    );
  }

  return (
    <label htmlFor={id} className={field.type === "textarea" ? "sm:col-span-2" : undefined}>
      <span className="text-sm font-medium">{field.label}</span>
      {field.type === "select" ? (
        <select
          id={id}
          disabled={disabled}
          value={typeof value === "string" ? value : ""}
          onChange={(event) => onChange(event.target.value)}
          className={controlClassName}
        >
          <option value="">Selecione</option>
          {field.options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      ) : field.type === "textarea" ? (
        <textarea
          id={id}
          disabled={disabled}
          value={typeof value === "string" ? value : ""}
          maxLength={field.maxLength}
          onChange={(event) => onChange(event.target.value)}
          className={`${controlClassName} min-h-32`}
        />
      ) : (
        <input
          id={id}
          disabled={disabled}
          type={field.type}
          value={typeof value === "string" ? value : ""}
          maxLength={field.maxLength}
          list={list}
          onChange={(event) => onChange(event.target.value)}
          className={controlClassName}
        />
      )}
    </label>
  );
}
