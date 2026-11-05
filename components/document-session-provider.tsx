"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { createClient } from "@/lib/supabase/client";

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
  cidadeEstado: string;
  documentoSolicitanteTipo: string;
  documentoSolicitanteNumero: string;
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
  cidadeEstado: "",
  documentoSolicitanteTipo: "",
  documentoSolicitanteNumero: "",
  nomeEstabelecimento: "",
  enderecoEstabelecimento: "",
  cnes: "",
  estabelecimentoExecutante: "",
  cnesExecutante: "",
};

export type ProfessionalSuggestion = {
  nome: string;
  crm: string;
  cidadeEstado: string;
  documentoTipo: string;
  documentoNumero: string;
};
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

function isCompleteCnes(value: string) {
  return /^\d{7}$/.test(value.trim());
}

export function DocumentSessionProvider({ children }: { children: ReactNode }) {
  const [sharedData, setSharedData] = useState<SharedDocumentData>(emptySharedData);
  const sharedDataRef = useRef(sharedData);
  const [professionals, setProfessionals] = useState<ProfessionalSuggestion[]>([]);
  const [institutions, setInstitutions] = useState<InstitutionSuggestion[]>([]);
  const userIdRef = useRef<string | null>(null);
  const pendingProfessionals = useRef(new Map<string, ProfessionalSuggestion>());
  const pendingInstitutions = useRef(new Map<string, InstitutionSuggestion>());
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    sharedDataRef.current = sharedData;
  }, [sharedData]);

  const flushSaves = useCallback(async () => {
    const userId = userIdRef.current;
    const professionalRows = [...pendingProfessionals.current.entries()];
    const institutionRows = [...pendingInstitutions.current.entries()];
    pendingProfessionals.current.clear();
    pendingInstitutions.current.clear();
    if (!userId || (!professionalRows.length && !institutionRows.length)) return;

    const supabase = createClient();
    const now = new Date().toISOString();
    if (professionalRows.length) {
      await supabase.from("saved_professionals").upsert(
        professionalRows.map(([entryKey, item]) => ({
          user_id: userId,
          entry_key: entryKey,
          nome: item.nome,
          crm: item.crm,
          cidade_estado: item.cidadeEstado,
          documento_tipo: item.documentoTipo,
          documento_numero: item.documentoNumero,
          updated_at: now,
        })),
        { onConflict: "user_id,entry_key" },
      );
    }
    if (institutionRows.length) {
      await supabase.from("saved_institutions").upsert(
        institutionRows.map(([entryKey, item]) => ({
          user_id: userId,
          entry_key: entryKey,
          nome: item.nome,
          cnes: item.cnes,
          endereco: item.endereco,
          updated_at: now,
        })),
        { onConflict: "user_id,entry_key" },
      );
    }
  }, []);

  const scheduleSave = useCallback(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      void flushSaves();
    }, 800);
  }, [flushSaves]);

  useEffect(() => {
    let supabase: ReturnType<typeof createClient>;
    try {
      supabase = createClient();
    } catch {
      return;
    }

    const loadSaved = async (userId: string | null) => {
      userIdRef.current = userId;
      if (!userId) {
        setProfessionals([]);
        setInstitutions([]);
        return;
      }
      const [professionalResult, institutionResult] = await Promise.all([
        supabase.from("saved_professionals").select("*").eq("user_id", userId).order("nome"),
        supabase.from("saved_institutions").select("*").eq("user_id", userId).order("nome"),
      ]);
      if (userIdRef.current !== userId) return;
      setProfessionals(
        (professionalResult.data ?? []).map((row) => ({
          nome: row.nome,
          crm: row.crm,
          cidadeEstado: row.cidade_estado,
          documentoTipo: row.documento_tipo,
          documentoNumero: row.documento_numero,
        })),
      );
      setInstitutions(
        (institutionResult.data ?? []).map((row) => ({
          nome: row.nome,
          cnes: row.cnes,
          endereco: row.endereco,
        })),
      );
    };

    void supabase.auth.getUser().then(({ data }) => loadSaved(data.user?.id ?? null));
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      const nextUserId = session?.user.id ?? null;
      if (nextUserId === userIdRef.current) return;
      // Evita misturar dados entre contas no mesmo navegador.
      sharedDataRef.current = emptySharedData;
      setSharedData(emptySharedData);
      pendingProfessionals.current.clear();
      pendingInstitutions.current.clear();
      void loadSaved(nextUserId);
    });
    return () => subscription.subscription.unsubscribe();
  }, []);

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

    const professionalName = nextSharedData.profissional.trim();
    const professionalCrm = nextSharedData.crm.trim();
    if (professionalName && professionalCrm) {
      const entry: ProfessionalSuggestion = {
        nome: professionalName,
        crm: professionalCrm,
        cidadeEstado: nextSharedData.cidadeEstado.trim(),
        documentoTipo: nextSharedData.documentoSolicitanteTipo,
        documentoNumero: nextSharedData.documentoSolicitanteNumero.trim(),
      };
      setProfessionals((previous) => [
        ...previous.filter((item) => normalize(item.nome) !== normalize(entry.nome)),
        entry,
      ]);
      pendingProfessionals.current.set(normalize(entry.nome), entry);
      scheduleSave();
    }

    const institutionEntries: InstitutionSuggestion[] = [
      {
        nome: nextSharedData.nomeEstabelecimento.trim(),
        cnes: nextSharedData.cnes.trim(),
        endereco: nextSharedData.enderecoEstabelecimento.trim(),
      },
      {
        nome: nextSharedData.estabelecimentoExecutante.trim(),
        cnes: nextSharedData.cnesExecutante.trim(),
        endereco: "",
      },
    ];
    for (const entry of institutionEntries) {
      if (!entry.nome || !isCompleteCnes(entry.cnes)) continue;
      setInstitutions((previous) => {
        const existing = previous.find((item) => item.cnes === entry.cnes);
        const merged = { ...entry, endereco: entry.endereco || existing?.endereco || "" };
        return [...previous.filter((item) => item.cnes !== entry.cnes), merged];
      });
      pendingInstitutions.current.set(entry.cnes, entry);
      scheduleSave();
    }
  }, [scheduleSave]);

  const clearSharedData = useCallback(() => {
    sharedDataRef.current = emptySharedData;
    setSharedData(emptySharedData);
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
