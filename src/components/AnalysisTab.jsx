// src/components/AnalysisTab.jsx
// Análise em 4 abas (Resumo · Volume · Progresso · Dicas), visual primeiro.
import { useState } from "react";
import {
  ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, Cell, LineChart, BarChart, ReferenceLine, CartesianGrid,
} from "recharts";
import { Info, TrendingUp, TrendingDown, Minus, ChevronRight, Lightbulb, Activity, BarChart3, Gauge } from "lucide-react";
import { C, MUSCLE_GROUPS, TRAIN_TYPES, PERIODIZATION_TIPS, todayISO, addDays, weekStartISO, fmtDate } from "../data/constants";
import { getAdjustedLandmarks, classifyVolume } from "../data/volumeLandmarks";
import { ALL_EXERCISES } from "../data/exercises";
import { daysAgo, sessionsInRange, weeksAsMainExercise } from "../data/analyticsHelpers";
import {
  setsByMuscle, topExercisesProgression, performanceEvolution, periodRanges, periodStats, STATUS, weeklySeries, sparkPoints,
} from "../data/progression";

const VOLUME_MUSCLES = ["Peito", "Costas", "Ombros", "Bíceps", "Tríceps", "Quadríceps", "Posterior de Coxa", "Glúteos", "Panturrilha", "Core / Abdômen"];
const ZONE = {
  below_mev: { color: "#ff9800", label: "Abaixo do MEV" },
  below_mav: { color: "#ffc107", label: "Abaixo da faixa" },
  in_mav:    { color: "#4caf50", label: "Na faixa" },
  above_mrv: { color: "#f44336", label: "Acima do MRV" },
};

const CONCEPTS = {
  mev: {
    title: "MEV · MAV · MRV — referências de volume",
    body: "MEV (volume mínimo efetivo estimado): menor nº de séries semanais que costuma gerar ganho.\nMAV (faixa de volume adaptativo máximo estimada): faixa onde a maioria responde melhor.\nMRV (volume máximo recuperável estimado): acima disso a recuperação tende a não acompanhar.\n\nSão referências APROXIMADAS e individuais, não limites universais. Estar abaixo do MEV não significa que o treino está inadequado — manutenção, deload ou alta intensidade podem justificar menos séries. Ajuste em ⚙️.\n\nContagem: só séries de trabalho (aquecimentos não contam). Séries indiretas (ex.: puxada → bíceps) contam como fração configurável (padrão ½).",
    source: "Israetel et al. — RP Volume Landmarks; Schoenfeld et al. (2017); Pelland et al. (2024)",
  },
  progression: {
    title: "Progressão comparável",
    body: "Só comparamos registros do MESMO exercício, academia e equipamento. Carga e repetições são avaliadas juntas: mesma carga com mais reps = progressão de repetições; mais carga com menos reps não é tratada automaticamente como melhora geral.\n\nO gráfico mostra o 1RM estimado (Epley, séries de 1–12 reps) — uma estimativa, não uma medição direta.",
    source: "Epley (1985); Haff & Triplett (2015) — NSCA; Helms et al. (2016)",
  },
  volume: {
    title: "Tonelagem × séries",
    body: "Tonelagem = soma de reps × carga de todas as séries. Volume de treinamento = nº de séries de trabalho.\n\nSão métricas diferentes. A tonelagem muda com troca de exercício, academia ou equipamento e NÃO indica sozinha melhora ou piora. Com o período em andamento, a comparação equivalente usa os mesmos dias decorridos.",
    source: "Schoenfeld et al. (2017); Baz-Valle et al. (2022)",
  },
  periodization: {
    title: "Variação de exercício",
    body: "Após 8–12 sessões com os mesmos exercícios principais, trocar 1–2 exercícios renova o estímulo sem abandonar o que funciona.",
    source: "Fonseca et al. (2014) — JSCR; Fabrício Pacholok",
  },
};

// ── Peças visuais ──────────────────────────────────────────────────────────────
const card = { background: `linear-gradient(180deg, ${C.surface}, #111217)`, border: `1px solid ${C.border}`, borderRadius: 16, padding: 14, marginBottom: 12 };
const tooltipStyle = { contentStyle: { background: "#1c1d24", border: `1px solid ${C.border}`, borderRadius: 10, fontSize: 12, color: C.text }, labelStyle: { color: C.sub }, cursor: { fill: "rgba(255,255,255,.04)" } };
const pctTxt = (v) => (v === null || !isFinite(v) ? "—" : `${v >= 0 ? "+" : ""}${v.toFixed(0)}%`);
const pct = (a, b) => (b ? ((a - b) / b) * 100 : null);

