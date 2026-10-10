// src/components/ExerciseDetail.jsx
// Histórico + análise individual de um exercício. Registros de academias ou
// equipamentos diferentes viram SÉRIES SEPARADAS no gráfico (nunca conectadas).
import { useState } from "react";
import { C, fmtDate, dayName, addDays, todayISO, UNKNOWN_GYM } from "../data/constants";
import { findExercise } from "../data/exercises";
import { exerciseRecords, warmupFlags } from "../data/progression";

const PALETTE = ["#f5a623", "#4fc3f7", "#ce93d8", "#81c784", "#f06292", "#ffb74d", "#90a4ae"];
const METRICS = [
  { key: "topWeight", label: "Carga máx", unit: "kg" },
  { key: "e1rm", label: "1RM est.", unit: "kg" },
  { key: "repsAtTop", label: "Reps (carga máx)", unit: "" },
  { key: "tonnage", label: "Volume", unit: "kg" },
];
const sel = { background: C.surfaceHigh, border: `1px solid ${C.border}`, borderRadius: 8, padding: "7px 8px", color: C.text, fontSize: 13, outline: "none", minWidth: 0, flex: 1 };

function Chart({ series, metric }) {
  const pts = series.flatMap((s) => s.points.filter((p) => p[metric.key]));
  if (pts.length < 2) return <div style={{ fontSize: 12, color: C.sub, padding: "16px 0" }}>Poucos dados para o gráfico com estes filtros.</div>;
  const W = 600, H = 180, P = { l: 34, r: 10, t: 10, b: 22 };
  const t = (d) => new Date(d + "T12:00:00").getTime();
  const xs = pts.map((p) => t(p.date)), ys = pts.map((p) => p[metric.key]);
  const x0 = Math.min(...xs), x1 = Math.max(...xs) || x0 + 1;
  const yMin = Math.min(...ys), yMax = Math.max(...ys);
  const pad = (yMax - yMin) * 0.15 || yMax * 0.1 || 1;
  const y0 = Math.max(0, yMin - pad), y1 = yMax + pad;
  const X = (d) => P.l + ((t(d) - x0) / (x1 - x0 || 1)) * (W - P.l - P.r);
  const Y = (v) => H - P.b - ((v - y0) / (y1 - y0)) * (H - P.t - P.b);
  const ticks = [y0, (y0 + y1) / 2, y1];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block" }}>
      {ticks.map((v, i) => (
        <g key={i}>
          <line x1={P.l} x2={W - P.r} y1={Y(v)} y2={Y(v)} stroke={C.border} strokeWidth="1" />
          <text x={P.l - 4} y={Y(v) + 3} fontSize="10" fill={C.sub} textAnchor="end">{Math.round(v)}</text>
        </g>
      ))}
      <text x={P.l} y={H - 6} fontSize="10" fill={C.sub}>{fmtDate(new Date(x0).toISOString().slice(0, 10)).slice(0, 5)}</text>
      <text x={W - P.r} y={H - 6} fontSize="10" fill={C.sub} textAnchor="end">{fmtDate(new Date(x1).toISOString().slice(0, 10)).slice(0, 5)}</text>
      {series.map((s) => {
        const ps = s.points.filter((p) => p[metric.key]);
        return (
          <g key={s.key}>
            {ps.length > 1 && <polyline fill="none" stroke={s.color} strokeWidth="2" points={ps.map((p) => `${X(p.date)},${Y(p[metric.key])}`).join(" ")} />}
            {ps.map((p, i) => <circle key={i} cx={X(p.date)} cy={Y(p[metric.key])} r="3.5" fill={s.color} />)}
          </g>
        );
      })}
    </svg>
  );
}

