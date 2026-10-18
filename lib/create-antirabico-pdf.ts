import { PDFDocument, StandardFonts, rgb, type PDFPage } from "pdf-lib";
import {
  antirabicoSections,
  type AntirabicoValue,
  type AntirabicoValues,
} from "@/lib/antirabico-form";

type TextPlacement = {
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
};

type MarkPlacement = {
  page: number;
  x: number;
  y: number;
};

const textPlacements: Record<string, TextPlacement> = {
  notificationNumber: { page: 0, x: 944, y: 71, width: 172, height: 23 },
  notificationDate: { page: 0, x: 915, y: 190, width: 208, height: 25 },
  notificationState: { page: 0, x: 107, y: 257, width: 45, height: 24 },
  notificationCity: { page: 0, x: 165, y: 255, width: 777, height: 25 },
  notificationIbge: { page: 0, x: 971, y: 264, width: 151, height: 21 },
  notificationUnit: { page: 0, x: 110, y: 312, width: 555, height: 22 },
  notificationCnes: { page: 0, x: 684, y: 321, width: 190, height: 17 },
  attendanceDate: { page: 0, x: 893, y: 313, width: 230, height: 23 },
  patientName: { page: 0, x: 110, y: 368, width: 755, height: 24 },
  birthDate: { page: 0, x: 892, y: 370, width: 230, height: 24 },
  age: { page: 0, x: 116, y: 430, width: 91, height: 19 },
  patientCns: { page: 0, x: 113, y: 552, width: 340, height: 20 },
  motherName: { page: 0, x: 467, y: 555, width: 650, height: 21 },
  residenceState: { page: 0, x: 108, y: 616, width: 48, height: 20 },
  residenceCity: { page: 0, x: 163, y: 615, width: 475, height: 22 },
  residenceIbge: { page: 0, x: 666, y: 629, width: 151, height: 18 },
  district: { page: 0, x: 825, y: 615, width: 292, height: 22 },
  neighborhood: { page: 0, x: 110, y: 667, width: 268, height: 22 },
  street: { page: 0, x: 389, y: 667, width: 560, height: 22 },
  streetCode: { page: 0, x: 960, y: 676, width: 158, height: 17 },
  streetNumber: { page: 0, x: 111, y: 717, width: 94, height: 22 },
  complement: { page: 0, x: 220, y: 716, width: 590, height: 22 },
  geo1: { page: 0, x: 818, y: 716, width: 302, height: 22 },
  geo2: { page: 0, x: 109, y: 767, width: 306, height: 21 },
  reference: { page: 0, x: 430, y: 766, width: 469, height: 22 },
  cep: { page: 0, x: 908, y: 772, width: 213, height: 20 },
  phone: { page: 0, x: 109, y: 817, width: 285, height: 19 },
  country: { page: 0, x: 711, y: 816, width: 413, height: 21 },
  occupation: { page: 0, x: 119, y: 920, width: 1012, height: 20 },
  exposureDate: { page: 0, x: 118, y: 1142, width: 222, height: 22 },
  dosesApplied: { page: 0, x: 1014, y: 1204, width: 56, height: 20 },
  otherSpecies: { page: 0, x: 734, y: 1261, width: 300, height: 17 },
  otherVaccineProducer: { page: 0, x: 716, y: 1472, width: 363, height: 16 },
  vaccineLot: { page: 0, x: 116, y: 1517, width: 490, height: 20 },
  vaccineExpiry: { page: 0, x: 919, y: 1516, width: 207, height: 21 },
  doseDate1: { page: 1, x: 142, y: 132, width: 136, height: 24 },
  doseDate2: { page: 1, x: 317, y: 132, width: 136, height: 24 },
  doseDate3: { page: 1, x: 495, y: 132, width: 140, height: 24 },
  doseDate4: { page: 1, x: 671, y: 132, width: 115, height: 24 },
  doseDate5: { page: 1, x: 846, y: 132, width: 112, height: 24 },
  patientWeight: { page: 1, x: 487, y: 418, width: 82, height: 21 },
  serumAmount: { page: 1, x: 688, y: 418, width: 84, height: 21 },
  otherSerumProducer: { page: 1, x: 840, y: 533, width: 260, height: 16 },
  serumBatch: { page: 1, x: 115, y: 584, width: 290, height: 20 },
  caseClosureDate: { page: 1, x: 800, y: 584, width: 197, height: 22 },
  observations: { page: 1, x: 67, y: 647, width: 1064, height: 355 },
  investigatorUnit: { page: 1, x: 113, y: 1047, width: 812, height: 25 },
  investigatorUnitCode: { page: 1, x: 943, y: 1060, width: 185, height: 18 },
  investigatorName: { page: 1, x: 113, y: 1111, width: 387, height: 25 },
  investigatorRole: { page: 1, x: 515, y: 1111, width: 410, height: 25 },
  investigatorSignature: { page: 1, x: 940, y: 1111, width: 190, height: 25 },
};

