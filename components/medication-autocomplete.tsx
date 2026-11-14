"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import {
  anvisaBularioSearchUrl,
  medicationDisplayName,
  type MedicationCatalogEntry,
} from "@/lib/medication-catalog";

type CatalogResponse = {
  results: MedicationCatalogEntry[];
  anvisaResults?: MedicationCatalogEntry[];
  catmatError?: string;
  anvisaError?: string;
  error?: string;
};

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

export default function MedicationAutocomplete({
  label,
  value,
  onChange,
  onSelect,
  list,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onSelect: (entry: MedicationCatalogEntry) => boolean;
  list?: string;
}) {
  const [results, setResults] = useState<MedicationCatalogEntry[]>([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [warning, setWarning] = useState("");
  const [searchedQuery, setSearchedQuery] = useState("");
  const [selectedEntry, setSelectedEntry] = useState<MedicationCatalogEntry | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const listId = `medication-options-${useId().replace(/:/g, "")}`;
  const searchCanStart = hasThreeLetters(value.trim());
  const requestId = useRef(0);
  const activeController = useRef<AbortController | null>(null);

  const closeSuggestions = () => {
    requestId.current += 1;
    activeController.current?.abort();
    activeController.current = null;
    setIsOpen(false);
    setSearchQuery("");
    setResults([]);
    setActiveIndex(-1);
    setLoading(false);
    setError("");
    setWarning("");
    setSearchedQuery("");
  };

  const startSearch = (query: string) => {
    requestId.current += 1;
    activeController.current?.abort();
    activeController.current = null;
    setIsOpen(true);
    setSearchQuery(query);
    setResults([]);
    setActiveIndex(-1);
    setLoading(false);
    setError("");
    setWarning("");
    setSearchedQuery("");
  };

  useEffect(() => {
    const query = searchQuery.trim();
    if (!isOpen || !hasThreeLetters(query)) return;

    const currentRequestId = requestId.current;
    const controller = new AbortController();
    activeController.current = controller;
    const timer = window.setTimeout(async () => {
      if (currentRequestId !== requestId.current) return;
      setLoading(true);
      setError("");
      try {
        const response = await fetch(`/api/medications?q=${encodeURIComponent(query)}`, {
          signal: controller.signal,
        });
        const payload = await response.json() as CatalogResponse;
        if (controller.signal.aborted || currentRequestId !== requestId.current) return;
        if (!response.ok) throw new Error(payload.error || "Não foi possível pesquisar o catálogo.");
        const suggestions = [...payload.results, ...(payload.anvisaResults ?? [])];
        setResults(suggestions);
        setWarning([payload.catmatError, payload.anvisaError].filter(Boolean).join(" "));
        setActiveIndex(suggestions.length > 0 ? 0 : -1);
        setSearchedQuery(query);
      } catch (requestError) {
        if (controller.signal.aborted || currentRequestId !== requestId.current) return;
        setResults([]);
        setWarning("");
        setSearchedQuery(query);
        setError(requestError instanceof Error ? requestError.message : "Não foi possível pesquisar o catálogo.");
      } finally {
        if (!controller.signal.aborted && currentRequestId === requestId.current) setLoading(false);
      }
    }, 250);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
      if (activeController.current === controller) activeController.current = null;
    };
  }, [isOpen, searchQuery]);

  const selectMedication = (entry: MedicationCatalogEntry) => {
    if (onSelect(entry) === false) return;
    setSelectedEntry(entry);
    closeSuggestions();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
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
      closeSuggestions();
    }
  };

  return (
    <div className="block text-sm font-medium text-slate-700">
      <label htmlFor={`${listId}-input`} className="mb-2 block">{label}</label>
      <div className="relative">
        <input
          id={`${listId}-input`}
          type="text"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={isOpen && searchCanStart && results.length > 0}
          aria-controls={listId}
          aria-activedescendant={activeIndex >= 0 ? `${listId}-${activeIndex}` : undefined}
          autoComplete="off"
          value={value}
          list={list}
          onFocus={() => startSearch(value)}
          onBlur={closeSuggestions}
          onChange={(event) => {
            setSelectedEntry(null);
            onChange(event.target.value);
            startSearch(event.target.value);
          }}
          onKeyDown={onKeyDown}
          placeholder="Digite ao menos 3 letras"
          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-base text-slate-800 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
        />
        {isOpen && searchCanStart && results.length > 0 && (
          <ul id={listId} role="listbox" aria-label="Sugestões de medicamentos" className="absolute z-30 mt-1 max-h-72 w-full overflow-auto rounded-xl border border-slate-200 bg-white py-1 shadow-xl">
            {results.map((entry, index) => (
              <li
                key={entry.id}
                id={`${listId}-${index}`}
                role="option"
                aria-selected={index === activeIndex}
                onPointerDown={(event) => event.preventDefault()}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => selectMedication(entry)}
                className={`cursor-pointer px-3 py-2 text-sm ${index === activeIndex ? "bg-emerald-50" : "hover:bg-slate-50"}`}
              >
                <span className="font-semibold">{highlightMatch(medicationDisplayName(entry), value.trim())}</span>
                {entry.source === "anvisa" ? (
                  <>
                    {entry.activeIngredient !== entry.commercialName && (
                      <span className="block text-slate-600">Princípio ativo: {highlightMatch(entry.activeIngredient, value.trim())}</span>
                    )}
                    <span className="block text-xs text-slate-500">
                      Anvisa · Registro {entry.anvisaRegistration} · {entry.regulatoryCategory || "Categoria não informada"}
                    </span>
                  </>
                ) : (
                  <>
                    <span className="block text-slate-600">{entry.concentration} · {entry.pharmaceuticalForm} · {entry.supplyUnit}</span>
                    <span className="block text-xs text-slate-500">CATMAT {entry.id}</span>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
      {isOpen && loading && searchCanStart && <p role="status" className="mt-1 text-xs text-slate-600">Pesquisando nos catálogos…</p>}
      {isOpen && !searchCanStart && value.trim().length > 0 && <p className="mt-1 text-xs text-slate-600">Digite ao menos 3 letras para buscar nos catálogos.</p>}
      {isOpen && searchCanStart && error && <p role="alert" className="mt-1 text-xs text-red-700">{error}</p>}
      {isOpen && searchCanStart && warning && <p role="status" className="mt-1 text-xs text-amber-800">{warning} Os resultados dos demais catálogos continuam disponíveis.</p>}
      {isOpen && searchCanStart && searchedQuery === value.trim() && !loading && !error && results.length === 0 && (
        <p className="mt-1 text-xs text-slate-600">Nenhum resultado encontrado nos catálogos. Você ainda pode digitar o medicamento manualmente.</p>
      )}
      {selectedEntry?.source === "anvisa" && (
        <p className="mt-1 text-xs font-normal text-slate-600">
          Registro Anvisa {selectedEntry.anvisaRegistration}.{" "}
          <a
            href={anvisaBularioSearchUrl(medicationDisplayName(selectedEntry))}
            target="_blank"
            rel="noreferrer"
            className="font-semibold underline"
          >
            Abrir a busca deste medicamento no Bulário da Anvisa
          </a>
        </p>
      )}
      <p className="mt-1 text-xs font-normal text-slate-500">A seleção do CATMAT preenche apresentação. O catálogo da Anvisa identifica produto e registro; confira a bula para preencher apresentação, posologia e modo de usar.</p>
    </div>
  );
}
