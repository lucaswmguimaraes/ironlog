# IronLog v2 — Plano 3: Analytics

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **Pré-requisito:** Plano 1 (Fundação) e Plano 2 (Exercícios) concluídos. `src/data/volumeLandmarks.js` já existe com `getAdjustedLandmarks` e `classifyVolume`.

**Goal:** Reformular a aba de Análise com 4 blocos (MEV/MAV/MRV, comparativos semana/mês, tendência de carga, cards de recomendação com referência técnica), reformular os KPIs do Home, e adicionar visualização rápida de treino ao clicar no calendário.

**Architecture:** A lógica de análise é extraída para `src/components/AnalysisTab.jsx`. Funções de cálculo puras ficam em `src/data/analyticsHelpers.js`. O `HomeTab` e `CalendarTab` são atualizados inline no App.jsx ou extraídos como componentes separados.

**Tech Stack:** React 18, cálculos puros em JS (sem biblioteca externa de charts — barras via CSS como no design atual)

---

## Mapa de arquivos

| Arquivo | Ação | Responsabilidade |
|---|---|---|
| `src/data/analyticsHelpers.js` | Criar | Funções de cálculo de volume semanal, comparativos, tendência de carga |
| `src/components/AnalysisTab.jsx` | Criar | Aba de análise reformulada (4 blocos) |
| `src/App.jsx` | Modificar | HomeTab KPIs, CalendarTab visualização rápida, importar AnalysisTab |

---

## Task 1: Criar `src/data/analyticsHelpers.js`

**Files:**
- Create: `src/data/analyticsHelpers.js`

- [ ] **Step 1.1: Criar o arquivo com todas as funções de cálculo**

