import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { SharedDocumentData } from "@/components/document-session-provider";

type SisregPatient = Record<string, unknown>;

const adminEmails = new Set([
  "ricardobarroso.med@gmail.com",
  "ricardo-barroso@hotmail.com",
  "rica_bol@hotmail.com",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readText(value: unknown, limit = 300) {
  return typeof value === "string" ? value.trim().slice(0, limit) : "";
}

function toIsoDate(value: string) {
  const isoMatch = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (isoMatch) return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
  const brazilianMatch = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value);
  return brazilianMatch ? `${brazilianMatch[3]}-${brazilianMatch[2]}-${brazilianMatch[1]}` : "";
}

function normalizePatient(patient: SisregPatient): Partial<SharedDocumentData> {
  const data: Partial<SharedDocumentData> = {};
  const assign = (key: keyof SharedDocumentData, value: string) => {
    if (value) data[key] = value;
  };
  const digits = (value: unknown) => readText(value).replace(/\D/g, "");
  const cpfDigits = digits(patient.cpf);
  const municipality = readText(patient.municipio_residencia);
  const municipalityMatch = /^(.*?)\s*-\s*([A-Z]{2})$/i.exec(municipality);
  const phones = Array.isArray(patient.lista_telefones) ? patient.lista_telefones : [];
  const phone = phones.find(isRecord);
  const phoneNumber = phone ? readText(phone.numero) : "";
  const phoneDdd = phone ? readText(phone.ddd) : "";
  const street = [
    readText(patient.tipo_logradouro),
    readText(patient.logradouro),
  ].filter(Boolean).join(" ");
  const sex = readText(patient.sexo).toLocaleUpperCase("pt-BR");

  assign("paciente", readText(patient.nome_social) || readText(patient.nome));
  assign("nascimento", toIsoDate(readText(patient.data_nascimento)));
  assign("cns", digits(patient.cns));
  assign(
    "cpf",
    cpfDigits.length === 11
      ? `${cpfDigits.slice(0, 3)}.${cpfDigits.slice(3, 6)}.${cpfDigits.slice(6, 9)}-${cpfDigits.slice(9)}`
      : "",
  );
  assign("sexo", sex.startsWith("M") ? "M" : sex.startsWith("F") ? "F" : sex ? "I" : "");
  assign("nomeMae", readText(patient.nome_mae));
  assign("telefone", phoneNumber ? (phoneDdd ? `(${phoneDdd}) ${phoneNumber}` : phoneNumber) : "");
  assign("ruaPaciente", street);
  assign("numeroEnderecoPaciente", readText(patient.numero));
  assign("complementoEnderecoPaciente", readText(patient.complemento));
  assign("bairroPaciente", readText(patient.bairro));
  assign("municipioResidencia", municipalityMatch ? municipalityMatch[1].trim() : municipality);
  assign("uf", municipalityMatch ? municipalityMatch[2].toLocaleUpperCase("pt-BR") : "");
  assign("cep", digits(patient.cep));
  return data;
}

export async function POST(request: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({ error: "Autenticação não está configurada neste servidor." }, { status: 503 });
  }

  const supabase = await createClient();
  const { data: userResult, error: authError } = await supabase.auth.getUser();
  if (authError) {
    return NextResponse.json({ error: "Não foi possível validar sua sessão. Entre novamente." }, { status: 401 });
  }
  const user = userResult.user;
  if (!user) {
    return NextResponse.json({ error: "Entre na sua conta para consultar o SISREG." }, { status: 401 });
  }

  const email = user.email?.toLocaleLowerCase("en-US") ?? "";
  if (!adminEmails.has(email)) {
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("approved")
      .eq("id", user.id)
      .maybeSingle();
    if (profileError) {
      return NextResponse.json({ error: "Não foi possível confirmar a autorização da conta." }, { status: 503 });
    }
    if (!profile?.approved) {
      return NextResponse.json({ error: "Sua conta ainda não está autorizada a usar o aplicativo." }, { status: 403 });
    }
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "A solicitação de consulta está inválida." }, { status: 400 });
  }
  if (!isRecord(body)) {
    return NextResponse.json({ error: "A solicitação de consulta está inválida." }, { status: 400 });
  }

  const identifier = readText(body.cpf_cns, 32).replace(/\D/g, "");
  if (identifier.length !== 11 && identifier.length !== 15) {
    return NextResponse.json({ error: "Informe um CPF com 11 dígitos ou um CNS com 15 dígitos." }, { status: 400 });
  }
  const unitName = readText(body.unit_name, 200);
  if (!unitName) {
    return NextResponse.json({ error: "Informe o estabelecimento de saúde antes de consultar o paciente." }, { status: 400 });
  }
  const unitCnes = readText(body.unit_cnes, 20).replace(/\D/g, "");
  if (unitCnes && !/^\d{7}$/.test(unitCnes)) {
    return NextResponse.json({ error: "O CNES da unidade deve conter 7 dígitos." }, { status: 400 });
  }

  const authorization = process.env.SISREG_API_AUTHORIZATION?.trim();
  if (!authorization) {
    return NextResponse.json(
      { error: "Falta configurar a variável secreta SISREG_API_AUTHORIZATION no servidor." },
      { status: 503 },
    );
  }

  const url = new URL("/sisreg/paciente", "https://crawler-prod.care4all.com.br");
  url.searchParams.set("cpf_cns", identifier);
  const headers: Record<string, string> = {
    Accept: "application/json",
    Authorization: authorization,
    "unit-name": unitName,
  };
  if (unitCnes) headers["unit-cnes"] = unitCnes;

  let response: Response;
  try {
    response = await fetch(url, {
      method: "GET",
      cache: "no-store",
      headers,
      signal: AbortSignal.timeout(10000),
    });
  } catch (error) {
    if (error instanceof Error && error.name === "TimeoutError") {
      return NextResponse.json({ error: "A consulta ao SISREG excedeu o tempo limite." }, { status: 504 });
    }
    return NextResponse.json({ error: "Não foi possível acessar a API do SISREG por uma conexão segura." }, { status: 502 });
  }

  if (response.status === 400) {
    return NextResponse.json({ error: "O SISREG rejeitou os dados da consulta. Confira o CPF/CNS e a unidade." }, { status: 400 });
  }
  if (response.status === 404) {
    return NextResponse.json({ error: "A unidade não foi encontrada ou não está autorizada no SISREG." }, { status: 404 });
  }
  if (response.status === 401 || response.status === 403) {
    return NextResponse.json({ error: "A API do SISREG recusou a autorização configurada no servidor." }, { status: 502 });
  }
  if (!response.ok) {
    return NextResponse.json({ error: "A API do SISREG retornou uma resposta inesperada." }, { status: 502 });
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    return NextResponse.json({ error: "A API do SISREG retornou uma resposta inválida." }, { status: 502 });
  }
  if (!isRecord(payload) || !isRecord(payload.dado) || !readText(payload.dado.nome)) {
    return NextResponse.json({ error: "Nenhum paciente foi localizado para esse CPF/CNS." }, { status: 404 });
  }

  const patient = normalizePatient(payload.dado);
  return NextResponse.json(
    { nome: patient.paciente, data: patient },
    { headers: { "Cache-Control": "private, no-store, max-age=0" } },
  );
}
