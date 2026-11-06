"use client";

import { useRef, useState } from "react";

type ExtractedPage = {
  pageNumber: number;
  text: string;
};

type BulaPdfReaderProps = {
  medicationName: string;
  registration?: string;
};

type CharacterRange = [number, number];

const MAX_FILE_SIZE = 20 * 1024 * 1024;
const MAX_PAGES = 300;
const MAX_EXCERPTS = 30;
const DEFAULT_SEARCH_TERMS = ["posologia", "dose", "modo de usar", "administração", "mg/kg", "adulto", "criança"];

function normalizeWithRanges(value: string) {
  let normalized = "";
  const ranges: CharacterRange[] = [];
  let sourceIndex = 0;

  for (const character of value) {
    const start = sourceIndex;
    sourceIndex += character.length;
    const normalizedCharacter = character.normalize("NFD").replace(/\p{M}/gu, "").toLocaleLowerCase("pt-BR");
    for (const item of normalizedCharacter) {
      normalized += item;
      ranges.push([start, sourceIndex]);
    }
  }

  return { normalized, ranges };
}

function findExcerpts(pages: ExtractedPage[], search: string) {
  const terms = search.trim() ? [search.trim()] : DEFAULT_SEARCH_TERMS;
  const excerpts: Array<{ pageNumber: number; text: string }> = [];

  for (const page of pages) {
    const { normalized, ranges } = normalizeWithRanges(page.text);
    const pageExcerpts: Array<{ pageNumber: number; text: string }> = [];
    let lastEnd = -1;

    for (const term of terms) {
      const normalizedTerm = term.normalize("NFD").replace(/\p{M}/gu, "").toLocaleLowerCase("pt-BR");
      if (!normalizedTerm) continue;

      let fromIndex = 0;
      while (fromIndex < normalized.length) {
        const matchIndex = normalized.indexOf(normalizedTerm, fromIndex);
        if (matchIndex < 0) break;

        const sourceStart = ranges[matchIndex][0];
        const sourceEnd = ranges[matchIndex + normalizedTerm.length - 1][1];
        const excerptStart = Math.max(0, sourceStart - 180);
        const excerptEnd = Math.min(page.text.length, sourceEnd + 240);
        if (sourceStart > lastEnd) {
          pageExcerpts.push({
            pageNumber: page.pageNumber,
            text: `${excerptStart > 0 ? "… " : ""}${page.text.slice(excerptStart, excerptEnd).trim()}${excerptEnd < page.text.length ? " …" : ""}`,
          });
          lastEnd = excerptEnd;
        }

        fromIndex = matchIndex + normalizedTerm.length;
        if (pageExcerpts.length >= 2) break;
      }

      if (pageExcerpts.length >= 2) break;
    }

    excerpts.push(...pageExcerpts);
    if (excerpts.length >= MAX_EXCERPTS) return excerpts.slice(0, MAX_EXCERPTS);
  }

  return excerpts;
}