```js
// src/data/analyticsHelpers.js
import { calcVolume } from "./constants";

/**
 * Retorna a data (YYYY-MM-DD) de N dias atrás a partir de hoje.
 */
export function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

/**
 * Retorna sessões dentro de um intervalo de datas (inclusive).
 */
export function sessionsInRange(sessions, fromDate, toDate) {
  return sessions.filter((s) => s.date >= fromDate && s.date <= toDate);
}

/**
 * Calcula séries por grupamento muscular para um conjunto de sessões.
 * @returns {Object} { "Peito": 12, "Costas": 16, ... }
 */
export function weeklySetsByMuscle(sessions) {
  const result = {};
  sessions.forEach((s) =>
    s.exercises.forEach((e) => {
      if (!result[e.category]) result[e.category] = 0;
      result[e.category] += e.sets.length;
    })
  );
  return result;
}

/**
 * Calcula volume total (tonelagem = séries × reps × carga) para um conjunto de sessões.
 * @returns {number} volume em kg
 */
export function totalVolume(sessions) {
  return sessions.reduce(
    (acc, s) => acc + s.exercises.reduce((a, e) => a + calcVolume(e.sets), 0),
    0
  );
}

/**
 * Calcula volume por grupamento para um conjunto de sessões.
 * @returns {Object} { "Peito": 4500, "Costas": 8200, ... }
 */
export function volumeByMuscle(sessions) {
  const result = {};
  sessions.forEach((s) =>
    s.exercises.forEach((e) => {
      if (!result[e.category]) result[e.category] = 0;
      result[e.category] += calcVolume(e.sets);
    })
  );
  return result;
}

/**
 * Retorna o delta percentual entre dois valores.
 * Retorna null se o valor base for 0.
 */
export function deltaPct(current, previous) {
  if (!previous || previous === 0) return null;
  return ((current - previous) / previous) * 100;
}

/**
 * Calcula a tendência de progressão de carga para um exercício específico.
 *
 * Progressão saudável para naturais: 5-10% por mesociclo (4-6 semanas).
 * Fonte: Haff & Triplett (2015) — Essentials of Strength Training and Conditioning, NSCA.
 *
 * @param {string} exerciseName
 * @param {Array} sessions - todas as sessões do perfil, ordenadas por data
 * @param {number} weeksBack - quantas semanas analisar (padrão: 8)
 * @returns {{ trend: "progressing"|"slow"|"stagnant"|"regressing", pctChange: number, dataPoints: number }}
 */
export function exerciseProgressionTrend(exerciseName, sessions, weeksBack = 8) {
  const cutoff = daysAgo(weeksBack * 7);
  const relevant = sessions
    .filter((s) => s.date >= cutoff)
    .flatMap((s) =>
      s.exercises
        .filter((e) => e.name === exerciseName)
        .map((e) => ({
          date: s.date,
          avgWeight:
            e.sets.length > 0
              ? e.sets.reduce((a, set) => a + (parseFloat(set.weight) || 0), 0) / e.sets.length
              : 0,
        }))
    )
    .sort((a, b) => a.date.localeCompare(b.date));

  if (relevant.length < 2) return { trend: "stagnant", pctChange: 0, dataPoints: relevant.length };

  const first = relevant[0].avgWeight;
  const last = relevant[relevant.length - 1].avgWeight;

  if (first === 0) return { trend: "stagnant", pctChange: 0, dataPoints: relevant.length };

  const pctChange = ((last - first) / first) * 100;

  let trend;
  if (pctChange >= 5) trend = "progressing";
  else if (pctChange >= 1) trend = "slow";
  else if (pctChange >= -1) trend = "stagnant";
  else trend = "regressing";

  return { trend, pctChange: Math.round(pctChange * 10) / 10, dataPoints: relevant.length };
}

/**
 * Retorna os exercícios mais frequentes de um perfil, com sua tendência de progressão.
 * Ordena por maior queda de progressão (mais urgentes primeiro).
 *
 * @param {Array} sessions
 * @param {number} topN - quantos exercícios retornar
 */
export function topExercisesTrends(sessions, topN = 10) {
  const freq = {};
  sessions.forEach((s) =>
    s.exercises.forEach((e) => {
      freq[e.name] = (freq[e.name] || 0) + 1;
    })
  );

  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([name, count]) => ({
      name,
      count,
      ...exerciseProgressionTrend(name, sessions, 8),
    }));
}

/**
 * Calcula quantas semanas consecutivas um exercício aparece como
 * 1º ou 2º na sessão de determinado tipo de treino.
 *
 * Usado para sugestão de periodização (gatilho: 8 semanas).
 * Fonte: Fonseca et al. (2014) — Journal of Strength and Conditioning Research.
 */
export function weeksAsMainExercise(exerciseName, trainType, sessions) {
  const relevant = sessions
    .filter((s) => (s.trainType || "") === trainType)
    .sort((a, b) => b.date.localeCompare(a.date)); // mais recente primeiro

  let weeks = 0;
  for (const s of relevant) {
    const idx = s.exercises.findIndex((e) => e.name === exerciseName);
    if (idx === 0 || idx === 1) {
      weeks++;
    } else {
      break;
    }
  }
  return weeks;
}

/**
 * Retorna o número de sessões no mês atual.
 */
export function sessionsThisMonth(sessions) {
  const now = new Date();
  const prefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  return sessions.filter((s) => s.date.startsWith(prefix)).length;
}

/**
 * Retorna a média de exercícios por treino no mês atual.
 */
export function avgExercisesPerSession(sessions) {
  const now = new Date();
  const prefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const monthly = sessions.filter((s) => s.date.startsWith(prefix));
  if (monthly.length === 0) return 0;
  const total = monthly.reduce((a, s) => a + s.exercises.length, 0);
  return Math.round((total / monthly.length) * 10) / 10;
}
```

- [ ] **Step 1.2: Commit**

```bash
git add src/data/analyticsHelpers.js
git commit -m "feat: add analytics helper functions (volume, trends, progression)"
```

---

## Task 2: Criar `src/components/AnalysisTab.jsx`

**Files:**
- Create: `src/components/AnalysisTab.jsx`

- [ ] **Step 2.1: Criar o componente com os 4 blocos**

