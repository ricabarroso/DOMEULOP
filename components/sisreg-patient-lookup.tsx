"use client";

import { useState } from "react";
import type { SharedDocumentData } from "@/components/document-session-provider";

type SisregPatientLookupProps = {
  unitName: string;
  unitCnes: string;
  onImport: (data: Partial<SharedDocumentData>) => void;
};

function isLookupResult(value: unknown): value is { nome: string; data: Partial<SharedDocumentData> } {
  if (typeof value !== "object" || value === null || !("nome" in value) || typeof value.nome !== "string" ||
    !("data" in value) || typeof value.data !== "object" || value.data === null || Array.isArray(value.data)) {
    return false;
  }
  const data = value.data as Record<string, unknown>;
  const stringKeys: (keyof SharedDocumentData)[] = [
    "paciente",
    "nascimento",
    "cns",
    "cpf",
    "sexo",
    "nomeMae",
    "telefone",
    "ruaPaciente",
    "numeroEnderecoPaciente",
    "complementoEnderecoPaciente",
    "bairroPaciente",
    "municipioResidencia",
    "uf",
    "cep",
  ];
  return stringKeys.every((key) => !(key in data) || typeof data[key] === "string");
}

export default function SisregPatientLookup({ unitName, unitCnes, onImport }: SisregPatientLookupProps) {
  const [identifier, setIdentifier] = useState("");
  const [consentedLookup, setConsentedLookup] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [result, setResult] = useState<{ nome: string; data: Partial<SharedDocumentData> } | null>(null);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error">("error");

  const currentLookup = `${identifier.replace(/\D/g, "")}|${unitName}|${unitCnes}`;
  const consentGiven = consentedLookup === currentLookup;

  const search = async () => {
    const digits = identifier.replace(/\D/g, "");
    const unitCnesDigits = unitCnes.replace(/\D/g, "");
    if (digits.length !== 11 && digits.length !== 15) {
      setResult(null);
      setMessage("Digite um CPF com 11 dígitos ou um CNS com 15 dígitos.");
      setMessageType("error");
      return;
    }
    if (!unitName.trim()) {
      setResult(null);
      setMessage("Preencha o nome do estabelecimento neste documento antes de consultar.");
      setMessageType("error");
      return;
    }
    if (unitCnesDigits && !/^\d{7}$/.test(unitCnesDigits)) {
      setResult(null);
      setMessage("O CNES da unidade deve conter 7 dígitos ou ficar em branco.");
      setMessageType("error");
      return;
    }
    if (!consentGiven) {
      setResult(null);
      setMessage("Confirme a autorização para enviar o CPF/CNS ao SISREG.");
      setMessageType("error");
      return;
    }

    setIsSearching(true);
    setResult(null);
    setMessage("");
    try {
      const response = await fetch("/api/sisreg/paciente", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({
          cpf_cns: digits,
          unit_name: unitName.trim(),
          unit_cnes: unitCnesDigits,
        }),
      });
      const payload: unknown = await response.json();
      if (!response.ok) {
        const errorMessage =
          typeof payload === "object" && payload !== null && "error" in payload && typeof payload.error === "string"
            ? payload.error
            : "Não foi possível consultar o SISREG.";
        setMessage(errorMessage);
        setMessageType("error");
        return;
      }
      if (!isLookupResult(payload)) {
        setMessage("A API do SISREG retornou dados incompatíveis.");
        setMessageType("error");
        return;
      }
      setResult(payload);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível consultar o SISREG.");
      setMessageType("error");
    } finally {
      setIsSearching(false);
      setConsentedLookup("");
    }
  };

  const applyResult = () => {
    if (!result) return;
    onImport(result.data);
    setMessage(`Dados de ${result.nome} aplicados. Confira as informações antes de usar.`);
    setMessageType("success");
    setResult(null);
  };

  return (
    <div className="w-full rounded-xl border border-emerald-200 bg-emerald-50/70 p-4">
      <label className="block text-sm font-semibold text-emerald-950" htmlFor="sisreg-patient-identifier">
        Buscar cadastro no SISREG pelo CPF ou CNS
      </label>
      <div className="mt-2 flex flex-wrap gap-2">
        <input
          id="sisreg-patient-identifier"
          type="text"
          inputMode="numeric"
          autoComplete="off"
          maxLength={20}
          value={identifier}
          onChange={(event) => {
            setIdentifier(event.target.value);
            setConsentedLookup("");
            setResult(null);
            setMessage("");
          }}
          placeholder="CPF (11 dígitos) ou CNS (15 dígitos)"
          className="min-w-60 flex-1 rounded-lg border border-emerald-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
        />
        <button
          type="button"
          onClick={search}
          disabled={isSearching}
          className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:cursor-wait disabled:opacity-60"
        >
          {isSearching ? "Consultando..." : "Consultar paciente"}
        </button>
      </div>
      <label className="mt-3 flex items-start gap-2 text-xs leading-5 text-slate-700">
        <input
          type="checkbox"
          checked={consentGiven}
          onChange={(event) => setConsentedLookup(event.target.checked ? currentLookup : "")}
          className="mt-1 accent-emerald-700"
        />
        <span>
          Autorizo enviar o CPF/CNS digitado e a identificação desta unidade à API do SISREG. Ao aplicar os dados,
          eles poderão ser salvos na lista de pacientes da minha conta. A pesquisa por nome ainda não está disponível.
        </span>
      </label>
      {result && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-emerald-200 bg-white p-3">
          <div className="text-sm text-slate-800">
            <p className="font-semibold">{result.nome}</p>
            {result.data.nascimento && <p>Nascimento: {result.data.nascimento}</p>}
            {result.data.cns && <p>CNS: {result.data.cns}</p>}
          </div>
          <button
            type="button"
            onClick={applyResult}
            className="rounded-lg bg-emerald-700 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
          >
            Aplicar dados ao documento
          </button>
        </div>
      )}
      {message && (
        <p role="status" className={`mt-2 text-sm ${messageType === "success" ? "text-emerald-800" : "text-red-700"}`}>
          {message}
        </p>
      )}
      <p className="mt-2 text-xs leading-5 text-slate-600">
        Unidade enviada: {unitName || "não informada"}{unitCnes ? ` — CNES ${unitCnes}` : ""}. A consulta é enviada pelo servidor
        do aplicativo por conexão HTTPS. Confira os dados retornados antes de usar.
      </p>
    </div>
  );
}