export default function BulaPdfReader({ medicationName, registration }: BulaPdfReaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pages, setPages] = useState<ExtractedPage[]>([]);
  const [fileName, setFileName] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState("");
  const excerpts = findExcerpts(pages, search);

  const extractPdf = async (file: File) => {
    setError("");
    setPages([]);
    setFileName("");
    setSearch("");

    if (!file.name.toLocaleLowerCase("pt-BR").endsWith(".pdf") || file.size > MAX_FILE_SIZE) {
      setError("Selecione um arquivo PDF de até 20 MB.");
      return;
    }

    setLoading(true);
    setProgress("Abrindo PDF no navegador…");
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const header = new TextDecoder().decode(bytes.subarray(0, 1024));
      if (!header.includes("%PDF-")) {
        throw new Error("O arquivo selecionado não parece ser um PDF válido.");
      }

      const pdfjs = await import("pdfjs-dist");
      pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();
      const loadingTask = pdfjs.getDocument({ data: bytes });
      const pdf = await loadingTask.promise;

      try {
        if (pdf.numPages > MAX_PAGES) {
          throw new Error(`O PDF tem ${pdf.numPages} páginas. O limite para leitura é ${MAX_PAGES}.`);
        }

        const extractedPages: ExtractedPage[] = [];
        for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
          setProgress(`Extraindo texto da página ${pageNumber} de ${pdf.numPages}…`);
          const page = await pdf.getPage(pageNumber);
          const content = await page.getTextContent();
          const text = content.items
            .filter((item) => "str" in item)
            .map((item) => item.str)
            .join(" ")
            .replace(/\s+/g, " ")
            .trim();
          if (text) extractedPages.push({ pageNumber, text });
        }

        setPages(extractedPages);
        setFileName(file.name);
      } finally {
        await loadingTask.destroy();
      }
    } catch (extractionError) {
      setError(extractionError instanceof Error ? extractionError.message : "Não foi possível extrair o texto do PDF.");
    } finally {
      setLoading(false);
      setProgress("");
    }
  };

  const clearPdf = () => {
    setPages([]);
    setFileName("");
    setSearch("");
    setError("");
    setProgress("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <section aria-labelledby="bula-reader-heading" className="space-y-3 rounded-xl border border-sky-200 bg-sky-50/70 p-4">
      <div>
        <h4 id="bula-reader-heading" className="font-semibold text-slate-900">Extrair texto da bula em PDF</h4>
        <p className="mt-1 text-sm leading-5 text-slate-700">
          Escolha no dispositivo o PDF da bula de <strong>{medicationName}</strong>
          {registration ? ` (registro ${registration})` : ""}. O aplicativo não confirma automaticamente que o documento
          corresponde ao medicamento selecionado.
        </p>
      </div>
      <label className="block text-sm font-medium text-slate-700">
        Arquivo PDF (máximo 20 MB e 300 páginas)
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,application/pdf"
          disabled={loading}
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void extractPdf(file);
          }}
          className="mt-2 block w-full rounded-lg border border-slate-300 bg-white p-2 text-sm"
        />
      </label>
      <p className="text-xs leading-5 text-slate-600">
        A leitura acontece somente neste navegador; o arquivo e o texto extraído não são enviados nem salvos pelo aplicativo.
        PDFs digitalizados como imagem não têm texto extraível aqui; OCR não está incluído.
      </p>
      {loading && <p role="status" className="text-sm text-slate-700">{progress}</p>}
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      {fileName && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p role="status" className="text-sm font-medium text-slate-700">
              PDF: {fileName} · {pages.length} páginas com texto extraído
            </p>
            <button type="button" onClick={clearPdf} className="text-sm font-semibold text-slate-700 underline">
              Remover PDF
            </button>
          </div>
          {pages.length === 0 ? (
            <p className="rounded-lg bg-white p-3 text-sm text-amber-900">
              Nenhum texto foi encontrado. O PDF pode ser digitalizado como imagem e exigir OCR.
            </p>
          ) : (
            <>
              <label className="block text-sm font-medium text-slate-700">
                Buscar termo no texto extraído
                <input
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Padrão: posologia, dose, administração…"
                  className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2"
                />
              </label>
              <p className="text-xs text-slate-600">
                {search.trim()
                  ? `Exibindo até ${MAX_EXCERPTS} trechos que correspondem a “${search.trim()}”.`
                  : "Trechos encontrados por termos relacionados a posologia. Busque outro termo para refinar."}
              </p>
              {excerpts.length > 0 ? (
                <ol className="max-h-96 space-y-3 overflow-auto">
                  {excerpts.map((excerpt, index) => (
                    <li key={`${excerpt.pageNumber}-${index}`} className="rounded-lg border border-slate-200 bg-white p-3">
                      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-sky-800">Página {excerpt.pageNumber}</p>
                      <p className="text-sm leading-6 text-slate-800">{excerpt.text}</p>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="rounded-lg bg-white p-3 text-sm text-slate-700">
                  Nenhum trecho correspondeu. Tente outra palavra ou expressão.
                </p>
              )}
            </>
          )}
          <p className="text-xs leading-5 text-amber-900">
            Os trechos são texto extraído, não uma interpretação nem recomendação de dose. Confira o PDF original, a página,
            versão, produto e apresentação, além de indicação, faixa etária e contexto clínico antes de prescrever.
          </p>
        </div>
      )}
    </section>
  );
}
