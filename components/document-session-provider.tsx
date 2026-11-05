"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Json } from "@/lib/supabase/database.types";

export type SharedDocumentData = {
  paciente: string;
  nascimento: string;
  numeroProntuario: string;
  cns: string;
  cpf: string;
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
};

const emptySharedData: SharedDocumentData = {
  paciente: "",
  nascimento: "",
  numeroProntuario: "",
  cns: "",
  cpf: "",
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
};

export type ProfessionalSuggestion = {
  nome: string;
  crm: string;
  cidadeEstado: string;
  documentoTipo: string;
  documentoNumero: string;
};
export type InstitutionSuggestion = { nome: string; cnes: string; endereco: string };
export type SavedValue = { field: string; value: string; detail: string };
export type SavedPatient = { nome: string; data: Partial<SharedDocumentData> };

const patientFieldKeys = [
  "paciente",
  "nascimento",
  "numeroProntuario",
  "cns",
  "cpf",
  "sexo",
  "nomeMae",
  "telefone",
  "enderecoPaciente",
  "ruaPaciente",
  "numeroEnderecoPaciente",
  "complementoEnderecoPaciente",
  "bairroPaciente",
  "distritoPaciente",
  "municipioResidencia",
  "codigoIbge",
  "uf",
  "cep",
] as const satisfies readonly (keyof SharedDocumentData)[];

type DocumentSessionContextValue = {
  sharedData: SharedDocumentData;
  professionals: ProfessionalSuggestion[];
  institutions: InstitutionSuggestion[];
  savedValues: SavedValue[];
  patients: SavedPatient[];
  updateSharedData: (values: Partial<SharedDocumentData>) => void;
  rememberInstitution: (institution: InstitutionSuggestion) => void;
  clearSharedData: () => void;
  rememberValues: (entries: SavedValue[]) => void;
  rememberCurrentPatient: () => void;
  applyPatient: (patient: SavedPatient) => void;
};

const DocumentSessionContext = createContext<DocumentSessionContextValue | null>(null);

function normalize(value: string) {
  return value.trim().toLocaleLowerCase("pt-BR");
}

function isCompleteCnes(value: string) {
  return /^\d{7}$/.test(value.trim());
}

function patientEntryKey(data: Partial<SharedDocumentData>) {
  const identifier = (data.cns ?? "").replace(/\D/g, "").length === 15
    ? (data.cns ?? "").replace(/\D/g, "")
    : data.nascimento ?? "";
  return identifier ? `${normalize(data.paciente ?? "")}|${identifier}` : "";
}

function pickPatientData(source: SharedDocumentData) {
  const data: Partial<SharedDocumentData> = {};
  for (const key of patientFieldKeys) {
    if (source[key]) data[key] = source[key].slice(0, 300);
  }
  return data;
}

