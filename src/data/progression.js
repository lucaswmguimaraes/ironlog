// src/data/progression.js
// Análises de desempenho comparáveis (mesmo exercício + academia + equipamento).
import { calcVolume, addDays, weekStartISO, todayISO } from "./constants";
import { secondaryMuscles } from "./exercises";

export const DEFAULT_ANALYSIS_PREFS = {
  autoWarmup: true,      // detecta aquecimento automaticamente nas séries iniciais leves
  warmupPct: 0.6,        // série inicial com carga < 60% da maior carga do exercício
  indirectFactor: 0.5,   // série indireta conta 0,5 (Pelland et al. 2024)
};

const num = (v) => +v || 0;

// ── Séries de aquecimento ───────────────────────────────────────────────────────
// Marcação manual (set.warmup true/false) sempre vence. Sem marcação, e com
// autoWarmup ligado, as séries INICIAIS com carga < warmupPct × maior carga do
// exercício naquele treino contam como aquecimento.
export function warmupFlags(sets, prefs = DEFAULT_ANALYSIS_PREFS) {
  const top = Math.max(0, ...sets.map((s) => num(s.weight)));
  let leading = true;
  return sets.map((s) => {
    if (s.warmup === true) return true;
    if (s.warmup === false) { leading = false; return false; }
    if (!prefs.autoWarmup || top <= 0) return false;
    const w = leading && num(s.weight) < top * prefs.warmupPct;
    if (!w) leading = false;
    return w;
  });
}

export function workingSets(sets, prefs) {
  const f = warmupFlags(sets, prefs);
  return sets.filter((s, i) => !f[i] && num(s.reps) > 0);
}

// ── 1RM estimado (Epley, 1985) — só séries de 1–12 reps (acima disso o erro cresce) ──
export const epley = (w, r) => (r === 1 ? w : w * (1 + r / 30));
export function bestE1rm(sets) {
  let best = 0;
  sets.forEach((s) => { const w = num(s.weight), r = num(s.reps); if (w > 0 && r >= 1 && r <= 12) best = Math.max(best, epley(w, r)); });
  return best || null;
}

// ── Chave de comparabilidade ─────────────────────────────────────────────────────
export const normEquip = (e) => (e || "").trim().toLowerCase();
export const compKey = (session, ex) => `${ex.name}||${session.gymId || ""}||${normEquip(ex.equipment)}`;

export function perfOf(ex, prefs) {
  const ws = workingSets(ex.sets || [], prefs);
  const topWeight = ws.reduce((a, s) => Math.max(a, num(s.weight)), 0);
  const atTop = ws.filter((s) => num(s.weight) === topWeight);
  return {
    workingSets: ws.length,
    topWeight,
    repsAtTop: atTop.reduce((a, s) => Math.max(a, num(s.reps)), 0),
    totalRepsAtTop: atTop.reduce((a, s) => a + num(s.reps), 0),
    setsAtTop: atTop.length,
    totalReps: ws.reduce((a, s) => a + num(s.reps), 0),
    e1rm: bestE1rm(ws),
    tonnage: calcVolume(ex.sets || []),
  };
}

// Histórico de um exercício (todos os treinos), do mais antigo ao mais recente
export function exerciseRecords(sessions, name, prefs = DEFAULT_ANALYSIS_PREFS) {
  const out = [];
  sessions.forEach((s) => (s.exercises || []).forEach((e) => {
    if (e.name !== name) return;
    out.push({
      date: s.date, sessionId: s.id, sessionName: s.name, gymId: s.gymId || null,
      equipment: (e.equipment || "").trim(), key: compKey(s, e), sets: e.sets, notes: e.notes,
      ...perfOf(e, prefs),
    });
  }));
  return out.sort((a, b) => a.date.localeCompare(b.date));
}

// Último registro comparável para preencher "Último treino" / repetir treino
export function lastComparable(sessions, name, gymId, equipment, excludeSessionId) {
  const matches = [];
  sessions.forEach((s) => {
    if (s.id === excludeSessionId) return;
    (s.exercises || []).forEach((e) => { if (e.name === name) matches.push({ s, e }); });
  });
  matches.sort((a, b) => b.s.date.localeCompare(a.s.date));
  const exact = matches.find(({ s, e }) => (s.gymId || null) === (gymId || null) && normEquip(e.equipment) === normEquip(equipment));
  const other = matches.find((m) => m !== exact);
  const pack = (m) => m && { date: m.s.date, sessionName: m.s.name, sets: m.e.sets, notes: m.e.notes, gymId: m.s.gymId || null, equipment: m.e.equipment || "" };
  return { exact: pack(exact), other: exact ? null : pack(other) };
}

