"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";

export type SharedDocumentData = {
  paciente: string;
  nascimento: string;
  numeroProntuario: string;
  cns: string;
  sexo: string;
  nomeMae: string;
  telefone: string;
  enderecoPaciente: string;
  ruaPaciente: string;
  numeroEnderecoPaciente: string;
  complementoEnderecoPaciente: string;
  bairroPaciente: string;
  distritoPaciente: string;
  municipioResidencia: string;
  codigoIbge: string;
  uf: string;
  cep: string;
  profissional: string;
  crm: string;
  nomeEstabelecimento: string;
  enderecoEstabelecimento: string;
  cnes: string;
  estabelecimentoExecutante: string;
  cnesExecutante: string;
};

const emptySharedData: SharedDocumentData = {
  paciente: "",
  nascimento: "",
  numeroProntuario: "",
  cns: "",
  sexo: "",
  nomeMae: "",
  telefone: "",
  enderecoPaciente: "",
  ruaPaciente: "",
  numeroEnderecoPaciente: "",
  complementoEnderecoPaciente: "",
  bairroPaciente: "",
  distritoPaciente: "",
  municipioResidencia: "",
  codigoIbge: "",
  uf: "",
  cep: "",
  profissional: "",
  crm: "",
  nomeEstabelecimento: "",
  enderecoEstabelecimento: "",
  cnes: "",
  estabelecimentoExecutante: "",
  cnesExecutante: "",
};

export type ProfessionalSuggestion = { nome: string; crm: string };
export type InstitutionSuggestion = { nome: string; cnes: string; endereco: string };

type DocumentSessionContextValue = {
  sharedData: SharedDocumentData;
  professionals: ProfessionalSuggestion[];
  institutions: InstitutionSuggestion[];
  updateSharedData: (values: Partial<SharedDocumentData>) => void;
  clearSharedData: () => void;
};

const DocumentSessionContext = createContext<DocumentSessionContextValue | null>(null);

function normalize(value: string) {
  return value.trim().toLocaleLowerCase("pt-BR");
}

export function DocumentSessionProvider({ children }: { children: ReactNode }) {
  const [sharedData, setSharedData] = useState<SharedDocumentData>(emptySharedData);
  const sharedDataRef = useRef(sharedData);
  const [professionals, setProfessionals] = useState<ProfessionalSuggestion[]>([]);
  const [institutions, setInstitutions] = useState<InstitutionSuggestion[]>([]);

  useEffect(() => {
    sharedDataRef.current = sharedData;
  }, [sharedData]);

  const updateSharedData = useCallback((values: Partial<SharedDocumentData>) => {
    let nextSharedData = { ...sharedDataRef.current, ...values };
    const hasFullAddress = Object.prototype.hasOwnProperty.call(values, "enderecoPaciente");
    const hasAddressPart = [
      "ruaPaciente",
      "numeroEnderecoPaciente",
      "complementoEnderecoPaciente",
      "bairroPaciente",
      "distritoPaciente",
    ].some((key) => Object.prototype.hasOwnProperty.call(values, key));
    if (hasFullAddress) {
      nextSharedData = {
        ...nextSharedData,
        ruaPaciente: values.enderecoPaciente ?? "",
        numeroEnderecoPaciente: "",
        complementoEnderecoPaciente: "",
        bairroPaciente: "",
        distritoPaciente: "",
      };
    } else if (hasAddressPart) {
      nextSharedData.enderecoPaciente = [
        nextSharedData.ruaPaciente,
        nextSharedData.numeroEnderecoPaciente,
        nextSharedData.complementoEnderecoPaciente,
        nextSharedData.bairroPaciente,
        nextSharedData.distritoPaciente,
      ].filter(Boolean).join(", ");
    }
    sharedDataRef.current = nextSharedData;
    setSharedData(nextSharedData);

    const professionalName = nextSharedData.profissional;
    const professionalCrm = nextSharedData.crm;
    if (professionalName.trim()) {
      setProfessionals((previous) => {
        const next = previous.filter((item) => normalize(item.nome) !== normalize(professionalName));
        return [...next, { nome: professionalName.trim(), crm: professionalCrm }];
      });
    }

    const institutionName = values.nomeEstabelecimento ?? values.estabelecimentoExecutante;
    const institutionCnes = values.cnes ?? values.cnesExecutante ?? nextSharedData.cnes ?? nextSharedData.cnesExecutante;
    const institutionAddress = nextSharedData.enderecoEstabelecimento;
    if (institutionName?.trim()) {
      const suggestion = {
        nome: institutionName.trim(),
        cnes: institutionCnes,
        endereco: institutionAddress,
      };
      setInstitutions((previous) => [
        ...previous.filter((item) =>
          suggestion.cnes
            ? item.cnes !== suggestion.cnes
            : normalize(item.nome) !== normalize(suggestion.nome),
        ),
        suggestion,
      ]);
    }
  }, []);

  const clearSharedData = useCallback(() => {
    sharedDataRef.current = emptySharedData;
    setSharedData(emptySharedData);
    setProfessionals([]);
    setInstitutions([]);
  }, []);

  const value = useMemo(() => ({
    sharedData,
    professionals,
    institutions,
    updateSharedData,
    clearSharedData,
  }), [sharedData, professionals, institutions, updateSharedData, clearSharedData]);

  return <DocumentSessionContext.Provider value={value}>{children}</DocumentSessionContext.Provider>;
}

export function useDocumentSession() {
  const context = useContext(DocumentSessionContext);
  if (!context) {
    throw new Error("useDocumentSession deve ser usado dentro de DocumentSessionProvider.");
  }
  return context;
}
