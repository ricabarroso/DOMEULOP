import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { gunzipSync } from "node:zlib";
import { NextResponse } from "next/server";
import {
  anvisaMedicationCatalogSource,
  anvisaMedicationCatalogSourceName,
  type MedicationCatalogEntry,
  medicationCatalogSource,
  medicationCatalogSourceName,
  parseMedicationCatalog,
  parseMedicationCatalogUpdatedAt,
  searchMedicationCatalog,
} from "@/lib/medication-catalog";
import {
  searchAnvisaMedicationCatalog,
  type AnvisaMedicationCatalog,
} from "@/lib/anvisa-medication-catalog";

type MedicationCatalogSnapshot = {
  entries: ReturnType<typeof parseMedicationCatalog>;
  updatedAt: string | null;
};

type AnvisaCatalogSnapshot = AnvisaMedicationCatalog;

let cachedSnapshot: { data: MedicationCatalogSnapshot; expiresAt: number } | null = null;
let pendingCatalogRequest: Promise<MedicationCatalogSnapshot> | null = null;
let cachedAnvisaSnapshot: Promise<AnvisaCatalogSnapshot> | null = null;

async function loadCatalogEntries() {
  if (cachedSnapshot && cachedSnapshot.expiresAt > Date.now()) return cachedSnapshot.data;
  if (pendingCatalogRequest) return pendingCatalogRequest;

  pendingCatalogRequest = (async () => {
    const response = await fetch(medicationCatalogSource, {
      headers: { Accept: "text/html" },
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) throw new Error(`A fonte CATMAT respondeu com HTTP ${response.status}.`);

    const html = await response.text();
    const entries = parseMedicationCatalog(html);
    if (entries.length === 0) throw new Error("A fonte CATMAT não retornou linhas no formato esperado.");

    const data = { entries, updatedAt: parseMedicationCatalogUpdatedAt(html) };
    cachedSnapshot = { data, expiresAt: Date.now() + 86400000 };
    return data;
  })();

  try {
    return await pendingCatalogRequest;
  } finally {
    pendingCatalogRequest = null;
  }
}

async function loadAnvisaCatalog() {
  if (!cachedAnvisaSnapshot) {
    cachedAnvisaSnapshot = (async () => {
      const path = join(process.cwd(), "data", "anvisa-medicamentos.json.gz");
      const compressedData = await readFile(path);
      const catalog = JSON.parse(gunzipSync(compressedData).toString("utf8")) as AnvisaCatalogSnapshot;
      if (!Array.isArray(catalog.records) || catalog.records.length === 0) {
        throw new Error("O índice local da Anvisa não contém registros.");
      }
      return catalog;
    })();
  }

  try {
    return await cachedAnvisaSnapshot;
  } catch (error) {
    cachedAnvisaSnapshot = null;
    throw error;
  }
}

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if ([...query.replace(/[^\p{L}]/gu, "")].length < 3) {
    return NextResponse.json({ results: [] });
  }
  if (query.length > 100) {
    return NextResponse.json({ error: "A busca deve ter até 100 caracteres." }, { status: 400 });
  }

  let catalogResults: MedicationCatalogEntry[] = [];
  let catalogSource: { name: string; url: string; updatedAt: string | null } | undefined;
  let catmatError: string | undefined;
  try {
    const catalog = await loadCatalogEntries();
    catalogResults = searchMedicationCatalog(catalog.entries, query);
    catalogSource = {
      name: medicationCatalogSourceName,
      url: medicationCatalogSource,
      updatedAt: catalog.updatedAt,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha desconhecida";
    console.error("Não foi possível consultar a tabela CATMAT:", message);
    catmatError = "Não foi possível consultar o CATMAT.";
  }

  let anvisaResults: MedicationCatalogEntry[] = [];
  let anvisaSource: { name: string; url: string; updatedAt: string | null } | undefined;
  let anvisaError: string | undefined;
  try {
    const anvisaCatalog = await loadAnvisaCatalog();
    anvisaResults = searchAnvisaMedicationCatalog(anvisaCatalog.records, query);
    anvisaSource = {
      name: anvisaMedicationCatalogSourceName,
      url: anvisaMedicationCatalogSource,
      updatedAt: anvisaCatalog.sourceUpdatedAt,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha desconhecida";
    console.error("Não foi possível consultar o índice local da Anvisa:", message);
    anvisaError = "Não foi possível consultar o catálogo de medicamentos da Anvisa.";
  }

  if (catmatError && anvisaError) {
    return NextResponse.json(
      { error: "Não foi possível consultar os catálogos de medicamentos. Tente novamente mais tarde." },
      { status: 502 },
    );
  }

  return NextResponse.json({
    results: catalogResults,
    catmatError,
    anvisaResults,
    anvisaSource,
    anvisaError,
    source: catalogSource,
  });
}