export function ExerciseDetail({ exName, sessions, gyms, prefs, onBack }) {
  const info = findExercise(exName);
  const [gymF, setGymF] = useState("all");
  const [eqF, setEqF] = useState("all");
  const [days, setDays] = useState(180);
  const [metricKey, setMetricKey] = useState("topWeight");
  const metric = METRICS.find((m) => m.key === metricKey);
  const gName = (id) => (id ? gyms.find((g) => g.id === id)?.name || UNKNOWN_GYM : UNKNOWN_GYM);

  const all = exerciseRecords(sessions, exName, prefs);
  const equipments = [...new Set(all.map((r) => r.equipment).filter(Boolean))];
  const gymIds = [...new Set(all.map((r) => r.gymId || ""))];
  const cutoff = days ? addDays(todayISO(), -days) : "0000";
  const recs = all.filter((r) => r.date >= cutoff
    && (gymF === "all" || (r.gymId || "") === gymF)
    && (eqF === "all" || (eqF === "" ? !r.equipment : r.equipment === eqF)));

  const seriesMap = new Map();
  recs.forEach((r) => {
    if (!seriesMap.has(r.key)) seriesMap.set(r.key, { key: r.key, label: `${gName(r.gymId)}${r.equipment ? ` · ${r.equipment}` : ""}`, limited: !r.gymId, points: [] });
    seriesMap.get(r.key).points.push(r);
  });
  const series = [...seriesMap.values()].map((s, i) => ({ ...s, color: PALETTE[i % PALETTE.length] }));

  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: "'DM Sans','Segoe UI',sans-serif", color: C.text, maxWidth: 680, margin: "0 auto" }}>
      <header style={{ position: "sticky", top: 0, zIndex: 100, background: "rgba(10,10,12,.96)", backdropFilter: "blur(14px)", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", padding: "calc(12px + env(safe-area-inset-top)) 14px 12px", gap: 8 }}>
        <button style={{ background: "none", border: "none", color: C.sub, fontSize: 13, cursor: "pointer", padding: "4px 8px" }} onClick={onBack}>← Voltar</button>
        <div style={{ flex: 1, textAlign: "center", fontSize: 13, fontWeight: 700 }}>Histórico e progressão</div>
        <div style={{ width: 70 }} />
      </header>
      <div style={{ padding: "16px 16px 60px" }}>
        <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 4 }}>{exName}</div>
        {info.desc && <div style={{ fontSize: 12, color: C.sub, marginBottom: 14, lineHeight: 1.5 }}>{info.desc}</div>}
        {all.length === 0 && <div style={{ color: C.sub, padding: "20px 0" }}>Sem histórico ainda.</div>}

        {all.length > 0 && (<>
          <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
            <select style={sel} value={gymF} onChange={(e) => setGymF(e.target.value)}>
              <option value="all">Todas as academias</option>
              {gymIds.map((id) => <option key={id} value={id}>{gName(id)}</option>)}
            </select>
            <select style={sel} value={eqF} onChange={(e) => setEqF(e.target.value)}>
              <option value="all">Todos equipamentos</option>
              <option value="">Sem equipamento informado</option>
              {equipments.map((q) => <option key={q} value={q}>{q}</option>)}
            </select>
          </div>
          <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
            {[[30, "30d"], [90, "90d"], [180, "6m"], [365, "1a"], [0, "Tudo"]].map(([d, l]) => (
              <button key={d} onClick={() => setDays(d)} style={{ flex: 1, padding: "6px 2px", borderRadius: 8, fontSize: 12, cursor: "pointer", border: `1px solid ${days === d ? C.accent : C.border}`, background: days === d ? C.accentD : C.surface, color: days === d ? C.accent : C.sub }}>{l}</button>
            ))}
          </div>

          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 14, marginBottom: 14 }}>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
              {METRICS.map((m) => (
                <button key={m.key} onClick={() => setMetricKey(m.key)} style={{ padding: "4px 10px", borderRadius: 20, fontSize: 11, cursor: "pointer", border: `1px solid ${metricKey === m.key ? C.accent : C.border}`, background: metricKey === m.key ? C.accentD : "transparent", color: metricKey === m.key ? C.accent : C.sub }}>{m.label}</button>
              ))}
            </div>
            <Chart series={series} metric={metric} />
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 8 }}>
              {series.map((s) => (
                <span key={s.key} style={{ fontSize: 10, color: C.sub, display: "flex", alignItems: "center", gap: 4 }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: s.color }} />{s.label}{s.limited ? " (comparabilidade limitada)" : ""}
                </span>
              ))}
            </div>
            {series.length > 1 && <div style={{ fontSize: 10, color: C.sub, marginTop: 6 }}>Academias/equipamentos diferentes aparecem como linhas separadas — os pesos não são comparados entre si.</div>}
            {metricKey === "e1rm" && <div style={{ fontSize: 10, color: C.sub, marginTop: 6 }}>1RM estimado (Epley) a partir de séries de 1–12 reps. É uma estimativa, não uma medição direta.</div>}
          </div>

          {series.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.sub, letterSpacing: ".8px", textTransform: "uppercase", marginBottom: 8 }}>🏆 Melhor desempenho</div>
              {series.map((s) => {
                const bestW = s.points.reduce((a, p) => (p.topWeight > (a?.topWeight || 0) || (p.topWeight === a?.topWeight && p.repsAtTop > a.repsAtTop) ? p : a), null);
                const bestE = s.points.reduce((a, p) => ((p.e1rm || 0) > (a?.e1rm || 0) ? p : a), null);
                return (
                  <div key={s.key} style={{ background: C.surface, border: `1px solid ${s.color}55`, borderRadius: 10, padding: "8px 12px", marginBottom: 6, fontSize: 12 }}>
                    <div style={{ color: s.color, fontWeight: 600, marginBottom: 2 }}>{s.label}</div>
                    <div style={{ color: C.text }}>
                      {bestW && <>Carga máx: <strong>{bestW.topWeight} kg × {bestW.repsAtTop}</strong> ({fmtDate(bestW.date)})</>}
                      {bestE && bestE.e1rm && <> · 1RM est.: <strong>{bestE.e1rm.toFixed(1)} kg</strong></>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div style={{ fontSize: 11, fontWeight: 700, color: C.sub, letterSpacing: ".8px", textTransform: "uppercase", marginBottom: 8 }}>📋 Sessões ({recs.length})</div>
          {[...recs].reverse().map((h, i) => {
            const warm = warmupFlags(h.sets, prefs);
            return (
              <div key={i} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 14, marginBottom: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>{dayName(h.date)}, {fmtDate(h.date)}</div>
                    <div style={{ fontSize: 11, color: C.sub, marginTop: 2 }}>{h.sessionName}</div>
                    <div style={{ fontSize: 10, color: C.sub, marginTop: 2 }}>🏢 {gName(h.gymId)}{h.equipment ? ` · ${h.equipment}` : ""}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 17, fontWeight: 800, color: C.accent }}>{h.tonnage.toFixed(0)}</div>
                    <div style={{ fontSize: 9, color: C.sub }}>kg vol</div>
                  </div>
                </div>
                {h.notes && <div style={{ fontSize: 11, color: C.sub, marginBottom: 8, fontStyle: "italic" }}>📝 {h.notes}</div>}
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {h.sets.map((s, si) => (
                    <span key={si} style={{ fontSize: 11, color: warm[si] ? C.warn : C.text, background: C.surfaceHigh, borderRadius: 6, padding: "3px 8px" }}>
                      {warm[si] ? "A " : ""}{s.reps}×{s.weight}kg
                    </span>
                  ))}
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, paddingTop: 8, borderTop: `1px solid ${C.border}`, fontSize: 11, color: C.sub }}>
                  <span>💪 Máx: <strong style={{ color: C.accent }}>{h.topWeight}kg × {h.repsAtTop}</strong></span>
                  <span>{h.workingSets} séries de trabalho{h.e1rm ? ` · 1RM est. ${h.e1rm.toFixed(0)}` : ""}</span>
                </div>
              </div>
            );
          })}
        </>)}
      </div>
    </div>
  );
}
