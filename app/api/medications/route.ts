import { NextResponse } from "next/server";
import {
  medicationCatalogSource,
  medicationCatalogSourceName,
  parseMedicationCatalog,
  parseMedicationCatalogUpdatedAt,
  searchMedicationCatalog,
} from "@/lib/medication-catalog";

type MedicationCatalogSnapshot = {
  entries: ReturnType<typeof parseMedicationCatalog>;
  updatedAt: string | null;
};

let cachedSnapshot: { data: MedicationCatalogSnapshot; expiresAt: number } | null = null;
let pendingCatalogRequest: Promise<MedicationCatalogSnapshot> | null = null;

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

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if ([...query.replace(/[^\p{L}]/gu, "")].length < 3) {
    return NextResponse.json({ results: [] });
  }
  if (query.length > 100) {
    return NextResponse.json({ error: "A busca deve ter até 100 caracteres." }, { status: 400 });
  }

  let catalog: Awaited<ReturnType<typeof loadCatalogEntries>>;
  try {
    catalog = await loadCatalogEntries();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha desconhecida";
    console.error("Não foi possível consultar a tabela CATMAT:", message);
    return NextResponse.json(
      { error: "Não foi possível consultar o catálogo público de medicamentos. Tente novamente mais tarde." },
      { status: 502 },
    );
  }

  return NextResponse.json({
    results: searchMedicationCatalog(catalog.entries, query),
    source: {
      name: medicationCatalogSourceName,
      url: medicationCatalogSource,
      updatedAt: catalog.updatedAt,
    },
  });
}
