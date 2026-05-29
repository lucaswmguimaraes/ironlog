import { useState, useEffect, useRef } from "react";
import {
  DndContext, closestCenter, PointerSensor, TouchSensor, useSensor, useSensors,
} from "@dnd-kit/core";
import {
  SortableContext, verticalListSortingStrategy, useSortable, arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import { EXERCISE_DB, ALL_EXERCISES, findExercise } from "./data/exercises";
import {
  C, PROFILES, TRAIN_TYPES, MUSCLE_GROUPS, MONTHS_PT, PERIODIZATION_TIPS,
  uid, fmtDate, dayName, calcVolume, detectTrainType,
} from "./data/constants";
import { useGitHubStorage } from "./hooks/useGitHubStorage";
import { useProfile } from "./hooks/useProfile";
import { ProfileSetup } from "./components/ProfileSetup";
import { GitHubSetup } from "./components/GitHubSetup";
import { AnalysisTab } from "./components/AnalysisTab";
import { ProfileSettings } from "./components/ProfileSettings";

// ── INITIAL DATA ───────────────────────────────────────────────────────────────
const INITIAL_SESSIONS_LUCAS = [
  {id:"s1",date:"2025-04-04",name:"Treino C – Legs (Quadríceps + Panturrilha)",trainType:"C",exercises:[
    {id:"e1",name:"Agachamento livre",category:"Quadríceps",notes:"Última série com isometria 10-15s",sets:[{reps:15,weight:15},{reps:10,weight:30},{reps:12,weight:27.5},{reps:10,weight:25}]},
    {id:"e2",name:"Leg press 45°",category:"Quadríceps",notes:"",sets:[{reps:10,weight:110},{reps:10,weight:100},{reps:10,weight:90}]},
    {id:"e3",name:"Extensora",category:"Quadríceps",notes:"Última série com rest-pause",sets:[{reps:12,weight:59},{reps:10,weight:52},{reps:10,weight:52},{reps:8,weight:52}]},
    {id:"e4",name:"Agachamento búlgaro com halteres",category:"Quadríceps",notes:"Por perna",sets:[{reps:10,weight:17.5},{reps:8,weight:17.5},{reps:7,weight:16}]},
    {id:"e5",name:"Adutora na máquina",category:"Adutores / Abdutores",notes:"",sets:[{reps:15,weight:102},{reps:10,weight:111},{reps:10,weight:102}]},
    {id:"e6",name:"Panturrilha sentado (máquina)",category:"Panturrilha",notes:"",sets:[{reps:12,weight:100},{reps:15,weight:115},{reps:15,weight:130}]},
  ]},
  {id:"s2",date:"2025-04-03",name:"Treino D – Upper (Bíceps, Ombros, Peito, Costas)",trainType:"D",exercises:[
    {id:"e7",name:"Remada cavalinho",category:"Costas",notes:"Pegada aberta",sets:[{reps:12,weight:15},{reps:10,weight:35},{reps:10,weight:30},{reps:10,weight:25}]},
    {id:"e8",name:"Supino reto com halteres",category:"Peito",notes:"",sets:[{reps:12,weight:14},{reps:10,weight:26},{reps:9,weight:24},{reps:10,weight:20}]},
    {id:"e9",name:"Remada serrote unilateral",category:"Costas",notes:"",sets:[{reps:10,weight:22},{reps:8,weight:22},{reps:10,weight:20}]},
    {id:"e10",name:"Elevação lateral + frontal alternadas",category:"Ombros",notes:"10 cada",sets:[{reps:10,weight:9},{reps:9,weight:9},{reps:10,weight:8}]},
    {id:"e11",name:"Rosca direta na corda com drops",category:"Bíceps",notes:"2 drops na última série",sets:[{reps:10,weight:31.5},{reps:10,weight:31.5},{reps:10,weight:27}]},
    {id:"e12",name:"Peck deck",category:"Peito",notes:"+ parciais no final",sets:[{reps:12,weight:38.5},{reps:10,weight:38.5},{reps:10,weight:38.5}]},
    {id:"e13",name:"Encolhimento com barra (trapézio)",category:"Ombros",notes:"",sets:[{reps:12,weight:60},{reps:10,weight:60},{reps:8,weight:60}]},
  ]},
  {id:"s3",date:"2025-04-02",name:"Treino E – Lower (Posterior + Panturrilha + Core)",trainType:"E",exercises:[
    {id:"e14",name:"Mesa flexora",category:"Posterior de Coxa",notes:"Última série: isometria + parciais",sets:[{reps:15,weight:18},{reps:10,weight:38.5},{reps:8,weight:38.5},{reps:8,weight:31.5}]},
    {id:"e15",name:"Stiff com barra",category:"Posterior de Coxa",notes:"Cada lado",sets:[{reps:12,weight:20},{reps:10,weight:20},{reps:8,weight:20}]},
    {id:"e16",name:"Leg press 45°",category:"Quadríceps",notes:"Foco glúteo/posterior",sets:[{reps:12,weight:80},{reps:8,weight:80},{reps:10,weight:72.5}]},
    {id:"e17",name:"Glute bridge",category:"Glúteos",notes:"",sets:[{reps:12,weight:0},{reps:12,weight:0},{reps:12,weight:0}]},
    {id:"e18",name:"Abdutora na máquina",category:"Adutores / Abdutores",notes:"",sets:[{reps:10,weight:120},{reps:10,weight:111},{reps:10,weight:111}]},
    {id:"e19",name:"Panturrilha em pé (máquina)",category:"Panturrilha",notes:"",sets:[{reps:12,weight:60},{reps:12,weight:60},{reps:10,weight:60}]},
  ]},
  {id:"s4",date:"2025-03-30",name:"Treino A – Pull (Costas, Bíceps, Antebraço)",trainType:"A",exercises:[
    {id:"e20",name:"Rosca 45° com halteres",category:"Bíceps",notes:"Última série com drop set",sets:[{reps:15,weight:7},{reps:10,weight:12.5},{reps:8,weight:12.5},{reps:9,weight:10}]},
    {id:"e21",name:"Rosca Scott com barra W",category:"Bíceps",notes:"",sets:[{reps:8,weight:28},{reps:10,weight:23},{reps:8,weight:23}]},
    {id:"e22",name:"Puxada alta com barra reta",category:"Costas",notes:"Rest-pause na última série",sets:[{reps:9,weight:60},{reps:8,weight:60},{reps:9,weight:50}]},
    {id:"e23",name:"Remada curvada com barra",category:"Costas",notes:"",sets:[{reps:12,weight:30},{reps:8,weight:30},{reps:10,weight:25}]},
    {id:"e24",name:"Remada baixa com triângulo",category:"Costas",notes:"",sets:[{reps:10,weight:60},{reps:7,weight:60},{reps:10,weight:50}]},
    {id:"e25",name:"Pullover com corda na polia",category:"Costas",notes:"",sets:[{reps:10,weight:50},{reps:8,weight:50},{reps:9,weight:40}]},
    {id:"e26",name:"Rosca inversa (barra)",category:"Antebraço",notes:"",sets:[{reps:8,weight:40},{reps:10,weight:30},{reps:9,weight:25}]},
    {id:"e27",name:"Flexão de punho (polia alta)",category:"Antebraço",notes:"",sets:[{reps:10,weight:30},{reps:10,weight:25},{reps:10,weight:25}]},
    {id:"e28",name:"Exercício escapular",category:"Escapular / Mobilidade",notes:"",sets:[{reps:12,weight:25},{reps:12,weight:25},{reps:10,weight:25}]},
  ]},
  {id:"s5",date:"2025-03-29",name:"Treino B – Push (Peito, Ombro, Tríceps)",trainType:"B",exercises:[
    {id:"e29",name:"Supino inclinado com halteres",category:"Peito",notes:"Última série rest-pause",sets:[{reps:15,weight:10},{reps:10,weight:22.5},{reps:8,weight:20},{reps:10,weight:17.5}]},
    {id:"e30",name:"Crucifixo no cross (cabo alto)",category:"Peito",notes:"+ 6 parciais por série",sets:[{reps:12,weight:27},{reps:10,weight:27},{reps:10,weight:22.5}]},
    {id:"e31",name:"Desenvolvimento no aparelho",category:"Ombros",notes:"",sets:[{reps:15,weight:9},{reps:10,weight:31.5},{reps:10,weight:27},{reps:10,weight:22.5}]},
    {id:"e32",name:"Elevação lateral com drops",category:"Ombros",notes:"Parciais + completas",sets:[{reps:12,weight:16},{reps:12,weight:14},{reps:12,weight:14}]},
    {id:"e33",name:"Posterior de ombro no cross",category:"Ombros",notes:"Unilateral",sets:[{reps:10,weight:10},{reps:10,weight:10},{reps:8,weight:10}]},
    {id:"e34",name:"Tríceps testa na polia unilateral",category:"Tríceps",notes:"",sets:[{reps:8,weight:22.5},{reps:10,weight:18},{reps:9,weight:18}]},
    {id:"e35",name:"Tríceps na polia com corda",category:"Tríceps",notes:"",sets:[{reps:12,weight:30},{reps:10,weight:40},{reps:8,weight:40}]},
    {id:"e36",name:"Tríceps francês no cross com corda",category:"Tríceps",notes:"",sets:[{reps:10,weight:30},{reps:8,weight:30}]},
  ]},
];

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
export default function App(){
  const { profile, selectProfile, getPAT, setPAT, getConfig, saveConfig } = useProfile();
  const { loadFromGitHub, saveToGitHub } = useGitHubStorage();
  const syncTimer = useRef(null);

  const [sessions, setSessions] = useState(() => {
    if (!profile) return [];
    try {
      const s = localStorage.getItem(`wkv3_${profile.id}`);
      if (s) return JSON.parse(s);
      return profile.id === "lucas" ? INITIAL_SESSIONS_LUCAS : [];
    } catch {
      return profile.id === "lucas" ? INITIAL_SESSIONS_LUCAS : [];
    }
  });

  const [onboardingDone, setOnboardingDone] = useState(() => {
    if (!profile) return true;
    return getConfig(profile.id).completedOnboarding;
  });

  const [githubSetupDone, setGithubSetupDone] = useState(() => {
    if (!profile) return true;
    return !!getPAT(profile.id);
  });

  const [tab, setTab] = useState("home");
  const [activeSession, setActiveSession] = useState(null);
  const [histEx, setHistEx] = useState(null);
  const [swapEx, setSwapEx] = useState(null);
  const [calYear, setCalYear] = useState(new Date().getFullYear());
  const [showSettings, setShowSettings] = useState(false);
  const prevTab = useRef("home");

  // Persist to localStorage — nunca sobrescreve dados existentes com array vazio
  useEffect(() => {
    if (!profile) return;
    if (sessions.length === 0) {
      // Não sobrescreve se já havia dados salvos
      const existing = localStorage.getItem(`wkv3_${profile.id}`);
      if (existing && existing !== "[]" && existing !== "null") return;
    }
    try { localStorage.setItem(`wkv3_${profile.id}`, JSON.stringify(sessions)); } catch {}
  }, [sessions, profile?.id]);

  // Load from GitHub on profile select
  useEffect(() => {
    if (!profile) return;
    const pat = getPAT(profile.id);
    if (!pat) return;
    loadFromGitHub(profile.id, pat).then((data) => {
      if (data && data.length > 0) setSessions(data);
    });
  }, [profile?.id]);

  // Sync to GitHub with debounce — nunca grava array vazio
  useEffect(() => {
    if (!profile) return;
    if (sessions.length === 0) return; // proteção: nunca sobrescreve dados com vazio
    const pat = getPAT(profile.id);
    if (!pat) return;
    clearTimeout(syncTimer.current);
    syncTimer.current = setTimeout(() => {
      saveToGitHub(profile.id, sessions, pat);
    }, 3000);
    return () => clearTimeout(syncTimer.current);
  }, [sessions, profile?.id]);

  // Export/import for ProfileSettings
  window.__ironlog_export = () => sessions;
  window.__ironlog_import = (data) => setSessions(data);

  const handleSelectProfile = (p) => {
    sessionStorage.setItem("ironlog_profile", JSON.stringify(p));
    setTab("home");
    // Force re-mount with new profile via selectProfile
    selectProfile(p);
    // Check onboarding for new profile
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
          onSave={(pat) => { setPAT(profile.id, pat); setGithubSetupDone(true); }}
          onSkip={() => setGithubSetupDone(true)}
        />
      </div>
    );
  }

  const saveSession = s => setSessions(prev => {
    const i = prev.findIndex(x => x.id === s.id);
    if (i >= 0) { const n = [...prev]; n[i] = s; return n; }
    return [s, ...prev];
  });
  const deleteSession = id => { setSessions(p => p.filter(s => s.id !== id)); setTab("home"); };
  const getExHist = name => sessions
    .filter(s => s.exercises.some(e => e.name === name))
    .map(s => { const ex = s.exercises.find(e => e.name === name); return { date: s.date, sessionName: s.name, sets: ex.sets, notes: ex.notes }; })
    .sort((a, b) => b.date.localeCompare(a.date));
  const getLastSess = name => getExHist(name)[0] || null;

  const goTo = (t, extra = {}) => {
    prevTab.current = tab;
    if (extra.session !== undefined) setActiveSession(extra.session);
    if (extra.ex !== undefined) setHistEx(extra.ex);
    if (extra.swap !== undefined) setSwapEx(extra.swap);
    setTab(t);
  };

  const sorted = [...sessions].sort((a, b) => b.date.localeCompare(a.date));
  const lastSession = sorted[0] || null;

  const handleRepeatLast = () => {
    if (!lastSession) return;
    const newSess = { ...JSON.parse(JSON.stringify(lastSession)), id: uid(), date: new Date().toISOString().slice(0, 10) };
    goTo("session", { session: newSess });
  };

  const profileConfig = getConfig(profile.id);

  if (showSettings) return (
    <div style={{ background: C.bg, minHeight: "100vh" }}>
      <div style={S.grain} />
      <ProfileSettings
        profileId={profile.id}
        profileName={profile.name}
        currentConfig={profileConfig}
        currentPAT={getPAT(profile.id)}
        onSave={(config) => { saveConfig(profile.id, { ...config, completedOnboarding: true }); setShowSettings(false); }}
        onSavePAT={(pat) => { setPAT(profile.id, pat); setGithubSetupDone(true); }}
        onBack={() => setShowSettings(false)}
      />
    </div>
  );

  if (tab === "session" && activeSession) return (
    <SessionView session={activeSession} isNew={false}
      onSave={s => { saveSession(s); setTab("home"); }}
      onDelete={() => deleteSession(activeSession.id)}
      onBack={() => setTab("home")}
      onHistClick={n => goTo("ex-hist", { ex: n })}
      onSwap={ex => goTo("swap", { swap: ex })}
      getLastSess={getLastSess}
      profileConfig={profileConfig}
    />
  );
  if (tab === "new-session") return (
    <SessionView
      session={{ id: uid(), date: new Date().toISOString().slice(0, 10), name: "", trainType: null, exercises: [] }}
      isNew onSave={s => { saveSession(s); setTab("home"); }}
      onDelete={null} onBack={() => setTab("home")}
      onHistClick={n => goTo("ex-hist", { ex: n })}
      onSwap={ex => goTo("swap", { swap: ex })}
      getLastSess={getLastSess} allSessions={sorted}
      profileConfig={profileConfig}
    />
  );
  if (tab === "ex-hist") return <HistView exName={histEx} history={getExHist(histEx)} onBack={() => setTab(prevTab.current)} />;
  if (tab === "swap") return <SwapView exercise={swapEx} onBack={() => setTab(prevTab.current)} />;

  return (
    <div style={S.app}>
      <div style={S.grain} />
      <header style={S.header}>
        <div style={S.headerInner}>
          <div><div style={S.logo}>⚡ IRON LOG</div><div style={S.logoSub}>Diário de Hipertrofia</div></div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button style={{ ...S.profileChip, borderColor: `${profile.color}66`, color: profile.color }} onClick={handleSwitchProfile}>
              {profile.emoji} {profile.name} ↩
            </button>
            <button style={{ background: "none", border: "none", color: C.sub, fontSize: 18, cursor: "pointer", padding: "4px 6px" }} onClick={() => setShowSettings(true)}>⚙️</button>
            <button style={S.newBtn} onClick={() => goTo("new-session")}>+ Treino</button>
          </div>
        </div>
      </header>
      <div style={S.tabBar}>
        {[["home", "🏠", "Início"], ["calendar", "📅", "Calendário"], ["analysis", "📊", "Análise"]].map(([t, icon, label]) => (
          <button key={t} style={{ ...S.tab, ...(tab === t ? S.tabActive : {}) }} onClick={() => setTab(t)}>
            <span style={{ fontSize: 18 }}>{icon}</span><span style={{ fontSize: 10 }}>{label}</span>
          </button>
        ))}
      </div>
      {tab === "home" && <HomeTab sessions={sorted} onOpen={s => goTo("session", { session: s })} onHistClick={n => goTo("ex-hist", { ex: n })} getLastSess={getLastSess} onRepeatLast={handleRepeatLast} lastSession={lastSession} profileConfig={profileConfig} />}
      {tab === "calendar" && <CalTab sessions={sessions} year={calYear} setYear={setCalYear} onOpen={s => goTo("session", { session: s })} />}
      {tab === "analysis" && <AnalysisTab sessions={sessions} profileConfig={profileConfig} />}
    </div>
  );
}

