// src/components/AnalysisTab.jsx
import { useState } from "react";
import { C, MUSCLE_GROUPS, TRAIN_TYPES, PERIODIZATION_TIPS } from "../data/constants";
import { getAdjustedLandmarks, classifyVolume } from "../data/volumeLandmarks";
import { ALL_EXERCISES } from "../data/exercises";
import {
  daysAgo, sessionsInRange, weeklySetsByMuscle,
  totalVolume, deltaPct, topExercisesTrends, weeksAsMainExercise,
} from "../data/analyticsHelpers";

const ZONE_CONFIG = {
  below_mev: { color: "#f44336", icon: "🔴", label: "Abaixo do MEV" },
  below_mav: { color: "#ff9800", icon: "🟡", label: "Abaixo do ótimo" },
  in_mav:    { color: "#4caf50", icon: "🟢", label: "Dentro do MAV ✓" },
  above_mrv: { color: "#f44336", icon: "🔴", label: "Acima do MRV" },
};

const TREND_CONFIG = {
  progressing: { icon: "📈", color: "#4caf50", label: "Progredindo bem" },
  slow:        { icon: "➡️", color: "#ff9800", label: "Progressão lenta" },
  stagnant:    { icon: "⚠️", color: "#f44336", label: "Estagnado" },
  regressing:  { icon: "📉", color: "#f44336", label: "Regressão" },
};

// Conceitos científicos exibidos no ℹ️ de cada recomendação
const CONCEPTS = {
  mev: {
    title: "MEV — Volume Mínimo Efetivo",
    body: "Mínimo de séries semanais por grupamento para gerar adaptação. Abaixo do MEV, o treino mantém mas não progride.",
    source: "RP Strength / Mike Israetel — Training Volume Landmarks for Muscle Growth",
  },
  mav: {
    title: "MAV — Volume Máximo Adaptativo",
    body: "Faixa ótima de séries semanais onde o estímulo gera crescimento e a recuperação ainda acontece completamente.",
    source: "Schoenfeld et al. (2017) — Journal of Sports Sciences",
  },
  mrv: {
    title: "MRV — Volume Máximo Recuperável",
    body: "Teto de séries semanais. Acima do MRV: queda de performance, risco de lesão, overtraining.",
    source: "Kreher & Schwartz (2012) — Sports Health",
  },
  progression: {
    title: "Sobrecarga Progressiva",
    body: "Para naturais, progressão de carga saudável: 5–10% por mesociclo (4–6 semanas). Menos de 1% em 4 semanas indica estagnação.",
    source: "Haff & Triplett (2015) — NSCA; Caio Bottura; Fabrício Pacholok",
  },
  periodization: {
    title: "Variação de Exercício e Periodização",
    body: "Após 8–12 sessões com os mesmos exercícios principais, o organismo se adapta ao padrão de movimento. Trocar 1–2 exercícios renova o estímulo sem abandonar o que funciona.",
    source: "Fonseca et al. (2014) — Journal of Strength and Conditioning Research; Fabrício Pacholok",
  },
};

function ConceptModal({ concept, onClose }) {
  if (!concept) return null;
  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "flex-end", zIndex: 1000 }}
      onClick={onClose}
    >
      <div
        style={{ background: C.surface, borderRadius: "16px 16px 0 0", padding: 24, width: "100%", maxWidth: 480, margin: "0 auto", boxSizing: "border-box" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ fontWeight: 700, fontSize: 16, color: C.text, marginBottom: 8 }}>{concept.title}</div>
        <div style={{ fontSize: 13, color: C.sub, lineHeight: 1.6, marginBottom: 12 }}>{concept.body}</div>
        <div style={{ fontSize: 11, color: C.accent }}>📚 {concept.source}</div>
        <button
          onClick={onClose}
          style={{ marginTop: 16, width: "100%", padding: 12, borderRadius: 10, border: "none", background: C.surfaceHigh, color: C.text, cursor: "pointer", fontSize: 14 }}
        >
          Fechar
        </button>
      </div>
    </div>
  );
}