// ── Classificação de progressão (último vs anterior comparável) ──────────────────
export const STATUS = {
  load:        { icon: "📈", color: "#4caf50", label: "Progressão de carga" },
  reps:        { icon: "🔁", color: "#4caf50", label: "Progressão de repetições" },
  stable:      { icon: "➡️", color: "#9e9e9e", label: "Desempenho estável" },
  regression:  { icon: "📉", color: "#ff9800", label: "Possível regressão" },
  insufficient:{ icon: "❔", color: "#7a7a95", label: "Dados insuficientes" },
  changed:     { icon: "🏢", color: "#7a7a95", label: "Academia/equipamento diferente" },
};

export function classifyPair(prev, last) {
  if (!prev || !last || !last.topWeight || !prev.topWeight) return { status: "insufficient", note: "Menos de 2 registros comparáveis." };
  const dw = last.topWeight - prev.topWeight;
  const de = prev.e1rm && last.e1rm ? (last.e1rm - prev.e1rm) / prev.e1rm : null;
  if (dw > 0) {
    if (last.repsAtTop >= prev.repsAtTop) return { status: "load", note: `${prev.topWeight}→${last.topWeight} kg mantendo ${last.repsAtTop} reps.` };
    return { status: "load", caveat: true, note: `Carga ${prev.topWeight}→${last.topWeight} kg, mas reps ${prev.repsAtTop}→${last.repsAtTop}${de !== null ? ` (1RM est. ${de >= 0 ? "+" : ""}${(de * 100).toFixed(0)}%)` : ""}. Não indica melhora geral por si só.` };
  }
  if (dw === 0) {
    if (last.repsAtTop > prev.repsAtTop || (last.repsAtTop === prev.repsAtTop && last.totalRepsAtTop > prev.totalRepsAtTop && last.setsAtTop <= prev.setsAtTop))
      return { status: "reps", note: `${last.topWeight} kg: ${prev.repsAtTop}→${last.repsAtTop} reps.` };
    if (prev.repsAtTop - last.repsAtTop >= 2) return { status: "regression", note: `${last.topWeight} kg: ${prev.repsAtTop}→${last.repsAtTop} reps. Acompanhe os próximos treinos.` };
    if (last.workingSets > prev.workingSets) return { status: "stable", note: `${last.topWeight} kg × ${last.repsAtTop} · séries ${prev.workingSets}→${last.workingSets}: mais volume de treino, não mais força.` };
    return { status: "stable", note: `${last.topWeight} kg × ${last.repsAtTop}.` };
  }
  // carga menor
  if (de !== null && de >= -0.03) return { status: "stable", note: `Carga menor (${prev.topWeight}→${last.topWeight} kg) compensada por mais reps.` };
  if (de !== null && de < -0.05) return { status: "regression", note: `1RM est. ${(de * 100).toFixed(0)}% (${prev.topWeight}×${prev.repsAtTop} → ${last.topWeight}×${last.repsAtTop}). Acompanhe os próximos treinos.` };
  return { status: "stable", note: `${prev.topWeight}×${prev.repsAtTop} → ${last.topWeight}×${last.repsAtTop}.` };
}

// Top exercícios mais frequentes com status e % de 1RM estimado (registros comparáveis)
export function topExercisesProgression(sessions, prefs, topN = 8, weeksBack = 8, today = todayISO()) {
  const cutoff = addDays(today, -weeksBack * 7);
  const freq = {};
  sessions.filter((s) => s.date >= cutoff).forEach((s) => s.exercises.forEach((e) => { freq[e.name] = (freq[e.name] || 0) + 1; }));
  return Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, topN).map(([name, count]) => {
    const recs = exerciseRecords(sessions, name, prefs).filter((r) => r.date >= cutoff);
    const last = recs[recs.length - 1];
    const sameKey = recs.filter((r) => r.key === last.key);
    const prev = sameKey[sameKey.length - 2] || null;
    const anyPrev = recs[recs.length - 2] || null;
    let cls;
    if (!prev && anyPrev && anyPrev.key !== last.key) cls = { status: "changed", note: "Último treino em academia/equipamento diferente do anterior — pesos não comparados." };
    else cls = classifyPair(prev, last);
    const first = sameKey.find((r) => r.e1rm);
    const lastE = [...sameKey].reverse().find((r) => r.e1rm);
    const pct = first && lastE && first !== lastE ? ((lastE.e1rm - first.e1rm) / first.e1rm) * 100 : null;
    return {
      name, count, ...cls, pct: pct === null ? null : Math.round(pct * 10) / 10,
      comparablePoints: sameKey.length, limited: !last.gymId, gymId: last.gymId, equipment: last.equipment,
    };
  });
}

// ── Séries por grupamento (diretas + indiretas fracionadas) ──────────────────────
export function setsByMuscle(sessions, prefs = DEFAULT_ANALYSIS_PREFS) {
  const r = {};
  const add = (m, k, v) => { if (!r[m]) r[m] = { direct: 0, indirect: 0, total: 0 }; r[m][k] += v; r[m].total += k === "direct" ? v : v * prefs.indirectFactor; };
  sessions.forEach((s) => s.exercises.forEach((e) => {
    const n = workingSets(e.sets || [], prefs).length;
    if (!n) return;
    add(e.category, "direct", n);
    secondaryMuscles(e.name, e.category).forEach((m) => { if (m !== e.category) add(m, "indirect", n); });
  }));
  return r;
}

