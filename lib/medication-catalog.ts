export const medicationCatalogSource =
  "https://integracao.esusaps.bridge.ufsc.tech/ledi/documentacao/referencias/tabela_catmat.html";

export const medicationCatalogSourceName = "Tabela CATMAT referenciada pelo e-SUS APS";

export type MedicationCatalogEntry = {
  id: string;
  activeIngredient: string;
  concentration: string;
  pharmaceuticalForm: string;
  supplyUnit: string;
};

export function parseMedicationCatalogUpdatedAt(html: string) {
  const match = html.match(/Alterado em\s+(\d{2})\/(\d{2})\/(\d{4})/i);
  return match ? `${match[3]}-${match[2]}-${match[1]}` : null;
}

function decodeHtml(value: string) {
  return value
    .replace(/&amp;/gi, "&")
    .replace(/&nbsp;/gi, " ")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
}

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR")
    .trim();
}

export function parseMedicationCatalog(html: string): MedicationCatalogEntry[] {
  const entries: MedicationCatalogEntry[] = [];
  const rows = html.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi);

  for (const row of rows) {
    const cells = [...row[1].matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)]
      .map((cell) => decodeHtml(cell[1].replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim()));
    if (cells.length !== 5 || !/^BR\d{7}(?:-\d+)?$/i.test(cells[0])) continue;
    if (cells.slice(1).some((cell) => !cell)) continue;

    entries.push({
      id: cells[0],
      activeIngredient: cells[1],
      concentration: cells[2],
      pharmaceuticalForm: cells[3],
      supplyUnit: cells[4],
    });
  }

  return entries;
}

export function searchMedicationCatalog(entries: MedicationCatalogEntry[], query: string) {
  const normalizedQuery = normalize(query);
  if ([...normalizedQuery.replace(/[^\p{L}]/gu, "")].length < 3) return [];

  return entries
    .map((entry) => {
      const active = normalize(entry.activeIngredient);
      const searchable = normalize([
        entry.id,
        entry.activeIngredient,
        entry.concentration,
        entry.pharmaceuticalForm,
        entry.supplyUnit,
      ].join(" "));
      const matchScore = active === normalizedQuery ? 0 : active.startsWith(normalizedQuery) ? 1 : active.includes(normalizedQuery) ? 2 : 3;
      const combinationPenalty = active.includes("+") ? 1 : 0;
      const score = matchScore + combinationPenalty;
      return searchable.includes(normalizedQuery) ? { entry, score } : null;
    })
    .filter((match): match is { entry: MedicationCatalogEntry; score: number } => match !== null)
    .sort((a, b) => a.score - b.score || a.entry.activeIngredient.localeCompare(b.entry.activeIngredient, "pt-BR"))
    .slice(0, 12)
    .map(({ entry }) => entry);
}
