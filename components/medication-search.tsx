"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import type { MedicationCatalogEntry } from "@/lib/medication-catalog";
import { medicationCatalogSource, medicationCatalogSourceName } from "@/lib/medication-catalog";
import { calculateWeightDose } from "@/lib/weight-dose";

type CatalogResponse = {
  results: MedicationCatalogEntry[];
  source?: { name: string; url: string; updatedAt: string | null };
  error?: string;
};

type DoseResult = ReturnType<typeof calculateWeightDose>;

function hasThreeLetters(value: string) {
  return [...value.replace(/[^\p{L}]/gu, "")].length >= 3;
}

function highlightMatch(text: string, query: string) {
  const normalize = (value: string) => value.normalize("NFD").replace(/\p{M}/gu, "").toLocaleLowerCase("pt-BR");
  const normalizedQuery = normalize(query);
  if (!normalizedQuery) return text;

  let normalizedText = "";
  const characterRanges: Array<[number, number]> = [];
  let sourceIndex = 0;
  for (const character of text) {
    const start = sourceIndex;
    sourceIndex += character.length;
    for (const normalizedCharacter of normalize(character)) {
      normalizedText += normalizedCharacter;
      characterRanges.push([start, sourceIndex]);
    }
  }

  const matchIndex = normalizedText.indexOf(normalizedQuery);
  if (matchIndex < 0) return text;
  const start = characterRanges[matchIndex][0];
  const end = characterRanges[matchIndex + normalizedQuery.length - 1][1];
  return (
    <>
      {text.slice(0, start)}
      <mark className="rounded bg-amber-200 px-0.5 text-inherit">{text.slice(start, end)}</mark>
      {text.slice(end)}
    </>
  );
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 }).format(value);
}