export function AnalysisTab({ sessions, profileConfig }) {
  const [period, setPeriod] = useState(30);
  const [selTT, setSelTT] = useState("A");
  const [activeConcept, setActiveConcept] = useState(null);
  const [compareMode, setCompareMode] = useState("week");
  const [snoozed, setSnoozed] = useState(() => {
    try { return JSON.parse(localStorage.getItem("ironlog_snoozed") || "{}"); } catch { return {}; }
  });

  const today = new Date().toISOString().slice(0, 10);

  const snoozeKey = (name, tt) => `${name}__${tt}`;
  const isSnoozed = (name, tt) => {
    const until = snoozed[snoozeKey(name, tt)];
    return until ? today <= until : false;
  };
  const snoozeUntil = (name, tt) => {
    const until = new Date();
    until.setDate(until.getDate() + 14);
    const updated = { ...snoozed, [snoozeKey(name, tt)]: until.toISOString().slice(0, 10) };
    setSnoozed(updated);
    localStorage.setItem("ironlog_snoozed", JSON.stringify(updated));
  };

  // Period ranges
  const currentStart = daysAgo(period);
  const currentSessions = sessionsInRange(sessions, currentStart, today);

  // Week vs week
  const thisWeekSessions = sessionsInRange(sessions, daysAgo(7), today);
  const lastWeekSessions = sessionsInRange(sessions, daysAgo(14), daysAgo(8));

  // Month vs month
  const now = new Date();
  const thisMonthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthPrefix = `${lastMonthDate.getFullYear()}-${String(lastMonthDate.getMonth() + 1).padStart(2, "0")}`;
  const thisMonthSessions = sessions.filter((s) => s.date.startsWith(thisMonthPrefix));
  const lastMonthSessions = sessions.filter((s) => s.date.startsWith(lastMonthPrefix));

  const compareSessions = compareMode === "week" ? thisWeekSessions : thisMonthSessions;
  const comparePrevSessions = compareMode === "week" ? lastWeekSessions : lastMonthSessions;

  const currentSets = {};
  compareSessions.forEach((s) => s.exercises.forEach((e) => { currentSets[e.category] = (currentSets[e.category] || 0) + e.sets.length; }));
  const prevSets = {};
  comparePrevSessions.forEach((s) => s.exercises.forEach((e) => { prevSets[e.category] = (prevSets[e.category] || 0) + e.sets.length; }));

  const currentVol = totalVolume(compareSessions);
  const prevVol = totalVolume(comparePrevSessions);
  const volDelta = deltaPct(currentVol, prevVol);

  const periodSets = weeklySetsByMuscle(currentSessions);
  const trends = topExercisesTrends(sessions, 8);

  // Recommendations
  const recommendations = [];
  MUSCLE_GROUPS.forEach((m) => {
    const sets = periodSets[m.key] || 0;
    const weeklySets = Math.round(sets / (period / 7));
    const zone = classifyVolume(weeklySets, m.key, profileConfig);
    const landmarks = getAdjustedLandmarks(m.key, profileConfig);
    if (!landmarks) return;
    const isFocal = (profileConfig?.focalGroups || []).includes(m.key);

    if (zone === "below_mev" && weeklySets > 0) {
      recommendations.push({ muscle: m.label, icon: "🔴", text: `${m.label} em ${weeklySets} séries/sem — abaixo do MEV (${landmarks.mev}). Adicione 1 série no próximo treino.`, conceptKey: "mev", isFocal });
    }
    if (zone === "above_mrv") {
      recommendations.push({ muscle: m.label, icon: "🔴", text: `${m.label} em ${weeklySets} séries/sem — acima do MRV (${landmarks.mrv}). Reduza volume para evitar overtraining.`, conceptKey: "mrv", isFocal });
    }
    if (zone === "in_mav" && isFocal) {
      recommendations.push({ muscle: m.label, icon: "🟢", text: `[Grupo focal] ${m.label} dentro do MAV (${landmarks.mavMin}–${landmarks.mavMax} séries/sem). Bom ritmo.`, conceptKey: "mav", isFocal });
    }
  });

  trends.filter((t) => t.trend === "stagnant" || t.trend === "regressing").slice(0, 3).forEach((t) => {
    recommendations.push({
      muscle: t.name, icon: t.trend === "stagnant" ? "⚠️" : "📉",
      text: `${t.name}: ${t.trend === "stagnant" ? "sem progressão" : "carga regredindo"} nas últimas 8 semanas (${t.pctChange > 0 ? "+" : ""}${t.pctChange}%). Considere trocar variação ou ajustar rep range.`,
      conceptKey: "progression", isFocal: false,
    });
  });

  recommendations.sort((a, b) => (b.isFocal ? 1 : 0) - (a.isFocal ? 1 : 0));

  // Periodization suggestions
  const periodizationSuggestions = [];
  Object.keys(TRAIN_TYPES).forEach((trainType) => {
    const typeSessions = sessions.filter((s) => (s.trainType || "") === trainType);
    if (typeSessions.length < 3) return;
    const mainExFreq = {};
    typeSessions.forEach((s) => [0, 1].forEach((idx) => {
      const ex = s.exercises[idx];
      if (ex) mainExFreq[ex.name] = (mainExFreq[ex.name] || 0) + 1;
    }));
    Object.keys(mainExFreq).forEach((exName) => {
      if (isSnoozed(exName, trainType)) return;
      const count = weeksAsMainExercise(exName, trainType, sessions);
      if (count >= 8) {
        const exData = ALL_EXERCISES.find((e) => e.name === exName);
        periodizationSuggestions.push({ exName, trainType, count, suggestions: exData?.alts?.slice(0, 3) || [] });
      }
    });
  });

  const ttCount = {};
  currentSessions.forEach((s) => { const tt = s.trainType || "?"; ttCount[tt] = (ttCount[tt] || 0) + 1; });

  const musclesWithData = MUSCLE_GROUPS.filter((m) => (currentSets[m.key] || 0) + (prevSets[m.key] || 0) > 0);

  return (
    <div style={{ paddingBottom: 80 }}>
      <ConceptModal concept={activeConcept ? CONCEPTS[activeConcept] : null} onClose={() => setActiveConcept(null)} />

      {/* Período */}
      <div style={{ padding: "16px 16px 0" }}>
        <div style={{ fontSize: 11, color: C.sub, marginBottom: 8, fontWeight: 700, letterSpacing: ".8px", textTransform: "uppercase" }}>⏱ Período de análise</div>
        <div style={{ display: "flex", gap: 8 }}>
          {[7, 14, 30, 60, 90].map((d) => (
            <button key={d} onClick={() => setPeriod(d)} style={{
              flex: 1, padding: "8px 4px", borderRadius: 8,
              border: `1px solid ${period === d ? C.accent : C.border}`,
              background: period === d ? C.accentD : C.surface,
              color: period === d ? C.accent : C.sub, fontSize: 12, cursor: "pointer",
            }}>{d}d</button>
          ))}
        </div>
      </div>

      {/* BLOCO 1 — Volume por grupamento com MEV/MAV/MRV */}
      <div style={{ padding: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 12 }}>
          💪 Volume semanal por grupamento
          <button onClick={() => setActiveConcept("mev")} style={{ marginLeft: 8, background: "none", border: "none", color: C.accent, cursor: "pointer", fontSize: 13 }}>ℹ️</button>
        </div>
        {MUSCLE_GROUPS.filter((m) => ["Peito","Costas","Ombros","Bíceps","Tríceps","Quadríceps","Posterior de Coxa","Glúteos","Panturrilha","Core / Abdômen"].includes(m.key)).map((m) => {
          const sets = periodSets[m.key] || 0;
          const weeklySets = Math.round(sets / (period / 7));
          const zone = classifyVolume(weeklySets, m.key, profileConfig);
          const landmarks = getAdjustedLandmarks(m.key, profileConfig);
          const zc = ZONE_CONFIG[zone];
          const isFocal = (profileConfig?.focalGroups || []).includes(m.key);
          const mavMax = landmarks?.mavMax || 1;
          const barPct = Math.min((weeklySets / mavMax) * 100, 130);
          return (
            <div key={m.key} style={{ marginBottom: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  {isFocal && <span style={{ fontSize: 10, background: `${C.accent}33`, color: C.accent, borderRadius: 4, padding: "1px 5px" }}>FOCO</span>}
                  <span style={{ fontSize: 13, color: C.text }}>{m.label}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 11, color: zc.color }}>{zc.icon} {weeklySets}s/sem</span>
                  {landmarks && <span style={{ fontSize: 10, color: C.sub }}>MEV {landmarks.mev} · {landmarks.mavMin}–{landmarks.mavMax} · MRV {landmarks.mrv}</span>}
                </div>
              </div>
              <div style={{ height: 6, background: C.surfaceHigh, borderRadius: 3, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${barPct}%`, background: zc.color, borderRadius: 3, transition: "width 0.3s" }} />
              </div>
            </div>
          );
        })}
      </div>

      {/* BLOCO 2 — Comparativo semana vs semana / mês vs mês */}
      <div style={{ padding: "0 16px 16px" }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 12 }}>📊 Comparativo de volume</div>
        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          {["week", "month"].map((mode) => (
            <button key={mode} onClick={() => setCompareMode(mode)} style={{
              flex: 1, padding: 8, borderRadius: 8,
              border: `1px solid ${compareMode === mode ? C.accent : C.border}`,
              background: compareMode === mode ? C.accentD : C.surface,
              color: compareMode === mode ? C.accent : C.sub, fontSize: 12, cursor: "pointer",
            }}>{mode === "week" ? "Semana vs. semana" : "Mês vs. mês"}</button>
          ))}
        </div>
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 14, marginBottom: 10 }}>
          <div style={{ fontSize: 11, color: C.sub, marginBottom: 4 }}>Volume total (tonelagem)</div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <div>
              <span style={{ fontSize: 22, fontWeight: 800, color: C.text }}>{(currentVol / 1000).toFixed(1)}t</span>
              <span style={{ fontSize: 11, color: C.sub, marginLeft: 6 }}>{compareMode === "week" ? "esta semana" : "este mês"}</span>
            </div>
            {volDelta !== null && (
              <span style={{ fontSize: 13, color: volDelta >= 0 ? "#4caf50" : "#f44336", fontWeight: 700 }}>
                {volDelta >= 0 ? "+" : ""}{volDelta.toFixed(1)}%
              </span>
            )}
          </div>
          {prevVol > 0 && <div style={{ fontSize: 11, color: C.sub, marginTop: 4 }}>vs. {(prevVol / 1000).toFixed(1)}t {compareMode === "week" ? "semana passada" : "mês passado"}</div>}
        </div>
        {musclesWithData.map((m) => {
          const curr = currentSets[m.key] || 0, prev = prevSets[m.key] || 0;
          const delta = deltaPct(curr, prev);
          return (
            <div key={m.key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0", borderBottom: `1px solid ${C.border}` }}>
              <span style={{ fontSize: 13, color: C.text }}>{m.label}</span>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontSize: 11, color: C.sub }}>{prev}s →</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{curr}s</span>
                {delta !== null && <span style={{ fontSize: 11, color: delta >= 0 ? "#4caf50" : "#f44336" }}>{delta >= 0 ? "+" : ""}{delta.toFixed(0)}%</span>}
              </div>
            </div>
          );
        })}
      </div>

      {/* BLOCO 3 — Tendência de progressão */}
      <div style={{ padding: "0 16px 16px" }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 4 }}>
          🏋️ Progressão de carga
          <button onClick={() => setActiveConcept("progression")} style={{ marginLeft: 8, background: "none", border: "none", color: C.accent, cursor: "pointer", fontSize: 13 }}>ℹ️</button>
        </div>
        <div style={{ fontSize: 11, color: C.sub, marginBottom: 12 }}>Top 8 exercícios mais frequentes · últimas 8 semanas</div>
        {trends.map((t) => {
          const tc = TREND_CONFIG[t.trend];
          return (
            <div key={t.name} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0", borderBottom: `1px solid ${C.border}` }}>
              <span style={{ fontSize: 13, color: C.text, flex: 1 }}>{t.name}</span>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 11, color: tc.color }}>{tc.icon} {t.pctChange > 0 ? "+" : ""}{t.pctChange}%</span>
                <span style={{ fontSize: 10, color: C.sub }}>{tc.label}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* BLOCO 4 — Recomendações */}
      {recommendations.length > 0 && (
        <div style={{ padding: "0 16px 16px" }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 12 }}>🎯 Recomendações</div>
          {recommendations.map((r, i) => (
            <div key={i} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 14, marginBottom: 10, borderLeft: `3px solid ${r.icon === "🟢" ? "#4caf50" : r.icon === "🔴" ? "#f44336" : "#ff9800"}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div style={{ fontSize: 13, color: C.text, flex: 1, lineHeight: 1.5 }}>{r.icon} {r.text}</div>
                <button onClick={() => setActiveConcept(r.conceptKey)} style={{ background: "none", border: "none", color: C.accent, cursor: "pointer", fontSize: 14, paddingLeft: 8, flexShrink: 0 }}>ℹ️</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* BLOCO 5 — Sugestões de periodização */}
      {periodizationSuggestions.length > 0 && (
        <div style={{ padding: "0 16px 16px" }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 4 }}>
            🔄 Hora de variar?
            <button onClick={() => setActiveConcept("periodization")} style={{ marginLeft: 8, background: "none", border: "none", color: C.accent, cursor: "pointer", fontSize: 13 }}>ℹ️</button>
          </div>
          <div style={{ fontSize: 11, color: C.sub, marginBottom: 12 }}>Exercícios principais há 8+ sessões — considere alternar para novo estímulo</div>
          {periodizationSuggestions.map((p, i) => (
            <div key={i} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 14, marginBottom: 10 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 4 }}>
                {p.exName}
                <span style={{ fontSize: 11, color: C.sub, marginLeft: 8 }}>{TRAIN_TYPES[p.trainType]?.emoji} Treino {p.trainType} · {p.count} sessões</span>
              </div>
              {p.suggestions.length > 0 && (
                <div style={{ fontSize: 12, color: C.sub, marginBottom: 10 }}>
                  Alternativas: <strong style={{ color: C.text }}>{p.suggestions.join(", ")}</strong>
                </div>
              )}
              <button onClick={() => snoozeUntil(p.exName, p.trainType)} style={{ padding: "6px 12px", borderRadius: 8, border: `1px solid ${C.border}`, background: "transparent", color: C.sub, fontSize: 11, cursor: "pointer" }}>
                Ignorar por 2 semanas
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Distribuição ABCDE */}
      <div style={{ padding: "0 16px 16px" }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 12 }}>🔄 Distribuição ABCDE</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {Object.entries(TRAIN_TYPES).map(([k, v]) => (
            <div key={k} style={{ background: C.surface, border: `1px solid ${v.color}55`, borderRadius: 10, padding: "10px 14px", textAlign: "center", minWidth: 56 }}>
              <div style={{ fontSize: 18 }}>{v.emoji}</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: v.color }}>{ttCount[k] || 0}</div>
              <div style={{ fontSize: 10, color: C.sub }}>{k}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Periodização Pacholok */}
      <div style={{ padding: "0 16px 16px" }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 12 }}>📚 Periodização — Fabrício Pacholok</div>
        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          {["A","B","C","D","E"].map((t) => (
            <button key={t} onClick={() => setSelTT(t)} style={{
              flex: 1, padding: "8px 4px", borderRadius: 8,
              border: `1px solid ${selTT === t ? TRAIN_TYPES[t].color : C.border}`,
              background: selTT === t ? `${TRAIN_TYPES[t].color}22` : C.surface,
              color: selTT === t ? TRAIN_TYPES[t].color : C.sub, fontSize: 12, cursor: "pointer",
            }}>{TRAIN_TYPES[t].emoji}{t}</button>
          ))}
        </div>
        {PERIODIZATION_TIPS[selTT].map((tip, i) => (
          <div key={i} style={{ background: C.surfaceHigh, border: `1px solid ${C.border}`, borderRadius: 10, padding: 12, marginBottom: 8 }}>
            <div style={{ fontSize: 11, color: C.accent, fontWeight: 700, marginBottom: 4 }}>{tip.phase}</div>
            <div style={{ fontSize: 12, color: C.text, lineHeight: 1.6 }}>{tip.tip}</div>
          </div>
        ))}
        <div style={{ background: "rgba(245,166,35,.06)", border: "1px solid rgba(245,166,35,.2)", borderRadius: 10, padding: 12, fontSize: 12, color: C.sub, lineHeight: 1.6, marginTop: 12 }}>
          💡 Periodização ondulatória: Acumulação → Intensificação → Realização. Cada bloco de 4 semanas tem objetivo distinto. Baseado nos princípios de Fabrício Pacholok para hipertrofia avançada.
        </div>
      </div>
    </div>
  );
}
