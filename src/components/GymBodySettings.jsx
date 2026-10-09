// src/components/GymBodySettings.jsx
// Academias, dados corporais e regras de análise — sincronizados no GitHub
// (data/<perfil>-meta.json), valem em qualquer aparelho.
import { useState } from "react";
import { C, uid, UNKNOWN_GYM } from "../data/constants";
import { DEFAULT_ANALYSIS_PREFS } from "../data/progression";
import { getAdjustedLandmarks } from "../data/volumeLandmarks";

const box = { background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 16, marginBottom: 16 };
const title = { fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 8 };
const inp = { background: C.surfaceHigh, border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 10px", color: C.text, fontSize: 16, outline: "none", minWidth: 0 };
const btn = (on) => ({ padding: "6px 12px", borderRadius: 8, fontSize: 12, cursor: "pointer", border: `1px solid ${on ? C.accent : C.border}`, background: on ? C.accentD : "transparent", color: on ? C.accent : C.sub });

const LANDMARK_MUSCLES = ["Peito", "Costas", "Ombros", "Bíceps", "Tríceps", "Quadríceps", "Posterior de Coxa", "Glúteos", "Panturrilha", "Core / Abdômen"];

export function GymBodySettings({ meta, updateMeta, sessions, onAssignGym, profileConfig }) {
  const gyms = meta.gyms || [];
  const body = meta.body || {};
  const prefs = { ...DEFAULT_ANALYSIS_PREFS, ...(meta.analysis || {}) };
  const landmarks = meta.landmarks || {};
  const [newGym, setNewGym] = useState("");
  const [confirmAssign, setConfirmAssign] = useState(null);
  const [showLandmarks, setShowLandmarks] = useState(false);

  const countBy = {};
  sessions.forEach((s) => { const k = s.gymId || ""; countBy[k] = (countBy[k] || 0) + 1; });
  const unassignedIds = sessions.filter((s) => !s.gymId || !gyms.some((g) => g.id === s.gymId)).map((s) => s.id);

  const addGym = () => {
    const name = newGym.trim();
    if (!name) return;
    const g = { id: uid(), name };
    updateMeta((m) => ({ gyms: [...(m.gyms || []), g], defaultGymId: m.defaultGymId || g.id }));
    setNewGym("");
  };
  const renameGym = (id, name) => updateMeta((m) => ({ gyms: (m.gyms || []).map((g) => (g.id === id ? { ...g, name } : g)) }));
  const removeGym = (id) => updateMeta((m) => ({ gyms: (m.gyms || []).filter((g) => g.id !== id), defaultGymId: m.defaultGymId === id ? null : m.defaultGymId }));
  const setBody = (k, v) => updateMeta((m) => ({ body: { ...(m.body || {}), [k]: v === "" ? null : v } }));
  const setPref = (k, v) => updateMeta((m) => ({ analysis: { ...(m.analysis || {}), [k]: v } }));
  const setLm = (muscle, k, v) => updateMeta((m) => {
    const cur = { ...(m.landmarks || {}) };
    const base = cur[muscle] || getAdjustedLandmarks(muscle, profileConfig, {});
    cur[muscle] = { ...base, [k]: v === "" ? 0 : +v };
    return { landmarks: cur };
  });
  const resetLm = (muscle) => updateMeta((m) => { const cur = { ...(m.landmarks || {}) }; delete cur[muscle]; return { landmarks: cur }; });

  return (
    <div>
      {/* Academias */}
      <div style={box}>
        <div style={title}>🏢 Academias</div>
        <div style={{ fontSize: 12, color: C.sub, marginBottom: 12, lineHeight: 1.5 }}>
          Cada academia tem seu próprio histórico de cargas — máquinas diferentes não são comparadas entre si. A padrão já vem selecionada ao iniciar um treino.
        </div>
        {gyms.map((g) => (
          <div key={g.id} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <input style={{ ...inp, flex: 1 }} value={g.name} onChange={(e) => renameGym(g.id, e.target.value)} />
            <button style={btn(meta.defaultGymId === g.id)} onClick={() => updateMeta({ defaultGymId: g.id })}>{meta.defaultGymId === g.id ? "★ padrão" : "☆"}</button>
            {(countBy[g.id] || 0) === 0
              ? <button style={{ ...btn(false), color: C.danger }} onClick={() => removeGym(g.id)}>×</button>
              : <span style={{ fontSize: 10, color: C.sub, width: 40, textAlign: "right" }}>{countBy[g.id]} tr.</span>}
          </div>
        ))}
        <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
          <input style={{ ...inp, flex: 1 }} placeholder="Nome da academia (ex: Smart Fit Paulista)" value={newGym} onChange={(e) => setNewGym(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addGym()} />
          <button style={btn(true)} onClick={addGym}>+ Adicionar</button>
        </div>

        {gyms.length > 0 && unassignedIds.length > 0 && (
          <div style={{ marginTop: 14, paddingTop: 12, borderTop: `1px solid ${C.border}` }}>
            <div style={{ fontSize: 12, color: C.sub, marginBottom: 8 }}>
              {unassignedIds.length} treinos estão como "{UNKNOWN_GYM}". Associar só muda a academia — pesos, séries e reps continuam iguais.
            </div>
            {confirmAssign ? (
              <div style={{ fontSize: 12, color: C.text }}>
                Associar {unassignedIds.length} treinos a <strong>{gyms.find((g) => g.id === confirmAssign)?.name}</strong>?
                <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                  <button style={btn(true)} onClick={() => { onAssignGym(confirmAssign, unassignedIds); setConfirmAssign(null); }}>Confirmar</button>
                  <button style={btn(false)} onClick={() => setConfirmAssign(null)}>Cancelar</button>
                </div>
              </div>
            ) : (
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {gyms.map((g) => <button key={g.id} style={btn(false)} onClick={() => setConfirmAssign(g.id)}>→ {g.name}</button>)}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Dados corporais */}
      <div style={box}>
        <div style={title}>🧍 Dados corporais (cardio)</div>
        <div style={{ fontSize: 12, color: C.sub, marginBottom: 12 }}>Usados para estimar calorias do cardio. Ficam salvos no seu backup do GitHub.</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 10 }}>
          {[["weightKg", "Peso (kg)", "0.1"], ["heightCm", "Altura (cm)", "1"], ["birthYear", "Ano nasc.", "1"]].map(([k, l, step]) => (
            <label key={k} style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 11, color: C.sub }}>
              {l}
              <input type="number" inputMode="decimal" step={step} style={inp} value={body[k] ?? ""} onChange={(e) => setBody(k, e.target.value === "" ? "" : +e.target.value)} />
            </label>
          ))}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {[["male", "Masculino"], ["female", "Feminino"]].map(([v, l]) => {
            const cur = body.sex || profileConfig?.sex;
            return <button key={v} style={{ ...btn(cur === v), flex: 1, padding: 10 }} onClick={() => setBody("sex", v)}>{l}</button>;
          })}
        </div>
      </div>

      {/* Regras de análise */}
      <div style={box}>
        <div style={title}>📐 Regras de contagem de séries</div>
        <div style={{ fontSize: 12, color: C.sub, marginBottom: 10, lineHeight: 1.5 }}>
          Volume semanal conta só <strong>séries de trabalho</strong>. Aquecimentos marcados com "A" nunca contam.
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <span style={{ fontSize: 12, color: C.text }}>Detectar aquecimento automaticamente<br /><span style={{ fontSize: 10, color: C.sub }}>séries iniciais com carga &lt; 60% da maior do exercício</span></span>
          <button style={btn(prefs.autoWarmup)} onClick={() => setPref("autoWarmup", !prefs.autoWarmup)}>{prefs.autoWarmup ? "Ligado" : "Desligado"}</button>
        </div>
        <div style={{ fontSize: 12, color: C.text, marginBottom: 6 }}>Série indireta (ex.: puxada → bíceps) conta como:</div>
        <div style={{ display: "flex", gap: 8, marginBottom: 6 }}>
          {[[0, "Não conta"], [0.5, "½ série"], [1, "1 série"]].map(([v, l]) => (
            <button key={v} style={{ ...btn(prefs.indirectFactor === v), flex: 1 }} onClick={() => setPref("indirectFactor", v)}>{l}</button>
          ))}
        </div>
        <div style={{ fontSize: 10, color: C.sub, lineHeight: 1.5 }}>Padrão ½ — contagem fracionada (Pelland et al., 2024, meta-regressão de dose-resposta).</div>

        <button style={{ ...btn(showLandmarks), marginTop: 14, width: "100%" }} onClick={() => setShowLandmarks(!showLandmarks)}>
          {showLandmarks ? "▲" : "▼"} Ajustar referências MEV / MAV / MRV
        </button>
        {showLandmarks && (
          <div style={{ marginTop: 10 }}>
            <div style={{ fontSize: 10, color: C.sub, marginBottom: 8, lineHeight: 1.5 }}>Referências aproximadas (séries/semana). Ajuste conforme sua experiência, objetivo e recuperação. Vazio = padrão pelo seu nível.</div>
            <div style={{ display: "grid", gridTemplateColumns: "1.4fr repeat(4, 1fr) 24px", gap: 4, fontSize: 10, color: C.sub, marginBottom: 4 }}>
              <span /> <span>MEV</span><span>MAV mín</span><span>MAV máx</span><span>MRV</span><span />
            </div>
            {LANDMARK_MUSCLES.map((m) => {
              const def = getAdjustedLandmarks(m, profileConfig, {});
              const cur = landmarks[m];
              return (
                <div key={m} style={{ display: "grid", gridTemplateColumns: "1.4fr repeat(4, 1fr) 24px", gap: 4, alignItems: "center", marginBottom: 4 }}>
                  <span style={{ fontSize: 11, color: cur ? C.accent : C.text }}>{m.replace(" / Abdômen", "").replace(" de Coxa", "")}</span>
                  {["mev", "mavMin", "mavMax", "mrv"].map((k) => (
                    <input key={k} type="number" inputMode="numeric" style={{ ...inp, padding: "4px", fontSize: 14, textAlign: "center" }}
                      placeholder={String(def[k])} value={cur ? cur[k] : ""} onChange={(e) => setLm(m, k, e.target.value)} />
                  ))}
                  {cur ? <button onClick={() => resetLm(m)} style={{ background: "none", border: "none", color: C.sub, cursor: "pointer" }}>↺</button> : <span />}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
