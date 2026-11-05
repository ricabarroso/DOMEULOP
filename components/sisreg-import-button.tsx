"use client";

import { useState } from "react";
import type { SharedDocumentData } from "@/components/document-session-provider";
import { parseSisregPayload, SISREG_BOOKMARKLET_HREF } from "@/lib/sisreg-import";

type SisregImportButtonProps = {
  onImport: (data: Partial<SharedDocumentData>) => void;
};

export default function SisregImportButton({ onImport }: SisregImportButtonProps) {
  const [open, setOpen] = useState(false);
  const [pasted, setPasted] = useState("");
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  const handleApply = () => {
    const result = parseSisregPayload(pasted);
    if (!result) {
      setStatus("error");
      setMessage("Não entendi os dados colados. Use o favorito do SISREG e cole o texto copiado, sem alterar.");
      return;
    }
    onImport(result.data);
    setStatus("success");
    setMessage(`Dados de ${result.nome} aplicados ao formulário.`);
    setPasted("");
  };

  return (
    <div className="inline-block">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="rounded-lg border border-sky-300 bg-sky-50 px-3 py-2 text-sm font-medium text-sky-800 hover:bg-sky-100"
      >
        Importar do SISREG
      </button>
      {open && (
        <div className="mt-2 max-w-xl rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-700 shadow-sm">
          <p className="font-semibold text-slate-800">1. Instale o favorito (uma vez só)</p>
          <p className="mt-1">
            Arraste o link abaixo para a barra de favoritos do navegador:{" "}
            <a
              href="#sisreg-favorito"
              ref={(node) => {
                // O React bloqueia javascript: em props; definir no DOM permite arrastar o favorito.
                node?.setAttribute("href", SISREG_BOOKMARKLET_HREF);
              }}
              draggable
              onClick={(event) => event.preventDefault()}
              className="rounded border border-sky-400 bg-sky-50 px-2 py-1 font-medium text-sky-800"
            >
              SISREG → DOMEULOP
            </a>
          </p>
          <p className="mt-3 font-semibold text-slate-800">2. No SISREG, consulte o paciente pelo CNS</p>
          <p className="mt-1">
            Com a tela de resultado aberta, clique no favorito. Ele copia os dados do paciente para a área de
            transferência, sem enviá-los a nenhum servidor.
          </p>
          <p className="mt-3 font-semibold text-slate-800">3. Cole aqui</p>
          <textarea
            value={pasted}
            onChange={(event) => setPasted(event.target.value)}
            placeholder="Cole aqui o texto copiado pelo favorito"
            className="mt-1 h-20 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <div className="mt-2 flex items-center gap-3">
            <button
              type="button"
              onClick={handleApply}
              className="rounded-lg bg-sky-700 px-3 py-2 text-sm font-semibold text-white hover:bg-sky-800"
            >
              Aplicar dados
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-sm text-slate-500 hover:text-slate-700"
            >
              Fechar
            </button>
          </div>
          {status !== "idle" && (
            <p
              role="status"
              className={`mt-2 ${status === "success" ? "text-emerald-700" : "text-red-700"}`}
            >
              {message}
            </p>
          )}
          <p className="mt-3 text-xs text-slate-500">
            Use apenas com a sua própria credencial do SISREG. O CNS do paciente não é enviado ao app nem ao CNES.
          </p>
        </div>
      )}
    </div>
  );
}
