export type WeightDoseBasis = "per-dose" | "per-day";

export type WeightDoseInput = {
  weightKg: number;
  labeledDoseMgPerKg: number;
  basis: WeightDoseBasis;
  dosesPerDay?: number;
  maximumDosePerAdministrationMg?: number;
  concentration: string;
};

export type WeightDoseResult = {
  milligramsPerDose: number;
  millilitersPerDose: number | null;
  maximumApplied: boolean;
};

function parseMilligramsPerMilliliter(concentration: string) {
  const normalized = concentration.replace(",", ".");
  const match = normalized.match(/(\d+(?:\.\d+)?)\s*mg\s*\/\s*(?:(\d+(?:\.\d+)?)\s*)?ml\b/i);
  if (!match) return null;
  const amount = Number(match[1]);
  const volume = Number(match[2] ?? "1");
  return amount > 0 && volume > 0 ? amount / volume : null;
}

export function calculateWeightDose(input: WeightDoseInput): WeightDoseResult | null {
  const {
    weightKg,
    labeledDoseMgPerKg,
    basis,
    dosesPerDay,
    maximumDosePerAdministrationMg,
    concentration,
  } = input;

  if (!Number.isFinite(weightKg) || weightKg <= 0 ||
    !Number.isFinite(labeledDoseMgPerKg) || labeledDoseMgPerKg <= 0 ||
    (basis === "per-day" && (!Number.isInteger(dosesPerDay) || (dosesPerDay ?? 0) < 1 || (dosesPerDay ?? 25) > 24)) ||
    (maximumDosePerAdministrationMg !== undefined &&
      (!Number.isFinite(maximumDosePerAdministrationMg) || maximumDosePerAdministrationMg <= 0))) {
    return null;
  }

  const uncappedMilligrams = weightKg * labeledDoseMgPerKg /
    (basis === "per-day" ? dosesPerDay! : 1);
  const maximumApplied = maximumDosePerAdministrationMg !== undefined &&
    uncappedMilligrams > maximumDosePerAdministrationMg;
  const milligramsPerDose = maximumApplied
    ? maximumDosePerAdministrationMg
    : uncappedMilligrams;
  const milligramsPerMilliliter = parseMilligramsPerMilliliter(concentration);

  return {
    milligramsPerDose,
    millilitersPerDose: milligramsPerMilliliter === null
      ? null
      : milligramsPerDose / milligramsPerMilliliter,
    maximumApplied,
  };
}