const codePlacements: Record<string, TextPlacement> = {
  ageUnit: { page: 0, x: 219, y: 425, width: 20, height: 19 },
  sex: { page: 0, x: 464, y: 410, width: 22, height: 19 },
  pregnancy: { page: 0, x: 851, y: 410, width: 23, height: 19 },
  race: { page: 0, x: 1102, y: 410, width: 22, height: 19 },
  education: { page: 0, x: 1102, y: 466, width: 22, height: 19 },
  zone: { page: 0, x: 664, y: 799, width: 22, height: 19 },
  exposureStatus: { page: 0, x: 115, y: 974, width: 26, height: 18 },
  locationStatus: { page: 0, x: 115, y: 1024, width: 26, height: 18 },
  injuryType: { page: 0, x: 404, y: 1074, width: 24, height: 18 },
  injuryStatus: { page: 0, x: 465, y: 1083, width: 30, height: 18 },
  previousTreatment: { page: 0, x: 381, y: 1147, width: 26, height: 18 },
  previousTreatmentCompleted: { page: 0, x: 592, y: 1190, width: 25, height: 18 },
  animalSpecies: { page: 0, x: 1105, y: 1236, width: 22, height: 18 },
  animalCondition: { page: 0, x: 571, y: 1292, width: 23, height: 18 },
  animalObservable: { page: 0, x: 1106, y: 1292, width: 22, height: 18 },
  recommendedTreatment: { page: 0, x: 1109, y: 1372, width: 22, height: 18 },
  vaccineProducer: { page: 0, x: 1111, y: 1441, width: 22, height: 18 },
  animalFinalCondition: { page: 1, x: 1098, y: 183, width: 22, height: 18 },
  treatmentInterrupted: { page: 1, x: 400, y: 264, width: 22, height: 18 },
  interruptionReason: { page: 1, x: 1084, y: 285, width: 35, height: 18 },
  unitContactedPatient: { page: 1, x: 810, y: 344, width: 22, height: 18 },
  adverseVaccine: { page: 1, x: 1117, y: 337, width: 22, height: 18 },
  serumIndication: { page: 1, x: 391, y: 405, width: 22, height: 18 },
  serumType: { page: 1, x: 1100, y: 405, width: 22, height: 18 },
  serumInfiltration: { page: 1, x: 150, y: 518, width: 28, height: 18 },
  serumProducer: { page: 1, x: 1098, y: 482, width: 22, height: 18 },
  adverseSerum: { page: 1, x: 716, y: 574, width: 22, height: 18 },
};

const checkboxPlacements: Record<string, Record<string, MarkPlacement>> = {
  exposureTypes: {
    indirect: { page: 0, x: 381, y: 966 },
    scratch: { page: 0, x: 537, y: 966 },
    lick: { page: 0, x: 674, y: 966 },
    bite: { page: 0, x: 804, y: 966 },
    other: { page: 0, x: 930, y: 966 },
  },
  locations: {
    mucosa: { page: 0, x: 376, y: 1021 },
    "head-neck": { page: 0, x: 463, y: 1021 },
    "hands-feet": { page: 0, x: 620, y: 1021 },
    trunk: { page: 0, x: 714, y: 1021 },
    "upper-limbs": { page: 0, x: 797, y: 1021 },
    "lower-limbs": { page: 0, x: 971, y: 1021 },
  },
  injuryTypes: {
    deep: { page: 0, x: 708, y: 1084 },
    superficial: { page: 0, x: 850, y: 1084 },
    lacerating: { page: 0, x: 986, y: 1084 },
  },
  previousTreatmentTypes: {
    "pre-exposure": { page: 0, x: 712, y: 1148 },
    "post-exposure": { page: 0, x: 969, y: 1148 },
  },
  infiltrationExtent: {
    total: { page: 1, x: 350, y: 472 },
    partial: { page: 1, x: 451, y: 472 },
  },
};

function printableValue(value: AntirabicoValue | undefined): string {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  if (!trimmed) return "";
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  return dateMatch ? `${dateMatch[3]}/${dateMatch[2]}/${dateMatch[1]}` : trimmed;
}

