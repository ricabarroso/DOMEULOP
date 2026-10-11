import { NextResponse } from "next/server";

type CnesProfessional = {
  nome?: unknown;
  cns?: unknown;
};

function isProfessional(value: unknown): value is CnesProfessional {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function GET(request: Request) {
  const cns = new URL(request.url).searchParams.get("cns")?.replace(/\D/g, "") ?? "";
  if (!/^\d{15}$/.test(cns)) {
    return NextResponse.json({ error: "Informe o CNS do profissional com 15 dígitos." }, { status: 400 });
  }

  let response: Response;
  try {
    response = await fetch(
      `https://cnes.datasus.gov.br/services/profissionais?cns=${encodeURIComponent(cns)}`,
      {
        headers: {
          Accept: "application/json",
          Referer: "https://cnes.datasus.gov.br/pages/profissionais/consulta.jsp",
        },
        cache: "no-store",
        signal: AbortSignal.timeout(8000),
      },
    );
  } catch (error) {
    const timeout = error instanceof Error && error.name === "TimeoutError";
    return NextResponse.json(
      { error: timeout ? "A consulta pública do CNES excedeu o tempo limite." : "Não foi possível acessar a consulta pública do CNES." },
      { status: timeout ? 504 : 502 },
    );
  }

  if (!response.ok) {
    return NextResponse.json({ error: "O serviço público do CNES está indisponível." }, { status: 502 });
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    return NextResponse.json({ error: "O serviço CNES retornou dados inválidos." }, { status: 502 });
  }
  if (!Array.isArray(payload) || !payload.every(isProfessional)) {
    return NextResponse.json({ error: "O serviço CNES retornou um formato incompatível." }, { status: 502 });
  }

  const professional = payload.find(
    (item) => typeof item.cns === "string" && item.cns.replace(/\D/g, "") === cns,
  );
  if (!professional || typeof professional.nome !== "string" || !professional.nome.trim()) {
    return NextResponse.json({ error: "Profissional não encontrado na consulta pública do CNES." }, { status: 404 });
  }

  return NextResponse.json({ cns, nome: professional.nome.trim() });
}