function ConceptModal({ concept, onClose }) {
  if (!concept) return null;
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "flex-end", zIndex: 1000 }} onClick={onClose}>
      <div className="fade" style={{ background: C.surface, borderRadius: "20px 20px 0 0", padding: 24, width: "100%", maxWidth: 680, margin: "0 auto", maxHeight: "85vh", overflowY: "auto" }} onClick={(e) => e.stopPropagation()}>
        <div style={{ fontWeight: 700, fontSize: 16, color: C.text, marginBottom: 8 }}>{concept.title}</div>
        <div style={{ fontSize: 13, color: C.sub, lineHeight: 1.6, marginBottom: 12, whiteSpace: "pre-line" }}>{concept.body}</div>
        <div style={{ fontSize: 11, color: C.accent }}>📚 {concept.source}</div>
        <button className="press" onClick={onClose} style={{ marginTop: 16, width: "100%", padding: 12, borderRadius: 12, border: "none", background: C.surfaceHigh, color: C.text, cursor: "pointer", fontSize: 14 }}>Fechar</button>
      </div>
    </div>
  );
}

const Title = ({ children, sub, onInfo }) => (
  <div style={{ marginBottom: 10 }}>
    <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 14, fontWeight: 700, color: C.text }}>
      {children}
      {onInfo && <button onClick={onInfo} aria-label="Explicação" style={{ background: "none", border: "none", color: C.sub, cursor: "pointer", display: "flex", padding: 2 }}><Info size={15} /></button>}
    </div>
    {sub && <div style={{ fontSize: 11, color: C.sub, marginTop: 2 }}>{sub}</div>}
  </div>
);

const Seg = ({ opts, val, set, small }) => (
  <div style={{ display: "flex", background: C.surfaceHigh, borderRadius: 12, padding: 3, gap: 3, marginBottom: 12 }}>
    {opts.map(([v, l]) => (
      <button key={v} className="press" onClick={() => set(v)} style={{ flex: 1, padding: small ? "6px 4px" : "8px 4px", borderRadius: 9, border: "none", fontSize: small ? 11 : 12, fontWeight: 600, cursor: "pointer",
        background: val === v ? C.accent : "transparent", color: val === v ? "#000" : C.sub }}>{l}</button>
    ))}
  </div>
);

