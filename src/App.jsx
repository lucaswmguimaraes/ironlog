import { useState, useEffect, useRef } from "react";
import {
  DndContext, closestCenter, PointerSensor, TouchSensor, useSensor, useSensors,
} from "@dnd-kit/core";
import {
  SortableContext, verticalListSortingStrategy, useSortable, arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import { EXERCISE_DB, ALL_EXERCISES, findExercise, matchesExercise } from "./data/exercises";
import {
  C, PROFILES, TRAIN_TYPES, MONTHS_PT,
  uid, fmtDate, dayName, calcVolume, detectTrainType, todayISO, UNKNOWN_GYM,
} from "./data/constants";
import { DEFAULT_ANALYSIS_PREFS, lastComparable, warmupFlags } from "./data/progression";
import { useGitHubStorage } from "./hooks/useGitHubStorage";
import { useSyncedData } from "./hooks/useSyncedData";
import { useProfile } from "./hooks/useProfile";
import { ProfileSetup } from "./components/ProfileSetup";
import { GitHubSetup } from "./components/GitHubSetup";
import { AnalysisTab } from "./components/AnalysisTab";
import { ProfileSettings } from "./components/ProfileSettings";
import { GymBodySettings } from "./components/GymBodySettings";
import { CardioTab } from "./components/CardioTab";
import { ExerciseDetail } from "./components/ExerciseDetail";

// ── SORTABLE EXERCISE ITEM (drag & drop) ───────────────────────────────────────
function SortableExerciseItem({ id, children }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id });
  return (
    <div ref={setNodeRef} style={{
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isDragging ? 0.5 : 1,
      position: "relative",
    }}>
      <div {...attributes} {...listeners} style={{
        position: "absolute", top: 12, right: 46,
        cursor: "grab", color: "#7a7a95", fontSize: 18,
        touchAction: "none", zIndex: 10, padding: "4px 8px",
        userSelect: "none",
      }}>⠿</div>
      {children}
    </div>
  );
}

