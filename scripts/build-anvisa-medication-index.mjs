import { createReadStream } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { gzipSync } from "node:zlib";

async function* csvRows(path) {
  const decoder = new TextDecoder("windows-1252");
  let buffer = "";
  let row = [];
  let field = "";
  let quoted = false;
  let skipLineFeed = false;

  const processBuffer = function* (endOfInput = false) {
    let index = 0;
    while (index < buffer.length) {
      const character = buffer[index];
      if (skipLineFeed) {
        skipLineFeed = false;
        if (character === "\n") {
          index += 1;
          continue;
        }
      }

      if (quoted) {
        if (character === '"') {
          if (index + 1 >= buffer.length && !endOfInput) break;
          if (buffer[index + 1] === '"') {
            field += '"';
            index += 2;
            continue;
          }
          quoted = false;
        } else {
          field += character;
        }
        index += 1;
        continue;
      }

      if (character === '"' && field.length === 0) {
        quoted = true;
      } else if (character === ";") {
        row.push(field);
        field = "";
      } else if (character === "\r" || character === "\n") {
        row.push(field);
        field = "";
        const completeRow = row;
        row = [];
        skipLineFeed = character === "\r";
        index += 1;
        yield completeRow;
        continue;
      } else {
        field += character;
      }
      index += 1;
    }

    buffer = buffer.slice(index);
    if (endOfInput) {
      if (quoted) throw new Error("O CSV terminou dentro de um campo entre aspas.");
      if (buffer.length > 0 || field.length > 0 || row.length > 0) {
        field += buffer;
        row.push(field);
        yield row;
        buffer = "";
        row = [];
        field = "";
      }
    }
  };

  for await (const chunk of createReadStream(path)) {
    buffer += decoder.decode(chunk, { stream: true });
    yield* processBuffer();
  }
  buffer += decoder.decode();
  yield* processBuffer(true);
}

const sourcePath = resolve(process.argv[2] ?? process.env.ANVISA_MEDICATION_CSV ?? "TA_CONSULTA_MEDICAMENTOS.CSV");
const outputPath = resolve(process.argv[3] ?? "data/anvisa-medicamentos.json.gz");
const iterator = csvRows(sourcePath);
const firstRow = await iterator.next();
if (firstRow.done) throw new Error("O CSV está vazio.");

const headers = firstRow.value.map((header) => header.replace(/^\uFEFF/, "").trim());
const column = (name) => {
  const index = headers.indexOf(name);
  if (index < 0) throw new Error(`O CSV não contém a coluna obrigatória ${name}.`);
  return index;
};

const columns = {
  productType: column("CO_TIPO_PRODUTO"),
  productName: column("NO_PRODUTO"),
  registration: column("NU_REGISTRO_PRODUTO"),
  processNumber: column("NU_PROCESSO"),
  category: column("DS_TIPO_CATEGORIA_REGULATORIA"),
  activeIngredient: column("SUBSTANCIAS_MEDICAMENTOS"),
  status: column("VALIDADE_SITUACAO"),
  updatedAt: column("DT_CARGA_ETL"),
};
const recordsByRegistration = new Map();
let sourceUpdatedAt = null;

for await (const values of iterator) {
  if (values[columns.productType]?.trim() !== "1" || values[columns.status]?.trim().toLocaleLowerCase("pt-BR") !== "ativo") {
    continue;
  }

  const registration = values[columns.registration]?.trim() ?? "";
  const productName = values[columns.productName]?.trim() ?? "";
  if (!/^\d{9}$/.test(registration) || !productName) continue;

  const record = [
    registration,
    productName,
    values[columns.activeIngredient]?.trim() ?? "",
    values[columns.processNumber]?.trim() ?? "",
    values[columns.category]?.trim() ?? "",
  ];
  const previous = recordsByRegistration.get(registration);
  if (!previous || record.filter(Boolean).length > previous.filter(Boolean).length) {
    recordsByRegistration.set(registration, record);
  }

  const updatedAt = values[columns.updatedAt]?.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (updatedAt) {
    const isoDate = `${updatedAt[3]}-${updatedAt[2]}-${updatedAt[1]}`;
    if (!sourceUpdatedAt || isoDate > sourceUpdatedAt) sourceUpdatedAt = isoDate;
  }
}

const records = [...recordsByRegistration.values()].sort((a, b) => a[1].localeCompare(b[1], "pt-BR"));
if (records.length === 0) throw new Error("O CSV não contém medicamentos registrados ativos com número de registro válido.");

const payload = JSON.stringify({ sourceUpdatedAt, records });
await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, gzipSync(payload, { level: 9 }));
const { stat } = await import("node:fs/promises");
console.log(JSON.stringify({
  source: sourcePath,
  output: outputPath,
  sourceUpdatedAt,
  records: records.length,
  compressedBytes: (await stat(outputPath)).size,
}, null, 2));
