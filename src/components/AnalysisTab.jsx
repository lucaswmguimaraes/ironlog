// src/components/AnalysisTab.jsx
import { useState } from "react";
import { C, MUSCLE_GROUPS, TRAIN_TYPES, PERIODIZATION_TIPS, todayISO, addDays, weekStartISO, fmtDate } from "../data/constants";
import { getAdjustedLandmarks, classifyVolume } from "../data/volumeLandmarks";
import { ALL_EXERCISES } from "../data/exercises";
import { daysAgo, sessionsInRange, weeksAsMainExercise } from "../data/analyticsHelpers";
import {
  setsByMuscle, topExercisesProgression, performanceEvolution, periodRanges, periodStats, STATUS,
} from "../data/progression";

const ZONE_CONFIG = {
  below_mev: { color: "#ff9800", icon: "🟠", label: "Abaixo da ref. MEV" },
  below_mav: { color: "#ffc107", icon: "🟡", label: "Abaixo da faixa MAV" },
  in_mav:    { color: "#4caf50", icon: "🟢", label: "Na faixa de referência" },
  above_mrv: { color: "#f44336", icon: "🔴", label: "Acima da ref. MRV" },
};

const VOLUME_MUSCLES = ["Peito", "Costas", "Ombros", "Bíceps", "Tríceps", "Quadríceps", "Posterior de Coxa", "Glúteos", "Panturrilha", "Core / Abdômen"];

// Conceitos exibidos no ℹ️
const CONCEPTS = {
  mev: {
    title: "MEV · MAV · MRV — referências de volume",
    body: "MEV (volume mínimo efetivo estimado): menor nº de séries semanais que costuma gerar ganho.\nMAV (faixa de volume adaptativo máximo estimada): faixa onde a maioria responde melhor.\nMRV (volume máximo recuperável estimado): acima disso a recuperação tende a não acompanhar.\n\nSão referências APROXIMADAS e individuais, não limites universais. Estar abaixo do MEV não significa que o treino está inadequado — fase de manutenção, deload ou alta intensidade podem justificar menos séries. Ajuste os valores em ⚙️ conforme sua experiência, objetivo e recuperação.\n\nContagem: só séries de trabalho (aquecimentos não contam). Séries indiretas (ex.: puxada → bíceps) contam como fração configurável (padrão ½).",
    source: "Israetel et al. — RP Training Volume Landmarks; Schoenfeld et al. (2017) J Sports Sci; Pelland et al. (2024) SportRxiv",
  },
  progression: {
    title: "Progressão de carga comparável",
    body: "Só comparamos registros do MESMO exercício, MESMA academia e MESMO equipamento. A comparação considera carga e repetições juntas: mesma carga com mais reps é progressão de repetições; mais carga com menos reps não é tratada automaticamente como melhora geral.\n\nO % exibido é a variação do 1RM estimado (Epley, séries de 1–12 reps) entre o primeiro e o último registro comparável nas últimas 8 semanas — uma estimativa, não uma medição direta. Registros antigos sem academia informada têm comparabilidade limitada.",
    source: "Epley (1985); Haff & Triplett (2015) — NSCA; Helms et al. (2016)",
  },
  volume: {
    title: "Tonelagem × séries",
    body: "Tonelagem (volume de carga) = soma de reps × carga de todas as séries.\nVolume de treinamento = nº de séries de trabalho por grupamento.\n\nSão métricas diferentes. A tonelagem muda com troca de exercício, academia ou equipamento e NÃO indica sozinha melhora ou piora de desempenho. Com o período atual em andamento, a comparação equivalente usa o mesmo nº de dias do período anterior.",
    source: "Schoenfeld et al. (2017); Baz-Valle et al. (2022)",
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
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "flex-end", zIndex: 1000 }} onClick={onClose}>
      <div style={{ background: C.surface, borderRadius: "16px 16px 0 0", padding: 24, width: "100%", maxWidth: 480, margin: "0 auto", boxSizing: "border-box", maxHeight: "85vh", overflowY: "auto" }} onClick={(e) => e.stopPropagation()}>
        <div style={{ fontWeight: 700, fontSize: 16, color: C.text, marginBottom: 8 }}>{concept.title}</div>
        <div style={{ fontSize: 13, color: C.sub, lineHeight: 1.6, marginBottom: 12, whiteSpace: "pre-line" }}>{concept.body}</div>
        <div style={{ fontSize: 11, color: C.accent }}>📚 {concept.source}</div>
        <button onClick={onClose} style={{ marginTop: 16, width: "100%", padding: 12, borderRadius: 10, border: "none", background: C.surfaceHigh, color: C.text, cursor: "pointer", fontSize: 14 }}>Fechar</button>
      </div>
    </div>
  );
}

