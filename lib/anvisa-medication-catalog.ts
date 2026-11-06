import type { MedicationCatalogEntry } from "@/lib/medication-catalog";

export type AnvisaMedicationRecord = [
  registration: string,
  commercialName: string,
  activeIngredient: string,
  processNumber: string,
  regulatoryCategory: string,
];

export type AnvisaMedicationCatalog = {
  sourceUpdatedAt: string | null;
  records: AnvisaMedicationRecord[];
};

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLocaleLowerCase("pt-BR")
    .trim();
}

export function searchAnvisaMedicationCatalog(records: AnvisaMedicationRecord[], query: string) {
  const normalizedQuery = normalize(query);
  if ([...normalizedQuery.replace(/[^\p{L}]/gu, "")].length < 3) return [];

  return records
    .map(([registration, commercialName, activeIngredient, processNumber, regulatoryCategory]) => {
      const normalizedName = normalize(commercialName);
      const normalizedIngredient = normalize(activeIngredient);
      const searchable = normalize([commercialName, activeIngredient, registration].join(" "));
      if (!searchable.includes(normalizedQuery)) return null;

      const nameScore = normalizedName === normalizedQuery ? 0 : normalizedName.startsWith(normalizedQuery) ? 1 : normalizedName.includes(normalizedQuery) ? 2 : 4;
      const ingredientScore = normalizedIngredient === normalizedQuery ? 0 : normalizedIngredient.startsWith(normalizedQuery) ? 1 : normalizedIngredient.includes(normalizedQuery) ? 2 : 4;
      const score = Math.min(nameScore, ingredientScore);
      const entry: MedicationCatalogEntry = {
        id: `ANVISA-${registration}`,
        activeIngredient: activeIngredient || commercialName,
        concentration: "",
        pharmaceuticalForm: "",
        supplyUnit: "",
        source: "anvisa",
        commercialName,
        anvisaRegistration: registration,
        processNumber,
        regulatoryCategory,
      };
      return { entry, score };
    })
    .filter((match): match is { entry: MedicationCatalogEntry; score: number } => match !== null)
    .sort((a, b) => a.score - b.score || a.entry.commercialName!.localeCompare(b.entry.commercialName!, "pt-BR"))
    .slice(0, 12)
    .map(({ entry }) => entry);
}
