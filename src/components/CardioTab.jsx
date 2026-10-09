// src/components/CardioTab.jsx
import { useState } from "react";
import { C, uid, fmtDate, dayName, todayISO, addDays, weekStartISO } from "../data/constants";
import { CARDIO_ACTIVITIES, INTENSITIES, findActivity, estimateCardioKcal, METHOD_LABEL } from "../data/cardio";

const chip = (on) => ({ padding: "8px 12px", borderRadius: 20, fontSize: 13, cursor: "pointer", whiteSpace: "nowrap", border: `1px solid ${on ? C.accent : C.border}`, background: on ? C.accentD : C.surfaceHigh, color: on ? C.accent : C.sub });
const inp = { background: C.surfaceHigh, border: `1px solid ${C.border}`, borderRadius: 8, padding: "9px 10px", color: C.text, fontSize: 16, outline: "none", width: "100%", minWidth: 0, boxSizing: "border-box" };
const WEEK = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

function CardioForm({ initial, body, onSave, onDelete, onClose }) {
  const [e, setE] = useState(initial);
  const set = (k, v) => setE((p) => ({ ...p, [k]: v }));
  const est = estimateCardioKcal(e, body);
  const act = findActivity(e.activity);
  const canSave = +e.durationMin > 0;
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.8)", zIndex: 300, display: "flex", alignItems: "flex-end" }} onClick={onClose}>
      <div style={{ background: C.surface, borderRadius: "20px 20px 0 0", width: "100%", maxWidth: 680, margin: "0 auto", maxHeight: "88vh", overflowY: "auto", padding: "16px 16px 28px", boxSizing: "border-box" }} onClick={(ev) => ev.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <span style={{ fontWeight: 700, color: C.text }}>🏃 Cardio · {dayName(e.date)}, {fmtDate(e.date)}</span>
          <button onClick={onClose} style={{ background: "none", border: "none", color: C.sub, fontSize: 24, cursor: "pointer" }}>×</button>
        </div>
        <input type="date" style={{ ...inp, marginBottom: 12 }} value={e.date} onChange={(ev) => set("date", ev.target.value)} />
        <div style={{ fontSize: 11, color: C.sub, marginBottom: 6 }}>Atividade</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
          {CARDIO_ACTIVITIES.map((a) => <button key={a.key} style={chip(e.activity === a.key)} onClick={() => set("activity", a.key)}>{a.icon} {a.label}</button>)}
        </div>
        <div style={{ fontSize: 11, color: C.sub, marginBottom: 6 }}>Intensidade {act.hint && <span style={{ opacity: .8 }}>· {act.hint}</span>}</div>
        <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
          {INTENSITIES.map((i) => <button key={i.key} style={{ ...chip(e.intensity === i.key), flex: 1 }} onClick={() => set("intensity", i.key)}>{i.label}</button>)}
        </div>
        <div style={{ fontSize: 11, color: C.sub, marginBottom: 6 }}>Duração (min)</div>
        <div style={{ display: "flex", gap: 6, marginBottom: 8, flexWrap: "wrap" }}>
          {[15, 20, 30, 45, 60, 90].map((m) => <button key={m} style={chip(+e.durationMin === m)} onClick={() => set("durationMin", m)}>{m}</button>)}
        </div>
        <input type="number" inputMode="numeric" placeholder="ou digite os minutos" style={{ ...inp, marginBottom: 12 }} value={e.durationMin} onChange={(ev) => set("durationMin", ev.target.value === "" ? "" : +ev.target.value)} />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 8, marginBottom: 12 }}>
          <label style={{ fontSize: 10, color: C.sub }}>FC média (bpm)<input type="number" inputMode="numeric" style={inp} value={e.avgHr ?? ""} onChange={(ev) => set("avgHr", ev.target.value === "" ? null : +ev.target.value)} /></label>
          <label style={{ fontSize: 10, color: C.sub }}>kcal do relógio<input type="number" inputMode="numeric" style={inp} value={e.watchKcal ?? ""} onChange={(ev) => set("watchKcal", ev.target.value === "" ? null : +ev.target.value)} /></label>
          <label style={{ fontSize: 10, color: C.sub }}>Distância (km)<input type="number" inputMode="decimal" step="0.1" style={inp} value={e.distanceKm ?? ""} onChange={(ev) => set("distanceKm", ev.target.value === "" ? null : +ev.target.value)} /></label>
        </div>
        <input placeholder="Observações..." style={{ ...inp, marginBottom: 12 }} value={e.notes || ""} onChange={(ev) => set("notes", ev.target.value)} />

        <div style={{ background: C.accentD, border: `1px solid ${C.accent}44`, borderRadius: 12, padding: 12, marginBottom: 14 }}>
          {est.gross !== null ? (
            <>
              <div style={{ fontSize: 20, fontWeight: 800, color: C.accent }}>
                {est.watch ? `${est.watch} kcal` : `≈ ${est.active} kcal ativas`}
              </div>
              <div style={{ fontSize: 11, color: C.sub, marginTop: 2 }}>
                {est.watch ? `Do relógio · estimativa do app: ≈${est.active} ativas / ${est.gross} totais` : `${est.gross} kcal totais (inclui o gasto de repouso)`}
              </div>
              <div style={{ fontSize: 10, color: C.sub, marginTop: 6 }}>Método: {METHOD_LABEL[est.method]}{est.method === "met" || est.estimateMethod === "met" ? ` · MET ${est.met}` : ""}</div>
            </>
          ) : <div style={{ fontSize: 12, color: C.sub }}>Informe a duração para estimar as calorias.</div>}
          {est.missing && est.missing.length > 0 && est.missing[0] !== "duração" && (
            <div style={{ fontSize: 11, color: C.warn, marginTop: 6 }}>⚠️ Para uma estimativa individual, preencha em ⚙️ Configurações: {est.missing.join(", ")}.</div>
          )}
        </div>

        <button disabled={!canSave} onClick={() => onSave({ ...e, label: act.label, kcal: est.watch || est.active || null, kcalMethod: est.method, updatedAt: Date.now() })}
          style={{ width: "100%", padding: 14, borderRadius: 10, border: "none", background: canSave ? C.accent : C.border, color: "#000", fontWeight: 700, fontSize: 15, cursor: canSave ? "pointer" : "default" }}>
          ✓ Salvar cardio
        </button>
        {onDelete && <button onClick={onDelete} style={{ width: "100%", marginTop: 10, padding: 10, borderRadius: 10, border: "1px solid rgba(255,68,85,.4)", background: "transparent", color: C.danger, fontSize: 13, cursor: "pointer" }}>🗑 Excluir</button>}
      </div>
    </div>
  );
}