function drawTextInBox(
  page: PDFPage,
  text: string,
  placement: TextPlacement,
  font: Awaited<ReturnType<PDFDocument["embedFont"]>>,
  bold = false,
) {
  const height = placement.height / 2;
  const width = placement.width / 2;
  let fontSize = Math.min(9, Math.max(6, height * 0.72));
  while (font.widthOfTextAtSize(text, fontSize) > width - 2 && fontSize > 5) {
    fontSize -= 0.25;
  }
  if (font.widthOfTextAtSize(text, fontSize) > width - 2) {
    throw new Error(`O conteúdo excede o espaço impresso reservado para: ${text}`);
  }
  const x = placement.x / 2 + 1;
  const y = page.getHeight() - placement.y / 2 - fontSize * 0.8;
  page.drawText(text, {
    x,
    y,
    size: fontSize,
    font,
    color: rgb(0.05, 0.05, 0.05),
    opacity: 0.95,
    ...(bold ? { opacity: 1 } : {}),
  });
}

function drawCheckboxMark(page: PDFPage, placement: MarkPlacement, font: Awaited<ReturnType<PDFDocument["embedFont"]>>) {
  page.drawText("X", {
    x: placement.x / 2 + 3,
    y: page.getHeight() - (placement.y + 18) / 2 + 2,
    size: 8,
    font,
    color: rgb(0.02, 0.02, 0.02),
  });
}

function wrapText(text: string, font: Awaited<ReturnType<PDFDocument["embedFont"]>>, fontSize: number, maxWidth: number) {
  const lines: string[] = [];
  for (const paragraph of text.split(/\r?\n/)) {
    if (!paragraph.trim()) {
      lines.push("");
      continue;
    }
    let line = "";
    for (const word of paragraph.split(/\s+/)) {
      const candidate = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(candidate, fontSize) <= maxWidth) {
        line = candidate;
      } else {
        if (line) lines.push(line);
        if (font.widthOfTextAtSize(word, fontSize) > maxWidth) {
          throw new Error("Uma palavra das observações é maior que a linha disponível na ficha.");
        }
        line = word;
      }
    }
    if (line) lines.push(line);
  }
  return lines;
}

export async function createAntirabicoPdf(values: AntirabicoValues): Promise<Uint8Array> {
  for (const section of antirabicoSections) {
    for (const field of section.fields) {
      const hasPlacement =
        field.type === "checkboxes"
          ? field.key in checkboxPlacements
          : field.type === "select"
            ? field.key in codePlacements
            : field.key in textPlacements;
      if (!hasPlacement) {
        throw new Error(`Campo sem posição correspondente na ficha original: ${field.label}.`);
      }
    }
  }

  const response = await fetch("/atendimento-antirrabico.pdf", { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Não foi possível carregar o formulário original (HTTP ${response.status}).`);
  }

  const source = await response.arrayBuffer();
  const pdf = await PDFDocument.load(source);
  const pages = pdf.getPages();
  if (pages.length !== 2) {
    throw new Error(`O formulário original deveria ter 2 páginas; foram encontradas ${pages.length}.`);
  }
  const font = await pdf.embedFont(StandardFonts.Helvetica);

  for (const [key, placement] of Object.entries(textPlacements)) {
    if (key === "observations") continue;
    const value = printableValue(values[key]);
    if (value) drawTextInBox(pages[placement.page], value, placement, font);
  }

  for (const [key, placement] of Object.entries(codePlacements)) {
    const value = printableValue(values[key]);
    if (value) drawTextInBox(pages[placement.page], value, placement, font, true);
  }

  for (const [fieldKey, placements] of Object.entries(checkboxPlacements)) {
    const value = values[fieldKey];
    if (!Array.isArray(value)) continue;
    for (const selected of value) {
      const placement = placements[selected];
      if (!placement) {
        throw new Error(`Opção de preenchimento sem posição no PDF original: ${fieldKey} / ${selected}.`);
      }
      drawCheckboxMark(pages[placement.page], placement, font);
    }
  }

  const observations = printableValue(values.observations);
  if (observations) {
    const placement = textPlacements.observations;
    const page = pages[placement.page];
    const fontSize = 8;
    const lineHeight = 11;
    const lines = wrapText(observations, font, fontSize, placement.width / 2 - 8);
    const maxLines = Math.floor(placement.height / 2 / lineHeight);
    if (lines.length > maxLines) {
      throw new Error(`As observações ocupam ${lines.length} linhas; a ficha comporta ${maxLines}. Reduza o texto.`);
    }
    lines.forEach((line, index) => {
      if (line) {
        page.drawText(line, {
          x: placement.x / 2 + 2,
          y: page.getHeight() - placement.y / 2 - 12 - index * lineHeight,
          size: fontSize,
          font,
          color: rgb(0.05, 0.05, 0.05),
        });
      }
    });
  }

  return pdf.save();
}
