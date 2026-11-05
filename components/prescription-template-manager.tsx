"use client";

import { useCallback, useEffect, useState } from "react";
import type { Json } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/client";
import type { PrescriptionMedication, PrescriptionType } from "@/components/document-editor";

type TemplateRow = {
  id: string;
  disease: string;
  prescription_type: PrescriptionType;
  medications: Json;
  compounding_text: string;
};

function parseMedications(value: Json): PrescriptionMedication[] | null {
  if (!Array.isArray(value)) return null;
  const parsed: PrescriptionMedication[] = [];
  for (const item of value) {
    if (typeof item !== "object" || item === null || Array.isArray(item)) return null;
    const record = item as { [key: string]: Json | undefined };
    if (
      typeof record.nome !== "string" ||
      typeof record.apresentacao !== "string" ||
      typeof record.posologia !== "string" ||
      typeof record.quantidade !== "string"
    ) {
      return null;
    }
    parsed.push({
      nome: record.nome,
      apresentacao: record.apresentacao,
      posologia: record.posologia,
      quantidade: record.quantidade,
    });
  }
  return parsed;
}

export default function PrescriptionTemplateManager({
  prescriptionType,
  medications,
  compoundingText,
  onLoad,
}: {
  prescriptionType: PrescriptionType;
  medications: PrescriptionMedication[];
  compoundingText: string;
  onLoad: (template: {
    prescriptionType: PrescriptionType;
    medications: PrescriptionMedication[];
    compoundingText: string;
  }) => void;
}) {
  const [disease, setDisease] = useState("");
  const [templates, setTemplates] = useState<TemplateRow[]>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchTemplates = useCallback(async () => {
    const supabase = createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError) throw userError;
    if (!user) throw new Error("Entre novamente para acessar seus modelos de receita.");

    const { data, error: queryError } = await supabase
      .from("prescription_templates")
      .select("id,disease,prescription_type,medications,compounding_text")
      .order("disease", { ascending: true });
    if (queryError) throw queryError;
    setTemplates(data);
  }, []);

  const loadTemplates = useCallback(async () => {
    try {
      await fetchTemplates();
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : "Não foi possível carregar os modelos salvos.");
    } finally {
      setLoading(false);
    }
  }, [fetchTemplates]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadTemplates(), 0);
    return () => window.clearTimeout(timer);
  }, [loadTemplates]);

  const saveTemplate = async () => {
    const normalizedDisease = disease.trim();
    if (!normalizedDisease) {
      setMessage("Informe o nome da doença antes de salvar o modelo.");
      return;
    }
    if (prescriptionType === "compounded" && !compoundingText.trim()) {
      setMessage("Escreva a prescrição manipulada antes de salvar.");
      return;
    }
    if (prescriptionType === "standard" && !medications.some((item) =>
      item.nome.trim() || item.apresentacao.trim() || item.posologia.trim() || item.quantidade.trim(),
    )) {
      setMessage("Preencha ao menos um medicamento antes de salvar.");
      return;
    }

    setSaving(true);
    setMessage("");
    try {
      const supabase = createClient();
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) throw new Error("Entre novamente para salvar modelos na sua conta.");

      const medicationData: Json[] = medications.map((item) => ({
        nome: item.nome,
        apresentacao: item.apresentacao,
        posologia: item.posologia,
        quantidade: item.quantidade,
      }));
      const matchingTemplate = templates.find(
        (item) => item.disease.trim().toLocaleLowerCase("pt-BR") === normalizedDisease.toLocaleLowerCase("pt-BR"),
      );
      const values = {
        disease: normalizedDisease,
        prescription_type: prescriptionType,
        medications: prescriptionType === "standard" ? medicationData : [],
        compounding_text: prescriptionType === "compounded" ? compoundingText : "",
        updated_at: new Date().toISOString(),
      };

      if (matchingTemplate) {
        const { error: updateError } = await supabase
          .from("prescription_templates")
          .update(values)
          .eq("id", matchingTemplate.id);
        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from("prescription_templates")
          .insert({ ...values, user_id: user.id });
        if (insertError) throw insertError;
      }

      await fetchTemplates();
      setMessage("Modelo salvo na sua conta.");
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : "Não foi possível salvar o modelo.");
    } finally {
      setSaving(false);
    }
  };

  const openTemplate = (template: TemplateRow) => {
    const parsedMedications = parseMedications(template.medications);
    if (!parsedMedications) {
      setMessage(`O modelo "${template.disease}" contém dados incompatíveis e não foi carregado.`);
      return;
    }
    onLoad({
      prescriptionType: template.prescription_type,
      medications: parsedMedications.length ? parsedMedications : [{ nome: "", apresentacao: "", posologia: "", quantidade: "" }],
      compoundingText: template.compounding_text,
    });
    setDisease(template.disease);
    setMessage(`Modelo de ${template.disease} carregado. Revise a prescrição e os dados do paciente.`);
  };

  return (
    <section className="space-y-4 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4">
      <div>
        <h3 className="font-semibold text-emerald-950">Modelos de prescrição por doença</h3>
        <p className="mt-1 text-sm leading-5 text-emerald-900">
          Salvos na sua conta; contêm somente o nome da doença e a prescrição, nunca dados de pacientes.
        </p>
      </div>
      <div className="grid gap-3 md:grid-cols-[1fr_auto]">
        <label className="block text-sm font-medium text-slate-700">
          <span className="mb-2 block">Doença ou diagnóstico do modelo</span>
          <input
            value={disease}
            onChange={(event) => setDisease(event.target.value)}
            maxLength={120}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-base text-slate-800 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
          />
        </label>
        <button
          type="button"
          disabled={saving}
          onClick={() => void saveTemplate()}
          className="self-end rounded-xl bg-emerald-700 px-4 py-2 font-semibold text-white hover:bg-emerald-800 disabled:cursor-wait disabled:opacity-60"
        >
          {saving ? "Salvando…" : "Salvar modelo"}
        </button>
      </div>

      <div>
        <h4 className="text-sm font-semibold text-slate-800">Prescrições salvas</h4>
        {loading ? (
          <p className="mt-2 text-sm text-slate-600" aria-live="polite">Carregando modelos…</p>
        ) : templates.length ? (
          <ul className="mt-2 flex flex-wrap gap-2">
            {templates.map((template) => (
              <li key={template.id}>
                <button
                  type="button"
                  onClick={() => openTemplate(template)}
                  className="rounded-lg border border-emerald-300 bg-white px-3 py-2 text-sm font-medium text-emerald-900 hover:bg-emerald-100"
                >
                  {template.disease} — abrir
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-slate-600">Ainda não há modelos salvos nesta conta.</p>
        )}
      </div>
      {message && <p role="status" className="text-sm text-slate-700">{message}</p>}
    </section>
  );
}