export default function MedicationSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<MedicationCatalogEntry[]>([]);
  const [selected, setSelected] = useState<MedicationCatalogEntry | null>(null);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [source, setSource] = useState<CatalogResponse["source"]>();
  const [weight, setWeight] = useState("");
  const [labelDose, setLabelDose] = useState("");
  const [doseBasis, setDoseBasis] = useState<"per-dose" | "per-day">("per-dose");
  const [dosesPerDay, setDosesPerDay] = useState("");
  const [maximumDose, setMaximumDose] = useState("");
  const [confirmedLabel, setConfirmedLabel] = useState(false);
  const [calculatedDose, setCalculatedDose] = useState<DoseResult | null>(null);
  const [doseError, setDoseError] = useState("");
  const [instructions, setInstructions] = useState("");
  const [posology, setPosology] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = "medication-search-results";
  const searchCanStart = hasThreeLetters(query.trim());

  useEffect(() => {
    const trimmedQuery = query.trim();
    if (!hasThreeLetters(trimmedQuery)) return;

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      setError("");
      try {
        const response = await fetch(`/api/medications?q=${encodeURIComponent(trimmedQuery)}`, {
          signal: controller.signal,
        });
        const payload = await response.json() as CatalogResponse;
        if (!response.ok) throw new Error(payload.error || "Não foi possível pesquisar o catálogo.");
        setResults(payload.results);
        setSource(payload.source);
        setActiveIndex(payload.results.length > 0 ? 0 : -1);
      } catch (requestError) {
        if (controller.signal.aborted) return;
        setResults([]);
        setError(requestError instanceof Error ? requestError.message : "Não foi possível pesquisar o catálogo.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 250);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  const selectMedication = (entry: MedicationCatalogEntry) => {
    setSelected(entry);
    setQuery(entry.activeIngredient);
    setResults([]);
    setActiveIndex(-1);
    setWeight("");
    setLabelDose("");
    setMaximumDose("");
    setDosesPerDay("");
    setConfirmedLabel(false);
    setCalculatedDose(null);
    setDoseError("");
    setInstructions("");
    setPosology("");
  };

  const onSearchKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown" && results.length > 0) {
      event.preventDefault();
      setActiveIndex((index) => (index + 1) % results.length);
    } else if (event.key === "ArrowUp" && results.length > 0) {
      event.preventDefault();
      setActiveIndex((index) => (index - 1 + results.length) % results.length);
    } else if (event.key === "Enter" && activeIndex >= 0 && results[activeIndex]) {
      event.preventDefault();
      selectMedication(results[activeIndex]);
    } else if (event.key === "Escape") {
      setResults([]);
      setActiveIndex(-1);
    }
  };

  const calculateDose = () => {
    setDoseError("");
    setCalculatedDose(null);
    const parsedWeight = Number(weight.replace(",", "."));
    const parsedLabelDose = Number(labelDose.replace(",", "."));
    const parsedMaximumDose = maximumDose.trim() ? Number(maximumDose.replace(",", ".")) : null;
    const parsedDosesPerDay = Number(dosesPerDay);

    if (!confirmedLabel) {
      setDoseError("Confirme a consulta à bula profissional e à indicação antes de calcular.");
      return;
    }
    if (!selected) {
      setDoseError("Selecione uma apresentação antes de calcular.");
      return;
    }

    const result = calculateWeightDose({
      weightKg: parsedWeight,
      labeledDoseMgPerKg: parsedLabelDose,
      basis: doseBasis,
      dosesPerDay: parsedDosesPerDay,
      maximumDosePerAdministrationMg: parsedMaximumDose ?? undefined,
      concentration: selected.concentration,
    });
    if (!result) {
      setDoseError("Informe peso e dose da bula válidos. Para dose diária, informe de 1 a 24 administrações ao dia. A dose máxima é opcional.");
      return;
    }

    setCalculatedDose(result);
  };

  const applyCalculatedDose = () => {
    if (!calculatedDose) return;
    const amount = `${formatNumber(calculatedDose.milligramsPerDose)} mg`;
    const volume = calculatedDose.millilitersPerDose === null ? "" : ` (${formatNumber(calculatedDose.millilitersPerDose)} mL)`;
    const calculation = `Cálculo conferido: ${amount}${volume} por dose`;
    setPosology((current) => current.trim() ? `${current.trim()}\n${calculation}` : calculation);
  };

  const recipeHref = selected
    ? `/receita?medicamento=${encodeURIComponent(selected.activeIngredient)}&apresentacao=${encodeURIComponent(
      [selected.concentration, selected.pharmaceuticalForm, selected.supplyUnit].filter(Boolean).join(" — "),
    )}&posologia=${encodeURIComponent([instructions.trim(), posology.trim()].filter(Boolean).join("\n"))}`
    : "/receita";

  return (
    <section aria-labelledby="medication-search-heading" className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm md:p-8">
      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-800">Busca de medicamentos</p>
      <h2 id="medication-search-heading" className="mt-2 text-2xl font-bold">Encontre princípio ativo e apresentação</h2>
      <p className="mt-2 max-w-3xl leading-6 text-slate-600">
        Pesquise pelo princípio ativo. A busca usa o catálogo CATMAT referenciado pelo e-SUS APS; confira a bula
        profissional vigente antes de prescrever.
      </p>

      <div className="relative mt-5">
        <label htmlFor="medication-search-input" className="mb-2 block text-sm font-medium text-slate-700">
          Medicamento
        </label>
        <input
          ref={inputRef}
          id="medication-search-input"
          type="search"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={results.length > 0}
          aria-controls={listId}
          aria-activedescendant={activeIndex >= 0 ? `${listId}-${activeIndex}` : undefined}
          autoComplete="off"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setSelected(null);
            setResults([]);
            setError("");
            setActiveIndex(-1);
            setLoading(false);
          }}
          onKeyDown={onSearchKeyDown}
          placeholder="Digite ao menos 3 letras"
          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-base outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-200"
        />
        {loading && searchCanStart && <p role="status" className="mt-2 text-sm text-slate-600">Pesquisando no catálogo público…</p>}
        {!searchCanStart && query.trim().length > 0 && (
          <p className="mt-2 text-sm text-slate-600">Digite ao menos 3 letras para iniciar a busca.</p>
        )}
        {searchCanStart && error && <p role="alert" className="mt-2 text-sm text-red-700">{error}</p>}
        {searchCanStart && results.length > 0 && (
          <ul id={listId} role="listbox" aria-label="Sugestões de medicamentos" className="absolute z-20 mt-1 max-h-80 w-full overflow-auto rounded-xl border border-slate-200 bg-white py-1 shadow-xl">
            {results.map((entry, index) => (
              <li
                key={`${entry.id}-${entry.concentration}`}
                id={`${listId}-${index}`}
                role="option"
                aria-selected={index === activeIndex}
                onMouseDown={(event) => event.preventDefault()}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => selectMedication(entry)}
                className={`cursor-pointer px-4 py-3 text-sm ${index === activeIndex ? "bg-emerald-50" : "hover:bg-slate-50"}`}
              >
                <span className="font-semibold text-slate-900">{highlightMatch(entry.activeIngredient, query.trim())}</span>
                <span className="block text-slate-600">
                  {entry.concentration} · {entry.pharmaceuticalForm} · {entry.supplyUnit}
                </span>
                <span className="block text-xs text-slate-500">CATMAT {entry.id}</span>
              </li>
            ))}
          </ul>
        )}
        {searchCanStart && !loading && !error && results.length === 0 && (
          <p className="mt-2 text-sm text-slate-600">Nenhuma apresentação encontrada para essa busca.</p>
        )}
      </div>

      <p className="mt-4 text-xs leading-5 text-slate-500">
        Fonte: <a className="underline" href={source?.url ?? medicationCatalogSource} target="_blank" rel="noreferrer">
          {source?.name ?? medicationCatalogSourceName}
        </a>. Atualização indicada na página de origem: {source?.updatedAt ?? "não informada"}.
        O CATMAT não contém posologia nem modo de usar.
      </p>

      {selected && (
        <div className="mt-6 space-y-5 rounded-2xl border border-emerald-200 bg-emerald-50/60 p-5">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">{selected.activeIngredient}</h3>
            <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
              <div><dt className="text-slate-600">Concentração</dt><dd className="font-medium">{selected.concentration}</dd></div>
              <div><dt className="text-slate-600">Forma farmacêutica</dt><dd className="font-medium">{selected.pharmaceuticalForm}</dd></div>
              <div><dt className="text-slate-600">Unidade de fornecimento</dt><dd className="font-medium">{selected.supplyUnit}</dd></div>
              <div><dt className="text-slate-600">Código CATMAT</dt><dd className="font-medium">{selected.id}</dd></div>
            </dl>
          </div>

          <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
            Consulte a bula profissional vigente da apresentação e confirme indicação, faixa etária, contraindicações,
            intervalo, duração e limites de dose. O catálogo não fornece posologia. A bula da Anvisa é consultada
            manualmente e não é pesquisada nem interpretada automaticamente por este aplicativo.
            {" "}<a href="https://consultas.anvisa.gov.br/#/bulario/" target="_blank" rel="noreferrer" className="font-semibold underline">
              Abrir Bulário Eletrônico da Anvisa
            </a>
          </div>

          <fieldset className="space-y-4 rounded-xl border border-slate-200 bg-white p-4">
            <legend className="px-1 font-semibold text-slate-900">Cálculo com dose por peso informada pela bula</legend>
            <p className="text-sm leading-5 text-slate-600">
              Ferramenta aritmética: não recomenda dose. Informe exatamente a dose da bula profissional para a
              indicação e faixa etária em questão.
            </p>
            <label className="flex items-start gap-2 text-sm leading-5 text-slate-700">
              <input
                type="checkbox"
                checked={confirmedLabel}
                onChange={(event) => {
                  setConfirmedLabel(event.target.checked);
                  setCalculatedDose(null);
                }}
                className="mt-1 accent-emerald-700"
              />
              Conferi a dose, a indicação e a faixa etária na bula profissional vigente da Anvisa.
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-medium text-slate-700">
                Peso (kg)
                <input type="number" min="0.1" step="0.1" value={weight} onChange={(event) => {
                  setWeight(event.target.value);
                  setCalculatedDose(null);
                }} className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2" />
              </label>
              <label className="block text-sm font-medium text-slate-700">
                Dose da bula (mg/kg{doseBasis === "per-day" ? "/dia" : "/dose"})
                <input type="number" min="0.001" step="any" value={labelDose} onChange={(event) => {
                  setLabelDose(event.target.value);
                  setCalculatedDose(null);
                }} className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2" />
              </label>
              <label className="block text-sm font-medium text-slate-700">
                Base da dose
                <select value={doseBasis} onChange={(event) => {
                  setDoseBasis(event.target.value === "per-day" ? "per-day" : "per-dose");
                  setCalculatedDose(null);
                }} className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2">
                  <option value="per-dose">mg/kg por dose</option>
                  <option value="per-day">mg/kg por dia</option>
                </select>
              </label>
              {doseBasis === "per-day" && (
                <label className="block text-sm font-medium text-slate-700">
                  Doses ao dia (conforme bula)
                  <input type="number" min="1" max="24" step="1" value={dosesPerDay} onChange={(event) => {
                    setDosesPerDay(event.target.value);
                    setCalculatedDose(null);
                  }} className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2" />
                </label>
              )}
              <label className="block text-sm font-medium text-slate-700 sm:col-span-2">
                Dose máxima por administração (mg), se indicada na bula
                <input type="number" min="0.001" step="any" value={maximumDose} onChange={(event) => {
                  setMaximumDose(event.target.value);
                  setCalculatedDose(null);
                }} className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2" />
              </label>
            </div>
            <button type="button" onClick={calculateDose} className="rounded-lg bg-emerald-700 px-4 py-2 font-semibold text-white hover:bg-emerald-800">
              Calcular valor informado
            </button>
            {doseError && <p role="alert" className="text-sm text-red-700">{doseError}</p>}
            {calculatedDose && (
              <div role="status" className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-950">
                Resultado aritmético:                 <strong>{formatNumber(calculatedDose.milligramsPerDose)} mg por dose</strong>
                {calculatedDose.millilitersPerDose !== null && <> ({formatNumber(calculatedDose.millilitersPerDose)} mL)</>}.
                {calculatedDose.maximumApplied && " Resultado limitado pela dose máxima por administração que você informou."}
                {calculatedDose.millilitersPerDose === null && " A concentração informada não permite converter para mL automaticamente."}
                <p className="mt-1">Confirme unidades, arredondamento, limite máximo e volume mensurável antes de usar.</p>
                <button type="button" onClick={applyCalculatedDose} className="mt-2 font-semibold underline">
                  Inserir o resultado na posologia
                </button>
              </div>
            )}
          </fieldset>

          <label className="block text-sm font-medium text-slate-700">
            Via e modo de usar — preencher após conferir a bula
            <textarea rows={2} value={instructions} onChange={(event) => setInstructions(event.target.value)} className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2" />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Posologia confirmada na bula
            <textarea rows={3} value={posology} onChange={(event) => setPosology(event.target.value)} className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2" />
          </label>
          <div className="flex flex-wrap gap-3">
            <Link href={recipeHref} className="rounded-xl bg-emerald-700 px-4 py-3 font-semibold text-white hover:bg-emerald-800">
              Usar na receita
            </Link>
            <button type="button" onClick={() => {
              setSelected(null);
              setQuery("");
              setInstructions("");
              setPosology("");
              inputRef.current?.focus();
            }} className="rounded-xl border border-slate-300 px-4 py-3 font-semibold text-slate-700 hover:bg-white">
              Limpar seleção
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
