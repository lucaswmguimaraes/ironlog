// src/components/LegacyImport.jsx
// Migração única do app antigo (arquivos data/*.json do GitHub) para a conta.
// Junta por id: não apaga nada e repetir não duplica.
import { useState } from "react";
import { C } from "../data/constants";

const RAW = "https://raw.githubusercontent.com/lucaswmguimaraes/ironlog/main/data/";

export function LegacyImport({ onImport }) {
  const [state, setState] = useState(null);
  const run = async (file, label) => {
    setState({ busy: true, text: `Buscando histórico de ${label}…` });
    try {
      const get = async (f) => { const r = await fetch(`${RAW}${f}?t=${Date.now()}`, { cache: "no-store" }); return r.ok ? r.json() : null; };
      const [sessions, meta, cardio] = await Promise.all([get(`${file}.json`), get(`${file}-meta.json`), get(`${file}-cardio.json`)]);
      if (!Array.isArray(sessions)) throw new Error("arquivo não encontrado");
      onImport({ sessions, meta, cardio: Array.isArray(cardio) ? cardio : [] });
      setState({ ok: true, text: `✅ ${sessions.length} treinos de ${label} importados${meta ? " + academias e dados corporais" : ""}. Já estão sincronizando com a sua conta.` });
    } catch (e) {
      setState({ ok: false, text: `Não foi possível importar: ${e.message}` });
    }
  };
  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 16, marginBottom: 16 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 4 }}>📦 Trazer histórico do app antigo</div>
      <div style={{ fontSize: 12, color: C.sub, marginBottom: 12, lineHeight: 1.5 }}>Para quem usava o IronLog antes das contas. Junta com o que já está aqui — não apaga nada e repetir não duplica.</div>
      <div style={{ display: "flex", gap: 8 }}>
        {[["lucas", "Lucas"], ["namorada", "Isadora"]].map(([f, l]) => (
          <button key={f} disabled={state?.busy} onClick={() => run(f, l)} style={{ flex: 1, padding: 10, borderRadius: 8, border: `1px solid ${C.accent}66`, background: C.accentD, color: C.accent, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>{l}</button>
        ))}
      </div>
      {state && <div style={{ fontSize: 12, marginTop: 10, color: state.ok === false ? C.error : state.ok ? C.success : C.sub }}>{state.text}</div>}
    </div>
  );
}
