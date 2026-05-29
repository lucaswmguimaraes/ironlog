// src/components/ProfileSetup.jsx
import { useState } from "react";
import { C, MUSCLE_GROUPS } from "../data/constants";

export function ProfileSetup({ profileName, onComplete }) {
  const [step, setStep] = useState(0);
  const [config, setConfig] = useState({
    experienceLevel: null, sex: null, goal: null,
    trainingDaysPerWeek: null, focalGroups: [], completedOnboarding: false,
  });

  const set = (key, value) => setConfig((p) => ({ ...p, [key]: value }));
  const next = () => setStep((s) => s + 1);

  const muscleOptions = MUSCLE_GROUPS
    .filter((m) => !["Antebraço", "Escapular / Mobilidade", "Adutores / Abdutores", "Trapézio"].includes(m.key))
    .map((m) => m.key);

  const toggleFocal = (g) => {
    set("focalGroups", config.focalGroups.includes(g)
      ? config.focalGroups.filter((x) => x !== g)
      : config.focalGroups.length < 3 ? [...config.focalGroups, g] : config.focalGroups
    );
  };

  const card = (children) => (
    <div style={{ padding: 24, maxWidth: 480, margin: "0 auto" }}>
      <div style={{ color: C.sub, fontSize: 12, textAlign: "center", marginBottom: 20 }}>
        Olá, {profileName} · {step + 1} de 5
      </div>
      {children}
    </div>
  );

  const optBtn = (label, value, current, onClick, desc) => (
    <button key={value} onClick={onClick} style={{
      width: "100%", padding: "14px 16px", borderRadius: 12, marginBottom: 10,
      border: `1px solid ${current === value ? C.accent : C.border}`,
      background: current === value ? `${C.accent}22` : C.surface,
      color: current === value ? C.accent : C.text, textAlign: "left", cursor: "pointer",
    }}>
      <div style={{ fontWeight: 700, fontSize: 14 }}>{label}</div>
      {desc && <div style={{ fontSize: 11, color: C.sub, marginTop: 3 }}>{desc}</div>}
    </button>
  );

  if (step === 0) return card(<>
    <h2 style={{ color: C.text, fontSize: 18, marginBottom: 4 }}>Qual seu nível de experiência?</h2>
    <p style={{ color: C.sub, fontSize: 13, marginBottom: 20 }}>Isso ajusta os thresholds de volume (MEV/MAV/MRV) para seu nível atual.</p>
    {optBtn("Iniciante", "beginner", config.experienceLevel, () => { set("experienceLevel", "beginner"); next(); }, "Menos de 1 ano de treino consistente")}
    {optBtn("Intermediário", "intermediate", config.experienceLevel, () => { set("experienceLevel", "intermediate"); next(); }, "1 a 3 anos de treino")}
    {optBtn("Avançado", "advanced", config.experienceLevel, () => { set("experienceLevel", "advanced"); next(); }, "Mais de 3 anos de treino sério")}
  </>);

  if (step === 1) return card(<>
    <h2 style={{ color: C.text, fontSize: 18, marginBottom: 4 }}>Sexo biológico</h2>
    <p style={{ color: C.sub, fontSize: 13, marginBottom: 20 }}>
      Mulheres têm maior resistência à fadiga muscular e recuperação mais rápida — o app aplica +10% no volume ótimo (MAV) para perfis femininos.
      <br /><small style={{ fontSize: 11 }}>Fonte: Hunter (2014), Medicine & Science in Sports & Exercise</small>
    </p>
    {optBtn("Masculino", "male", config.sex, () => { set("sex", "male"); next(); })}
    {optBtn("Feminino", "female", config.sex, () => { set("sex", "female"); next(); })}
  </>);

  if (step === 2) return card(<>
    <h2 style={{ color: C.text, fontSize: 18, marginBottom: 4 }}>Objetivo principal</h2>
    <p style={{ color: C.sub, fontSize: 13, marginBottom: 20 }}>Direciona as recomendações de volume e progressão.</p>
    {optBtn("Hipertrofia", "hypertrophy", config.goal, () => { set("goal", "hypertrophy"); next(); }, "Foco em ganho de massa muscular — volume no MAV")}
    {optBtn("Força", "strength", config.goal, () => { set("goal", "strength"); next(); }, "Foco em carga máxima — intensidade sobre volume")}
    {optBtn("Manutenção", "maintenance", config.goal, () => { set("goal", "maintenance"); next(); }, "Manter o que tem — volume no MEV")}
  </>);

  if (step === 3) return card(<>
    <h2 style={{ color: C.text, fontSize: 18, marginBottom: 4 }}>Dias de treino por semana</h2>
    <p style={{ color: C.sub, fontSize: 13, marginBottom: 20 }}>Usado para calcular volume semanal médio e metas.</p>
    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
      {[3, 4, 5, 6].map((d) => (
        <button key={d} onClick={() => { set("trainingDaysPerWeek", d); next(); }} style={{
          flex: 1, padding: 18, borderRadius: 12, fontSize: 22, fontWeight: 800,
          border: `1px solid ${config.trainingDaysPerWeek === d ? C.accent : C.border}`,
          background: config.trainingDaysPerWeek === d ? `${C.accent}22` : C.surface,
          color: config.trainingDaysPerWeek === d ? C.accent : C.text, cursor: "pointer",
        }}>{d}x</button>
      ))}
    </div>
  </>);

  if (step === 4) return card(<>
    <h2 style={{ color: C.text, fontSize: 18, marginBottom: 4 }}>Grupos focais</h2>
    <p style={{ color: C.sub, fontSize: 13, marginBottom: 20 }}>
      Escolha até 3 grupamentos prioritários. Eles aparecem em destaque nas análises e sobem ao topo ao copiar treinos anteriores.
    </p>
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 20 }}>
      {muscleOptions.map((g) => {
        const sel = config.focalGroups.includes(g);
        return (
          <button key={g} onClick={() => toggleFocal(g)} style={{
            padding: "8px 14px", borderRadius: 20, fontSize: 13,
            border: `1px solid ${sel ? C.accent : C.border}`,
            background: sel ? `${C.accent}22` : C.surface,
            color: sel ? C.accent : C.text, cursor: "pointer",
          }}>{g}</button>
        );
      })}
    </div>
    <button onClick={next} disabled={config.focalGroups.length === 0} style={{
      width: "100%", padding: 14, borderRadius: 10, border: "none",
      background: config.focalGroups.length > 0 ? C.accent : C.surfaceHigh,
      color: "#000", fontWeight: 700, fontSize: 15, cursor: "pointer",
    }}>
      Confirmar ({config.focalGroups.length}/3 selecionados)
    </button>
  </>);

  return card(<>
    <div style={{ fontSize: 48, textAlign: "center", marginBottom: 12 }}>🎯</div>
    <h2 style={{ color: C.text, fontSize: 18, textAlign: "center", marginBottom: 8 }}>Tudo pronto, {profileName}!</h2>
    <p style={{ color: C.sub, fontSize: 13, textAlign: "center", marginBottom: 24 }}>
      Suas análises e recomendações agora são personalizadas. Você pode editar essas configurações a qualquer momento nas configurações do perfil.
    </p>
    <div style={{ background: C.surface, borderRadius: 12, padding: 16, marginBottom: 20 }}>
      <div style={{ color: C.sub, fontSize: 12, marginBottom: 4 }}>Resumo</div>
      <div style={{ color: C.text, fontSize: 13, lineHeight: 2 }}>
        <div>Nível: <strong style={{ color: C.accent }}>
          {{ beginner: "Iniciante", intermediate: "Intermediário", advanced: "Avançado" }[config.experienceLevel]}
        </strong></div>
        <div>Objetivo: <strong style={{ color: C.accent }}>
          {{ hypertrophy: "Hipertrofia", strength: "Força", maintenance: "Manutenção" }[config.goal]}
        </strong></div>
        <div>Treinos/semana: <strong style={{ color: C.accent }}>{config.trainingDaysPerWeek}x</strong></div>
        <div>Grupos focais: <strong style={{ color: C.accent }}>{config.focalGroups.join(", ")}</strong></div>
      </div>
    </div>
    <button onClick={() => onComplete({ ...config, completedOnboarding: true })} style={{
      width: "100%", padding: 14, borderRadius: 10, border: "none",
      background: C.accent, color: "#000", fontWeight: 700, fontSize: 15, cursor: "pointer",
    }}>
      Começar a treinar 💪
    </button>
  </>);
}
