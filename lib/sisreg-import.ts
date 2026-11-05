import type { SharedDocumentData } from "@/components/document-session-provider";

/**
 * Importação manual de dados do paciente a partir da tela "CONSULTA AO CADASTRO DE
 * PACIENTES SUS" do SISREG III, usando a própria sessão do usuário no navegador.
 * Nada é enviado a um servidor: o usuário copia os dados com o favorito (bookmarklet)
 * abaixo, enquanto está logado no SISREG com a própria credencial, e cola no app.
 */

const PLACEHOLDER = /^-+$/;

function clean(value: unknown): string {
  const text = String(value ?? "").trim();
  return PLACEHOLDER.test(text) ? "" : text;
}

function toIsoDate(brDate: string): string {
  const match = brDate.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (!match) return "";
  const [, day, month, year] = match;
  return `${year}-${month}-${day}`;
}

function normalizeSexo(text: string): string {
  const value = clean(text).toUpperCase();
  if (value.startsWith("M")) return "M";
  if (value.startsWith("F")) return "F";
  if (value) return "I";
  return "";
}

function splitMunicipioUf(text: string): { municipio: string; uf: string } {
  const match = clean(text).match(/^(.*?)\s*-\s*([A-Z]{2})$/);
  if (match) return { municipio: match[1].trim(), uf: match[2] };
  return { municipio: clean(text), uf: "" };
}

export type SisregImportResult = {
  nome: string;
  data: Partial<SharedDocumentData>;
};

/** Converte o JSON copiado pelo favorito do SISREG em campos do formulário. */
export function parseSisregPayload(raw: string): SisregImportResult | null {
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(raw.trim());
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== "object") return null;

  const nome = clean(parsed.nome);
  if (!nome) return null;

  const { municipio, uf } = splitMunicipioUf(String(parsed.municipioResidencia ?? ""));
  const rua = [clean(parsed.tipoLogradouro), clean(parsed.logradouro)].filter(Boolean).join(" ");

  const data: Partial<SharedDocumentData> = {
    paciente: nome,
    nascimento: toIsoDate(String(parsed.nascimento ?? "")),
    cns: clean(parsed.cns).replace(/\D/g, ""),
    sexo: normalizeSexo(String(parsed.sexo ?? "")),
    nomeMae: clean(parsed.nomeMae),
    telefone: clean(parsed.telefone),
    ruaPaciente: rua,
    numeroEnderecoPaciente: clean(parsed.numero),
    complementoEnderecoPaciente: clean(parsed.complemento),
    bairroPaciente: clean(parsed.bairro),
    municipioResidencia: municipio,
    uf,
    cep: clean(parsed.cep),
  };

  for (const key of Object.keys(data) as (keyof SharedDocumentData)[]) {
    if (data[key] === undefined || data[key] === "") delete data[key];
  }

  return { nome, data };
}

/**
 * Código do favorito (bookmarklet). Roda na página do SISREG, acha a tela de
 * resultado da consulta ao CNS (mesmo dentro de iframes), monta um JSON com os
 * dados e copia para a área de transferência.
 */
export const SISREG_BOOKMARKLET_SOURCE = `(function(){
  function findResultDoc(win){
    try {
      var doc = win.document;
      var found = Array.prototype.slice.call(doc.querySelectorAll("*")).some(function (el) {
        return el.children.length === 0 && /CONSULTA AO CADASTRO/i.test(el.textContent || "");
      });
      if (found) return doc;
    } catch (e) {}
    for (var i = 0; i < win.frames.length; i++) {
      var inner = findResultDoc(win.frames[i]);
      if (inner) return inner;
    }
    return null;
  }
  var doc = findResultDoc(window);
  if (!doc) {
    alert("Não encontrei a tela de resultado da consulta ao CNS. Pesquise um paciente no SISREG primeiro.");
    return;
  }
  function textOf(el) {
    return (el.textContent || "").replace(/\\s+/g, " ").trim();
  }
  var table = doc.querySelector("table");
  if (!table) {
    alert("Tabela de resultado não encontrada.");
    return;
  }
  var rows = Array.prototype.slice.call(table.children[0] ? table.children[0].children : table.children);
  var pairs = {};
  for (var i = 0; i < rows.length; i++) {
    var cells = Array.prototype.slice.call(rows[i].children).filter(function (c) {
      return c.tagName === "TD" || c.tagName === "TH";
    });
    if (!cells.length) continue;
    var labels = cells.map(textOf);
    var isLabelRow = labels.length > 0 && labels.every(function (l) { return l === "" || /:$/.test(l); });
    if (isLabelRow && rows[i + 1]) {
      var nextCells = Array.prototype.slice.call(rows[i + 1].children).filter(function (c) {
        return c.tagName === "TD" || c.tagName === "TH";
      });
      for (var j = 0; j < cells.length; j++) {
        if (!labels[j]) continue;
        pairs[labels[j]] = nextCells[j] ? textOf(nextCells[j]) : "";
      }
    }
  }
  function get(label) { return pairs[label] || ""; }
  var allText = textOf(table);
  var phoneMatch = allText.match(/\\((\\d{2})\\)\\s*(\\d{4,5}-\\d{4})/);
  var data = {
    cns: get("CNS:").replace(/\\D/g, ""),
    nome: get("Nome:"),
    nomeMae: get("Nome da Mãe:"),
    sexo: get("Sexo:"),
    nascimento: get("Data de Nascimento:"),
    municipioResidencia: get("Município de Residência:"),
    tipoLogradouro: get("Tipo Logradouro:"),
    logradouro: get("Logradouro:"),
    complemento: get("Complemento:"),
    numero: get("Número:"),
    bairro: get("Bairro:"),
    cep: get("CEP:"),
    telefone: phoneMatch ? "(" + phoneMatch[1] + ") " + phoneMatch[2] : ""
  };
  var json = JSON.stringify(data);
  var copied = false;
  try {
    var ta = doc.createElement("textarea");
    ta.value = json;
    ta.style.position = "fixed";
    ta.style.left = "-9999px";
    doc.body.appendChild(ta);
    ta.focus();
    ta.select();
    copied = doc.execCommand("copy");
    doc.body.removeChild(ta);
  } catch (e) {}
  if (copied) {
    alert("Dados copiados! Volte ao DOMEULOP, clique em \\"Importar do SISREG\\", cole no campo de texto e clique em \\"Aplicar dados\\".");
  } else {
    prompt("Copie o texto abaixo (Ctrl+C) e cole no DOMEULOP:", json);
  }
})();`;

export const SISREG_BOOKMARKLET_HREF = `javascript:${encodeURIComponent(SISREG_BOOKMARKLET_SOURCE)}`;