const H = ({ children, info, onInfo }) => (
  <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 4, display: "flex", alignItems: "center" }}>
    {children}
    {info && <button onClick={onInfo} style={{ marginLeft: 8, background: "none", border: "none", color: C.accent, cursor: "pointer", fontSize: 13 }}>ℹ️</button>}
  </div>
);
const pctTxt = (v) => (v === null || !isFinite(v) ? "—" : `${v >= 0 ? "+" : ""}${v.toFixed(0)}%`);
const pct = (a, b) => (b ? ((a - b) / b) * 100 : null);
const tagColor = (g) => (g === true ? "#4caf50" : g === false ? "#ff9800" : C.sub);

export function AnalysisTab({ sessions, profileConfig, prefs, landmarkOverrides = {}, onOpenExercise }) {
  const [period, setPeriod] = useState(30);
  const [selTT, setSelTT] = useState("A");
  const [activeConcept, setActiveConcept] = useState(null);
  const [compareMode, setCompareMode] = useState("week");
  const [basis, setBasis] = useState("equivalent");
  const [snoozed, setSnoozed] = useState(() => {
    try { return JSON.parse(localStorage.getItem("ironlog_snoozed") || "{}"); } catch { return {}; }
  });

  const today = todayISO();
  const focal = profileConfig?.focalGroups || [];
  const lm = (m) => getAdjustedLandmarks(m, profileConfig, landmarkOverrides);

  const snoozeKey = (name, tt) => `${name}__${tt}`;
  const isSnoozed = (name, tt) => { const until = snoozed[snoozeKey(name, tt)]; return until ? today <= until : false; };
  const snoozeUntil = (name, tt) => {
    const updated = { ...snoozed, [snoozeKey(name, tt)]: addDays(today, 14) };
    setSnoozed(updated);
    try { localStorage.setItem("ironlog_snoozed", JSON.stringify(updated)); } catch {}
  };

  // ── Volume semanal médio no período (séries de trabalho, diretas + indiretas) ──
  const currentSessions = sessionsInRange(sessions, daysAgo(period - 1), today);
  const periodSets = setsByMuscle(currentSessions, prefs);
  const weeks = period / 7;

  // ── Comparativo de períodos ──
  const R = periodRanges(compareMode, basis, today);
  const cur = periodStats(sessions, R.curStart, R.curEnd, prefs);
  const prev = periodStats(sessions, R.prevStart, R.prevEnd, prefs);
  const tonDelta = pct(cur.tonnage, prev.tonnage);
  const avgDelta = pct(cur.avgPerSession, prev.avgPerSession);
  const musclesWithData = MUSCLE_GROUPS.filter((m) => (cur.sets[m.key]?.total || 0) + (prev.sets[m.key]?.total || 0) > 0);
  const neutralNeg = R.inProgress && basis === "full";
  const deltaColor = (d) => (d === null ? C.sub : d >= 0 ? "#4caf50" : neutralNeg ? C.sub : "#ff9800");

  // ── Progressão e evolução ──
  const trends = topExercisesProgression(sessions, prefs, 8, 8, today);
  const evolution = performanceEvolution(sessions, prefs, 8, today);

  // ── Recomendações (várias evidências, linguagem cautelosa) ──
  const recommendations = [];
  const ws = weekStartISO(today);
  const completeWeeks = [1, 2, 3].map((k) => {
    const from = addDays(ws, -7 * k), to = addDays(from, 6);
    return { from, sets: setsByMuscle(sessionsInRange(sessions, from, to), prefs), n: sessionsInRange(sessions, from, to).length };
  });
  const firstDate = sessions.reduce((a, s) => (s.date < a ? s.date : a), today);
  const enoughHistory = firstDate <= addDays(ws, -21);
  const curWeekSets = setsByMuscle(sessionsInRange(sessions, ws, today), prefs);
  const dayOfWeek = R.elapsed && compareMode === "week" ? R.elapsed : Math.round((new Date(today + "T12:00:00") - new Date(ws + "T12:00:00")) / 864e5) + 1;
  const regressingCats = new Set(trends.filter((t) => t.status === "regression").map((t) => ALL_EXERCISES.find((e) => e.name === t.name)?.category).filter(Boolean));

  if (!enoughHistory) {
    recommendations.push({ icon: "❔", tone: "info", text: "Dados insuficientes para avaliar volume por semana — são necessárias pelo menos 3 semanas completas de registros.", conceptKey: "mev", isFocal: false });
  } else {
    VOLUME_MUSCLES.forEach((m) => {
      const l = lm(m);
      if (!l) return;
      const isFocal = focal.includes(m);
      const label = MUSCLE_GROUPS.find((x) => x.key === m)?.label || m;
      const hist = completeWeeks.map((w) => +(w.sets[m]?.total || 0).toFixed(1));
      const trained = hist.some((v) => v > 0);
      if (trained && hist.every((v) => v < l.mev)) {
        recommendations.push({
          icon: "🟠", tone: "warn", isFocal, conceptKey: "mev",
          text: regressingCats.has(m)
            ? `${label}: abaixo da referência MEV (${l.mev}) nas últimas 3 semanas completas (${hist.reverse().join(" → ")} séries) e com possível regressão em exercício do grupo. Acompanhe a recuperação antes de mudar o volume.`
            : `${label}: abaixo da referência MEV (${l.mev}) nas últimas 3 semanas completas (${hist.reverse().join(" → ")} séries). Se a recuperação estiver boa, considere aumentar gradualmente (+1–2 séries/semana).`,
        });
      } else if (hist[0] > l.mrv && hist[1] > l.mrv) {
        recommendations.push({ icon: "🔴", tone: "danger", isFocal, conceptKey: "mev", text: `${label}: acima da referência MRV (${l.mrv}) há 2 semanas (${hist[1]} → ${hist[0]} séries). Avalie sua recuperação; se o desempenho cair, considere reduzir.` });
      } else if (isFocal && hist[0] >= l.mavMin && hist[0] <= l.mavMax) {
        recommendations.push({ icon: "🟢", tone: "good", isFocal, conceptKey: "mev", text: `[Foco] ${label} na faixa de referência na última semana completa (${hist[0]} séries; ref. ${l.mavMin}–${l.mavMax}).` });
      }
      if (isFocal && dayOfWeek < 7) {
        const sofar = +(curWeekSets[m]?.total || 0).toFixed(1);
        if (sofar < l.mev) recommendations.push({ icon: "⏳", tone: "info", isFocal, conceptKey: "mev", text: `${label}: seu volume semanal ainda está em andamento (${sofar} séries até o dia ${dayOfWeek}/7). Sem ação por enquanto.` });
      }
    });
  }
  trends.filter((t) => t.status === "regression").slice(0, 3).forEach((t) => {
    recommendations.push({ icon: "📉", tone: "warn", isFocal: false, conceptKey: "progression", text: `${t.name}: possível regressão no mesmo equipamento — ${t.note}` });
  });
  recommendations.sort((a, b) => (b.isFocal ? 1 : 0) - (a.isFocal ? 1 : 0));

  // ── Periodização ──
  const periodizationSuggestions = [];
  Object.keys(TRAIN_TYPES).forEach((trainType) => {
    const typeSessions = sessions.filter((s) => (s.trainType || "") === trainType);
    if (typeSessions.length < 3) return;
    const mainExFreq = {};
    typeSessions.forEach((s) => [0, 1].forEach((idx) => { const ex = s.exercises[idx]; if (ex) mainExFreq[ex.name] = (mainExFreq[ex.name] || 0) + 1; }));
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

  const toggle = (opts, val, set) => (
    <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
      {opts.map(([v, l]) => (
        <button key={v} onClick={() => set(v)} style={{ flex: 1, padding: 8, borderRadius: 8, fontSize: 12, cursor: "pointer", border: `1px solid ${val === v ? C.accent : C.border}`, background: val === v ? C.accentD : C.surface, color: val === v ? C.accent : C.sub }}>{l}</button>
      ))}
    </div>
  );

  return (
    <div style={{ paddingBottom: 80 }}>
      <ConceptModal concept={activeConcept ? CONCEPTS[activeConcept] : null} onClose={() => setActiveConcept(null)} />

      {/* Período */}
      <div style={{ padding: "16px 16px 0" }}>
        <div style={{ fontSize: 11, color: C.sub, marginBottom: 8, fontWeight: 700, letterSpacing: ".8px", textTransform: "uppercase" }}>⏱ Período de análise</div>
        <div style={{ display: "flex", gap: 8 }}>
          {[7, 14, 30, 60, 90].map((d) => (
            <button key={d} onClick={() => setPeriod(d)} style={{ flex: 1, padding: "8px 4px", borderRadius: 8, border: `1px solid ${period === d ? C.accent : C.border}`, background: period === d ? C.accentD : C.surface, color: period === d ? C.accent : C.sub, fontSize: 12, cursor: "pointer" }}>{d}d</button>
          ))}
        </div>
      </div>

      {/* BLOCO 1 — Volume semanal por grupamento */}
      <div style={{ padding: 16 }}>
        <H info onInfo={() => setActiveConcept("mev")}>💪 Volume semanal por grupamento</H>
        <div style={{ fontSize: 11, color: C.sub, marginBottom: 12 }}>Média de séries de trabalho/semana nos últimos {period} dias · indiretas contam {prefs.indirectFactor === 0.5 ? "½" : prefs.indirectFactor}</div>
        {MUSCLE_GROUPS.filter((m) => VOLUME_MUSCLES.includes(m.key)).map((m) => {
          const d = periodSets[m.key] || { direct: 0, indirect: 0, total: 0 };
          const weeklySets = Math.round((d.total / weeks) * 10) / 10;
          const zone = classifyVolume(weeklySets, m.key, profileConfig, landmarkOverrides);
          const landmarks = lm(m.key);
          const zc = ZONE_CONFIG[zone];
          const isFocal = focal.includes(m.key);
          const barPct = Math.min((weeklySets / (landmarks?.mavMax || 1)) * 100, 130);
          return (
            <div key={m.key} style={{ marginBottom: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4, gap: 6 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  {isFocal && <span style={{ fontSize: 10, background: `${C.accent}33`, color: C.accent, borderRadius: 4, padding: "1px 5px" }}>FOCO</span>}
                  <span style={{ fontSize: 13, color: C.text }}>{m.label}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", justifyContent: "flex-end" }}>
                  <span style={{ fontSize: 11, color: zc.color }}>{zc.icon} {weeklySets}s/sem</span>
                  {landmarks && <span style={{ fontSize: 10, color: C.sub }}>MEV {landmarks.mev} · {landmarks.mavMin}–{landmarks.mavMax} · MRV {landmarks.mrv}{landmarks.custom ? " ✎" : ""}</span>}
                </div>
              </div>
              <div style={{ height: 6, background: C.surfaceHigh, borderRadius: 3, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${barPct}%`, background: zc.color, borderRadius: 3, transition: "width 0.3s" }} />
              </div>
              {d.indirect > 0 && <div style={{ fontSize: 9, color: C.sub, marginTop: 2 }}>{(d.direct / weeks).toFixed(1)} diretas + {(d.indirect / weeks).toFixed(1)} indiretas × {prefs.indirectFactor}</div>}
            </div>
          );
        })}
      </div>

      {/* BLOCO 2 — Comparativo de volume */}
      <div style={{ padding: "0 16px 16px" }}>
        <H info onInfo={() => setActiveConcept("volume")}>📊 Comparativo de volume</H>
        <div style={{ height: 8 }} />
        {toggle([["week", "Semana vs. semana"], ["month", "Mês vs. mês"]], compareMode, setCompareMode)}
        {toggle([["equivalent", "Mesmos dias decorridos"], ["full", "Período anterior completo"]], basis, setBasis)}
        {R.inProgress && (
          <div style={{ fontSize: 11, color: C.warn, marginBottom: 10 }}>
            ⏳ {compareMode === "week" ? "Semana" : "Mês"} em andamento — dia {R.elapsed} de {R.totalDays}.
            {basis === "full" ? " Comparando com um período completo: uma queda aqui não indica regressão." : ` Comparando com os primeiros ${R.elapsed} dias do período anterior.`}
          </div>
        )}
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 14, marginBottom: 10 }}>
          <div style={{ fontSize: 11, color: C.sub, marginBottom: 4 }}>Tonelagem (volume de carga)</div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <div>
              <span style={{ fontSize: 22, fontWeight: 800, color: C.text }}>{(cur.tonnage / 1000).toFixed(1)}t</span>
              <span style={{ fontSize: 11, color: C.sub, marginLeft: 6 }}>{compareMode === "week" ? "esta semana" : "este mês"}</span>
            </div>
            <span style={{ fontSize: 13, color: deltaColor(tonDelta), fontWeight: 700 }}>{pctTxt(tonDelta)}</span>
          </div>
          <div style={{ fontSize: 11, color: C.sub, marginTop: 4 }}>vs. {(prev.tonnage / 1000).toFixed(1)}t ({fmtDate(R.prevStart).slice(0, 5)}–{fmtDate(R.prevEnd).slice(0, 5)})</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 12 }}>
            <div style={{ background: C.surfaceHigh, borderRadius: 8, padding: 10 }}>
              <div style={{ fontSize: 10, color: C.sub }}>Sessões</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: C.text }}>{cur.sessions} <span style={{ fontSize: 11, color: C.sub, fontWeight: 400 }}>vs {prev.sessions}</span></div>
            </div>
            <div style={{ background: C.surfaceHigh, borderRadius: 8, padding: 10 }}>
              <div style={{ fontSize: 10, color: C.sub }}>Média por sessão</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: C.text }}>{(cur.avgPerSession / 1000).toFixed(1)}t <span style={{ fontSize: 11, color: deltaColor(avgDelta), fontWeight: 400 }}>{pctTxt(avgDelta)}</span></div>
            </div>
          </div>
          <div style={{ fontSize: 10, color: C.sub, marginTop: 10, lineHeight: 1.5 }}>A tonelagem sozinha não indica melhora ou piora de desempenho — veja "Evolução de desempenho".</div>
        </div>
        <div style={{ fontSize: 11, color: C.sub, margin: "8px 0 4px" }}>Séries de trabalho por grupamento</div>
        {musclesWithData.map((m) => {
          const c = +(cur.sets[m.key]?.total || 0).toFixed(1), p = +(prev.sets[m.key]?.total || 0).toFixed(1);
          const d = pct(c, p);
          return (
            <div key={m.key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0", borderBottom: `1px solid ${C.border}` }}>
              <span style={{ fontSize: 13, color: C.text }}>{m.label}</span>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontSize: 11, color: C.sub }}>{p}s →</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{c}s</span>
                <span style={{ fontSize: 11, color: deltaColor(d), width: 40, textAlign: "right" }}>{pctTxt(d)}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* BLOCO 3 — Progressão de carga */}
      <div style={{ padding: "0 16px 16px" }}>
        <H info onInfo={() => setActiveConcept("progression")}>🏋️ Progressão de carga</H>
        <div style={{ fontSize: 11, color: C.sub, marginBottom: 12 }}>Top 8 exercícios · últimas 8 semanas · mesmo equipamento · toque para ver o gráfico</div>
        {trends.map((t) => {
          const tc = STATUS[t.status];
          return (
            <button key={t.name} onClick={() => onOpenExercise && onOpenExercise(t.name)} style={{ width: "100%", textAlign: "left", background: "none", border: "none", borderBottom: `1px solid ${C.border}`, padding: "9px 0", cursor: "pointer" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                <span style={{ fontSize: 13, color: C.text, flex: 1 }}>{t.name}</span>
                <span style={{ fontSize: 11, color: tc.color, whiteSpace: "nowrap" }}>{tc.icon} {tc.label}{t.caveat ? "*" : ""}</span>
                <span style={{ fontSize: 10, color: C.sub, width: 92, textAlign: "right" }}>{t.pct === null ? "—" : `1RM 8sem ${t.pct > 0 ? "+" : ""}${t.pct}%`}</span>
                <span style={{ color: C.sub }}>›</span>
              </div>
              <div style={{ fontSize: 10, color: C.sub, marginTop: 2 }}>{t.note}{t.limited ? " · registros sem academia: comparabilidade limitada" : ""}</div>
            </button>
          );
        })}
      </div>

      {/* BLOCO 3b — Evolução de desempenho */}
      <div style={{ padding: "0 16px 16px" }}>
        <H>📈 Evolução de desempenho</H>
        <div style={{ fontSize: 11, color: C.sub, marginBottom: 12 }}>Último treino das últimas 4 semanas vs. último das 4 anteriores · mesmo equipamento · carga, reps, séries e força estimada separadas</div>
        {evolution.map((e) => (
          <button key={e.name} onClick={() => onOpenExercise && onOpenExercise(e.name)} style={{ width: "100%", textAlign: "left", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: "10px 12px", marginBottom: 8, cursor: "pointer" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <span style={{ fontSize: 13, color: C.text, fontWeight: 600 }}>{e.name}</span>
              <span style={{ fontSize: 10, color: C.sub }}>{e.freqPrev} → {e.freqRecent} sessões/4 sem</span>
            </div>
            {e.insufficient ? (
              <div style={{ fontSize: 11, color: C.sub }}>❔ Dados insuficientes para avaliar a progressão (precisa de registros comparáveis nos dois períodos).</div>
            ) : (
              <>
                <div style={{ fontSize: 10, color: C.sub, marginBottom: 6 }}>
                  {e.from.workingSets}×{e.from.repsAtTop} com {e.from.topWeight}kg ({fmtDate(e.from.date).slice(0, 5)}) → {e.to.workingSets}×{e.to.repsAtTop} com {e.to.topWeight}kg ({fmtDate(e.to.date).slice(0, 5)})
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {e.tags.map((t, i) => <span key={i} style={{ fontSize: 10, color: tagColor(t.good), border: `1px solid ${tagColor(t.good)}55`, borderRadius: 20, padding: "2px 8px" }}>{t.text}</span>)}
                </div>
              </>
            )}
            {e.limited && <div style={{ fontSize: 9, color: C.sub, marginTop: 4 }}>Sem academia informada — comparabilidade limitada</div>}
          </button>
        ))}
      </div>

      {/* BLOCO 4 — Recomendações */}
      {recommendations.length > 0 && (
        <div style={{ padding: "0 16px 16px" }}>
          <H>🎯 Recomendações</H>
          <div style={{ fontSize: 11, color: C.sub, marginBottom: 12 }}>Baseadas em semanas completas, frequência e desempenho — nunca em um único indicador</div>
          {recommendations.map((r, i) => (
            <div key={i} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 14, marginBottom: 10, borderLeft: `3px solid ${r.tone === "good" ? "#4caf50" : r.tone === "danger" ? "#f44336" : r.tone === "warn" ? "#ff9800" : C.sub}` }}>
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
          <H info onInfo={() => setActiveConcept("periodization")}>🔄 Hora de variar?</H>
          <div style={{ fontSize: 11, color: C.sub, marginBottom: 12 }}>Exercícios principais há 8+ sessões — considere alternar para novo estímulo</div>
          {periodizationSuggestions.map((p, i) => (
            <div key={i} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 14, marginBottom: 10 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 4 }}>
                {p.exName}
                <span style={{ fontSize: 11, color: C.sub, marginLeft: 8 }}>{TRAIN_TYPES[p.trainType]?.emoji} Treino {p.trainType} · {p.count} sessões</span>
              </div>
              {p.suggestions.length > 0 && <div style={{ fontSize: 12, color: C.sub, marginBottom: 10 }}>Alternativas: <strong style={{ color: C.text }}>{p.suggestions.join(", ")}</strong></div>}
              <button onClick={() => snoozeUntil(p.exName, p.trainType)} style={{ padding: "6px 12px", borderRadius: 8, border: `1px solid ${C.border}`, background: "transparent", color: C.sub, fontSize: 11, cursor: "pointer" }}>Ignorar por 2 semanas</button>
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
            <button key={t} onClick={() => setSelTT(t)} style={{ flex: 1, padding: "8px 4px", borderRadius: 8, border: `1px solid ${selTT === t ? TRAIN_TYPES[t].color : C.border}`, background: selTT === t ? `${TRAIN_TYPES[t].color}22` : C.surface, color: selTT === t ? TRAIN_TYPES[t].color : C.sub, fontSize: 12, cursor: "pointer" }}>{TRAIN_TYPES[t].emoji}{t}</button>
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