export function DocumentSessionProvider({ children }: { children: ReactNode }) {
  const [sharedData, setSharedData] = useState<SharedDocumentData>(emptySharedData);
  const sharedDataRef = useRef(sharedData);
  const [professionals, setProfessionals] = useState<ProfessionalSuggestion[]>([]);
  const [institutions, setInstitutions] = useState<InstitutionSuggestion[]>([]);
  const institutionsRef = useRef<InstitutionSuggestion[]>([]);
  const [savedValues, setSavedValues] = useState<SavedValue[]>([]);
  const [patients, setPatients] = useState<SavedPatient[]>([]);
  const patientsRef = useRef<SavedPatient[]>([]);
  const userIdRef = useRef<string | null>(null);
  const pendingProfessionals = useRef(new Map<string, ProfessionalSuggestion>());
  const pendingInstitutions = useRef(new Map<string, InstitutionSuggestion>());
  const pendingValues = useRef(new Map<string, SavedValue>());
  const pendingPatients = useRef(new Map<string, SavedPatient>());
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    sharedDataRef.current = sharedData;
  }, [sharedData]);

  useEffect(() => {
    patientsRef.current = patients;
  }, [patients]);

  const flushSaves = useCallback(async () => {
    const userId = userIdRef.current;
    const professionalRows = [...pendingProfessionals.current.entries()];
    const institutionRows = [...pendingInstitutions.current.entries()];
    const valueRows = [...pendingValues.current.entries()];
    const patientRows = [...pendingPatients.current.entries()];
    pendingProfessionals.current.clear();
    pendingInstitutions.current.clear();
    pendingValues.current.clear();
    pendingPatients.current.clear();
    if (!userId || (!professionalRows.length && !institutionRows.length && !valueRows.length && !patientRows.length)) return;

    const supabase = createClient();
    const now = new Date().toISOString();
    if (valueRows.length) {
      await supabase.from("saved_values").upsert(
        valueRows.map(([key, item]) => ({
          user_id: userId,
          field_key: item.field,
          value_key: key.slice(item.field.length + 1),
          value: item.value,
          detail: item.detail,
          updated_at: now,
        })),
        { onConflict: "user_id,field_key,value_key" },
      );
    }
    if (patientRows.length) {
      await supabase.from("saved_patients").upsert(
        patientRows.map(([entryKey, item]) => ({
          user_id: userId,
          entry_key: entryKey,
          nome: item.nome,
          data: item.data as Json,
          updated_at: now,
        })),
        { onConflict: "user_id,entry_key" },
      );
    }
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

  const rememberInstitution = useCallback((institution: InstitutionSuggestion) => {
    const nome = institution.nome.trim();
    const cnes = institution.cnes.trim();
    if (!nome || !isCompleteCnes(cnes)) return;

    const entry = {
      nome: nome.slice(0, 200),
      cnes,
      endereco: institution.endereco.trim(),
    };
    institutionsRef.current = [
      ...institutionsRef.current.filter((item) => item.cnes !== cnes),
      entry,
    ];
    setInstitutions(institutionsRef.current);
    pendingInstitutions.current.set(cnes, entry);
    scheduleSave();
  }, [scheduleSave]);

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
        institutionsRef.current = [];
        setSavedValues([]);
        setPatients([]);
        return;
      }
      const [professionalResult, institutionResult, valueResult, patientResult] = await Promise.all([
        supabase.from("saved_professionals").select("*").eq("user_id", userId).order("nome"),
        supabase.from("saved_institutions").select("*").eq("user_id", userId).order("nome"),
        supabase.from("saved_values").select("*").eq("user_id", userId).order("value").limit(5000),
        supabase.from("saved_patients").select("*").eq("user_id", userId).order("nome").limit(5000),
      ]);
      if (userIdRef.current !== userId) return;
      setSavedValues(
        (valueResult.data ?? []).map((row) => ({ field: row.field_key, value: row.value, detail: row.detail })),
      );
      setPatients(
        (patientResult.data ?? []).map((row) => ({
          nome: row.nome,
          data: (typeof row.data === "object" && row.data !== null && !Array.isArray(row.data)
            ? row.data
            : {}) as Partial<SharedDocumentData>,
        })),
      );
      setProfessionals(
        (professionalResult.data ?? []).map((row) => ({
          nome: row.nome,
          crm: row.crm,
          cidadeEstado: row.cidade_estado,
          documentoTipo: row.documento_tipo,
          documentoNumero: row.documento_numero,
        })),
      );
      const loadedInstitutions = (institutionResult.data ?? []).map((row) => ({
        nome: row.nome,
        cnes: row.cnes,
        endereco: row.endereco,
      }));
      institutionsRef.current = loadedInstitutions;
      setInstitutions(loadedInstitutions);
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
      pendingValues.current.clear();
      pendingPatients.current.clear();
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
  }, [scheduleSave]);

  const clearSharedData = useCallback(() => {
    sharedDataRef.current = emptySharedData;
    setSharedData(emptySharedData);
  }, []);

  const rememberValues = useCallback((entries: SavedValue[]) => {
    const accepted: SavedValue[] = [];
    for (const entry of entries) {
      const value = entry.value.trim().slice(0, 500);
      if (value.length < 2) continue;
      accepted.push({ field: entry.field, value, detail: entry.detail.slice(0, 2000) });
    }
    if (!accepted.length) return;

    setSavedValues((previous) => {
      let next = previous;
      for (const entry of accepted) {
        const existing = next.find((item) => item.field === entry.field && normalize(item.value) === normalize(entry.value));
        if (existing && existing.detail === entry.detail && existing.value === entry.value) continue;
        next = [
          ...next.filter((item) => item !== existing),
          { ...entry, detail: entry.detail || existing?.detail || "" },
        ];
      }
      return next;
    });
    for (const entry of accepted) {
      pendingValues.current.set(`${entry.field}|${normalize(entry.value)}`, entry);
    }
    scheduleSave();
  }, [scheduleSave]);

  const rememberCurrentPatient = useCallback(() => {
    const current = sharedDataRef.current;
    const nome = current.paciente.trim();
    const data = pickPatientData(current);
    const entryKey = patientEntryKey(data);
    if (nome.length < 3 || !entryKey) return;
    const entry: SavedPatient = { nome, data };
    const signature = JSON.stringify(entry);
    const unchanged = patientsRef.current.some(
      (item) => patientEntryKey(item.data) === entryKey && JSON.stringify(item) === signature,
    );
    if (unchanged) return;
    setPatients((previous) => [
      ...previous.filter((item) => patientEntryKey(item.data) !== entryKey),
      entry,
    ]);
    pendingPatients.current.set(entryKey, entry);
    scheduleSave();
  }, [scheduleSave]);

  const applyPatient = useCallback((patient: SavedPatient) => {
    const values: Partial<SharedDocumentData> = {};
    for (const key of patientFieldKeys) values[key] = patient.data[key] ?? "";
    const hasAddressParts = [
      values.ruaPaciente,
      values.numeroEnderecoPaciente,
      values.complementoEnderecoPaciente,
      values.bairroPaciente,
      values.distritoPaciente,
    ].some(Boolean);
    // O endereço completo só entra quando não há partes separadas.
    if (hasAddressParts) delete values.enderecoPaciente;
    updateSharedData(values);
  }, [updateSharedData]);

  const value = useMemo(() => ({
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
  }), [
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
  ]);

  return <DocumentSessionContext.Provider value={value}>{children}</DocumentSessionContext.Provider>;
}

export function useDocumentSession() {
  const context = useContext(DocumentSessionContext);
  if (!context) {
    throw new Error("useDocumentSession deve ser usado dentro de DocumentSessionProvider.");
  }
  return context;
}
