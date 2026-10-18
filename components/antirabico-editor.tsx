"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
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
  const [values, setValues] = useState<AntirabicoValues>(initialAntirabicoValues);
  const [filledPdfUrl, setFilledPdfUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
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
    fetch(`/api/cnes/${cnes}`, { signal: controller.signal })
      .then((response) => (response.ok ? response.json() : null))
      .then((data: unknown) => {
        if (
          typeof data === "object" &&
          data !== null &&
          "nome" in data &&
          typeof data.nome === "string"
        ) {
          const nome = data.nome.slice(0, 80);
          setValues((current) => ({ ...current, notificationUnit: nome }));
          setFilledPdfUrl(null);
        }
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, [cnes]);

  const updateValue = (key: string, value: AntirabicoValue) => {
    setValues((current) => ({ ...current, [key]: value }));
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

  return (
    <main className="min-h-screen px-4 py-8 text-slate-900 md:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm">
          <Link href="/" className="text-sm font-semibold text-sky-800 hover:underline">
            ← Todos os documentos
          </Link>
          <h1 className="mt-3 text-2xl font-bold md:text-3xl">Atendimento Anti-Rábico Humano</h1>
          <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-700">
            Preencha os campos conforme a ficha original. Ao gerar, os dados são colocados sobre o PDF original,
            preservando o formulário para visualizar, imprimir ou baixar. O preenchimento permanece no navegador
            e não é enviado ou salvo pela aplicação.
          </p>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            A ficha informa “2 — Individual” e o código CID-10 “W64”. O arquivo original indica SVS — 27/09/2005;
            confirme a versão e as orientações vigentes antes de usar.
          </p>
        </header>

        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(420px,0.9fr)]">
          <div className="space-y-5">
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
                className="rounded-xl bg-sky-800 px-5 py-3 font-semibold text-white hover:bg-sky-900 disabled:cursor-wait disabled:opacity-60"
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
}: {
  field: AntirabicoField;
  value: AntirabicoValue;
  disabled: boolean;
  onChange: (value: AntirabicoValue) => void;
}) {
  const id = `antirabico-${field.key}`;
  const controlClassName =
    "mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700";

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
                className="size-4 accent-sky-800"
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
          onChange={(event) => onChange(event.target.value)}
          className={controlClassName}
        />
      )}
    </label>
  );
}
