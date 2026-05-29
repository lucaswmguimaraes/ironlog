// src/components/ProfileSettings.jsx
import { useState } from "react";
import { C, MUSCLE_GROUPS } from "../data/constants";

export function ProfileSettings({ profileId, profileName, currentConfig, currentPAT, onSave, onSavePAT, onBack }) {
  const [config, setConfig] = useState({ ...currentConfig });
  const [patValue, setPatValue] = useState("");
  const [patSection, setPatSection] = useState(false);
  const [importError, setImportError] = useState(null);

  const set = (key, value) => setConfig((p) => ({ ...p, [key]: value }));

  const toggleFocal = (g) => {
    set("focalGroups", config.focalGroups.includes(g)
      ? config.focalGroups.filter((x) => x !== g)
      : config.focalGroups.length < 3 ? [...config.focalGroups, g] : config.focalGroups
    );
  };

  const muscleOptions = MUSCLE_GROUPS
    .filter((m) => !["Antebraço", "Escapular / Mobilidade", "Adutores / Abdutores", "Trapézio"].includes(m.key))
    .map((m) => m.key);

  const handleExport = () => {
    if (typeof window.__ironlog_export === "function") {
      const sessions = window.__ironlog_export();
      const blob = new Blob([JSON.stringify(sessions, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `ironlog-${profileId}-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const handleImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        if (!Array.isArray(data)) throw new Error("Formato inválido");
        if (typeof window.__ironlog_import === "function") window.__ironlog_import(data);
        setImportError(null);
        alert(`${data.length} treinos importados com sucesso!`);
      } catch {
        setImportError("Arquivo inválido. Certifique-se de que é um backup do IronLog.");
      }
    };
    reader.readAsText(file);
  };

  return (
    <div style={{ padding: "0 16px 80px", maxWidth: 480, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "16px 0" }}>
        <button onClick={onBack} style={{ background: "none", border: "none", color: C.sub, fontSize: 20, cursor: "pointer" }}>←</button>
        <div style={{ fontSize: 16, fontWeight: 700, color: C.text }}>Configurações — {profileName}</div>
      </div>

      {/* Nível */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 12, color: C.sub, marginBottom: 8 }}>Nível de experiência</div>
        {[["beginner","Iniciante","< 1 ano"],["intermediate","Intermediário","1–3 anos"],["advanced","Avançado","> 3 anos"]].map(([value, label, desc]) => (
          <button key={value} onClick={() => set("experienceLevel", value)} style={{
            width: "100%", padding: "12px 14px", borderRadius: 10, marginBottom: 8, textAlign: "left",
            border: `1px solid ${config.experienceLevel === value ? C.accent : C.border}`,
            background: config.experienceLevel === value ? C.accentD : C.surface,
            color: config.experienceLevel === value ? C.accent : C.text, cursor: "pointer",
          }}>
            <span style={{ fontWeight: 700 }}>{label}</span>
            <span style={{ fontSize: 11, color: C.sub, marginLeft: 8 }}>{desc}</span>
          </button>
        ))}
      </div>

      {/* Sexo */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 12, color: C.sub, marginBottom: 8 }}>Sexo biológico</div>
        <div style={{ display: "flex", gap: 8 }}>
          {[["male","Masculino"],["female","Feminino"]].map(([value, label]) => (
            <button key={value} onClick={() => set("sex", value)} style={{
              flex: 1, padding: 12, borderRadius: 10,
              border: `1px solid ${config.sex === value ? C.accent : C.border}`,
              background: config.sex === value ? C.accentD : C.surface,
              color: config.sex === value ? C.accent : C.text, cursor: "pointer",
            }}>{label}</button>
          ))}
        </div>
      </div>

      {/* Objetivo */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 12, color: C.sub, marginBottom: 8 }}>Objetivo principal</div>
        {[["hypertrophy","Hipertrofia"],["strength","Força"],["maintenance","Manutenção"]].map(([value, label]) => (
          <button key={value} onClick={() => set("goal", value)} style={{
            width: "100%", padding: 12, borderRadius: 10, marginBottom: 8, textAlign: "left",
            border: `1px solid ${config.goal === value ? C.accent : C.border}`,
            background: config.goal === value ? C.accentD : C.surface,
            color: config.goal === value ? C.accent : C.text, cursor: "pointer",
          }}>{label}</button>
        ))}
      </div>

      {/* Dias */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 12, color: C.sub, marginBottom: 8 }}>Dias de treino por semana</div>
        <div style={{ display: "flex", gap: 8 }}>
          {[3,4,5,6].map((d) => (
            <button key={d} onClick={() => set("trainingDaysPerWeek", d)} style={{
              flex: 1, padding: 14, borderRadius: 10, fontSize: 18, fontWeight: 800,
              border: `1px solid ${config.trainingDaysPerWeek === d ? C.accent : C.border}`,
              background: config.trainingDaysPerWeek === d ? C.accentD : C.surface,
              color: config.trainingDaysPerWeek === d ? C.accent : C.text, cursor: "pointer",
            }}>{d}x</button>
          ))}
        </div>
      </div>

      {/* Grupos focais */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 12, color: C.sub, marginBottom: 8 }}>Grupos focais (até 3)</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {muscleOptions.map((g) => {
            const sel = config.focalGroups.includes(g);
            return (
              <button key={g} onClick={() => toggleFocal(g)} style={{
                padding: "8px 14px", borderRadius: 20, fontSize: 13,
                border: `1px solid ${sel ? C.accent : C.border}`,
                background: sel ? C.accentD : C.surface,
                color: sel ? C.accent : C.text, cursor: "pointer",
              }}>{g}</button>
            );
          })}
        </div>
      </div>

      {/* Salvar */}
      <button onClick={() => onSave(config)} style={{
        width: "100%", padding: 14, borderRadius: 10, border: "none",
        background: C.accent, color: "#000", fontWeight: 700, fontSize: 15, cursor: "pointer", marginBottom: 20,
      }}>
        Salvar configurações
      </button>

      {/* GitHub PAT */}
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 16, marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 8 }}>🔐 Backup GitHub</div>
        <div style={{ fontSize: 12, color: C.sub, marginBottom: 12 }}>
          {currentPAT ? "✅ Token configurado — backup automático ativo" : "⚠️ Sem token — dados ficam só no navegador"}
        </div>
        {!patSection ? (
          <button onClick={() => setPatSection(true)} style={{
            width: "100%", padding: 10, borderRadius: 8, border: `1px solid ${C.border}`,
            background: "transparent", color: C.sub, fontSize: 12, cursor: "pointer",
          }}>{currentPAT ? "Trocar token" : "Configurar token"}</button>
        ) : (
          <>
            <input type="password" placeholder="ghp_..." value={patValue} onChange={(e) => setPatValue(e.target.value)} style={{
              width: "100%", padding: "10px 12px", borderRadius: 8, boxSizing: "border-box",
              background: C.surfaceHigh, border: `1px solid ${C.border}`, color: C.text, fontSize: 13, marginBottom: 8, outline: "none",
            }}/>
            <button onClick={() => { onSavePAT(patValue.trim()); setPatSection(false); setPatValue(""); }}
              disabled={patValue.trim().length < 10} style={{
              width: "100%", padding: 10, borderRadius: 8, border: "none",
              background: patValue.trim().length >= 10 ? C.accent : C.surfaceHigh,
              color: "#000", fontWeight: 700, cursor: "pointer", fontSize: 13,
            }}>Salvar token</button>
          </>
        )}
      </div>

      {/* Export/Import */}
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 16, marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 8 }}>💾 Backup manual</div>
        <button onClick={handleExport} style={{
          width: "100%", padding: 10, borderRadius: 8, marginBottom: 8,
          border: `1px solid ${C.border}`, background: "transparent", color: C.text, fontSize: 12, cursor: "pointer",
        }}>⬇️ Exportar JSON (download)</button>
        <label style={{
          display: "block", width: "100%", padding: 10, borderRadius: 8, boxSizing: "border-box",
          border: `1px solid ${C.border}`, background: "transparent", color: C.sub, fontSize: 12, cursor: "pointer", textAlign: "center",
        }}>
          ⬆️ Importar JSON (restaurar backup)
          <input type="file" accept=".json" style={{ display: "none" }} onChange={handleImport}/>
        </label>
        {importError && <div style={{ color: C.error, fontSize: 12, marginTop: 8 }}>{importError}</div>}
      </div>

      {/* Log de sincronização */}
      <SyncLog profileId={profileId} />
    </div>
  );
}

function SyncLog({ profileId }) {
  const [logs, setLogs] = useState([]);
  const [open, setOpen] = useState(false);

  const refresh = () => {
    try {
      const raw = localStorage.getItem("ironlog_sync_log") || "[]";
      setLogs(JSON.parse(raw));
    } catch { setLogs([]); }
  };

  const clear = () => {
    localStorage.removeItem("ironlog_sync_log");
    setLogs([]);
  };

  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 16, marginBottom: 40 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>🔍 Log de sincronização</div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => { refresh(); setOpen(true); }} style={{ fontSize: 11, color: C.accent, background: "none", border: `1px solid ${C.accent}44`, borderRadius: 6, padding: "4px 10px", cursor: "pointer" }}>Ver</button>
          <button onClick={clear} style={{ fontSize: 11, color: C.sub, background: "none", border: `1px solid ${C.border}`, borderRadius: 6, padding: "4px 10px", cursor: "pointer" }}>Limpar</button>
        </div>
      </div>
      <div style={{ fontSize: 11, color: C.sub }}>Registra cada save/load com hora e quantidade de treinos</div>
      {open && (
        <div style={{ marginTop: 12, maxHeight: 300, overflowY: "auto" }}>
          {logs.length === 0
            ? <div style={{ fontSize: 11, color: C.sub }}>Nenhum registro ainda.</div>
            : logs.map((l, i) => (
              <div key={i} style={{ fontSize: 11, color: l.includes("ERRO") || l.includes("exception") ? "#ff5555" : l.includes("ok") ? "#2ecc71" : C.sub, padding: "3px 0", borderBottom: `1px solid ${C.border}`, fontFamily: "monospace" }}>
                {l}
              </div>
            ))
          }
        </div>
      )}
    </div>
  );
}