const Kpi = ({ label, value, delta, hint, color }) => (
  <div style={{ ...card, marginBottom: 0, padding: 12, flex: 1, minWidth: 0 }}>
    <div style={{ fontSize: 10, color: C.sub, marginBottom: 4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{label}</div>
    <div className="num" style={{ fontSize: 22, fontWeight: 700, color: C.text, lineHeight: 1.1 }}>{value}</div>
    {delta !== undefined && <div className="num" style={{ fontSize: 11, color: color || C.sub, marginTop: 3 }}>{delta}</div>}
    {hint && <div style={{ fontSize: 9, color: C.sub, marginTop: 3 }}>{hint}</div>}
  </div>
);

// Barra com zonas MEV/MAV/MRV e marcador do volume atual
function VolumeBand({ value, l, color }) {
  const max = Math.max(l.mrv * 1.25, value * 1.05, 1);
  const p = (v) => `${Math.min(100, (v / max) * 100)}%`;
  return (
    <div style={{ position: "relative", height: 10, borderRadius: 6, background: "#1a1b22", overflow: "hidden" }}>
      <div style={{ position: "absolute", left: p(l.mev), width: `calc(${p(l.mavMin)} - ${p(l.mev)})`, top: 0, bottom: 0, background: "rgba(255,193,7,.12)" }} />
      <div style={{ position: "absolute", left: p(l.mavMin), width: `calc(${p(l.mavMax)} - ${p(l.mavMin)})`, top: 0, bottom: 0, background: "rgba(76,175,80,.22)" }} />
      <div style={{ position: "absolute", left: p(l.mavMax), width: `calc(${p(l.mrv)} - ${p(l.mavMax)})`, top: 0, bottom: 0, background: "rgba(255,193,7,.12)" }} />
      <div style={{ position: "absolute", left: p(l.mrv), right: 0, top: 0, bottom: 0, background: "rgba(244,67,54,.15)" }} />
      <div style={{ position: "absolute", left: 0, width: p(value), top: 3, bottom: 3, borderRadius: 3, background: color, transition: "width .4s" }} />
    </div>
  );
}

const statusIcon = (s) => (s === "load" || s === "reps" ? <TrendingUp size={13} /> : s === "regression" ? <TrendingDown size={13} /> : <Minus size={13} />);

export function AnalysisTab({ sessions, profileConfig, prefs, landmarkOverrides = {}, onOpenExercise }) {
  const [view, setView] = useState(() => { try { return localStorage.getItem("ironlog_analysis_view") || "resumo"; } catch { return "resumo"; } });
  const [period, setPeriod] = useState(30);
  const [selTT, setSelTT] = useState("A");
  const [activeConcept, setActiveConcept] = useState(null);
  const [compareMode, setCompareMode] = useState("week");
  const [basis, setBasis] = useState("equivalent");
  const [snoozed, setSnoozed] = useState(() => { try { return JSON.parse(localStorage.getItem("ironlog_snoozed") || "{}"); } catch { return {}; } });
  const setViewP = (v) => { setView(v); try { localStorage.setItem("ironlog_analysis_view", v); } catch {} };

  const today = todayISO();
  const focal = profileConfig?.focalGroups || [];
  const lm = (m) => getAdjustedLandmarks(m, profileConfig, landmarkOverrides);
  const snoozeKey = (n, tt) => `${n}__${tt}`;
  const isSnoozed = (n, tt) => { const u = snoozed[snoozeKey(n, tt)]; return u ? today <= u : false; };
  const snoozeUntil = (n, tt) => { const u = { ...snoozed, [snoozeKey(n, tt)]: addDays(today, 14) }; setSnoozed(u); try { localStorage.setItem("ironlog_snoozed", JSON.stringify(u)); } catch {} };

  // ── Dados ──
  const currentSessions = sessionsInRange(sessions, daysAgo(period - 1), today);
  const periodSets = setsByMuscle(currentSessions, prefs);
  const weeks = period / 7;
  const R = periodRanges(compareMode, basis, today);
  const cur = periodStats(sessions, R.curStart, R.curEnd, prefs);
  const prev = periodStats(sessions, R.prevStart, R.prevEnd, prefs);
  const tonDelta = pct(cur.tonnage, prev.tonnage);
  const avgDelta = pct(cur.avgPerSession, prev.avgPerSession);
  const neutralNeg = R.inProgress && basis === "full";
  const deltaColor = (d) => (d === null ? C.sub : d >= 0 ? "#4caf50" : neutralNeg ? C.sub : "#ff9800");
  const trends = topExercisesProgression(sessions, prefs, 8, 8, today);
  const evolution = performanceEvolution(sessions, prefs, 8, today);
  const weekly = weeklySeries(sessions, prefs, 12, today);

  // ── Recomendações ──
  const recommendations = [];
  const ws = weekStartISO(today);
  const completeWeeks = [1, 2, 3].map((k) => { const from = addDays(ws, -7 * k); return { sets: setsByMuscle(sessionsInRange(sessions, from, addDays(from, 6)), prefs) }; });
  const firstDate = sessions.reduce((a, s) => (s.date < a ? s.date : a), today);
  const enoughHistory = firstDate <= addDays(ws, -21);
  const curWeekSets = setsByMuscle(sessionsInRange(sessions, ws, today), prefs);
  const dayOfWeek = Math.round((new Date(today + "T12:00:00") - new Date(ws + "T12:00:00")) / 864e5) + 1;
  const regressingCats = new Set(trends.filter((t) => t.status === "regression").map((t) => ALL_EXERCISES.find((e) => e.name === t.name)?.category).filter(Boolean));
  if (!enoughHistory) {
    recommendations.push({ tone: "info", text: "Dados insuficientes para avaliar volume por semana — são necessárias pelo menos 3 semanas completas.", conceptKey: "mev" });
  } else {
    VOLUME_MUSCLES.forEach((m) => {
      const l = lm(m); if (!l) return;
      const isFocal = focal.includes(m);
      const label = MUSCLE_GROUPS.find((x) => x.key === m)?.label || m;
      const hist = completeWeeks.map((w) => +(w.sets[m]?.total || 0).toFixed(1));
      const chrono = [...hist].reverse().join(" → ");
      if (hist.some((v) => v > 0) && hist.every((v) => v < l.mev)) {
        recommendations.push({ tone: "warn", isFocal, conceptKey: "mev", title: label,
          text: regressingCats.has(m)
            ? `Abaixo do MEV (${l.mev}) há 3 semanas (${chrono} séries) e com possível regressão no grupo. Acompanhe a recuperação antes de mudar o volume.`
            : `Abaixo do MEV (${l.mev}) há 3 semanas completas (${chrono} séries). Se a recuperação estiver boa, considere aumentar gradualmente (+1–2 séries/sem).` });
      } else if (hist[0] > l.mrv && hist[1] > l.mrv) {
        recommendations.push({ tone: "danger", isFocal, conceptKey: "mev", title: label, text: `Acima do MRV (${l.mrv}) há 2 semanas (${hist[1]} → ${hist[0]} séries). Avalie a recuperação; se o desempenho cair, considere reduzir.` });
      } else if (isFocal && hist[0] >= l.mavMin && hist[0] <= l.mavMax) {
        recommendations.push({ tone: "good", isFocal, conceptKey: "mev", title: label, text: `Grupo foco na faixa de referência na última semana completa (${hist[0]} séries; ref. ${l.mavMin}–${l.mavMax}).` });
      }
      if (isFocal && dayOfWeek < 7) {
        const sofar = +(curWeekSets[m]?.total || 0).toFixed(1);
        if (sofar < l.mev) recommendations.push({ tone: "info", isFocal, conceptKey: "mev", title: label, text: `Seu volume semanal ainda está em andamento (${sofar} séries até o dia ${dayOfWeek}/7). Sem ação por enquanto.` });
      }
    });
  }
  trends.filter((t) => t.status === "regression").slice(0, 3).forEach((t) => recommendations.push({ tone: "warn", conceptKey: "progression", title: t.name, text: `Possível regressão no mesmo equipamento — ${t.note}` }));
  recommendations.sort((a, b) => (b.isFocal ? 1 : 0) - (a.isFocal ? 1 : 0));

  const periodizationSuggestions = [];
  Object.keys(TRAIN_TYPES).forEach((tt) => {
    const typeSessions = sessions.filter((s) => (s.trainType || "") === tt);
    if (typeSessions.length < 3) return;
    const freq = {};
    typeSessions.forEach((s) => [0, 1].forEach((i) => { const ex = s.exercises[i]; if (ex) freq[ex.name] = (freq[ex.name] || 0) + 1; }));
    Object.keys(freq).forEach((n) => {
      if (isSnoozed(n, tt)) return;
      const count = weeksAsMainExercise(n, tt, sessions);
      if (count >= 8) periodizationSuggestions.push({ exName: n, trainType: tt, count, suggestions: ALL_EXERCISES.find((e) => e.name === n)?.alts?.slice(0, 3) || [] });
    });
  });
  const ttCount = {};
  currentSessions.forEach((s) => { const tt = s.trainType || "?"; ttCount[tt] = (ttCount[tt] || 0) + 1; });

  const statusCount = { up: 0, flat: 0, down: 0, na: 0 };
  trends.forEach((t) => { if (t.status === "load" || t.status === "reps") statusCount.up++; else if (t.status === "regression") statusCount.down++; else if (t.status === "stable") statusCount.flat++; else statusCount.na++; });
  const evoBars = evolution.filter((e) => !e.insufficient && e.to?.e1rm && e.from?.e1rm).map((e) => ({ name: e.name, v: Math.round(((e.to.e1rm - e.from.e1rm) / e.from.e1rm) * 1000) / 10 }));

  const TABS = [["resumo", "Resumo", Gauge], ["volume", "Volume", BarChart3], ["progresso", "Progresso", Activity], ["dicas", "Dicas", Lightbulb]];
  const toneColor = { good: "#4caf50", danger: "#f44336", warn: "#ff9800", info: C.sub };

  return (
    <div style={{ padding: "12px 16px 110px" }}>
      <ConceptModal concept={activeConcept ? CONCEPTS[activeConcept] : null} onClose={() => setActiveConcept(null)} />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 6, marginBottom: 14 }}>
        {TABS.map(([k, l, Icon]) => (
          <button key={k} className="press" onClick={() => setViewP(k)} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, padding: "8px 2px", borderRadius: 14, fontSize: 11, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap", position: "relative",
            border: `1px solid ${view === k ? C.accent : C.border}`, background: view === k ? C.accentD : C.surface, color: view === k ? C.accent : C.sub }}>
            <Icon size={15} />{l}
            {k === "dicas" && recommendations.length > 0 && <span className="num" style={{ position: "absolute", top: 4, right: 8, fontSize: 9, background: view === k ? C.accent : C.border, color: view === k ? "#000" : C.text, borderRadius: 10, padding: "0 6px" }}>{recommendations.length}</span>}
          </button>
        ))}
      </div>

      {/* ═══════════ RESUMO ═══════════ */}
      {view === "resumo" && (
        <div className="fade">
          <Seg opts={[["week", "Esta semana"], ["month", "Este mês"]]} val={compareMode} set={setCompareMode} />
          {R.inProgress && <div style={{ fontSize: 11, color: C.warn, margin: "-4px 0 10px" }}>⏳ Em andamento — dia {R.elapsed} de {R.totalDays} · comparado aos mesmos {R.elapsed} dias do período anterior</div>}
          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            <Kpi label="Sessões" value={cur.sessions} delta={`vs ${periodStats(sessions, R.prevStart, periodRanges(compareMode, "equivalent", today).prevEnd, prefs).sessions}`} />
            <Kpi label="Tonelagem" value={`${(cur.tonnage / 1000).toFixed(1)}t`} delta={pctTxt(pct(cur.tonnage, periodStats(sessions, R.prevStart, periodRanges(compareMode, "equivalent", today).prevEnd, prefs).tonnage))} color={deltaColor(tonDelta)} />
            <Kpi label="Média/sessão" value={`${(cur.avgPerSession / 1000).toFixed(1)}t`} delta={pctTxt(avgDelta)} color={deltaColor(avgDelta)} />
          </div>

          <div style={card}>
            <Title sub="Tonelagem (barras) e sessões (linha) · últimas 12 semanas" onInfo={() => setActiveConcept("volume")}>Ritmo semanal</Title>
            <div style={{ height: 170, marginLeft: -10 }}>
              <ResponsiveContainer>
                <ComposedChart data={weekly} margin={{ top: 6, right: 4, bottom: 0, left: 0 }}>
                  <CartesianGrid vertical={false} stroke="#22232b" />
                  <XAxis dataKey="label" tick={{ fontSize: 9, fill: C.sub }} tickLine={false} axisLine={false} interval={1} />
                  <YAxis yAxisId="t" tick={{ fontSize: 9, fill: C.sub }} tickLine={false} axisLine={false} width={34} unit="t" />
                  <YAxis yAxisId="s" orientation="right" hide domain={[0, "dataMax + 2"]} />
                  <Tooltip {...tooltipStyle} formatter={(v, n) => (n === "tonnage" ? [`${v} t`, "Tonelagem"] : [v, "Sessões"])} />
                  <Bar isAnimationActive={false} yAxisId="t" dataKey="tonnage" radius={[5, 5, 0, 0]}>
                    {weekly.map((w, i) => <Cell key={i} fill={w.inProgress ? "rgba(245,166,35,.35)" : C.accent} />)}
                  </Bar>
                  <Line isAnimationActive={false} yAxisId="s" dataKey="sessions" stroke="#4fc3f7" strokeWidth={2} dot={{ r: 2.5, fill: "#4fc3f7" }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            <div style={{ fontSize: 10, color: C.sub, marginTop: 4 }}>Barra clara = semana atual (em andamento). Tonelagem sozinha não indica melhora ou piora.</div>
          </div>

          <div style={card}>
            <Title sub="Top 8 exercícios · último treino vs. anterior no mesmo equipamento" onInfo={() => setActiveConcept("progression")}>Como está a progressão</Title>
            <div style={{ display: "flex", height: 12, borderRadius: 6, overflow: "hidden", marginBottom: 10, background: C.surfaceHigh }}>
              {[["up", "#4caf50"], ["flat", "#757575"], ["down", "#ff9800"], ["na", "#3a3b45"]].map(([k, col]) => statusCount[k] > 0 && <div key={k} style={{ flex: statusCount[k], background: col }} />)}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}>
              <span style={{ color: "#4caf50" }}>▲ {statusCount.up} progredindo</span>
              <span style={{ color: "#9e9e9e" }}>■ {statusCount.flat} estáveis</span>
              <span style={{ color: "#ff9800" }}>▼ {statusCount.down} atenção</span>
              {statusCount.na > 0 && <span style={{ color: C.sub }}>? {statusCount.na}</span>}
            </div>
            <button className="press" onClick={() => setViewP("progresso")} style={{ marginTop: 12, width: "100%", padding: 10, borderRadius: 10, border: `1px solid ${C.border}`, background: "transparent", color: C.accent, fontSize: 12, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
              Ver gráficos por exercício <ChevronRight size={14} />
            </button>
          </div>

          {recommendations.filter((r) => r.tone !== "info").slice(0, 2).map((r, i) => (
            <button key={i} className="press" onClick={() => setViewP("dicas")} style={{ ...card, width: "100%", textAlign: "left", cursor: "pointer", borderLeft: `3px solid ${toneColor[r.tone]}`, display: "flex", gap: 10, alignItems: "center" }}>
              <Lightbulb size={16} color={toneColor[r.tone]} style={{ flexShrink: 0 }} />
              <div style={{ fontSize: 12, color: C.text, lineHeight: 1.4 }}><strong>{r.title}</strong> · {r.text.length > 90 ? r.text.slice(0, 90) + "…" : r.text}</div>
            </button>
          ))}
        </div>
      )}

      {/* ═══════════ VOLUME ═══════════ */}
      {view === "volume" && (
        <div className="fade">
          <div style={card}>
            <Title sub={`Séries de trabalho/semana · média dos últimos ${period} dias`} onInfo={() => setActiveConcept("mev")}>Volume por grupamento</Title>
            <Seg small opts={[[7, "7d"], [14, "14d"], [30, "30d"], [60, "60d"], [90, "90d"]]} val={period} set={setPeriod} />
            {MUSCLE_GROUPS.filter((m) => VOLUME_MUSCLES.includes(m.key)).map((m) => {
              const d = periodSets[m.key] || { direct: 0, indirect: 0, total: 0 };
              const wk = Math.round((d.total / weeks) * 10) / 10;
              const l = lm(m.key);
              const z = ZONE[classifyVolume(wk, m.key, profileConfig, landmarkOverrides)];
              return (
                <div key={m.key} style={{ marginBottom: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 5 }}>
                    <span style={{ fontSize: 13, color: C.text, display: "flex", alignItems: "center", gap: 6 }}>
                      {m.label}
                      {focal.includes(m.key) && <span style={{ fontSize: 9, fontWeight: 700, background: C.accentD, color: C.accent, borderRadius: 4, padding: "1px 5px" }}>FOCO</span>}
                    </span>
                    <span><span className="num" style={{ fontSize: 15, fontWeight: 700, color: z.color }}>{wk}</span><span style={{ fontSize: 10, color: C.sub }}> /sem · {z.label}</span></span>
                  </div>
                  <VolumeBand value={wk} l={l} color={z.color} />
                  <div className="num" style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: C.sub, marginTop: 3 }}>
                    <span>{d.indirect > 0 ? `${(d.direct / weeks).toFixed(1)} diretas + ${(d.indirect / weeks).toFixed(1)}×${prefs.indirectFactor} ind.` : ""}</span>
                    <span>MEV {l.mev} · faixa {l.mavMin}–{l.mavMax} · MRV {l.mrv}{l.custom ? " ✎" : ""}</span>
                  </div>
                </div>
              );
            })}
            <div style={{ display: "flex", gap: 10, fontSize: 9, color: C.sub, flexWrap: "wrap" }}>
              <span><span style={{ display: "inline-block", width: 8, height: 8, background: "rgba(76,175,80,.5)", borderRadius: 2 }} /> faixa de referência</span>
              <span><span style={{ display: "inline-block", width: 8, height: 8, background: "rgba(244,67,54,.4)", borderRadius: 2 }} /> acima do MRV</span>
            </div>
          </div>

          <div style={card}>
            <Title sub="Séries de trabalho por grupamento" onInfo={() => setActiveConcept("volume")}>Comparativo de períodos</Title>
            <Seg small opts={[["week", "Semana"], ["month", "Mês"]]} val={compareMode} set={setCompareMode} />
            <Seg small opts={[["equivalent", "Mesmos dias"], ["full", "Período completo"]]} val={basis} set={setBasis} />
            {R.inProgress && <div style={{ fontSize: 11, color: C.warn, marginBottom: 10 }}>⏳ Dia {R.elapsed} de {R.totalDays}{basis === "full" ? " — queda aqui não indica regressão." : "."}</div>}
            <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
              <Kpi label="Tonelagem" value={`${(cur.tonnage / 1000).toFixed(1)}t`} delta={`${pctTxt(tonDelta)} vs ${(prev.tonnage / 1000).toFixed(1)}t`} color={deltaColor(tonDelta)} />
              <Kpi label="Sessões" value={cur.sessions} delta={`vs ${prev.sessions}`} />
            </div>
            {(() => {
              const data = MUSCLE_GROUPS.filter((m) => (cur.sets[m.key]?.total || 0) + (prev.sets[m.key]?.total || 0) > 0)
                .map((m) => ({ name: m.label, atual: +(cur.sets[m.key]?.total || 0).toFixed(1), anterior: +(prev.sets[m.key]?.total || 0).toFixed(1) }));
              return (
                <div style={{ height: Math.max(120, data.length * 30), marginLeft: -6 }}>
                  <ResponsiveContainer>
                    <BarChart data={data} layout="vertical" margin={{ top: 0, right: 8, bottom: 0, left: 0 }} barGap={1}>
                      <XAxis type="number" hide />
                      <YAxis type="category" dataKey="name" width={78} tick={{ fontSize: 11, fill: C.text }} tickLine={false} axisLine={false} />
                      <Tooltip {...tooltipStyle} />
                      <Bar isAnimationActive={false} dataKey="anterior" fill="#3a3b45" radius={[0, 4, 4, 0]} barSize={8} />
                      <Bar isAnimationActive={false} dataKey="atual" fill={C.accent} radius={[0, 4, 4, 0]} barSize={8} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              );
            })()}
            <div style={{ display: "flex", gap: 12, fontSize: 10, color: C.sub, marginTop: 4 }}>
              <span><span style={{ display: "inline-block", width: 8, height: 8, background: "#3a3b45", borderRadius: 2 }} /> anterior</span>
              <span><span style={{ display: "inline-block", width: 8, height: 8, background: C.accent, borderRadius: 2 }} /> atual</span>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════ PROGRESSO ═══════════ */}
      {view === "progresso" && (
        <div className="fade">
          <Title sub="1RM estimado no mesmo equipamento · toque para detalhes" onInfo={() => setActiveConcept("progression")}>Progressão por exercício</Title>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10, marginBottom: 14 }}>
            {trends.map((t) => {
              const st = STATUS[t.status];
              const pts = sparkPoints(sessions, t.name, prefs);
              const hasLine = pts.filter((p) => p.e1rm).length > 1;
              const last = pts[pts.length - 1];
              return (
                <button key={t.name} className="press" onClick={() => onOpenExercise && onOpenExercise(t.name)} style={{ ...card, marginBottom: 0, padding: 12, textAlign: "left", cursor: "pointer", minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: C.text, lineHeight: 1.25, height: 30, overflow: "hidden" }}>{t.name}</div>
                  <div style={{ height: 46, margin: "6px -4px 4px" }}>
                    {hasLine ? (
                      <ResponsiveContainer>
                        <LineChart data={pts}>
                          <YAxis hide domain={["dataMin - 2", "dataMax + 2"]} />
                          <Line isAnimationActive={false} dataKey="e1rm" stroke={st.color === "#9e9e9e" ? C.accent : st.color} strokeWidth={2} dot={false} connectNulls />
                        </LineChart>
                      </ResponsiveContainer>
                    ) : <div style={{ fontSize: 10, color: C.sub, paddingTop: 14, textAlign: "center" }}>poucos dados comparáveis</div>}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 4 }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 10, color: st.color, minWidth: 0 }}>{statusIcon(t.status)}<span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{st.label.replace("Progressão de ", "+ ")}</span></span>
                    {last && <span className="num" style={{ fontSize: 11, color: C.text }}>{last.top}kg</span>}
                  </div>
                </button>
              );
            })}
          </div>

          {evoBars.length > 0 && (
            <div style={card}>
              <Title sub="Variação do 1RM estimado: últimas 4 semanas vs. 4 anteriores">Evolução de força</Title>
              <div style={{ height: Math.max(120, evoBars.length * 30), marginLeft: -6 }}>
                <ResponsiveContainer>
                  <BarChart data={evoBars} layout="vertical" margin={{ top: 0, right: 42, bottom: 0, left: 0 }}>
                    <XAxis type="number" hide domain={[(m) => Math.min(0, m) * 1.15, (m) => Math.max(0, m) * 1.15 || 1]} />
                    <YAxis type="category" dataKey="name" width={128} tickFormatter={(v) => (v.length > 22 ? v.slice(0, 21) + "…" : v)} tick={{ fontSize: 10, fill: C.text }} tickLine={false} axisLine={false} />
                    <ReferenceLine x={0} stroke={C.border} />
                    <Tooltip {...tooltipStyle} formatter={(v) => [`${v > 0 ? "+" : ""}${v}%`, "1RM est."]} />
                    <Bar isAnimationActive={false} dataKey="v" radius={4} barSize={12} label={{ position: "right", fontSize: 10, fill: C.sub, formatter: (v) => `${v > 0 ? "+" : ""}${v}%` }}>
                      {evoBars.map((e, i) => <Cell key={i} fill={e.v > 1 ? "#4caf50" : e.v < -3 ? "#ff9800" : "#757575"} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          <div style={card}>
            <Title sub="Carga, reps, séries e força separadas — mesmo equipamento">Evolução de desempenho</Title>
            {evolution.map((e) => (
              <button key={e.name} onClick={() => onOpenExercise && onOpenExercise(e.name)} style={{ width: "100%", textAlign: "left", background: "none", border: "none", borderTop: `1px solid ${C.border}`, padding: "10px 0", cursor: "pointer" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <span style={{ fontSize: 13, color: C.text, fontWeight: 600 }}>{e.name}</span>
                  <ChevronRight size={14} color={C.sub} />
                </div>
                {e.insufficient
                  ? <div style={{ fontSize: 11, color: C.sub }}>Dados insuficientes nos dois períodos</div>
                  : <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                      {e.tags.map((t, i) => {
                        const col = t.good === true ? "#4caf50" : t.good === false ? "#ff9800" : C.sub;
                        return <span key={i} style={{ fontSize: 10, color: col, background: `${col}18`, borderRadius: 20, padding: "3px 8px" }}>{t.text}</span>;
                      })}
                    </div>}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ═══════════ DICAS ═══════════ */}
      {view === "dicas" && (
        <div className="fade">
          <Title sub="Baseadas em semanas completas, frequência e desempenho" onInfo={() => setActiveConcept("mev")}>Recomendações</Title>
          {recommendations.length === 0 && <div style={{ ...card, fontSize: 13, color: C.sub }}>Nada a ajustar agora. 👌</div>}
          {recommendations.map((r, i) => (
            <div key={i} style={{ ...card, borderLeft: `3px solid ${toneColor[r.tone]}` }}>
              {r.title && <div style={{ fontSize: 12, fontWeight: 700, color: toneColor[r.tone], marginBottom: 4 }}>{r.isFocal ? "★ " : ""}{r.title}</div>}
              <div style={{ fontSize: 13, color: C.text, lineHeight: 1.5 }}>{r.text}</div>
            </div>
          ))}

          {periodizationSuggestions.length > 0 && (<>
            <div style={{ height: 6 }} />
            <Title sub="Exercícios principais há 8+ sessões" onInfo={() => setActiveConcept("periodization")}>Hora de variar?</Title>
            {periodizationSuggestions.map((p, i) => (
              <div key={i} style={card}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{p.exName}</span>
                  <span style={{ fontSize: 10, color: TRAIN_TYPES[p.trainType]?.color, whiteSpace: "nowrap" }}>Treino {p.trainType} · {p.count}x</span>
                </div>
                {p.suggestions.length > 0 && <div style={{ fontSize: 12, color: C.sub, marginBottom: 10 }}>Alternativas: <span style={{ color: C.text }}>{p.suggestions.join(", ")}</span></div>}
                <button className="press" onClick={() => snoozeUntil(p.exName, p.trainType)} style={{ padding: "6px 12px", borderRadius: 8, border: `1px solid ${C.border}`, background: "transparent", color: C.sub, fontSize: 11, cursor: "pointer" }}>Ignorar por 2 semanas</button>
              </div>
            ))}
          </>)}

          <div style={card}>
            <Title sub={`Treinos nos últimos ${period} dias`}>Distribuição ABCDE</Title>
            <div style={{ display: "flex", gap: 6, alignItems: "flex-end", height: 80 }}>
              {Object.entries(TRAIN_TYPES).map(([k, v]) => {
                const n = ttCount[k] || 0, mx = Math.max(1, ...Object.values(ttCount));
                return (
                  <div key={k} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                    <span className="num" style={{ fontSize: 12, color: v.color, fontWeight: 700 }}>{n}</span>
                    <div style={{ width: "100%", height: `${Math.max(4, (n / mx) * 50)}px`, background: v.color, borderRadius: 6, opacity: .85 }} />
                    <span style={{ fontSize: 10, color: C.sub }}>{k}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div style={card}>
            <Title>📚 Periodização — Fabrício Pacholok</Title>
            <Seg small opts={["A", "B", "C", "D", "E"].map((t) => [t, t])} val={selTT} set={setSelTT} />
            {PERIODIZATION_TIPS[selTT].map((tip, i) => (
              <div key={i} style={{ borderTop: i ? `1px solid ${C.border}` : "none", padding: "10px 0" }}>
                <div style={{ fontSize: 11, color: C.accent, fontWeight: 700, marginBottom: 4 }}>{tip.phase}</div>
                <div style={{ fontSize: 12, color: C.text, lineHeight: 1.6 }}>{tip.tip}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
