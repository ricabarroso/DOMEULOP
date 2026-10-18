import { NextResponse } from "next/server";

type CnesEstablishment = {
  codigo_cnes?: string | number;
  nome_fantasia?: string | null;
  nome_razao_social?: string | null;
  endereco_estabelecimento?: string | null;
  numero_estabelecimento?: string | null;
  bairro_estabelecimento?: string | null;
  codigo_cep_estabelecimento?: string | null;
  data_atualizacao?: string | null;
};

function isOptionalText(value: unknown): value is string | null | undefined {
  return value === undefined || value === null || typeof value === "string";
}

function isCnesEstablishment(value: unknown): value is CnesEstablishment {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  return (
    "codigo_cnes" in value &&
    (typeof value.codigo_cnes === "string" || typeof value.codigo_cnes === "number") &&
    (!("nome_fantasia" in value) || isOptionalText(value.nome_fantasia)) &&
    (!("nome_razao_social" in value) || isOptionalText(value.nome_razao_social)) &&
    (!("endereco_estabelecimento" in value) || isOptionalText(value.endereco_estabelecimento)) &&
    (!("numero_estabelecimento" in value) || isOptionalText(value.numero_estabelecimento)) &&
    (!("bairro_estabelecimento" in value) || isOptionalText(value.bairro_estabelecimento)) &&
    (!("codigo_cep_estabelecimento" in value) || isOptionalText(value.codigo_cep_estabelecimento)) &&
    (!("data_atualizacao" in value) || isOptionalText(value.data_atualizacao))
  );
}

function readText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ codigo: string }> },
) {
  const { codigo } = await params;
  if (!/^\d{7}$/.test(codigo)) {
    return NextResponse.json({ error: "Informe um código CNES com 7 dígitos." }, { status: 400 });
  }

  let response: Response;
  try {
    response = await fetch(
      `https://apidadosabertos.saude.gov.br/cnes/estabelecimentos/${codigo}`,
      {
        cache: "no-store",
        headers: { Accept: "application/json", "User-Agent": "Mozilla/5.0 (compatible; gerador-documentos-medicos)" },
        signal: AbortSignal.timeout(8000),
      },
    );
  } catch (error) {
    if (error instanceof Error && error.name === "TimeoutError") {
      return NextResponse.json({ error: "A consulta ao serviço CNES excedeu o tempo limite." }, { status: 504 });
    }
    return NextResponse.json({ error: "Não foi possível acessar o serviço CNES." }, { status: 502 });
  }

  if (response.status === 404) {
    return NextResponse.json({ error: "CNES não encontrado na consulta pública." }, { status: 404 });
  }
  if (!response.ok) {
    return NextResponse.json({ error: "O serviço CNES retornou uma resposta inesperada." }, { status: 502 });
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    return NextResponse.json({ error: "O serviço CNES retornou dados inválidos." }, { status: 502 });
  }
  if (!isCnesEstablishment(payload)) {
    return NextResponse.json({ error: "O serviço CNES retornou dados inválidos." }, { status: 502 });
  }
  const establishment = payload;

  const returnedCode = String(establishment.codigo_cnes ?? "").padStart(7, "0");
  if (returnedCode !== codigo) {
    return NextResponse.json({ error: "O serviço CNES retornou um estabelecimento incompatível." }, { status: 502 });
  }

  const nome = readText(establishment.nome_fantasia) || readText(establishment.nome_razao_social);
  if (!nome) {
    return NextResponse.json({ error: "O registro CNES não contém identificação do estabelecimento." }, { status: 502 });
  }

  const endereco = [
    readText(establishment.endereco_estabelecimento),
    readText(establishment.numero_estabelecimento),
    readText(establishment.bairro_estabelecimento),
  ]
    .filter(Boolean)
    .join(", ");

  return NextResponse.json({
    codigo: returnedCode,
    nome,
    endereco,
    cep: readText(establishment.codigo_cep_estabelecimento),
    atualizadoEm: readText(establishment.data_atualizacao),
  });
}