export const tonnage = (sessions) => sessions.reduce((a, s) => a + s.exercises.reduce((b, e) => b + calcVolume(e.sets), 0), 0);

// ── Períodos: atual (em andamento) vs anterior completo ou equivalente ───────────
export function periodRanges(mode, basis, today = todayISO()) {
  let curStart, prevStart, prevEndFull, totalDays;
  if (mode === "week") {
    curStart = weekStartISO(today);
    prevStart = addDays(curStart, -7);
    prevEndFull = addDays(curStart, -1);
    totalDays = 7;
  } else {
    const [y, m] = today.split("-").map(Number);
    curStart = `${y}-${String(m).padStart(2, "0")}-01`;
    const pd = new Date(y, m - 2, 1);
    prevStart = `${pd.getFullYear()}-${String(pd.getMonth() + 1).padStart(2, "0")}-01`;
    prevEndFull = addDays(curStart, -1);
    totalDays = new Date(y, m, 0).getDate();
  }
  const elapsed = Math.round((new Date(today + "T12:00:00") - new Date(curStart + "T12:00:00")) / 864e5) + 1;
  const prevDays = Math.round((new Date(prevEndFull + "T12:00:00") - new Date(prevStart + "T12:00:00")) / 864e5) + 1;
  const prevEnd = basis === "equivalent" ? addDays(prevStart, Math.min(elapsed, prevDays) - 1) : prevEndFull;
  return { curStart, curEnd: today, prevStart, prevEnd, elapsed, totalDays, inProgress: elapsed < totalDays };
}

export function periodStats(sessions, from, to, prefs) {
  const ss = sessions.filter((s) => s.date >= from && s.date <= to);
  const t = tonnage(ss);
  return { sessions: ss.length, tonnage: t, avgPerSession: ss.length ? t / ss.length : 0, sets: setsByMuscle(ss, prefs), list: ss };
}

// ── Evolução de desempenho: últimas 4 semanas vs 4 anteriores, mesmo equipamento ──
export function performanceEvolution(sessions, prefs, topN = 8, today = todayISO()) {
  const recentStart = addDays(today, -27), prevStart = addDays(today, -55);
  const freq = {};
  sessions.filter((s) => s.date >= prevStart).forEach((s) => s.exercises.forEach((e) => { freq[e.name] = (freq[e.name] || 0) + 1; }));
  return Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, topN).map(([name]) => {
    const all = exerciseRecords(sessions, name, prefs).filter((r) => r.date >= prevStart);
    const key = all[all.length - 1].key;
    const recs = all.filter((r) => r.key === key);
    const recent = recs.filter((r) => r.date >= recentStart);
    const prev = recs.filter((r) => r.date < recentStart);
    const out = { name, key, limited: !all[all.length - 1].gymId, freqRecent: recent.length, freqPrev: prev.length, tags: [] };
    if (!recent.length || !prev.length) { out.insufficient = true; return out; }
    const a = prev[prev.length - 1], b = recent[recent.length - 1];
    const dw = b.topWeight - a.topWeight;
    const dr = b.repsAtTop - a.repsAtTop;
    const ds = b.workingSets - a.workingSets;
    const de = a.e1rm && b.e1rm ? ((b.e1rm - a.e1rm) / a.e1rm) * 100 : null;
    if (dw > 0) out.tags.push({ kind: "load", text: `Carga +${+dw.toFixed(1)} kg`, good: true });
    if (dw < 0) out.tags.push({ kind: "load", text: `Carga ${+dw.toFixed(1)} kg`, good: false });
    if (dw === 0 && dr > 0) out.tags.push({ kind: "reps", text: `Reps +${dr} com ${b.topWeight} kg`, good: true });
    if (dw === 0 && dr < 0) out.tags.push({ kind: "reps", text: `Reps ${dr} com ${b.topWeight} kg`, good: false });
    if (dw !== 0 && dr !== 0) out.tags.push({ kind: "reps", text: `Reps ${dr > 0 ? "+" : ""}${dr} (carga mudou)`, good: null });
    if (ds > 0) out.tags.push({ kind: "sets", text: `Séries +${ds} (volume, não força)`, good: null });
    if (ds < 0) out.tags.push({ kind: "sets", text: `Séries ${ds} (volume)`, good: null });
    if (de !== null) out.tags.push({ kind: "e1rm", text: `1RM est. ${de >= 0 ? "+" : ""}${de.toFixed(1)}%`, good: de > 1 ? true : de < -3 ? false : null });
    if (!out.tags.length) out.tags.push({ kind: "stable", text: "Igual ao período anterior", good: null });
    out.from = a; out.to = b;
    return out;
  });
}