```jsx
// src/components/AnalysisTab.jsx
import { useState } from "react";
import { C, MUSCLE_GROUPS, TRAIN_TYPES, PERIODIZATION_TIPS } from "../data/constants";
import { getAdjustedLandmarks, classifyVolume } from "../data/volumeLandmarks";
import {
  daysAgo, sessionsInRange, weeklySetsByMuscle, volumeByMuscle,
  totalVolume, deltaPct, topExercisesTrends,
} from "../data/analyticsHelpers";

// Mapeamento de classificação para UI
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

// Conceitos técnicos exibidos no ℹ️ de cada recomendação
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
};

function ConceptModal({ concept, onClose }) {
  if (!concept) return null;
  return (
    <div
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)",
        display: "flex", alignItems: "flex-end", zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: C.surface, borderRadius: "16px 16px 0 0",
          padding: 24, width: "100%", maxWidth: 480, margin: "0 auto",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ fontWeight: 700, fontSize: 16, color: C.text, marginBottom: 8 }}>
          {concept.title}
        </div>
        <div style={{ fontSize: 13, color: C.sub, lineHeight: 1.6, marginBottom: 12 }}>
          {concept.body}
        </div>
        <div style={{ fontSize: 11, color: C.accent }}>
          📚 {concept.source}
        </div>
        <button
          onClick={onClose}
          style={{
            marginTop: 16, width: "100%", padding: 12, borderRadius: 10,
            border: "none", background: C.surfaceHigh, color: C.text, cursor: "pointer",
          }}
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
  const [compareMode, setCompareMode] = useState("week"); // "week" | "month"

  const today = new Date().toISOString().slice(0, 10);

  // Período atual
  const currentStart = daysAgo(period);
  const currentSessions = sessionsInRange(sessions, currentStart, today);

  // Período anterior (mesmo tamanho)
  const prevEnd = daysAgo(period + 1);
  const prevStart = daysAgo(period * 2);
  const prevSessions = sessionsInRange(sessions, prevStart, prevEnd);

  // Semana atual vs anterior
  const thisWeekSessions = sessionsInRange(sessions, daysAgo(7), today);
  const lastWeekSessions = sessionsInRange(sessions, daysAgo(14), daysAgo(8));

  // Mês atual vs anterior
  const now = new Date();
  const thisMonthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthPrefix = `${lastMonthDate.getFullYear()}-${String(lastMonthDate.getMonth() + 1).padStart(2, "0")}`;
  const thisMonthSessions = sessions.filter((s) => s.date.startsWith(thisMonthPrefix));
  const lastMonthSessions = sessions.filter((s) => s.date.startsWith(lastMonthPrefix));

  const currentSets = weeklySetsByMuscle(compareMode === "week" ? thisWeekSessions : thisMonthSessions);
  const prevSets    = weeklySetsByMuscle(compareMode === "week" ? lastWeekSessions : lastMonthSessions);

  const currentVol = totalVolume(compareMode === "week" ? thisWeekSessions : thisMonthSessions);
  const prevVol    = totalVolume(compareMode === "week" ? lastWeekSessions : lastMonthSessions);
  const volDelta   = deltaPct(currentVol, prevVol);

  const periodSets = weeklySetsByMuscle(currentSessions);

  const trends = topExercisesTrends(sessions, 8);

  // Cards de recomendação
  const recommendations = [];
  MUSCLE_GROUPS.forEach((m) => {
    const sets = periodSets[m.key] || 0;
    const weeklySets = Math.round(sets / (period / 7));
    const zone = classifyVolume(weeklySets, m.key, profileConfig);
    const landmarks = getAdjustedLandmarks(m.key, profileConfig);
    if (!landmarks) return;

    if (zone === "below_mev" && weeklySets > 0) {
      recommendations.push({
        muscle: m.label,
        icon: "🔴",
        text: `${m.label} em ${weeklySets} séries/sem — abaixo do MEV (${landmarks.mev}). Considere adicionar 1 série no próximo treino.`,
        conceptKey: "mev",
        isFocal: (profileConfig?.focalGroups || []).includes(m.key),
      });
    }
    if (zone === "above_mrv") {
      recommendations.push({
        muscle: m.label,
        icon: "🔴",
        text: `${m.label} em ${weeklySets} séries/sem — acima do MRV (${landmarks.mrv}). Reduza volume para evitar overtraining.`,
        conceptKey: "mrv",
        isFocal: (profileConfig?.focalGroups || []).includes(m.key),
      });
    }
    if (zone === "in_mav" && (profileConfig?.focalGroups || []).includes(m.key)) {
      recommendations.push({
        muscle: m.label,
        icon: "🟢",
        text: `[Grupo focal] ${m.label} dentro do MAV (${landmarks.mavMin}–${landmarks.mavMax} séries/sem). Bom ritmo.`,
        conceptKey: "mav",
        isFocal: true,
      });
    }
  });

  trends
    .filter((t) => t.trend === "stagnant" || t.trend === "regressing")
    .slice(0, 3)
    .forEach((t) => {
      recommendations.push({
        muscle: t.name,
        icon: t.trend === "stagnant" ? "⚠️" : "📉",
        text: `${t.name}: ${t.trend === "stagnant" ? "sem progressão" : "carga regredindo"} nas últimas 8 semanas (${t.pctChange > 0 ? "+" : ""}${t.pctChange}%). Considere trocar variação ou ajustar rep range.`,
        conceptKey: "progression",
        isFocal: false,
      });
    });

  // Grupos focais primeiro
  recommendations.sort((a, b) => (b.isFocal ? 1 : 0) - (a.isFocal ? 1 : 0));

  return (
    <div style={{ paddingBottom: 80 }}>
      <ConceptModal concept={activeConcept ? CONCEPTS[activeConcept] : null} onClose={() => setActiveConcept(null)} />

      {/* Período */}
      <div style={{ padding: "16px 16px 0" }}>
        <div style={{ fontSize: 12, color: C.sub, marginBottom: 8 }}>⏱ Período de análise</div>
        <div style={{ display: "flex", gap: 8 }}>
          {[7, 14, 30, 60, 90].map((d) => (
            <button
              key={d}
              onClick={() => setPeriod(d)}
              style={{
                flex: 1, padding: "8px 4px", borderRadius: 8, border: `1px solid ${period === d ? C.accent : C.border}`,
                background: period === d ? `${C.accent}22` : C.surface,
                color: period === d ? C.accent : C.sub, fontSize: 12, cursor: "pointer",
              }}
            >
              {d}d
            </button>
          ))}
        </div>
      </div>

      {/* BLOCO 1 — Volume por grupamento com MEV/MAV/MRV */}
      <div style={{ padding: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 12 }}>
          💪 Volume semanal por grupamento
          <button onClick={() => setActiveConcept("mev")} style={{ marginLeft: 8, background: "none", border: "none", color: C.accent, cursor: "pointer", fontSize: 12 }}>ℹ️</button>
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
                  {landmarks && (
                    <span style={{ fontSize: 10, color: C.sub }}>
                      MEV {landmarks.mev} · MAV {landmarks.mavMin}–{landmarks.mavMax} · MRV {landmarks.mrv}
                    </span>
                  )}
                </div>
              </div>
              <div style={{ height: 6, background: C.surfaceHigh, borderRadius: 3, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${barPct}%`, background: zc.color, borderRadius: 3, transition: "width 0.3s" }} />
              </div>
            </div>
          );
        })}
      </div>

      {/* BLOCO 2 — Comparativo semana vs. semana / mês vs. mês */}
      <div style={{ padding: "0 16px 16px" }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 12 }}>
          📊 Comparativo de volume
        </div>
        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          {["week", "month"].map((mode) => (
            <button
              key={mode}
              onClick={() => setCompareMode(mode)}
              style={{
                flex: 1, padding: "8px", borderRadius: 8,
                border: `1px solid ${compareMode === mode ? C.accent : C.border}`,
                background: compareMode === mode ? `${C.accent}22` : C.surface,
                color: compareMode === mode ? C.accent : C.sub,
                fontSize: 12, cursor: "pointer",
              }}
            >
              {mode === "week" ? "Semana vs. semana" : "Mês vs. mês"}
            </button>
          ))}
        </div>

        {/* Volume total */}
        <div style={{ background: C.surface, borderRadius: 12, padding: 14, marginBottom: 10 }}>
          <div style={{ fontSize: 11, color: C.sub, marginBottom: 4 }}>Volume total (tonelagem)</div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <div>
              <span style={{ fontSize: 22, fontWeight: 800, color: C.text }}>{(currentVol / 1000).toFixed(1)}t</span>
              <span style={{ fontSize: 11, color: C.sub, marginLeft: 6 }}>
                {compareMode === "week" ? "esta semana" : "este mês"}
              </span>
            </div>
            {volDelta !== null && (
              <span style={{ fontSize: 13, color: volDelta >= 0 ? "#4caf50" : "#f44336", fontWeight: 700 }}>
                {volDelta >= 0 ? "+" : ""}{volDelta.toFixed(1)}%
              </span>
            )}
          </div>
          {prevVol > 0 && (
            <div style={{ fontSize: 11, color: C.sub, marginTop: 4 }}>
              vs. {(prevVol / 1000).toFixed(1)}t {compareMode === "week" ? "semana passada" : "mês passado"}
            </div>
          )}
        </div>

        {/* Séries por grupamento — atual vs anterior */}
        {MUSCLE_GROUPS.filter((m) => (currentSets[m.key] || 0) + (prevSets[m.key] || 0) > 0).map((m) => {
          const curr = currentSets[m.key] || 0;
          const prev = prevSets[m.key] || 0;
          const delta = deltaPct(curr, prev);
          return (
            <div key={m.key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0", borderBottom: `1px solid ${C.border}` }}>
              <span style={{ fontSize: 13, color: C.text }}>{m.label}</span>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontSize: 11, color: C.sub }}>{prev}s → </span>
                <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{curr}s</span>
                {delta !== null && (
                  <span style={{ fontSize: 11, color: delta >= 0 ? "#4caf50" : "#f44336" }}>
                    {delta >= 0 ? "+" : ""}{delta.toFixed(0)}%
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* BLOCO 3 — Tendência de progressão de carga */}
      <div style={{ padding: "0 16px 16px" }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 4 }}>
          🏋️ Progressão de carga
          <button onClick={() => setActiveConcept("progression")} style={{ marginLeft: 8, background: "none", border: "none", color: C.accent, cursor: "pointer", fontSize: 12 }}>ℹ️</button>
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

      {/* BLOCO 4 — Cards de recomendação */}
      {recommendations.length > 0 && (
        <div style={{ padding: "0 16px 16px" }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 12 }}>🎯 Recomendações</div>
          {recommendations.map((r, i) => (
            <div key={i} style={{ background: C.surface, borderRadius: 12, padding: 14, marginBottom: 10, borderLeft: `3px solid ${r.icon === "🟢" ? "#4caf50" : r.icon === "🔴" ? "#f44336" : "#ff9800"}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div style={{ fontSize: 13, color: C.text, flex: 1, lineHeight: 1.5 }}>
                  {r.icon} {r.text}
                </div>
                <button
                  onClick={() => setActiveConcept(r.conceptKey)}
                  style={{ background: "none", border: "none", color: C.accent, cursor: "pointer", fontSize: 14, paddingLeft: 8, flexShrink: 0 }}
                >
                  ℹ️
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Distribuição ABCDE */}
      <div style={{ padding: "0 16px 16px" }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 12 }}>🔄 Distribuição ABCDE</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {Object.entries(TRAIN_TYPES).map(([k, v]) => {
            const count = currentSessions.filter((s) => (s.trainType || "") === k).length;
            return (
              <div key={k} style={{ background: C.surface, border: `1px solid ${v.color}55`, borderRadius: 10, padding: "10px 14px", textAlign: "center", minWidth: 56 }}>
                <div style={{ fontSize: 18 }}>{v.emoji}</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: v.color }}>{count}</div>
                <div style={{ fontSize: 10, color: C.sub }}>{k}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Periodização Pacholok */}
      <div style={{ padding: "0 16px 16px" }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 12 }}>📚 Periodização — Fabrício Pacholok</div>
        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          {["A","B","C","D","E"].map((t) => (
            <button
              key={t}
              onClick={() => setSelTT(t)}
              style={{
                flex: 1, padding: "8px 4px", borderRadius: 8,
                border: `1px solid ${selTT === t ? TRAIN_TYPES[t].color : C.border}`,
                background: selTT === t ? `${TRAIN_TYPES[t].color}22` : C.surface,
                color: selTT === t ? TRAIN_TYPES[t].color : C.sub,
                fontSize: 12, cursor: "pointer",
              }}
            >
              {TRAIN_TYPES[t].emoji}{t}
            </button>
          ))}
        </div>
        {PERIODIZATION_TIPS[selTT].map((tip, i) => (
          <div key={i} style={{ background: C.surface, borderRadius: 10, padding: 12, marginBottom: 8 }}>
            <div style={{ fontSize: 11, color: C.accent, fontWeight: 700, marginBottom: 4 }}>{tip.phase}</div>
            <div style={{ fontSize: 12, color: C.sub, lineHeight: 1.6 }}>{tip.tip}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2.2: Commit**

```bash
git add src/components/AnalysisTab.jsx
git commit -m "feat: add AnalysisTab with MEV/MAV/MRV, comparatives, trends, and recommendations"
```

---

## Task 3: Reformular KPIs do HomeTab

**Files:**
- Modify: `src/App.jsx` (componente `HomeTab` e função `SC`)

- [ ] **Step 3.1: Atualizar os imports no topo do App.jsx**

```jsx
import { sessionsThisMonth, avgExercisesPerSession, volumeByMuscle, deltaPct } from "./data/analyticsHelpers";
```

- [ ] **Step 3.2: Substituir o `statsBar` no `HomeTab`**

Localizar no `HomeTab`:
```jsx
<div style={S.statsBar}>
  <SC icon="🗓" label="Sessões" value={sessions.length}/>
  <SC icon="🏋️" label="Exercícios" value={new Set(sessions.flatMap(s=>s.exercises.map(e=>e.name))).size}/>
  <SC icon="📊" label="Volume" value={`${(totalVol/1000).toFixed(1)}t`}/>
</div>
```

Substituir por:
```jsx
{(() => {
  const now = new Date();
  const thisMonthCount = sessionsThisMonth(sessions);
  const avgEx = avgExercisesPerSession(sessions);
  const thisMonthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthPrefix = `${lastMonthDate.getFullYear()}-${String(lastMonthDate.getMonth() + 1).padStart(2, "0")}`;
  const thisMonthSessions = sessions.filter(s => s.date.startsWith(thisMonthPrefix));
  const lastMonthSessions = sessions.filter(s => s.date.startsWith(lastMonthPrefix));
  const thisVol = volumeByMuscle(thisMonthSessions);
  const lastVol = volumeByMuscle(lastMonthSessions);
  const focalGroups = profileConfig?.focalGroups || [];

  return (
    <div style={{ padding: "0 16px" }}>
      <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
        <div style={{ flex: 1, background: C.surface, borderRadius: 12, padding: 14 }}>
          <div style={{ fontSize: 10, color: C.sub, marginBottom: 4 }}>🗓 Sessões este mês</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: C.accent }}>{thisMonthCount}</div>
        </div>
        <div style={{ flex: 1, background: C.surface, borderRadius: 12, padding: 14 }}>
          <div style={{ fontSize: 10, color: C.sub, marginBottom: 4 }}>🏋️ Exercícios/treino</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: C.text }}>{avgEx}</div>
        </div>
      </div>
      {focalGroups.length > 0 && (
        <div style={{ background: C.surface, borderRadius: 12, padding: 14, marginBottom: 12 }}>
          <div style={{ fontSize: 11, color: C.sub, marginBottom: 10 }}>📊 Volume por grupo focal (este mês vs. anterior)</div>
          {focalGroups.map(g => {
            const curr = thisVol[g] || 0;
            const prev = lastVol[g] || 0;
            const delta = deltaPct(curr, prev);
            const maxVal = Math.max(curr, prev, 1);
            return (
              <div key={g} style={{ marginBottom: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ fontSize: 12, color: C.text }}>{g}</span>
                  <span style={{ fontSize: 11, color: delta === null ? C.sub : delta >= 0 ? "#4caf50" : "#f44336" }}>
                    {delta !== null ? `${delta >= 0 ? "+" : ""}${delta.toFixed(0)}%` : "—"}
                  </span>
                </div>
                <div style={{ display: "flex", gap: 4, height: 6 }}>
                  <div style={{ flex: prev / maxVal, background: C.border, borderRadius: 3 }} />
                  <div style={{ flex: curr / maxVal, background: C.accent, borderRadius: 3 }} />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 2 }}>
                  <span style={{ fontSize: 9, color: C.sub }}>{(prev/1000).toFixed(1)}t mês ant.</span>
                  <span style={{ fontSize: 9, color: C.accent }}>{(curr/1000).toFixed(1)}t este mês</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
})()}
```

> Nota: `HomeTab` precisará receber `profileConfig` como prop — adicionar na assinatura e no ponto de instanciação no App.

- [ ] **Step 3.3: Commit**

```bash
git add src/App.jsx
git commit -m "feat: redesign HomeTab KPIs with monthly sessions, avg exercises, focal group volume"
```

---

## Task 4: Calendário com visualização rápida

**Files:**
- Modify: `src/App.jsx` (componente `CalTab`)

A funcionalidade de clicar num dia do calendário e ver o treino **já existe** no código atual — `CalTab` já mostra a seção com `selSessions` ao clicar em um dia. O que falta é:

1. A lista exibe apenas nome e volume — adicionar os exercícios com séries/reps/peso
2. O visual do painel pode ser melhorado

- [ ] **Step 4.1: Expandir o painel de dia selecionado no CalTab**

Localizar no `CalTab` a seção do `selDay` que mostra `selSessions` e substituir o conteúdo de cada sessão por:

```jsx
selSessions.map(s => {
  const tt = s.trainType || detectTrainType(s.name);
  const ti = tt ? TRAIN_TYPES[tt] : null;
  const vol = s.exercises.reduce((a, e) => a + calcVolume(e.sets), 0);
  return (
    <div key={s.id} style={{ background: C.surface, borderRadius: 12, padding: 14, marginBottom: 10 }}>
      {/* Cabeçalho da sessão */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{s.name}</div>
          <div style={{ fontSize: 11, color: C.sub }}>{s.exercises.length} exercícios · {vol.toFixed(0)} kg{ti ? ` · ${ti.label}` : ""}</div>
        </div>
        <button
          onClick={() => onOpen(s)}
          style={{
            padding: "6px 12px", borderRadius: 8, border: `1px solid ${C.accent}`,
            background: "transparent", color: C.accent, fontSize: 12, cursor: "pointer",
          }}
        >
          Editar
        </button>
      </div>
      {/* Lista de exercícios com séries */}
      {s.exercises.map((e, ei) => (
        <div key={e.id} style={{ padding: "8px 0", borderTop: `1px solid ${C.border}` }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: C.text, marginBottom: 4 }}>
            {ei + 1}. {e.name}
            <span style={{ fontWeight: 400, color: C.sub, fontSize: 11, marginLeft: 6 }}>{e.category}</span>
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {e.sets.map((set, si) => (
              <span key={si} style={{
                fontSize: 11, color: C.sub, background: C.surfaceHigh,
                borderRadius: 6, padding: "2px 8px",
              }}>
                {set.reps}×{set.weight}kg
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
})
```

- [ ] **Step 4.2: Commit**

```bash
git add src/App.jsx
git commit -m "feat: expand calendar day view with exercise details and sets"
```

---

## Task 5: Integrar AnalysisTab no App.jsx

**Files:**
- Modify: `src/App.jsx`

- [ ] **Step 5.1: Importar AnalysisTab e substituir o componente inline**

```jsx
// Adicionar import no topo:
import { AnalysisTab } from "./components/AnalysisTab";
```

Localizar no App.jsx onde `<AnalysisTab sessions={sessions}/>` é renderizado e substituir por:
```jsx
<AnalysisTab sessions={sessions} profileConfig={profile ? getConfig(profile.id) : null} />
```

- [ ] **Step 5.2: Testar fluxo completo**

1. Selecionar perfil com onboarding concluído
2. Navegar para aba Análise
3. Verificar Bloco 1 (barras MEV/MAV/MRV aparecem e refletem os grupos focais com badge FOCO)
4. Verificar Bloco 2 (comparativos semana/mês com toggle)
5. Verificar Bloco 3 (tendências de progressão para os 8 exercícios mais frequentes)
6. Verificar Bloco 4 (cards de recomendação com ℹ️ abrindo modal de conceito)
7. Verificar Home (KPIs reformulados com volume por grupo focal)
8. Verificar Calendário (clicar num dia mostra exercícios e séries)

- [ ] **Step 5.3: Commit**

```bash
git add src/App.jsx
git commit -m "feat: integrate AnalysisTab component and profileConfig across tabs"
```

---

## Task 6: Build e deploy

- [ ] **Step 6.1: Build**

```bash
npm run build
```

Esperado: sem erros.

- [ ] **Step 6.2: Push e deploy**

```bash
git push origin main
```