// ── PROFILE SELECTOR ───────────────────────────────────────────────────────────
function ProfileScreen({ onSelect }) {
  const exportBackup = (profileId, profileName) => {
    try {
      const raw = localStorage.getItem(`wkv3_${profileId}`);
      if (!raw || raw === "[]" || raw === "null") {
        alert(`Nenhum dado encontrado para ${profileName} neste dispositivo.`);
        return;
      }
      const data = JSON.parse(raw);
      if (!data || data.length === 0) {
        alert(`Nenhum treino encontrado para ${profileName} neste dispositivo.`);
        return;
      }
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `ironlog-backup-${profileId}-${new Date().toISOString().slice(0,10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      alert(`✅ Backup de ${profileName} exportado com ${data.length} treinos!`);
    } catch (e) {
      alert(`Erro ao exportar: ${e.message}`);
    }
  };

  return (
    <div style={S.app}>
      <div style={S.grain}/>
      <div style={{
        minHeight:"100vh", display:"flex", flexDirection:"column",
        alignItems:"center", justifyContent:"center", padding:24, gap:32
      }}>
        <div style={{textAlign:"center"}}>
          <div style={S.logo}>⚡ IRON LOG</div>
          <div style={S.logoSub}>Diário de Hipertrofia</div>
        </div>
        <div style={{fontSize:15, color:C.sub, textAlign:"center"}}>Quem vai treinar hoje?</div>
        <div style={{display:"flex", gap:16, flexWrap:"wrap", justifyContent:"center"}}>
          {PROFILES.map(p=>(
            <button key={p.id} onClick={()=>onSelect(p)} style={{
              background:C.surface, border:`2px solid ${p.color}44`,
              borderRadius:20, padding:"28px 36px", cursor:"pointer",
              display:"flex", flexDirection:"column", alignItems:"center", gap:12,
              minWidth:140,
            }}>
              <span style={{fontSize:48}}>{p.emoji}</span>
              <span style={{fontSize:18, fontWeight:800, color:p.color}}>{p.name}</span>
            </button>
          ))}
        </div>
        {/* Botão de emergência para exportar dados antes do onboarding */}
        <div style={{textAlign:"center"}}>
          <div style={{fontSize:12, color:C.sub, marginBottom:10}}>💾 Exportar backup deste dispositivo</div>
          <div style={{display:"flex", gap:10, justifyContent:"center"}}>
            {PROFILES.map(p=>(
              <button key={p.id} onClick={()=>exportBackup(p.id, p.name)} style={{
                background:"transparent", border:`1px solid ${C.border}`,
                borderRadius:10, padding:"8px 16px", cursor:"pointer",
                fontSize:12, color:C.sub,
              }}>
                ⬇️ {p.name}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── MAIN APP ───────────────────────────────────────────────────────────────────
const gymName = (gyms, id) => (id ? (gyms.find((g) => g.id === id)?.name || UNKNOWN_GYM) : UNKNOWN_GYM);
const hasFilledSets = (s) => (s?.exercises || []).some((e) => e.sets.some((x) => x.reps !== "" || x.weight !== ""));

export default function App(){
  const { profile, selectProfile, getPAT, setPAT, getConfig, saveConfig } = useProfile();
  const { loadFile, saveFile } = useGitHubStorage();
  const pid = profile?.id || null;
  const [patTick, setPatTick] = useState(0);
  const pat = pid ? getPAT(pid) : null;
  const sync = { profileId: pid, pat, loadFile, saveFile };
  const sessSync = useSyncedData({ ...sync, file: `${pid}.json`, lsKey: `wkv3_${pid}` });
  const cardioSync = useSyncedData({ ...sync, file: `${pid}-cardio.json`, lsKey: `ironlog_cardio_${pid}` });
  const metaSync = useSyncedData({ ...sync, file: `${pid}-meta.json`, lsKey: `ironlog_meta_${pid}`, kind: "object" });

  const sessions = Array.isArray(sessSync.data) ? sessSync.data : [];
  const cardio = Array.isArray(cardioSync.data) ? cardioSync.data : [];
  const meta = metaSync.data || {};
  const gyms = meta.gyms || [];
  const analysisPrefs = { ...DEFAULT_ANALYSIS_PREFS, ...(meta.analysis || {}) };
  const updateMeta = (patch) => metaSync.update((prev) => ({ ...(prev || {}), ...(typeof patch === "function" ? patch(prev || {}) : patch), updatedAt: Date.now() }));

  const [onboardingDone, setOnboardingDone] = useState(() => (profile ? getConfig(profile.id).completedOnboarding : true));
  const [githubSetupDone, setGithubSetupDone] = useState(() => (profile ? !!getPAT(profile.id) : true));
  const [tab, setTab] = useState("home");
  const [histEx, setHistEx] = useState(null);
  const [swapEx, setSwapEx] = useState(null);
  const [calYear, setCalYear] = useState(new Date().getFullYear());
  const [showSettings, setShowSettings] = useState(false);
  const prevTab = useRef("home");

  // Rascunho do treino em edição — persistido a cada mudança (sobrevive a fechar o app)
  const draftKey = `ironlog_draft_${pid}`;
  const [draft, setDraftState] = useState(null);
  useEffect(() => {
    if (!pid) return;
    try { setDraftState(JSON.parse(localStorage.getItem(`ironlog_draft_${pid}`) || "null")); } catch { setDraftState(null); }
  }, [pid]);
  const setDraft = (d) => {
    setDraftState(d);
    try { d ? localStorage.setItem(draftKey, JSON.stringify(d)) : localStorage.removeItem(draftKey); } catch {}
  };

  const saveSession = (s) => {
    const clean = { ...s, updatedAt: Date.now() };
    sessSync.update((prev) => {
      const i = prev.findIndex((x) => x.id === clean.id);
      if (i >= 0) { const n = [...prev]; n[i] = clean; return n; }
      return [clean, ...prev];
    });
  };
  const deleteSession = (id) => {
    sessSync.update((p) => p.filter((s) => s.id !== id), { deletedIds: [id] });
    setDraft(null);
    setTab("home");
  };

  // App indo para segundo plano com treino aberto: grava o rascunho como treino
  const draftRef = useRef(draft);
  draftRef.current = draft;
  useEffect(() => {
    const onHide = () => {
      const d = draftRef.current;
      if (document.visibilityState === "hidden" && d && hasFilledSets(d.session)) saveSession(d.session);
    };
    document.addEventListener("visibilitychange", onHide);
    return () => document.removeEventListener("visibilitychange", onHide);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pid]);

  // Export/import for ProfileSettings
  window.__ironlog_export = () => sessions;
  window.__ironlog_import = (data) => {
    sessSync.update((prev) => {
      const byId = new Map(prev.map((s) => [s.id, s]));
      data.forEach((s) => byId.set(s.id, { ...s, updatedAt: Date.now() }));
      return [...byId.values()];
    });
  };

  const handleSelectProfile = (p) => {
    sessionStorage.setItem("ironlog_profile", JSON.stringify(p));
    setTab("home");
    selectProfile(p);
    const cfg = getConfig(p.id);
    setOnboardingDone(cfg.completedOnboarding);
    setGithubSetupDone(!!getPAT(p.id));
  };

  const handleSwitchProfile = () => {
    sessionStorage.removeItem("ironlog_profile");
    selectProfile(null);
    setTab("home");
  };

  if (!profile) return <ProfileScreen onSelect={handleSelectProfile} />;

  if (profile && !onboardingDone) {
    return (
      <div style={{ background: C.bg, minHeight: "100vh" }}>
        <div style={S.grain} />
        <ProfileSetup
          profileName={profile.name}
          onComplete={(config) => {
            saveConfig(profile.id, config);
            setOnboardingDone(true);
          }}
        />
      </div>
    );
  }

  if (profile && onboardingDone && !githubSetupDone) {
    return (
      <div style={{ background: C.bg, minHeight: "100vh" }}>
        <div style={S.grain} />
        <GitHubSetup
          profileId={profile.id}
          profileName={profile.name}
          onSave={(p) => { setPAT(profile.id, p); setPatTick((t) => t + 1); setGithubSetupDone(true); }}
          onSkip={() => setGithubSetupDone(true)}
        />
      </div>
    );
  }

  const goTo = (t, extra = {}) => {
    prevTab.current = tab;
    if (extra.ex !== undefined) setHistEx(extra.ex);
    if (extra.swap !== undefined) setSwapEx(extra.swap);
    setTab(t);
  };

  const sorted = [...sessions].sort((a, b) => b.date.localeCompare(a.date));
  const lastSession = sorted[0] || null;
  const defaultGymId = meta.defaultGymId && gyms.some((g) => g.id === meta.defaultGymId) ? meta.defaultGymId : null;

  // Monta exercícios a partir de um treino-modelo: mesma ordem, séries e reps;
  // cargas SÓ do histórico da mesma academia + equipamento (senão ficam em branco).
  const buildExercises = (tplExercises, gymId, excludeId) => tplExercises.map((ex) => {
    const { exact } = lastComparable(sessions, ex.name, gymId, ex.equipment, excludeId);
    const ref = exact ? exact.sets : null;
    return {
      id: uid(), name: ex.name, category: ex.category, notes: ex.notes || "",
      ...(ex.equipment ? { equipment: ex.equipment } : {}),
      sets: ex.sets.map((s, i) => ({
        reps: s.reps,
        weight: ref ? (ref[i] || ref[ref.length - 1]).weight : "",
        ...(s.warmup !== undefined ? { warmup: s.warmup } : {}),
      })),
    };
  });

  const openSession = (s) => { setDraft({ session: JSON.parse(JSON.stringify(s)), isNew: false }); setTab("session"); };
  const startNew = () => {
    setDraft({ session: { id: uid(), date: todayISO(), name: "", trainType: null, gymId: defaultGymId, exercises: [] }, isNew: true });
    setTab("session");
  };
  const handleRepeatLast = () => {
    if (!lastSession) return;
    setDraft({
      session: {
        id: uid(), date: todayISO(), name: lastSession.name, trainType: lastSession.trainType || null,
        gymId: defaultGymId, exercises: buildExercises(lastSession.exercises, defaultGymId, null),
      },
      isNew: true, fromTemplate: true,
    });
    setTab("session");
  };

  const profileConfig = getConfig(profile.id);
  const body = { ...(meta.body || {}), sex: (meta.body && meta.body.sex) || profileConfig.sex };

  if (showSettings) return (
    <div style={{ background: C.bg, minHeight: "100vh" }}>
      <div style={S.grain} />
      <ProfileSettings
        profileId={profile.id}
        profileName={profile.name}
        currentConfig={profileConfig}
        currentPAT={pat}
        onSave={(config) => { saveConfig(profile.id, { ...config, completedOnboarding: true }); setShowSettings(false); }}
        onSavePAT={(p) => { setPAT(profile.id, p); setPatTick((t) => t + 1); }}
        onBack={() => setShowSettings(false)}
      >
        <GymBodySettings meta={meta} updateMeta={updateMeta} sessions={sessions}
          onAssignGym={(gymId, ids) => sessSync.update((prev) => prev.map((s) => (ids.includes(s.id) ? { ...s, gymId, updatedAt: Date.now() } : s)))}
          profileConfig={profileConfig} />
      </ProfileSettings>
    </div>
  );

  if (tab === "session" && draft) return (
    <SessionView
      key={draft.session.id}
      draft={draft}
      sessions={sorted}
      gyms={gyms}
      onChange={(s) => setDraft({ ...draft, session: s })}
      onSave={(s) => { saveSession(s); setDraft(null); setTab("home"); }}
      onBack={(s) => {
        if (!draft.isNew || hasFilledSets(s) || s.exercises.length > 0) saveSession(s);
        setDraft(null); setTab("home");
      }}
      onDelete={draft.isNew ? null : () => deleteSession(draft.session.id)}
      onHistClick={(n) => goTo("ex-hist", { ex: n })}
      onSwap={(ex) => goTo("swap", { swap: ex })}
      buildExercises={buildExercises}
    />
  );
  if (tab === "ex-hist") return (
    <ExerciseDetail exName={histEx} sessions={sessions} gyms={gyms} prefs={analysisPrefs}
      onBack={() => setTab(prevTab.current === "session" && draft ? "session" : prevTab.current)} />
  );
  if (tab === "swap") return <SwapView exercise={swapEx} onBack={() => setTab(prevTab.current === "session" && draft ? "session" : prevTab.current)} />;

  const st = [sessSync.status, cardioSync.status, metaSync.status];
  const syncState = st.includes("error") ? "error" : st.some((x) => x === "saving" || x === "pending") ? "saving" : st.includes("offline") ? "offline" : "ok";
  const retryAll = () => { sessSync.retry(); cardioSync.retry(); metaSync.retry(); };

  return (
    <div style={S.app}>
      <div style={S.grain} />
      <header style={S.header}>
        <div style={S.headerInner}>
          <div><div style={S.logo}>⚡ IRON LOG</div><div style={S.logoSub}>Diário de Hipertrofia</div></div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button onClick={retryAll} title="Sincronização" style={{ background: "none", border: "none", cursor: "pointer", fontSize: 11, padding: "4px 2px",
              color: syncState === "error" ? C.danger : syncState === "saving" ? C.warn : C.sub }}>
              {syncState === "error" ? "⚠️ não salvo" : syncState === "saving" ? "⟳" : syncState === "offline" ? "📴" : "☁️✓"}
            </button>
            <button style={{ ...S.profileChip, borderColor: `${profile.color}66`, color: profile.color }} onClick={handleSwitchProfile}>
              {profile.emoji} {profile.name} ↩
            </button>
            <button style={{ background: "none", border: "none", color: C.sub, fontSize: 18, cursor: "pointer", padding: "4px 6px" }} onClick={() => setShowSettings(true)}>⚙️</button>
            <button style={S.newBtn} onClick={startNew}>+ Treino</button>
          </div>
        </div>
      </header>
      <div style={S.tabBar}>
        {[["home", "🏠", "Início"], ["calendar", "📅", "Calendário"], ["cardio", "🏃", "Cardio"], ["analysis", "📊", "Análise"]].map(([t, icon, label]) => (
          <button key={t} style={{ ...S.tab, ...(tab === t ? S.tabActive : {}) }} onClick={() => setTab(t)}>
            <span style={{ fontSize: 18 }}>{icon}</span><span style={{ fontSize: 10 }}>{label}</span>
          </button>
        ))}
      </div>
      {syncState === "error" && (
        <div style={{ margin: "10px 16px 0", padding: "8px 12px", borderRadius: 10, fontSize: 12, background: "rgba(255,68,85,.08)", border: "1px solid rgba(255,68,85,.3)", color: "#ff6677" }}>
          Há alterações guardadas neste aparelho que ainda não subiram para o GitHub. Elas não serão perdidas — tentaremos de novo automaticamente.
          <button onClick={retryAll} style={{ marginLeft: 8, background: "none", border: "1px solid #ff667766", borderRadius: 6, color: "#ff6677", fontSize: 11, padding: "2px 8px", cursor: "pointer" }}>Tentar agora</button>
        </div>
      )}
      {tab === "home" && <HomeTab sessions={sorted} onOpen={openSession} onHistClick={(n) => goTo("ex-hist", { ex: n })} onRepeatLast={handleRepeatLast} lastSession={lastSession} profileConfig={profileConfig}
        gyms={gyms} defaultGymId={defaultGymId} onSetDefaultGym={(id) => updateMeta({ defaultGymId: id })}
        draft={draft} onResumeDraft={() => setTab("session")} onDiscardDraft={() => setDraft(null)} />}
      {tab === "calendar" && <CalTab sessions={sessions} cardio={cardio} year={calYear} setYear={setCalYear} onOpen={openSession} />}
      {tab === "cardio" && <CardioTab cardio={cardio} update={cardioSync.update} body={body} onOpenSettings={() => setShowSettings(true)} />}
      {tab === "analysis" && <AnalysisTab sessions={sessions} profileConfig={profileConfig} prefs={analysisPrefs} landmarkOverrides={meta.landmarks || {}} gyms={gyms}
        onOpenExercise={(n) => goTo("ex-hist", { ex: n })} />}
    </div>
  );
}

// ── HOME ───────────────────────────────────────────────────────────────────────
function HomeTab({ sessions, onOpen, onHistClick, onRepeatLast, lastSession, profileConfig, gyms, defaultGymId, onSetDefaultGym, draft, onResumeDraft, onDiscardDraft }) {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("Todos");
  const [view, setView] = useState(() => { try { return localStorage.getItem("ironlog_home_view") || "group"; } catch { return "group"; } });
  const [openGroup, setOpenGroup] = useState(null);
  const setViewP = (v) => { setView(v); try { localStorage.setItem("ironlog_home_view", v); } catch {} };
  const cats = ["Todos", ...Object.keys(EXERCISE_DB)];
  const hits = q.length > 1 ? ALL_EXERCISES.filter(e => (cat === "Todos" || e.category === cat) && matchesExercise(e, q)).slice(0, 12) : [];
  const lastOf = (name) => {
    for (const s of sessions) { const e = s.exercises.find(x => x.name === name); if (e) return { date: s.date, sets: e.sets }; }
    return null;
  };

  const now = new Date();
  const thisMonthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthPrefix = `${lastMonthDate.getFullYear()}-${String(lastMonthDate.getMonth() + 1).padStart(2, "0")}`;
  const dayOfMonth = now.getDate();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const monthInProgress = dayOfMonth < daysInMonth;
  const thisMonthSessions = sessions.filter(s => s.date.startsWith(thisMonthPrefix));
  const lastMonthSessions = sessions.filter(s => s.date.startsWith(lastMonthPrefix));
  // Mês anterior até o MESMO dia → comparação equivalente
  const lastMonthEquiv = lastMonthSessions.filter(s => +s.date.slice(8, 10) <= dayOfMonth);
  const sessionsThisMonth = thisMonthSessions.length;
  const avgEx = thisMonthSessions.length > 0
    ? Math.round((thisMonthSessions.reduce((a, s) => a + s.exercises.length, 0) / thisMonthSessions.length) * 10) / 10
    : 0;
  const focalGroups = profileConfig?.focalGroups || [];

  const volByMuscle = (sess) => {
    const r = {};
    sess.forEach(s => s.exercises.forEach(e => { r[e.category] = (r[e.category] || 0) + calcVolume(e.sets); }));
    return r;
  };
  const thisVol = volByMuscle(thisMonthSessions);
  const lastVol = volByMuscle(lastMonthSessions);
  const lastVolEq = volByMuscle(lastMonthEquiv);

  // Agrupamento por treino (tipo A–E; sem tipo → pelo nome)
  const groups = [];
  const gIdx = {};
  sessions.forEach(s => {
    const tt = s.trainType || detectTrainType(s.name);
    const key = tt || `n:${(s.name || "Sem nome").trim().toLowerCase()}`;
    if (!(key in gIdx)) { gIdx[key] = groups.length; groups.push({ key, tt, title: s.name || "Treino sem nome", list: [] }); }
    groups[gIdx[key]].list.push(s);
  });
  groups.sort((a, b) => (a.tt && b.tt ? a.tt.localeCompare(b.tt) : a.tt ? -1 : b.tt ? 1 : 0));

  const sessRow = (s) => {
    const vol = s.exercises.reduce((a, e) => a + calcVolume(e.sets), 0);
    const tt = s.trainType || detectTrainType(s.name);
    const ti = tt ? TRAIN_TYPES[tt] : null;
    return (
      <button key={s.id} style={S.sessCard} onClick={() => onOpen(s)}>
        <div style={{ ...S.sessDot, background: ti ? ti.color : "#555" }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={S.sessTop}>
            <span style={S.sessNm}>{s.name || "Treino sem nome"}</span>
            {ti && <span style={{ ...S.ttBadge, background: `${ti.color}22`, color: ti.color }}>{ti.emoji} {tt}</span>}
          </div>
          <div style={S.sessMt}>{dayName(s.date)}, {fmtDate(s.date)} · {s.exercises.length} ex · {vol.toFixed(0)} kg{gyms.length > 0 ? ` · ${gymName(gyms, s.gymId)}` : ""}</div>
        </div>
        <span style={S.arrow}>›</span>
      </button>
    );
  };

  return (
    <div style={S.body}>
      {draft && (
        <div style={{ background: C.accentD, border: `1px solid ${C.accent}66`, borderRadius: 12, padding: 12, marginBottom: 12, display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.accent }}>⏳ Treino em andamento</div>
            <div style={{ fontSize: 11, color: C.sub, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{draft.session.name || "Sem nome"} · {draft.session.exercises.length} ex · {fmtDate(draft.session.date)}</div>
          </div>
          <button onClick={onResumeDraft} style={{ ...S.newBtn, padding: "6px 12px", fontSize: 12 }}>Continuar</button>
          <button onClick={onDiscardDraft} style={{ ...S.ghostB, padding: "6px 10px", fontSize: 11 }}>Fechar</button>
        </div>
      )}

      <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
        <div style={{ flex: 1, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 14 }}>
          <div style={{ fontSize: 10, color: C.sub, marginBottom: 4 }}>🗓 Sessões este mês</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: C.accent }}>{sessionsThisMonth}</div>
        </div>
        <div style={{ flex: 1, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 14 }}>
          <div style={{ fontSize: 10, color: C.sub, marginBottom: 4 }}>🏋️ Exercícios/treino</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: C.text }}>{avgEx}</div>
        </div>
      </div>

      {focalGroups.length > 0 && (
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 14, marginBottom: 12 }}>
          <div style={{ fontSize: 11, color: C.sub, marginBottom: 4 }}>📊 Volume (tonelagem) por grupo focal — mês atual vs. anterior</div>
          {monthInProgress && <div style={{ fontSize: 10, color: C.warn, marginBottom: 10 }}>⏳ Mês em andamento (dia {dayOfMonth}/{daysInMonth}) — % comparada aos mesmos {dayOfMonth} dias do mês anterior</div>}
          {focalGroups.map(g => {
            const curr = thisVol[g] || 0;
            const prev = lastVol[g] || 0;
            const prevEq = lastVolEq[g] || 0;
            const delta = prevEq > 0 ? ((curr - prevEq) / prevEq * 100) : null;
            const maxVal = Math.max(curr, prev, 1);
            const col = delta === null ? C.sub : delta >= 0 ? C.success : monthInProgress ? C.sub : C.warn;
            return (
              <div key={g} style={{ marginBottom: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ fontSize: 12, color: C.text }}>{g}</span>
                  <span style={{ fontSize: 11, color: col }}>
                    {delta !== null ? `${delta >= 0 ? "+" : ""}${delta.toFixed(0)}%` : "—"}
                  </span>
                </div>
                <div style={{ display: "flex", gap: 4, height: 6 }}>
                  <div style={{ flex: prev / maxVal, background: C.border, borderRadius: 3 }} />
                  <div style={{ flex: curr / maxVal, background: C.accent, borderRadius: 3 }} />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 2 }}>
                  <span style={{ fontSize: 9, color: C.sub }}>{(prev / 1000).toFixed(1)}t mês ant.{monthInProgress ? ` (${(prevEq / 1000).toFixed(1)}t até dia ${dayOfMonth})` : ""}</span>
                  <span style={{ fontSize: 9, color: C.accent }}>{(curr / 1000).toFixed(1)}t atual</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {lastSession && (
        <div style={S.section}>
          <div style={S.sT}>⚡ Acesso Rápido</div>
          <button style={S.repeatBtn} onClick={onRepeatLast}>
            <div style={{ flex: 1, textAlign: "left" }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.accent, marginBottom: 3 }}>🔁 Repetir último treino</div>
              <div style={{ fontSize: 12, color: C.sub }}>{lastSession.name} · {fmtDate(lastSession.date)}</div>
            </div>
            <span style={{ color: C.accent, fontSize: 20 }}>›</span>
          </button>
        </div>
      )}
      {gyms.length > 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: 6, margin: "-10px 0 16px", fontSize: 11, color: C.sub }}>
          <span>🏢 Academia padrão:</span>
          <select value={defaultGymId || ""} onChange={(e) => onSetDefaultGym(e.target.value || null)}
            style={{ background: "transparent", border: "none", color: C.accent, fontSize: 11, fontWeight: 600, outline: "none", cursor: "pointer" }}>
            <option value="">{UNKNOWN_GYM}</option>
            {gyms.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
        </div>
      )}

      <div style={S.section}>
        <div style={S.sT}>🔍 Buscar Exercício</div>
        <input style={S.si} placeholder="Nome do exercício..." value={q} onChange={e => setQ(e.target.value)} />
        {q.length > 1 && <div style={S.cScroll}>{cats.map(c => <button key={c} style={{ ...S.chip, ...(cat === c ? S.chipA : {}) }} onClick={() => setCat(c)}>{c}</button>)}</div>}
        {hits.length > 0 && <div style={S.exGrid}>{hits.map(ex => {
          const l = lastOf(ex.name);
          return (
            <button key={ex.name} style={S.exCard} onClick={() => onHistClick(ex.name)}>
              <div style={S.exCat}>{ex.category}</div>
              <div style={S.exNm}>{ex.name}</div>
              <div style={S.exDs}>{ex.desc.slice(0, 55)}{ex.desc.length > 55 ? "…" : ""}</div>
              <div style={S.exLs}>{l ? `${fmtDate(l.date)} · ${l.sets.length}s · ${calcVolume(l.sets).toFixed(0)}kg` : "Sem histórico"}</div>
            </button>
          );
        })}</div>}
      </div>

      <div style={S.section}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <div style={{ ...S.sT, marginBottom: 0 }}>📋 {view === "group" ? "Treinos por grupamento" : "Treinos Recentes"}</div>
          <div style={{ display: "flex", gap: 4 }}>
            {[["group", "Por treino"], ["recent", "Recentes"]].map(([v, l]) => (
              <button key={v} onClick={() => setViewP(v)} style={{ ...S.chip, padding: "4px 10px", fontSize: 11, ...(view === v ? S.chipA : {}) }}>{l}</button>
            ))}
          </div>
        </div>
        {view === "recent" && sessions.map(sessRow)}
        {view === "group" && groups.map(g => {
          const ti = g.tt ? TRAIN_TYPES[g.tt] : null;
          const isOpen = openGroup === g.key;
          const last = g.list[0];
          return (
            <div key={g.key} style={{ marginBottom: 8 }}>
              <button onClick={() => setOpenGroup(isOpen ? null : g.key)} style={{ ...S.sessCard, marginBottom: isOpen ? 6 : 0, borderColor: ti ? `${ti.color}55` : C.border }}>
                <div style={{ ...S.sessDot, background: ti ? ti.color : "#555" }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={S.sessTop}>
                    <span style={S.sessNm}>{g.title}</span>
                    {ti && <span style={{ ...S.ttBadge, background: `${ti.color}22`, color: ti.color }}>{ti.emoji} {g.tt}</span>}
                  </div>
                  <div style={S.sessMt}>{g.list.length} treinos · último {dayName(last.date)}, {fmtDate(last.date)}</div>
                </div>
                <span style={{ color: C.sub, fontSize: 12 }}>{isOpen ? "▲" : "▼"}</span>
              </button>
              {isOpen && <div style={{ paddingLeft: 12, borderLeft: `2px solid ${ti ? ti.color + "55" : C.border}`, marginLeft: 4 }}>{g.list.map(sessRow)}</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── CALENDAR ───────────────────────────────────────────────────────────────────
function CalTab({ sessions, cardio = [], year, setYear, onOpen }) {
  const [selDay, setSelDay] = useState(null);
  const sMap = {};
  sessions.forEach(s => { if (!sMap[s.date]) sMap[s.date] = []; sMap[s.date].push(s); });
  const cMap = {};
  cardio.forEach(c => { if (!cMap[c.date]) cMap[c.date] = []; cMap[c.date].push(c); });

  const sorted = [...new Set(sessions.map(s => s.date))].sort();
  let streak = 0, cur = todayISO();
  for (let i = sorted.length - 1; i >= 0; i--) {
    const d = sorted[i];
    const diff = Math.round((new Date(cur + "T12:00:00") - new Date(d + "T12:00:00")) / 864e5);
    if (diff <= 1) { streak++; cur = d; } else break;
  }

  const selSessions = selDay ? (sMap[selDay] || []) : [];

  return (
    <div style={S.body}>
      <div style={S.yearNav}>
        <button style={S.yBtn} onClick={() => setYear(y => y - 1)}>‹</button>
        <span style={S.yLbl}>{year}</span>
        <button style={S.yBtn} onClick={() => setYear(y => y + 1)}>›</button>
      </div>
      <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap", marginBottom: 12 }}>
        {Object.entries(TRAIN_TYPES).map(([k, v]) => (
          <div key={k} style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: v.color }} />
            <span style={{ fontSize: 10, color: C.sub }}>{v.emoji}{k}</span>
          </div>
        ))}
      </div>
      {streak > 1 && <div style={{ textAlign: "center", marginBottom: 10, fontSize: 12, color: C.accent }}>🔥 Sequência atual: {streak} treinos!</div>}
      <div style={S.monthsGrid}>
        {Array.from({ length: 12 }, (_, m) => {
          const firstDay = new Date(year, m, 1).getDay();
          const days = new Date(year, m + 1, 0).getDate();
          return (
            <div key={m} style={S.mBlock}>
              <div style={S.mLabel}>{MONTHS_PT[m]}</div>
              <div style={S.wkHdr}>{["D", "S", "T", "Q", "Q", "S", "S"].map((d, i) => <span key={i} style={{ fontSize: 8, color: C.sub, textAlign: "center" }}>{d}</span>)}</div>
              <div style={S.dGrid}>
                {Array(firstDay).fill(null).map((_, i) => <div key={`e${i}`} />)}
                {Array.from({ length: days }, (_, i) => {
                  const day = i + 1;
                  const ds = `${year}-${String(m + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                  const ds2 = sMap[ds] || [];
                  const today = todayISO();
                  const tt = ds2[0] ? (ds2[0].trainType || detectTrainType(ds2[0].name)) : null;
                  const col = tt ? TRAIN_TYPES[tt]?.color : null;
                  const isSel = ds === selDay, isToday = ds === today;
                  return (
                    <button key={day} style={{ ...S.dCell, ...(isToday ? { border: `1px solid ${C.accent}66` } : {}), ...(isSel ? { border: `1px solid ${C.accent}` } : {}), ...(col ? { background: `${col}30`, border: `1px solid ${col}66` } : {}) }} onClick={() => setSelDay(isSel ? null : ds)}>
                      <span style={{ fontSize: 9, color: col || C.sub, lineHeight: 1 }}>{day}</span>
                      <div style={{ display: "flex", gap: 1, marginTop: 1 }}>
                        {ds2.length > 0 && <div style={{ width: 3, height: 3, borderRadius: "50%", background: col || C.accent }} />}
                        {cMap[ds] && <div style={{ width: 3, height: 3, borderRadius: "50%", background: "#4fc3f7" }} />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
      {selDay && (
        <div style={S.section}>
          <div style={S.sT}>{dayName(selDay)}, {fmtDate(selDay)}</div>
          {cMap[selDay] && cMap[selDay].map(c => (
            <div key={c.id} style={{ fontSize: 12, color: "#4fc3f7", background: "rgba(79,195,247,.06)", border: "1px solid rgba(79,195,247,.25)", borderRadius: 10, padding: "8px 12px", marginBottom: 8 }}>
              🏃 {c.label || c.activity} · {c.durationMin} min{c.kcal ? ` · ≈${c.kcal} kcal` : ""}
            </div>
          ))}
          {selSessions.length === 0 && !cMap[selDay]
            ? <div style={{ color: C.sub, fontSize: 13, padding: "8px 0" }}>Dia de descanso 😴</div>
            : selSessions.length === 0 ? null
            : selSessions.map(s => {
              const tt = s.trainType || detectTrainType(s.name);
              const ti = tt ? TRAIN_TYPES[tt] : null;
              const vol = s.exercises.reduce((a, e) => a + calcVolume(e.sets), 0);
              return (
                <div key={s.id} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 14, marginBottom: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{s.name}</div>
                      <div style={{ fontSize: 11, color: C.sub }}>{s.exercises.length} exercícios · {vol.toFixed(0)} kg{ti ? ` · ${ti.label}` : ""}</div>
                    </div>
                    <button onClick={() => onOpen(s)} style={{ padding: "6px 12px", borderRadius: 8, border: `1px solid ${C.accent}`, background: "transparent", color: C.accent, fontSize: 12, cursor: "pointer" }}>
                      Editar
                    </button>
                  </div>
                  {s.exercises.map((e, ei) => (
                    <div key={e.id} style={{ padding: "8px 0", borderTop: `1px solid ${C.border}` }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: C.text, marginBottom: 4 }}>
                        {ei + 1}. {e.name}
                        <span style={{ fontWeight: 400, color: C.sub, fontSize: 11, marginLeft: 6 }}>{e.category}</span>
                      </div>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        {e.sets.map((set, si) => (
                          <span key={si} style={{ fontSize: 11, color: C.sub, background: C.surfaceHigh, borderRadius: 6, padding: "2px 8px" }}>
                            {set.reps}×{set.weight}kg
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              );
            })}
        </div>
      )}
      <div style={S.section}>
        <div style={S.sT}>📈 Frequência {year}</div>
        <div style={S.statsBar}>
          <SC icon="🗓" label="Treinos" value={sessions.filter(s => s.date.startsWith(String(year))).length} />
          <SC icon="🔥" label="Streak" value={`${streak}x`} />
          <SC icon="💪" label="Esta semana" value={`${sessions.filter(s => { const d = new Date(s.date + "T12:00:00"), n = new Date(); return (n - d) / 864e5 < 7; }).length}x`} />
        </div>
      </div>
    </div>
  );
}

// ── SESSION VIEW ───────────────────────────────────────────────────────────────
function SessionView({ draft, sessions, gyms, onChange, onSave, onBack, onDelete, onHistClick, onSwap, buildExercises }) {
  const isNew = draft.isNew;
  const [data, setData] = useState(() => JSON.parse(JSON.stringify(draft.session)));
  const [showPicker, setShowPicker] = useState(false);
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);
  const [q, setQ] = useState(""); const [cat, setCat] = useState("Todos");
  const [exp, setExp] = useState(isNew && !draft.fromTemplate ? [] : draft.session.exercises.map(e => e.id));
  const [confirmDel, setConfirmDel] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } })
  );

  // Toda mudança vai para o rascunho persistido (não se perde se o app fechar)
  const first = useRef(true);
  useEffect(() => { if (first.current) { first.current = false; return; } onChange(data); }, [data]); // eslint-disable-line react-hooks/exhaustive-deps

  const mut = fn => { setData(p => { const n = JSON.parse(JSON.stringify(p)); fn(n); return n; }); };
  const addEx = ex => { const id = uid(); mut(d => d.exercises.push({ id, name: ex.name, category: ex.category, notes: "", sets: [{ reps: "", weight: "" }] })); setExp(p => [...p, id]); setShowPicker(false); setQ(""); };
  const rmEx = eid => mut(d => { d.exercises = d.exercises.filter(e => e.id !== eid); });
  const addSet = eid => mut(d => { const ex = d.exercises.find(e => e.id === eid); const l = ex.sets[ex.sets.length - 1] || { reps: "", weight: "" }; ex.sets.push({ reps: l.reps, weight: l.weight }); });
  const rmSet = (eid, si) => mut(d => { d.exercises.find(e => e.id === eid).sets.splice(si, 1); });
  const updS = (eid, si, f, v) => mut(d => { d.exercises.find(e => e.id === eid).sets[si][f] = v === "" ? "" : (parseFloat(v) || 0); });
  const updN = (eid, v) => mut(d => { d.exercises.find(e => e.id === eid).notes = v; });
  const updEq = (eid, v) => mut(d => { const ex = d.exercises.find(e => e.id === eid); if (v.trim()) ex.equipment = v; else delete ex.equipment; });
  const togWarm = (eid, si, current) => mut(d => { d.exercises.find(e => e.id === eid).sets[si].warmup = !current; });
  const togEx = id => setExp(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    mut(d => {
      const oldIndex = d.exercises.findIndex(e => e.id === active.id);
      const newIndex = d.exercises.findIndex(e => e.id === over.id);
      d.exercises = arrayMove(d.exercises, oldIndex, newIndex);
    });
  };

  // Usar treino anterior como base: mantém EXATAMENTE a ordem do treino escolhido
  const loadFromTemplate = (templateSession) => {
    const exs = buildExercises(templateSession.exercises, data.gymId || null, data.id);
    mut(d => { d.name = templateSession.name; d.trainType = templateSession.trainType; d.exercises = exs; });
    setExp(exs.map(e => e.id));
    setShowTemplatePicker(false);
  };
  const refillFromGym = () => {
    const exs = buildExercises(data.exercises, data.gymId || null, data.id);
    mut(d => { d.exercises = d.exercises.map((e, i) => ({ ...e, sets: exs[i].sets })); });
  };

  // Equipamentos já usados neste exercício nesta academia (sugestões)
  const equipOptions = (name) => {
    const set = new Set();
    sessions.forEach(s => { if ((s.gymId || null) !== (data.gymId || null)) return; s.exercises.forEach(e => { if (e.name === name && e.equipment) set.add(e.equipment); }); });
    return [...set];
  };

  const cats = ["Todos", ...Object.keys(EXERCISE_DB)];
  const filtEx = ALL_EXERCISES.filter(e => (cat === "Todos" || e.category === cat) && (q.length < 2 || matchesExercise(e, q)));
  const totalVol = data.exercises.reduce((a, e) => a + calcVolume(e.sets), 0);
  const tt = data.trainType || detectTrainType(data.name);
  const ti = tt ? TRAIN_TYPES[tt] : null;
  const gName = gymName(gyms, data.gymId);

  return (
    <div style={S.app}>
      <div style={S.grain} />
      <header style={S.sessHdr}>
        <button style={S.back} onClick={() => onBack(data)}>← Voltar</button>
        <div style={{ flex: 1, textAlign: "center", fontSize: 13, fontWeight: 700, color: C.text }}>{isNew ? "Novo Treino" : "Editar"}</div>
        <button style={S.saveB} onClick={() => onSave(data)}>✓ Salvar</button>
      </header>
      <div style={S.body}>
        <div style={S.metaCard}>
          <div style={S.mRow2}><label style={S.mLbl2}>Data</label><input type="date" style={S.mIn} value={data.date} onChange={e => mut(d => d.date = e.target.value)} /></div>
          <div style={S.mRow2}><label style={S.mLbl2}>Nome</label><input style={{ ...S.mIn, flex: 1 }} placeholder="Ex: Treino B – Push" value={data.name} onChange={e => { mut(d => { d.name = e.target.value; const tt = detectTrainType(e.target.value); if (tt) d.trainType = tt; }); }} /></div>
          {gyms.length > 0 && (
            <div style={S.mRow2}>
              <label style={{ ...S.mLbl2, width: 36 }}>🏢</label>
              <select value={data.gymId || ""} onChange={e => mut(d => { d.gymId = e.target.value || null; })} style={{ ...S.mIn, flex: 1 }}>
                <option value="">{UNKNOWN_GYM}</option>
                {gyms.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
            </div>
          )}
          {gyms.length > 0 && isNew && data.exercises.length > 0 && (
            <button onClick={refillFromGym} style={{ ...S.swapB, margin: "0 0 10px", fontSize: 11 }}>↻ Preencher cargas com o último registro em {gName}</button>
          )}
          <div style={S.cRow}>{Object.entries(TRAIN_TYPES).map(([k, v]) => <button key={k} style={{ ...S.chip, fontSize: 11, ...(data.trainType === k ? { background: `${v.color}22`, borderColor: v.color, color: v.color } : {}) }} onClick={() => mut(d => d.trainType = k)}>{v.emoji} {k}</button>)}</div>
          {ti && <div style={{ fontSize: 11, color: ti.color, marginTop: 6 }}>{ti.label} · {ti.muscles.join(", ")}</div>}
          <div style={{ fontSize: 11, color: C.sub, marginTop: 8 }}>Volume total: <strong style={{ color: C.accent }}>{totalVol.toFixed(0)} kg</strong></div>
        </div>

        {isNew && sessions.length > 0 && data.exercises.length === 0 && (
          <button style={S.templateBtn} onClick={() => setShowTemplatePicker(true)}>
            📋 Usar treino anterior como base
          </button>
        )}

        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={data.exercises.map(e => e.id)} strategy={verticalListSortingStrategy}>
            {data.exercises.map(ex => {
              const { exact, other } = lastComparable(sessions, ex.name, data.gymId || null, ex.equipment, data.id);
              const exVol = calcVolume(ex.sets);
              const isO = exp.includes(ex.id);
              const info = findExercise(ex.name);
              const warm = warmupFlags(ex.sets);
              const eqOpts = equipOptions(ex.name);
              const placeholderW = (si) => exact ? String((exact.sets[si] || exact.sets[exact.sets.length - 1]).weight) : "0";
              return (
                <SortableExerciseItem key={ex.id} id={ex.id}>
                  <div style={S.exBlk}>
                    <div style={S.exBlkH} onClick={() => togEx(ex.id)}>
                      <div style={{ flex: 1, minWidth: 0 }}><div style={S.exCat}>{ex.category}{ex.equipment ? ` · ${ex.equipment}` : ""}</div><div style={S.exNm2}>{ex.name}</div></div>
                      <span style={S.vChip}>{exVol.toFixed(0)}kg</span>
                      <span style={{ color: C.sub, fontSize: 11 }}>{isO ? "▲" : "▼"}</span>
                    </div>
                    {isO && (<>
                      {info.desc && <div style={S.exDsB}>📖 {info.desc}</div>}
                      {exact ? (
                        <button style={S.lastH} onClick={() => onHistClick(ex.name)}>
                          <span>⏱</span>
                          <div>
                            <div style={{ fontSize: 11, color: C.green, fontWeight: 600 }}>Último{gyms.length > 0 ? ` em ${gName}` : ""}{ex.equipment ? ` · ${ex.equipment}` : ""}: {fmtDate(exact.date)}</div>
                            <div style={{ fontSize: 11, color: C.sub, marginTop: 1 }}>{exact.sets.map(s => `${s.reps}×${s.weight}kg`).join(" · ")}</div>
                          </div>
                          <span style={{ marginLeft: "auto", color: C.sub }}>›</span>
                        </button>
                      ) : (
                        <button style={{ ...S.lastH, background: C.surfaceHigh, border: `1px solid ${C.border}` }} onClick={() => onHistClick(ex.name)}>
                          <span>ℹ️</span>
                          <div>
                            <div style={{ fontSize: 11, color: C.sub, fontWeight: 600 }}>Ainda não há registros {gyms.length > 0 ? `em ${gName}` : ""}{ex.equipment ? ` com ${ex.equipment}` : ""}</div>
                            {other && <div style={{ fontSize: 10, color: C.sub, marginTop: 2, opacity: .8 }}>Em {gymName(gyms, other.gymId)}{other.equipment ? ` · ${other.equipment}` : ""} ({fmtDate(other.date)}): {other.sets.map(s => `${s.reps}×${s.weight}`).join(" · ")} — não comparável</div>}
                          </div>
                          <span style={{ marginLeft: "auto", color: C.sub }}>›</span>
                        </button>
                      )}
                      {info.alts && info.alts.length > 0 && <button style={S.swapB} onClick={() => onSwap(info)}>🔄 Ver similares ({info.alts.length})</button>}
                      <div style={{ display: "flex", gap: 8, margin: "0 14px 10px" }}>
                        <input list={`eq-${ex.id}`} style={{ ...S.noteIn, margin: 0, width: "auto", flex: 1 }} placeholder="Equipamento (opcional) ex: Máquina 02" value={ex.equipment || ""} onChange={e => updEq(ex.id, e.target.value)} />
                        <datalist id={`eq-${ex.id}`}>{eqOpts.map(o => <option key={o} value={o} />)}</datalist>
                      </div>
                      <input style={S.noteIn} placeholder="Observações..." value={ex.notes} onChange={e => updN(ex.id, e.target.value)} />
                      <div style={S.sHdr}>
                        <span style={{ width: 24, color: C.sub, fontSize: 11, textAlign: "center" }}>#</span>
                        <span style={{ flex: 1, color: C.sub, fontSize: 11, textAlign: "center" }}>Reps</span>
                        <span style={{ flex: 1, color: C.sub, fontSize: 11, textAlign: "center" }}>Peso kg</span>
                        <span style={{ flex: 1, color: C.sub, fontSize: 11, textAlign: "center" }}>Vol</span>
                        <span style={{ width: 24 }} />
                      </div>
                      {ex.sets.map((s, si) => (
                        <div key={si} style={S.sRow}>
                          <button title="Tocar para marcar/desmarcar aquecimento" onClick={() => togWarm(ex.id, si, warm[si])}
                            style={{ ...S.sNum, background: "none", border: "none", cursor: "pointer", padding: 0, color: warm[si] ? C.warn : C.sub, fontWeight: warm[si] ? 700 : 400 }}>
                            {warm[si] ? "A" : si + 1}
                          </button>
                          <input style={S.sIn} type="number" inputMode="numeric" placeholder="0" value={s.reps} onChange={e => updS(ex.id, si, "reps", e.target.value)} />
                          <input style={S.sIn} type="number" inputMode="decimal" placeholder={placeholderW(si)} step="0.5" value={s.weight} onChange={e => updS(ex.id, si, "weight", e.target.value)} />
                          <span style={S.sVol}>{((+s.reps || 0) * (+s.weight || 0)).toFixed(0)}</span>
                          <button style={S.sDel} onClick={() => rmSet(ex.id, si)}>×</button>
                        </div>
                      ))}
                      <div style={{ fontSize: 10, color: C.sub, padding: "4px 14px 0" }}>Toque no nº da série para marcar como aquecimento (A) — não conta nas séries de trabalho.</div>
                      <div style={S.sActs}>
                        <button style={S.addSB} onClick={() => addSet(ex.id)}>+ Série</button>
                        <button style={S.rmExB} onClick={() => rmEx(ex.id)}>Remover</button>
                      </div>
                    </>)}
                  </div>
                </SortableExerciseItem>
              );
            })}
          </SortableContext>
        </DndContext>

        <button style={S.addExB} onClick={() => setShowPicker(true)}>+ Adicionar Exercício</button>
        {!isNew && onDelete && <div style={{ textAlign: "center", marginBottom: 40 }}>
          {!confirmDel
            ? <button style={S.dangerB} onClick={() => setConfirmDel(true)}>🗑 Excluir Treino</button>
            : <div>
              <div style={{ color: "#ff5555", fontSize: 13, marginBottom: 8 }}>Tem certeza?</div>
              <button style={{ ...S.dangerB, marginRight: 8 }} onClick={onDelete}>Sim</button>
              <button style={S.ghostB} onClick={() => setConfirmDel(false)}>Cancelar</button>
            </div>}
        </div>}
      </div>

      {showPicker && (
        <div style={S.modal} onClick={() => setShowPicker(false)}>
          <div style={S.mBox} onClick={e => e.stopPropagation()}>
            <div style={S.mHdr}><span style={{ fontWeight: 700 }}>Escolher Exercício</span><button style={S.mClose} onClick={() => setShowPicker(false)}>×</button></div>
            <input autoFocus style={S.mSearch} placeholder="Buscar..." value={q} onChange={e => setQ(e.target.value)} />
            <div style={{ ...S.cScroll, padding: "0 14px 8px" }}>{cats.map(c => <button key={c} style={{ ...S.chip, ...(cat === c ? S.chipA : {}) }} onClick={() => setCat(c)}>{c}</button>)}</div>
            <div style={S.mList}>{filtEx.slice(0, 60).map(ex => (
              <button key={ex.category + ex.name} style={S.mExI} onClick={() => addEx(ex)}>
                <span style={S.exCat}>{ex.category}</span>
                <span style={{ fontSize: 14, color: C.text }}>{ex.name}</span>
                {ex.desc && <span style={{ fontSize: 11, color: C.sub, marginTop: 2 }}>{ex.desc.slice(0, 60)}…</span>}
              </button>
            ))}
              {filtEx.length === 0 && <div style={{ color: C.sub, padding: 16 }}>Nenhum resultado</div>}
            </div>
          </div>
        </div>
      )}

      {showTemplatePicker && (
        <div style={S.modal} onClick={() => setShowTemplatePicker(false)}>
          <div style={S.mBox} onClick={e => e.stopPropagation()}>
            <div style={S.mHdr}><span style={{ fontWeight: 700 }}>Usar como base</span><button style={S.mClose} onClick={() => setShowTemplatePicker(false)}>×</button></div>
            <div style={{ padding: "0 14px 8px", fontSize: 12, color: C.sub }}>Copia exercícios (na mesma ordem), séries e reps. Cargas vêm do último registro em {gName}; sem registro, ficam em branco.</div>
            <div style={S.mList}>
              {sessions.map(s => {
                const tt = s.trainType || detectTrainType(s.name);
                const ti = tt ? TRAIN_TYPES[tt] : null;
                const vol = s.exercises.reduce((a, e) => a + calcVolume(e.sets), 0);
                return (
                  <button key={s.id} style={S.mExI} onClick={() => loadFromTemplate(s)}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, width: "100%" }}>
                      {ti && <div style={{ width: 8, height: 8, borderRadius: "50%", background: ti.color, flexShrink: 0 }} />}
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 14, color: C.text, fontWeight: 600 }}>{s.name || "Treino sem nome"}</div>
                        <div style={{ fontSize: 11, color: C.sub, marginTop: 2 }}>{dayName(s.date)}, {fmtDate(s.date)} · {s.exercises.length} ex · {vol.toFixed(0)} kg</div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── SWAP VIEW ──────────────────────────────────────────────────────────────────
function SwapView({ exercise, onBack }) {
  if (!exercise) return null;
  const alts = (exercise.alts || []).map(name => findExercise(name)).filter(e => e.name);
  return (
    <div style={S.app}>
      <div style={S.grain} />
      <header style={S.sessHdr}>
        <button style={S.back} onClick={onBack}>← Voltar</button>
        <div style={{ flex: 1, textAlign: "center", fontSize: 13, fontWeight: 700, color: C.text }}>Exercícios Similares</div>
        <div style={{ width: 70 }} />
      </header>
      <div style={S.body}>
        <div style={{ marginBottom: 16 }}>
          <div style={S.exCat}>{exercise.category}</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: C.text, marginBottom: 6 }}>{exercise.name}</div>
          {exercise.desc && <div style={{ fontSize: 13, color: C.sub, lineHeight: 1.6 }}>{exercise.desc}</div>}
        </div>
        <div style={S.sT}>🔄 Alternativas com Padrão Similar</div>
        {alts.length === 0 && <div style={{ color: C.sub }}>Sem alternativas cadastradas.</div>}
        {alts.map((alt, i) => (
          <div key={i} style={S.altCard}>
            <div style={S.exCat}>{alt.category}</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 4 }}>{alt.name}</div>
            <div style={{ fontSize: 12, color: C.sub, lineHeight: 1.5 }}>{alt.desc}</div>
            {alt.alts && alt.alts.length > 0 && <div style={{ marginTop: 6, fontSize: 11, color: C.sub }}>Outras opções: {alt.alts.filter(a => a !== exercise.name).slice(0, 2).join(", ")}</div>}
          </div>
        ))}
        <div style={S.pNote}>💡 Troque exercícios mantendo o padrão de movimento. Segundo Pacholok, variações devem ocorrer a cada bloco de 4 semanas. Priorize movimentos compostos para troca de estímulo.</div>
      </div>
    </div>
  );
}

function SC({ icon, label, value }) {
  return (
    <div style={S.statCard}>
      <div style={{ fontSize: 20 }}>{icon}</div>
      <div style={{ fontSize: 19, fontWeight: 800, color: C.accent }}>{value}</div>
      <div style={{ fontSize: 10, color: C.sub, marginTop: 1 }}>{label}</div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// STYLES
// ══════════════════════════════════════════════════════════════════════════════
const S = {
  app: { minHeight: "100vh", background: C.bg, fontFamily: "'DM Sans','Segoe UI',sans-serif", color: C.text, maxWidth: 680, margin: "0 auto", position: "relative" },
  grain: { position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0, opacity: .03, backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='4'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")", backgroundSize: "150px" },
  header: { position: "sticky", top: 0, zIndex: 100, background: "rgba(10,10,12,.96)", backdropFilter: "blur(14px)", borderBottom: `1px solid ${C.border}`, padding: "12px 18px" },
  headerInner: { display: "flex", alignItems: "center", justifyContent: "space-between" },
  logo: { fontSize: 22, fontWeight: 800, letterSpacing: "-.5px", color: C.accent },
  logoSub: { fontSize: 11, color: C.sub, letterSpacing: ".5px", marginTop: 1 },
  newBtn: { background: C.accent, color: "#000", border: "none", borderRadius: 8, padding: "8px 16px", fontWeight: 700, fontSize: 13, cursor: "pointer" },
  profileChip: { background: "transparent", border: `1px solid`, borderRadius: 20, padding: "5px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer" },
  tabBar: { display: "flex", background: C.surface, borderBottom: `1px solid ${C.border}` },
  tab: { flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 2, padding: "10px 4px", background: "none", border: "none", color: C.sub, cursor: "pointer" },
  tabActive: { color: C.accent, borderBottom: `2px solid ${C.accent}` },
  body: { padding: "16px 16px 60px", position: "relative", zIndex: 1 },
  statsBar: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 16 },
  statCard: { background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: "12px 8px", textAlign: "center" },
  section: { marginBottom: 20 },
  sT: { fontSize: 11, fontWeight: 700, color: C.sub, letterSpacing: ".8px", textTransform: "uppercase", marginBottom: 10 },
  si: { width: "100%", boxSizing: "border-box", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: "10px 14px", color: C.text, fontSize: 15, outline: "none", marginBottom: 8 },
  cScroll: { display: "flex", gap: 8, flexWrap: "wrap", paddingBottom: 8 },
  cRow: { display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 },
  chip: { background: C.surfaceHigh, border: `1px solid ${C.border}`, borderRadius: 20, padding: "8px 16px", fontSize: 14, color: C.sub, cursor: "pointer", whiteSpace: "nowrap" },
  chipA: { background: C.accentD, borderColor: C.accent, color: C.accent },
  exGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 8 },
  exCard: { background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: "10px", textAlign: "left", cursor: "pointer" },
  exCat: { fontSize: 9, color: C.accent, textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 2 },
  exNm: { fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 3, lineHeight: 1.3 },
  exDs: { fontSize: 10, color: C.sub, lineHeight: 1.4, marginBottom: 4 },
  exLs: { fontSize: 10, color: C.sub },
  repeatBtn: { width: "100%", background: C.surface, border: `1px solid ${C.accent}44`, borderRadius: 12, padding: "12px 16px", display: "flex", alignItems: "center", gap: 12, cursor: "pointer", textAlign: "left" },
  sessCard: { background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: "12px 14px", display: "flex", alignItems: "center", gap: 12, cursor: "pointer", textAlign: "left", width: "100%", marginBottom: 8 },
  sessDot: { width: 10, height: 10, borderRadius: "50%", flexShrink: 0 },
  sessTop: { display: "flex", alignItems: "center", gap: 8, marginBottom: 3 },
  sessNm: { fontSize: 14, fontWeight: 600, color: C.text, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  ttBadge: { fontSize: 10, fontWeight: 700, borderRadius: 20, padding: "2px 8px", flexShrink: 0 },
  sessMt: { fontSize: 11, color: C.sub },
  arrow: { fontSize: 20, color: C.sub },
  yearNav: { display: "flex", alignItems: "center", justifyContent: "center", gap: 20, padding: "12px 0" },
  yBtn: { background: "none", border: `1px solid ${C.border}`, borderRadius: 8, color: C.text, fontSize: 20, width: 36, height: 36, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" },
  yLbl: { fontSize: 20, fontWeight: 800, color: C.text },
  monthsGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 },
  mBlock: { background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: "8px" },
  mLabel: { fontSize: 11, fontWeight: 700, color: C.text, marginBottom: 4, textAlign: "center" },
  wkHdr: { display: "grid", gridTemplateColumns: "repeat(7,1fr)", marginBottom: 2 },
  dGrid: { display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 1 },
  dCell: { aspectRatio: "1", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", borderRadius: 3, background: "none", border: "1px solid transparent", cursor: "pointer", padding: 0 },
  mRow: { display: "flex", alignItems: "center", gap: 8, marginBottom: 8 },
  mLbl: { display: "flex", alignItems: "center", gap: 4, width: 88, flexShrink: 0 },
  mBarW: { flex: 1, background: C.surfaceHigh, borderRadius: 4, height: 7, overflow: "hidden" },
  mBar: { height: "100%", borderRadius: 4, transition: "width .3s" },
  mSets: { width: 28, textAlign: "right", fontSize: 12, color: C.accent, fontWeight: 600 },
  alertBox: { padding: "10px 14px", borderRadius: 10, marginBottom: 8, fontSize: 13, lineHeight: 1.5 },
  alertW: { background: "rgba(255,183,77,.1)", border: "1px solid rgba(255,183,77,.3)", color: "#ffb74d" },
  alertE: { background: "rgba(255,68,85,.1)", border: "1px solid rgba(255,68,85,.3)", color: "#ff6677" },
  tipCard: { background: C.surfaceHigh, border: `1px solid ${C.border}`, borderRadius: 10, padding: "12px", marginBottom: 10 },
  tipPh: { fontSize: 12, fontWeight: 700, color: C.accent, marginBottom: 6 },
  tipTx: { fontSize: 13, color: C.text, lineHeight: 1.6 },
  pNote: { background: "rgba(245,166,35,.06)", border: "1px solid rgba(245,166,35,.2)", borderRadius: 10, padding: "12px", fontSize: 12, color: C.sub, lineHeight: 1.6, marginTop: 12 },
  sessHdr: { position: "sticky", top: 0, zIndex: 100, background: "rgba(10,10,12,.96)", backdropFilter: "blur(14px)", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", padding: "12px 14px", gap: 8 },
  back: { background: "none", border: "none", color: C.sub, fontSize: 13, cursor: "pointer", padding: "4px 8px" },
  saveB: { background: C.accent, color: "#000", border: "none", borderRadius: 8, padding: "7px 14px", fontWeight: 700, fontSize: 13, cursor: "pointer" },
  metaCard: { background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: "14px", marginBottom: 14 },
  mRow2: { display: "flex", alignItems: "center", gap: 10, marginBottom: 10 },
  mLbl2: { fontSize: 12, color: C.sub, width: 36 },
  mIn: { background: C.surfaceHigh, border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 12px", color: C.text, fontSize: 14, outline: "none" },
  templateBtn: { display: "block", width: "100%", padding: "12px 14px", background: "rgba(79,195,247,.06)", border: `1px dashed rgba(79,195,247,.3)`, borderRadius: 12, color: "#4fc3f7", fontSize: 13, fontWeight: 600, cursor: "pointer", marginBottom: 12, textAlign: "left" },
  exBlk: { background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, marginBottom: 10, overflow: "hidden" },
  exBlkH: { display: "flex", alignItems: "center", padding: "12px 14px", cursor: "pointer", gap: 8 },
  exNm2: { fontSize: 15, fontWeight: 700, color: C.text },
  vChip: { background: C.accentD, border: `1px solid ${C.accent}44`, borderRadius: 20, padding: "2px 10px", fontSize: 11, color: C.accent, fontWeight: 600 },
  exDsB: { fontSize: 12, color: C.sub, lineHeight: 1.5, padding: "0 14px 10px", fontStyle: "italic" },
  lastH: { display: "flex", alignItems: "center", gap: 10, background: "rgba(46,204,113,.06)", border: "1px solid rgba(46,204,113,.2)", borderRadius: 8, margin: "0 14px 10px", padding: "8px 12px", cursor: "pointer", textAlign: "left", width: "calc(100% - 28px)" },
  swapB: { display: "block", margin: "0 14px 10px", background: "rgba(79,195,247,.08)", border: "1px solid rgba(79,195,247,.25)", borderRadius: 8, padding: "7px 12px", fontSize: 12, color: "#4fc3f7", cursor: "pointer", textAlign: "left" },
  noteIn: { display: "block", width: "calc(100% - 32px)", margin: "0 14px 10px", background: C.surfaceHigh, border: `1px solid ${C.border}`, borderRadius: 8, padding: "7px 10px", color: C.sub, fontSize: 16, outline: "none" },
  sHdr: { display: "flex", alignItems: "center", gap: 6, padding: "4px 14px 6px" },
  sRow: { display: "flex", alignItems: "center", gap: 6, padding: "4px 14px", borderTop: `1px solid ${C.border}` },
  sNum: { width: 24, textAlign: "center", fontSize: 12, color: C.sub, flexShrink: 0 },
  sIn: { flex: 1, background: C.surfaceHigh, border: `1px solid ${C.border}`, borderRadius: 7, padding: "7px 4px", color: C.text, fontSize: 16, textAlign: "center", outline: "none", minWidth: 0 },
  sVol: { flex: 1, textAlign: "center", fontSize: 13, color: C.accent, fontWeight: 600 },
  sDel: { width: 24, background: "none", border: "none", color: C.danger, fontSize: 18, cursor: "pointer", flexShrink: 0 },
  sActs: { display: "flex", justifyContent: "space-between", padding: "10px 14px 12px" },
  addSB: { background: C.accentD, border: `1px solid ${C.accent}44`, borderRadius: 8, padding: "6px 14px", color: C.accent, fontWeight: 600, fontSize: 13, cursor: "pointer" },
  rmExB: { background: "transparent", border: "1px solid rgba(255,68,85,.3)", borderRadius: 8, padding: "6px 12px", color: C.danger, fontSize: 12, cursor: "pointer" },
  addExB: { display: "block", width: "100%", padding: "14px", background: C.surface, border: `2px dashed ${C.border}`, borderRadius: 12, color: C.sub, fontSize: 14, fontWeight: 600, cursor: "pointer", marginBottom: 20 },
  dangerB: { background: "transparent", border: "1px solid rgba(255,68,85,.4)", borderRadius: 8, padding: "8px 18px", color: C.danger, fontSize: 13, cursor: "pointer" },
  ghostB: { background: "transparent", border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 18px", color: C.sub, fontSize: 13, cursor: "pointer" },
  modal: { position: "fixed", inset: 0, background: "rgba(0,0,0,.8)", zIndex: 200, display: "flex", alignItems: "flex-end" },
  mBox: { background: C.surface, borderTop: `1px solid ${C.border}`, borderRadius: "20px 20px 0 0", width: "100%", maxHeight: "80vh", display: "flex", flexDirection: "column" },
  mHdr: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 18px 10px" },
  mClose: { background: "none", border: "none", color: C.sub, fontSize: 24, cursor: "pointer" },
  mSearch: { margin: "0 16px 10px", background: C.surfaceHigh, border: `1px solid ${C.border}`, borderRadius: 10, padding: "10px 14px", color: C.text, fontSize: 16, outline: "none" },
  mList: { flex: 1, overflowY: "auto", padding: "0 0 20px" },
  mExI: { display: "flex", flexDirection: "column", alignItems: "flex-start", width: "100%", padding: "10px 18px", border: "none", borderTop: `1px solid ${C.border}`, background: "transparent", cursor: "pointer", textAlign: "left" },
  chartBox: { background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: "14px", marginBottom: 14 },
  hCard: { background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: "14px", marginBottom: 10 },
  altCard: { background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: "14px", marginBottom: 10 },
};