export function CardioTab({ cardio, update, body, onOpenSettings }) {
  const [weekStart, setWeekStart] = useState(() => weekStartISO(todayISO()));
  const [editing, setEditing] = useState(null);
  const [showInfo, setShowInfo] = useState(false);
  const today = todayISO();
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const byDate = {};
  cardio.forEach((c) => { (byDate[c.date] = byDate[c.date] || []).push(c); });
  const weekEntries = cardio.filter((c) => c.date >= weekStart && c.date <= addDays(weekStart, 6));
  const weekMin = weekEntries.reduce((a, c) => a + (+c.durationMin || 0), 0);
  const weekKcal = weekEntries.reduce((a, c) => a + (+c.kcal || 0), 0);
  const monthPrefix = today.slice(0, 7);
  const monthDays = new Set(cardio.filter((c) => c.date.startsWith(monthPrefix)).map((c) => c.date)).size;
  const recent = [...cardio].sort((a, b) => b.date.localeCompare(a.date) || (b.updatedAt || 0) - (a.updatedAt || 0)).slice(0, 30);
  const lastActivity = recent[0]?.activity || "corrida";
  const bodyMissing = !body.weightKg || !body.heightCm || !body.birthYear;

  const newEntry = (date) => setEditing({ id: uid(), date, activity: lastActivity, intensity: "moderate", durationMin: 30, avgHr: null, watchKcal: null, distanceKm: null, notes: "", _new: true });
  const save = (e) => { const { _new, ...clean } = e; update((prev) => { const i = prev.findIndex((x) => x.id === clean.id); if (i >= 0) { const n = [...prev]; n[i] = clean; return n; } return [clean, ...prev]; }); setEditing(null); };
  const del = (id) => { update((prev) => prev.filter((x) => x.id !== id), { deletedIds: [id] }); setEditing(null); };

  return (
    <div style={{ padding: "16px 16px 110px", position: "relative" }}>
      {bodyMissing && (
        <button onClick={onOpenSettings} style={{ width: "100%", textAlign: "left", background: "rgba(255,183,77,.08)", border: "1px solid rgba(255,183,77,.3)", borderRadius: 10, padding: "10px 12px", color: C.warn, fontSize: 12, marginBottom: 12, cursor: "pointer" }}>
          ⚠️ Preencha peso, altura e ano de nascimento em ⚙️ para calorias individualizadas ›
        </button>
      )}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <button onClick={() => setWeekStart(addDays(weekStart, -7))} style={{ background: "none", border: `1px solid ${C.border}`, borderRadius: 8, color: C.text, width: 32, height: 32, cursor: "pointer" }}>‹</button>
        <span style={{ fontSize: 12, color: C.sub }}>Semana de {fmtDate(weekStart).slice(0, 5)} a {fmtDate(addDays(weekStart, 6)).slice(0, 5)}</span>
        <button onClick={() => setWeekStart(addDays(weekStart, 7))} style={{ background: "none", border: `1px solid ${C.border}`, borderRadius: 8, color: C.text, width: 32, height: 32, cursor: "pointer" }}>›</button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 6, marginBottom: 14 }}>
        {days.map((d, i) => {
          const done = byDate[d];
          const isToday = d === today;
          return (
            <button key={d} onClick={() => (done ? setEditing(done[0]) : newEntry(d))} style={{
              display: "flex", flexDirection: "column", alignItems: "center", gap: 4, padding: "8px 0", borderRadius: 10, cursor: "pointer",
              background: done ? "rgba(79,195,247,.12)" : C.surface, border: `1px solid ${done ? "#4fc3f7" : isToday ? C.accent + "88" : C.border}`,
            }}>
              <span style={{ fontSize: 10, color: C.sub }}>{WEEK[i]}</span>
              <span style={{ width: 22, height: 22, borderRadius: 6, border: `2px solid ${done ? "#4fc3f7" : C.border}`, display: "flex", alignItems: "center", justifyContent: "center", color: "#4fc3f7", fontSize: 14, fontWeight: 800 }}>{done ? "✓" : ""}</span>
              <span style={{ fontSize: 9, color: C.sub }}>{d.slice(8)}</span>
            </button>
          );
        })}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 14 }}>
        {[["⏱", `${weekMin} min`, "na semana"], ["🔥", `≈${weekKcal}`, "kcal na semana"], ["📅", monthDays, "dias no mês"]].map(([ic, v, l]) => (
          <div key={l} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: "10px 6px", textAlign: "center" }}>
            <div style={{ fontSize: 16 }}>{ic}</div>
            <div style={{ fontSize: 17, fontWeight: 800, color: C.accent }}>{v}</div>
            <div style={{ fontSize: 10, color: C.sub }}>{l}</div>
          </div>
        ))}
      </div>
      <button onClick={() => newEntry(today)} style={{ width: "100%", padding: 14, borderRadius: 12, border: "none", background: C.accent, color: "#000", fontWeight: 700, fontSize: 14, cursor: "pointer", marginBottom: 16 }}>
        ✓ Fiz cardio hoje
      </button>

      <div style={{ fontSize: 11, fontWeight: 700, color: C.sub, letterSpacing: ".8px", textTransform: "uppercase", marginBottom: 10, display: "flex", alignItems: "center" }}>
        Histórico
        <button onClick={() => setShowInfo(!showInfo)} style={{ marginLeft: 8, background: "none", border: "none", color: C.accent, cursor: "pointer", fontSize: 13 }}>ℹ️</button>
      </div>
      {showInfo && (
        <div style={{ background: C.surfaceHigh, border: `1px solid ${C.border}`, borderRadius: 10, padding: 12, fontSize: 12, color: C.sub, lineHeight: 1.6, marginBottom: 12 }}>
          <strong style={{ color: C.text }}>Como as calorias são estimadas</strong><br />
          1. <strong>Valor do relógio</strong> (se informado): medição do dispositivo, exibida como principal.<br />
          2. <strong>Frequência cardíaca média</strong>: equação de Keytel et al. (2005), por sexo, idade, peso e FC. Melhor em esforço contínuo (FC 90–180).<br />
          3. <strong>MET</strong>: Compendium of Physical Activities 2024 (Herrmann et al.). O gasto de repouso individual (Mifflin-St Jeor) é descontado para mostrar as <em>kcal ativas</em> — o mesmo conceito das "calorias ativas" do Apple Watch.<br />
          Toda estimativa tem erro de ±10–20%. Use para comparar a sua própria evolução, não como valor exato.
        </div>
      )}
      {recent.length === 0 && <div style={{ color: C.sub, fontSize: 13 }}>Nenhum cardio registrado ainda.</div>}
      {recent.map((c) => {
        const a = findActivity(c.activity);
        return (
          <button key={c.id} onClick={() => setEditing(c)} style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: "10px 14px", marginBottom: 8, cursor: "pointer", textAlign: "left" }}>
            <span style={{ fontSize: 22 }}>{a.icon}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{c.label || a.label} · {c.durationMin} min</div>
              <div style={{ fontSize: 11, color: C.sub }}>{dayName(c.date)}, {fmtDate(c.date)}{c.distanceKm ? ` · ${c.distanceKm} km` : ""}{c.avgHr ? ` · ${c.avgHr} bpm` : ""}</div>
            </div>
            {c.kcal ? <span style={{ fontSize: 13, color: C.accent, fontWeight: 700 }}>≈{c.kcal}<span style={{ fontSize: 9, color: C.sub }}> kcal</span></span> : null}
          </button>
        );
      })}

      {editing && <CardioForm initial={editing} body={body} onSave={save} onDelete={editing._new ? null : () => del(editing.id)} onClose={() => setEditing(null)} />}
    </div>
  );
}