// ── HOME ───────────────────────────────────────────────────────────────────────
function HomeTab({ sessions, onOpen, onHistClick, getLastSess, onRepeatLast, lastSession, profileConfig }) {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("Todos");
  const cats = ["Todos", ...Object.keys(EXERCISE_DB)];
  const hits = q.length > 1 ? ALL_EXERCISES.filter(e => (cat === "Todos" || e.category === cat) && e.name.toLowerCase().includes(q.toLowerCase())).slice(0, 12) : [];

  // New KPIs
  const now = new Date();
  const thisMonthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthPrefix = `${lastMonthDate.getFullYear()}-${String(lastMonthDate.getMonth() + 1).padStart(2, "0")}`;
  const thisMonthSessions = sessions.filter(s => s.date.startsWith(thisMonthPrefix));
  const lastMonthSessions = sessions.filter(s => s.date.startsWith(lastMonthPrefix));
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

  return (
    <div style={S.body}>
      {/* New KPI cards */}
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
          <div style={{ fontSize: 11, color: C.sub, marginBottom: 10 }}>📊 Volume por grupo focal (mês atual vs. anterior)</div>
          {focalGroups.map(g => {
            const curr = thisVol[g] || 0;
            const prev = lastVol[g] || 0;
            const delta = prev > 0 ? ((curr - prev) / prev * 100) : null;
            const maxVal = Math.max(curr, prev, 1);
            return (
              <div key={g} style={{ marginBottom: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ fontSize: 12, color: C.text }}>{g}</span>
                  <span style={{ fontSize: 11, color: delta === null ? C.sub : delta >= 0 ? C.success : C.danger }}>
                    {delta !== null ? `${delta >= 0 ? "+" : ""}${delta.toFixed(0)}%` : "—"}
                  </span>
                </div>
                <div style={{ display: "flex", gap: 4, height: 6 }}>
                  <div style={{ flex: prev / maxVal, background: C.border, borderRadius: 3 }} />
                  <div style={{ flex: curr / maxVal, background: C.accent, borderRadius: 3 }} />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 2 }}>
                  <span style={{ fontSize: 9, color: C.sub }}>{(prev / 1000).toFixed(1)}t ant.</span>
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

      <div style={S.section}>
        <div style={S.sT}>🔍 Buscar Exercício</div>
        <input style={S.si} placeholder="Nome do exercício..." value={q} onChange={e => setQ(e.target.value)} />
        {q.length > 1 && <div style={S.cScroll}>{cats.map(c => <button key={c} style={{ ...S.chip, ...(cat === c ? S.chipA : {}) }} onClick={() => setCat(c)}>{c}</button>)}</div>}
        {hits.length > 0 && <div style={S.exGrid}>{hits.map(ex => {
          const l = getLastSess(ex.name);
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
        <div style={S.sT}>📋 Treinos Recentes</div>
        {sessions.map(s => {
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
                <div style={S.sessMt}>{dayName(s.date)}, {fmtDate(s.date)} · {s.exercises.length} ex · {vol.toFixed(0)} kg</div>
              </div>
              <span style={S.arrow}>›</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── CALENDAR ───────────────────────────────────────────────────────────────────
function CalTab({ sessions, year, setYear, onOpen }) {
  const [selDay, setSelDay] = useState(null);
  const sMap = {};
  sessions.forEach(s => { if (!sMap[s.date]) sMap[s.date] = []; sMap[s.date].push(s); });

  const sorted = [...new Set(sessions.map(s => s.date))].sort();
  let streak = 0, cur = new Date().toISOString().slice(0, 10);
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
                  const today = new Date().toISOString().slice(0, 10);
                  const tt = ds2[0] ? (ds2[0].trainType || detectTrainType(ds2[0].name)) : null;
                  const col = tt ? TRAIN_TYPES[tt]?.color : null;
                  const isSel = ds === selDay, isToday = ds === today;
                  return (
                    <button key={day} style={{ ...S.dCell, ...(isToday ? { border: `1px solid ${C.accent}66` } : {}), ...(isSel ? { border: `1px solid ${C.accent}` } : {}), ...(col ? { background: `${col}30`, border: `1px solid ${col}66` } : {}) }} onClick={() => setSelDay(isSel ? null : ds)}>
                      <span style={{ fontSize: 9, color: col || C.sub, lineHeight: 1 }}>{day}</span>
                      {ds2.length > 0 && <div style={{ width: 3, height: 3, borderRadius: "50%", background: col || C.accent, marginTop: 1 }} />}
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
          {selSessions.length === 0
            ? <div style={{ color: C.sub, fontSize: 13, padding: "8px 0" }}>Dia de descanso 😴</div>
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
function SessionView({ session, isNew, onSave, onDelete, onBack, onHistClick, onSwap, getLastSess, allSessions, profileConfig }) {
  const [data, setData] = useState(() => JSON.parse(JSON.stringify(session)));
  const [showPicker, setShowPicker] = useState(false);
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);
  const [q, setQ] = useState(""); const [cat, setCat] = useState("Todos");
  const [exp, setExp] = useState(isNew ? [] : session.exercises.map(e => e.id));
  const [confirmDel, setConfirmDel] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } })
  );

  const mut = fn => { setData(p => { const n = JSON.parse(JSON.stringify(p)); fn(n); return n; }); };
  const addEx = ex => { const id = uid(); mut(d => d.exercises.push({ id, name: ex.name, category: ex.category, notes: "", sets: [{ reps: "", weight: "" }] })); setExp(p => [...p, id]); setShowPicker(false); setQ(""); };
  const rmEx = eid => mut(d => { d.exercises = d.exercises.filter(e => e.id !== eid); });
  const addSet = eid => mut(d => { const ex = d.exercises.find(e => e.id === eid); const l = ex.sets[ex.sets.length - 1] || { reps: "", weight: "" }; ex.sets.push({ reps: l.reps, weight: l.weight }); });
  const rmSet = (eid, si) => mut(d => { d.exercises.find(e => e.id === eid).sets.splice(si, 1); });
  const updS = (eid, si, f, v) => mut(d => { d.exercises.find(e => e.id === eid).sets[si][f] = v === "" ? "" : (parseFloat(v) || 0); });
  const updN = (eid, v) => mut(d => { d.exercises.find(e => e.id === eid).notes = v; });
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

  // Load from template with focal groups prioritization
  const loadFromTemplate = (templateSession) => {
    const focalGroups = profileConfig?.focalGroups || [];
    const rawExercises = templateSession.exercises.map(ex => ({
      ...JSON.parse(JSON.stringify(ex)), id: uid(), notes: ex.notes || "",
    }));
    const focal = rawExercises.filter(e => focalGroups.includes(e.category));
    const rest = rawExercises.filter(e => !focalGroups.includes(e.category));
    const reordered = [...focal, ...rest];
    mut(d => { d.name = templateSession.name; d.trainType = templateSession.trainType; d.exercises = reordered; });
    setExp(reordered.map(e => e.id));
    setShowTemplatePicker(false);
  };

  const cats = ["Todos", ...Object.keys(EXERCISE_DB)];
  const filtEx = ALL_EXERCISES.filter(e => (cat === "Todos" || e.category === cat) && (q.length < 2 || e.name.toLowerCase().includes(q.toLowerCase())));
  const totalVol = data.exercises.reduce((a, e) => a + calcVolume(e.sets), 0);
  const tt = data.trainType || detectTrainType(data.name);
  const ti = tt ? TRAIN_TYPES[tt] : null;

  // Autosave before navigation
  const saveAndNavigate = (callback) => { onSave(data); callback(); };

  return (
    <div style={S.app}>
      <div style={S.grain} />
      <header style={S.sessHdr}>
        <button style={S.back} onClick={() => saveAndNavigate(onBack)}>← Voltar</button>
        <div style={{ flex: 1, textAlign: "center", fontSize: 13, fontWeight: 700, color: C.text }}>{isNew ? "Novo Treino" : "Editar"}</div>
        <button style={S.saveB} onClick={() => onSave(data)}>✓ Salvar</button>
      </header>
      <div style={S.body}>
        <div style={S.metaCard}>
          <div style={S.mRow2}><label style={S.mLbl2}>Data</label><input type="date" style={S.mIn} value={data.date} onChange={e => mut(d => d.date = e.target.value)} /></div>
          <div style={S.mRow2}><label style={S.mLbl2}>Nome</label><input style={{ ...S.mIn, flex: 1 }} placeholder="Ex: Treino B – Push" value={data.name} onChange={e => { mut(d => { d.name = e.target.value; const tt = detectTrainType(e.target.value); if (tt) d.trainType = tt; }); }} /></div>
          <div style={S.cRow}>{Object.entries(TRAIN_TYPES).map(([k, v]) => <button key={k} style={{ ...S.chip, fontSize: 11, ...(data.trainType === k ? { background: `${v.color}22`, borderColor: v.color, color: v.color } : {}) }} onClick={() => mut(d => d.trainType = k)}>{v.emoji} {k}</button>)}</div>
          {ti && <div style={{ fontSize: 11, color: ti.color, marginTop: 6 }}>{ti.label} · {ti.muscles.join(", ")}</div>}
          <div style={{ fontSize: 11, color: C.sub, marginTop: 8 }}>Volume total: <strong style={{ color: C.accent }}>{totalVol.toFixed(0)} kg</strong></div>
        </div>

        {isNew && allSessions && allSessions.length > 0 && data.exercises.length === 0 && (
          <button style={S.templateBtn} onClick={() => setShowTemplatePicker(true)}>
            📋 Usar treino anterior como base
          </button>
        )}

        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={data.exercises.map(e => e.id)} strategy={verticalListSortingStrategy}>
            {data.exercises.map(ex => {
              const last = getLastSess(ex.name);
              const exVol = calcVolume(ex.sets);
              const isO = exp.includes(ex.id);
              const info = findExercise(ex.name);
              return (
                <SortableExerciseItem key={ex.id} id={ex.id}>
                  <div style={S.exBlk}>
                    <div style={S.exBlkH} onClick={() => togEx(ex.id)}>
                      <div style={{ flex: 1, minWidth: 0 }}><div style={S.exCat}>{ex.category}</div><div style={S.exNm2}>{ex.name}</div></div>
                      <span style={S.vChip}>{exVol.toFixed(0)}kg</span>
                      <span style={{ color: C.sub, fontSize: 11 }}>{isO ? "▲" : "▼"}</span>
                    </div>
                    {isO && (<>
                      {info.desc && <div style={S.exDsB}>📖 {info.desc}</div>}
                      {last && <button style={S.lastH} onClick={() => saveAndNavigate(() => onHistClick(ex.name))}>
                        <span>⏱</span>
                        <div>
                          <div style={{ fontSize: 11, color: C.green, fontWeight: 600 }}>Último: {fmtDate(last.date)}</div>
                          <div style={{ fontSize: 11, color: C.sub, marginTop: 1 }}>{last.sets.map(s => `${s.reps}×${s.weight}kg`).join(" · ")}</div>
                        </div>
                        <span style={{ marginLeft: "auto", color: C.sub }}>›</span>
                      </button>}
                      {info.alts && info.alts.length > 0 && <button style={S.swapB} onClick={() => onSwap(info)}>🔄 Ver similares ({info.alts.length})</button>}
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
                          <span style={S.sNum}>{si + 1}</span>
                          <input style={S.sIn} type="number" placeholder="0" value={s.reps} onChange={e => updS(ex.id, si, "reps", e.target.value)} />
                          <input style={S.sIn} type="number" placeholder="0" step="0.5" value={s.weight} onChange={e => updS(ex.id, si, "weight", e.target.value)} />
                          <span style={S.sVol}>{((+s.reps || 0) * (+s.weight || 0)).toFixed(0)}</span>
                          <button style={S.sDel} onClick={() => rmSet(ex.id, si)}>×</button>
                        </div>
                      ))}
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
            <div style={S.mList}>{filtEx.slice(0, 40).map(ex => (
              <button key={ex.name} style={S.mExI} onClick={() => addEx(ex)}>
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
            <div style={{ padding: "0 14px 8px", fontSize: 12, color: C.sub }}>Selecione um treino anterior para copiar os exercícios e séries</div>
            <div style={S.mList}>
              {(allSessions || []).map(s => {
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

// ── HISTORY VIEW ───────────────────────────────────────────────────────────────
function HistView({ exName, history, onBack }) {
  const vols = history.map(h => ({ date: h.date, vol: calcVolume(h.sets) })).reverse();
  const maxV = Math.max(...vols.map(v => v.vol), 1);
  const info = findExercise(exName);
  return (
    <div style={S.app}>
      <div style={S.grain} />
      <header style={S.sessHdr}>
        <button style={S.back} onClick={onBack}>← Voltar</button>
        <div style={{ flex: 1, textAlign: "center", fontSize: 13, fontWeight: 700, color: C.text }}>Histórico</div>
        <div style={{ width: 70 }} />
      </header>
      <div style={S.body}>
        <div style={{ fontSize: 18, fontWeight: 800, color: C.text, marginBottom: 4 }}>{exName}</div>
        {info.desc && <div style={{ fontSize: 12, color: C.sub, marginBottom: 14, lineHeight: 1.5 }}>{info.desc}</div>}
        {history.length === 0 && <div style={{ color: C.sub, padding: "20px 0" }}>Sem histórico ainda.</div>}
        {vols.length > 1 && (
          <div style={S.chartBox}>
            <div style={S.sT}>📈 Progressão de Volume</div>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 110, overflowX: "auto", paddingBottom: 4 }}>
              {vols.map((v, i) => (
                <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0, minWidth: 44 }}>
                  <span style={{ fontSize: 9, color: C.accent, marginBottom: 2 }}>{v.vol.toFixed(0)}</span>
                  <div style={{ width: 28, background: `linear-gradient(to top,${C.accent},${C.accent}55)`, borderRadius: "3px 3px 0 0", height: `${(v.vol / maxV) * 96}px`, minHeight: 4 }} />
                  <span style={{ fontSize: 8, color: C.sub, marginTop: 3 }}>{fmtDate(v.date).slice(0, 5)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        {history.map((h, i) => {
          const vol = calcVolume(h.sets); const best = h.sets.reduce((a, s) => Math.max(a, +s.weight || 0), 0);
          return (
            <div key={i} style={S.hCard}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <div><div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{dayName(h.date)}, {fmtDate(h.date)}</div><div style={{ fontSize: 11, color: C.sub, marginTop: 2 }}>{h.sessionName}</div></div>
                <div style={{ textAlign: "right" }}><div style={{ fontSize: 17, fontWeight: 800, color: C.accent }}>{vol.toFixed(0)}</div><div style={{ fontSize: 9, color: C.sub }}>kg vol</div></div>
              </div>
              {h.notes && <div style={{ fontSize: 11, color: C.sub, marginBottom: 8, fontStyle: "italic" }}>📝 {h.notes}</div>}
              <div style={S.sHdr}>
                <span style={{ width: 24, color: C.sub, fontSize: 11, textAlign: "center" }}>#</span>
                <span style={{ flex: 1, color: C.sub, fontSize: 11, textAlign: "center" }}>Reps</span>
                <span style={{ flex: 1, color: C.sub, fontSize: 11, textAlign: "center" }}>Peso</span>
                <span style={{ flex: 1, color: C.sub, fontSize: 11, textAlign: "center" }}>Vol</span>
              </div>
              {h.sets.map((s, si) => (
                <div key={si} style={{ ...S.sRow, cursor: "default" }}>
                  <span style={S.sNum}>{si + 1}</span>
                  <span style={{ flex: 1, textAlign: "center", fontSize: 13, color: C.text }}>{s.reps}</span>
                  <span style={{ flex: 1, textAlign: "center", fontSize: 13, color: C.text }}>{s.weight}kg</span>
                  <span style={S.sVol}>{((+s.reps || 0) * (+s.weight || 0)).toFixed(0)}</span>
                </div>
              ))}
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, paddingTop: 8, borderTop: `1px solid ${C.border}`, fontSize: 11, color: C.sub }}>
                <span>💪 Carga máx: <strong style={{ color: C.accent }}>{best}kg</strong></span>
                <span>📊 {h.sets.length} séries</span>
              </div>
            </div>
          );
        })}
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
  cScroll: { display: "flex", gap: 6, overflowX: "auto", paddingBottom: 8, scrollbarWidth: "none" },
  cRow: { display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 },
  chip: { flexShrink: 0, background: C.surfaceHigh, border: `1px solid ${C.border}`, borderRadius: 20, padding: "5px 12px", fontSize: 12, color: C.sub, cursor: "pointer", whiteSpace: "nowrap" },
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
  noteIn: { display: "block", width: "calc(100% - 32px)", margin: "0 14px 10px", background: C.surfaceHigh, border: `1px solid ${C.border}`, borderRadius: 8, padding: "7px 10px", color: C.sub, fontSize: 12, outline: "none" },
  sHdr: { display: "flex", alignItems: "center", gap: 6, padding: "4px 14px 6px" },
  sRow: { display: "flex", alignItems: "center", gap: 6, padding: "4px 14px", borderTop: `1px solid ${C.border}` },
  sNum: { width: 24, textAlign: "center", fontSize: 12, color: C.sub, flexShrink: 0 },
  sIn: { flex: 1, background: C.surfaceHigh, border: `1px solid ${C.border}`, borderRadius: 7, padding: "7px 4px", color: C.text, fontSize: 14, textAlign: "center", outline: "none", minWidth: 0 },
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
  mSearch: { margin: "0 16px 10px", background: C.surfaceHigh, border: `1px solid ${C.border}`, borderRadius: 10, padding: "10px 14px", color: C.text, fontSize: 15, outline: "none" },
  mList: { flex: 1, overflowY: "auto", padding: "0 0 20px" },
  mExI: { display: "flex", flexDirection: "column", alignItems: "flex-start", width: "100%", padding: "10px 18px", border: "none", borderTop: `1px solid ${C.border}`, background: "transparent", cursor: "pointer", textAlign: "left" },
  chartBox: { background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: "14px", marginBottom: 14 },
  hCard: { background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: "14px", marginBottom: 10 },
  altCard: { background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: "14px", marginBottom: 10 },
};
