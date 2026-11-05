"use client";

import { useDocumentSession } from "@/components/document-session-provider";
import type { SavedValue } from "@/components/document-session-provider";

export function normalizeSaved(value: string) {
  return value.trim().toLocaleLowerCase("pt-BR");
}

export function parseSavedDetail(detail: string): Record<string, string> {
  try {
    const parsed: unknown = JSON.parse(detail);
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return {};
    return Object.fromEntries(
      Object.entries(parsed).filter((entry): entry is [string, string] => typeof entry[1] === "string"),
    );
  } catch {
    return {};
  }
}

export function findSavedByValue(values: SavedValue[], field: string, value: string) {
  const wanted = normalizeSaved(value);
  if (!wanted) return undefined;
  return values.find((item) => item.field === field && normalizeSaved(item.value) === wanted);
}

export function findSavedByDetail(values: SavedValue[], field: string, detail: string) {
  const wanted = normalizeSaved(detail);
  if (!wanted) return undefined;
  return values.find((item) => item.field === field && normalizeSaved(item.detail) === wanted);
}

function formatBirthDate(value: string | undefined) {
  const match = value?.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : "";
}

function distinct(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

export default function SavedDatalists() {
  const { savedValues, patients } = useDocumentSession();
  const ofField = (field: string) => savedValues.filter((item) => item.field === field);
  const investigators = ofField("investigador").map((item) => ({ item, detail: parseSavedDetail(item.detail) }));

  return (
    <>
      <datalist id="patient-name-suggestions">
        {patients.map((patient, index) => (
          <option
            key={`${patient.nome}-${index}`}
            value={patient.nome}
            label={[formatBirthDate(patient.data.nascimento), patient.data.cns].filter(Boolean).join(" · ") || undefined}
          />
        ))}
      </datalist>
      <datalist id="patient-cns-suggestions">
        {patients.filter((patient) => patient.data.cns).map((patient, index) => (
          <option key={`${patient.data.cns}-${index}`} value={patient.data.cns} label={patient.nome} />
        ))}
      </datalist>
      <datalist id="saved-medicamento">
        {ofField("medicamento").map((item) => (
          <option key={item.value} value={item.value} label={parseSavedDetail(item.detail).apresentacao || undefined} />
        ))}
      </datalist>
      <datalist id="saved-medicamento-apresentacao">
        {distinct(ofField("medicamento").map((item) => parseSavedDetail(item.detail).apresentacao ?? "")).map((value) => (
          <option key={value} value={value} />
        ))}
      </datalist>
      <datalist id="saved-medicamento-quantidade">
        {distinct(ofField("medicamento").map((item) => parseSavedDetail(item.detail).quantidade ?? "")).map((value) => (
          <option key={value} value={value} />
        ))}
      </datalist>
      <datalist id="saved-procedimento-nome">
        {ofField("procedimento").map((item) => (
          <option key={item.value} value={item.value} label={item.detail || undefined} />
        ))}
      </datalist>
      <datalist id="saved-procedimento-codigo">
        {ofField("procedimento").filter((item) => item.detail).map((item) => (
          <option key={`${item.detail}-${item.value}`} value={item.detail} label={item.value} />
        ))}
      </datalist>
      <datalist id="saved-diagnostico">
        {ofField("diagnostico").map((item) => (
          <option key={item.value} value={item.value} label={item.detail || undefined} />
        ))}
      </datalist>
      <datalist id="saved-cid">
        {ofField("cid").map((item) => (
          <option key={item.value} value={item.value} label={item.detail || undefined} />
        ))}
      </datalist>
      <datalist id="saved-investigador">
        {investigators.map(({ item, detail }) => (
          <option key={item.value} value={item.value} label={detail.role || undefined} />
        ))}
      </datalist>
      <datalist id="saved-investigador-funcao">
        {distinct(investigators.map(({ detail }) => detail.role ?? "")).map((value) => (
          <option key={value} value={value} />
        ))}
      </datalist>
      <datalist id="saved-investigador-unidade">
        {distinct(investigators.map(({ detail }) => detail.unit ?? "")).map((value) => (
          <option key={value} value={value} />
        ))}
      </datalist>
      <datalist id="saved-investigador-codigo">
        {distinct(investigators.map(({ detail }) => detail.code ?? "")).map((value) => (
          <option key={value} value={value} />
        ))}
      </datalist>
    </>
  );
}

export function SavedChips({
  field,
  label,
  onPick,
}: {
  field: string;
  label: string;
  onPick: (value: string) => void;
}) {
  const { savedValues } = useDocumentSession();
  const items = savedValues.filter((item) => item.field === field);
  if (!items.length) return null;

  return (
    <div className="mt-2">
      <p className="text-xs font-medium text-slate-600">{label}</p>
      <div className="mt-1 flex max-h-32 flex-wrap gap-2 overflow-y-auto rounded-xl border border-slate-200 bg-white p-2">
        {items.map((item) => (
          <button
            key={item.value}
            type="button"
            onClick={() => onPick(item.value)}
            className="rounded-full border border-slate-300 bg-slate-50 px-3 py-1 text-left text-xs text-slate-800 hover:bg-slate-100"
          >
            {item.value}
          </button>
        ))}
      </div>
    </div>
  );
}
