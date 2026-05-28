# IronLog v2 — Plano 1: Fundação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refatorar o App.jsx monolítico em módulos, implementar persistência via GitHub Contents API, e criar o sistema de perfil com onboarding/triagem.

**Architecture:** O App.jsx atual (~2000 linhas) é dividido em componentes, hooks e módulos de dados. Um hook `useGitHubStorage` gerencia sync bidirecional entre localStorage (cache local) e GitHub (fonte de verdade). O sistema de perfil é estendido com `config` de onboarding persistido junto com as sessões.

**Tech Stack:** React 18, Vite, GitHub Contents API (REST), localStorage/sessionStorage

---

## Mapa de arquivos

| Arquivo | Ação | Responsabilidade |
|---|---|---|
| `src/data/exercises.js` | Criar | Base de exercícios (extraída do App.jsx) |
| `src/data/volumeLandmarks.js` | Criar | Tabela MEV/MAV/MRV por grupamento |
| `src/data/constants.js` | Criar | PROFILES, TRAIN_TYPES, MUSCLE_GROUPS, MONTHS_PT, PERIODIZATION_TIPS, helpers (uid, fmtDate, dayName, calcVolume, detectTrainType) |
| `src/hooks/useGitHubStorage.js` | Criar | Leitura/gravação no GitHub com fallback localStorage |
| `src/hooks/useProfile.js` | Criar | Perfil ativo, config onboarding, PAT |
| `src/components/ProfileSetup.jsx` | Criar | Tela de onboarding/triagem |
| `src/components/GitHubSetup.jsx` | Criar | Tela de configuração do PAT |
| `src/App.jsx` | Modificar | Importar módulos, usar hooks novos, manter lógica de roteamento de abas |

---

## Task 1: Extrair constantes e helpers para `src/data/constants.js`

**Files:**
- Create: `src/data/constants.js`
- Modify: `src/App.jsx` (remover definições duplicadas, adicionar imports)

- [ ] **Step 1.1: Criar `src/data/constants.js` com PROFILES, TRAIN_TYPES, MUSCLE_GROUPS, MONTHS_PT e helpers**

```js
// src/data/constants.js
export const C = {
  bg: "#0a0a0c", surface: "#14141a", surfaceHigh: "#1e1e2a",
  border: "#2a2a3a", text: "#f0f0f5", sub: "#7a7a9a",
  accent: "#f5a623", accentD: "#c4811a", success: "#4caf50",
  warn: "#ff9800", error: "#f44336",
};

export const PROFILES = [
  { id: "lucas", name: "Lucas", emoji: "⚡", color: "#f5a623" },
  { id: "namorada", name: "Isadora", emoji: "🌸", color: "#f06292" },
];

export const TRAIN_TYPES = {
  A: { label: "Pull – Costas & Bíceps", emoji: "🔵", color: "#4fc3f7", muscles: ["Costas", "Bíceps", "Antebraço"] },
  B: { label: "Push – Peito, Ombro & Tríceps", emoji: "🔴", color: "#ef5350", muscles: ["Peito", "Ombros", "Tríceps"] },
  C: { label: "Leg Quad – Quadríceps & Panturrilha", emoji: "🟡", color: "#ffd54f", muscles: ["Quadríceps", "Panturrilha", "Adutores / Abdutores"] },
  D: { label: "Upper – Ombro & Trapézio", emoji: "🟣", color: "#ce93d8", muscles: ["Ombros", "Trapézio", "Core / Abdômen"] },
  E: { label: "Leg Post – Posterior & Glúteos", emoji: "🟢", color: "#81c784", muscles: ["Posterior de Coxa", "Glúteos", "Panturrilha"] },
};

export const MUSCLE_GROUPS = [
  { key: "Peito", label: "Peito", icon: "💪" },
  { key: "Costas", label: "Costas", icon: "🔵" },
  { key: "Ombros", label: "Ombros", icon: "🔺" },
  { key: "Bíceps", label: "Bíceps", icon: "💪" },
  { key: "Tríceps", label: "Tríceps", icon: "💪" },
  { key: "Antebraço", label: "Antebraço", icon: "🦾" },
  { key: "Quadríceps", label: "Quadríceps", icon: "🦵" },
  { key: "Posterior de Coxa", label: "Posterior", icon: "🦵" },
  { key: "Glúteos", label: "Glúteos", icon: "🍑" },
  { key: "Panturrilha", label: "Panturrilha", icon: "🦶" },
  { key: "Core / Abdômen", label: "Core", icon: "⭕" },
  { key: "Adutores / Abdutores", label: "Adutores", icon: "🦵" },
  { key: "Trapézio", label: "Trapézio", icon: "🔺" },
  { key: "Escapular / Mobilidade", label: "Mobilidade", icon: "🔄" },
];

export const MONTHS_PT = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];

export const PERIODIZATION_TIPS = {
  A: [
    { phase: "Semanas 1-4 · Acumulação", tip: "Foque em volume: 4-5 séries por exercício, 10-15 reps. Aumente 1 série por semana. Remada curvada e puxada pronada como bases." },
    { phase: "Semanas 5-8 · Intensificação", tip: "Reduza reps (6-10), aumente carga. Introduza rest-pause na última série da remada." },
    { phase: "Semanas 9-12 · Realização", tip: "Pico de força: 4-6 reps nas compostas. Reduza volume total. Priorize qualidade de contração." },
  ],
  B: [
    { phase: "Semanas 1-4 · Acumulação", tip: "Volume no supino e desenvolvimento: 4-5 séries, 10-12 reps. Inclua voador como isolador." },
    { phase: "Semanas 5-8 · Intensificação", tip: "Supino pesado: 6-8 reps. Adicione drop-set no último exercício de ombro." },
    { phase: "Semanas 9-12 · Realização", tip: "Máximo no supino: 3-5 reps. Tríceps com foco em extensão total da articulação." },
  ],
  C: [
    { phase: "Semanas 1-4 · Acumulação", tip: "Agachamento livre como base: 4 séries, 10-15 reps. Leg press como complemento de volume." },
    { phase: "Semanas 5-8 · Intensificação", tip: "Agachamento pesado (6-8 reps) + isometria. Búlgaro unilateral para assimetrias." },
    { phase: "Semanas 9-12 · Realização", tip: "Força máxima no agachamento. Reduza extensora. Mantenha panturrilha em alta frequência." },
  ],
  D: [
    { phase: "Semanas 1-4 · Acumulação", tip: "Desenvolvimento com halteres: 4 séries, 10-12 reps. Elevação lateral alta frequência (3x/semana)." },
    { phase: "Semanas 5-8 · Intensificação", tip: "Desenvolvimento pesado (6-8 reps). Inclua remada alta para trapézio." },
    { phase: "Semanas 9-12 · Realização", tip: "Pico em desenvolvimento. Elevação lateral com técnica estrita, sem balanço." },
  ],
  E: [
    { phase: "Semanas 1-4 · Acumulação", tip: "Stiff como base: 4 séries, 10-12 reps. Hip thrust para glúteos: 4 séries, 12-15 reps." },
    { phase: "Semanas 5-8 · Intensificação", tip: "Stiff pesado (6-8 reps). Leg curl com isometria. Glúteo unilateral." },
    { phase: "Semanas 9-12 · Realização", tip: "Stiff máximo. Hip thrust pesado (6-8 reps). Reduza volume de panturrilha." },
  ],
};

export const uid = () => Math.random().toString(36).slice(2, 9);

export const fmtDate = (d) => {
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
};

export const dayName = (d) => {
  const days = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
  return days[new Date(d + "T12:00:00").getDay()];
};

export const calcVolume = (sets) =>
  sets.reduce((a, s) => a + (parseFloat(s.reps) || 0) * (parseFloat(s.weight) || 0), 0);

export const detectTrainType = (name) => {
  if (!name) return null;
  const n = name.toLowerCase();
  if (n.includes(" a") || n.includes("pull") || n.includes("costas")) return "A";
  if (n.includes(" b") || n.includes("push") || n.includes("peito")) return "B";
  if (n.includes(" c") || n.includes("quad")) return "C";
  if (n.includes(" d") || n.includes("upper") || n.includes("ombro")) return "D";
  if (n.includes(" e") || n.includes("post") || n.includes("glút")) return "E";
  return null;
};
```

- [ ] **Step 1.2: Commit**

```bash
git add src/data/constants.js
git commit -m "refactor: extract constants and helpers to src/data/constants.js"
```

---

## Task 2: Extrair base de exercícios para `src/data/exercises.js`

**Files:**
- Create: `src/data/exercises.js`

- [ ] **Step 2.1: Criar `src/data/exercises.js` copiando o `EXERCISE_DB` e `ALL_EXERCISES` do App.jsx**

```js
// src/data/exercises.js
export const EXERCISE_DB = {
  // Cole aqui o conteúdo completo do EXERCISE_DB do App.jsx atual
  // (manter todos os exercícios existentes sem alteração)
};

export const ALL_EXERCISES = Object.entries(EXERCISE_DB).flatMap(([category, exs]) =>
  exs.map((e) => ({ ...e, category }))
);
```

> Nota: o conteúdo de EXERCISE_DB deve ser copiado literalmente do App.jsx. Os novos exercícios (máquinas e unilaterais) serão adicionados no Plano 2.

- [ ] **Step 2.2: Commit**

```bash
git add src/data/exercises.js
git commit -m "refactor: extract EXERCISE_DB to src/data/exercises.js"
```

---

## Task 3: Criar tabela de volume `src/data/volumeLandmarks.js`

**Files:**
- Create: `src/data/volumeLandmarks.js`

- [ ] **Step 3.1: Criar o arquivo com a tabela MEV/MAV/MRV e função de ajuste por perfil**

```js
// src/data/volumeLandmarks.js

// Valores base para intermediário (séries semanais — hard sets próximos à falha)
// Fonte: RP Strength / Mike Israetel — Training Volume Landmarks for Muscle Growth
// Schoenfeld et al. (2017) — Journal of Sports Sciences
export const VOLUME_LANDMARKS = {
  "Peito":               { mev: 10, mavMin: 14, mavMax: 18, mrv: 22 },
  "Costas":              { mev: 10, mavMin: 14, mavMax: 20, mrv: 25 },
  "Ombros":              { mev: 8,  mavMin: 12, mavMax: 20, mrv: 24 },
  "Ombros (posterior)":  { mev: 6,  mavMin: 10, mavMax: 16, mrv: 20 },
  "Bíceps":              { mev: 6,  mavMin: 10, mavMax: 14, mrv: 20 },
  "Tríceps":             { mev: 6,  mavMin: 10, mavMax: 14, mrv: 18 },
  "Quadríceps":          { mev: 8,  mavMin: 12, mavMax: 16, mrv: 20 },
  "Posterior de Coxa":   { mev: 6,  mavMin: 10, mavMax: 12, mrv: 16 },
  "Glúteos":             { mev: 4,  mavMin: 8,  mavMax: 12, mrv: 16 },
  "Panturrilha":         { mev: 8,  mavMin: 12, mavMax: 16, mrv: 20 },
  "Antebraço":           { mev: 4,  mavMin: 6,  mavMax: 10, mrv: 14 },
  "Core / Abdômen":      { mev: 4,  mavMin: 8,  mavMax: 12, mrv: 16 },
  "Adutores / Abdutores":{ mev: 4,  mavMin: 6,  mavMax: 10, mrv: 14 },
  "Trapézio":            { mev: 4,  mavMin: 8,  mavMax: 12, mrv: 16 },
};

/**
 * Retorna os landmarks ajustados pelo nível e sexo do perfil.
 *
 * Ajustes (baseados em literatura):
 * - Iniciante: ×0.7 (menos volume necessário para adaptação — Schoenfeld 2017)
 * - Avançado: MAV ×1.2 (maior capacidade de recuperação — RP Strength)
 * - Feminino: MAV +10% (maior resistência à fadiga, recuperação mais rápida
 *   — Hunter 2014, Medicine & Science in Sports & Exercise)
 *
 * @param {string} muscleGroup
 * @param {{ experienceLevel: string, sex: string }} profileConfig
 * @returns {{ mev: number, mavMin: number, mavMax: number, mrv: number }}
 */
export function getAdjustedLandmarks(muscleGroup, profileConfig) {
  const base = VOLUME_LANDMARKS[muscleGroup];
  if (!base) return null;

  const { experienceLevel = "intermediate", sex = "male" } = profileConfig || {};

  let levelMult = 1;
  if (experienceLevel === "beginner") levelMult = 0.7;
  if (experienceLevel === "advanced") levelMult = 1.2;

  const sexMavBonus = sex === "female" ? 1.1 : 1;

  return {
    mev:    Math.round(base.mev    * levelMult),
    mavMin: Math.round(base.mavMin * levelMult * sexMavBonus),
    mavMax: Math.round(base.mavMax * levelMult * sexMavBonus),
    mrv:    Math.round(base.mrv    * levelMult),
  };
}

/**
 * Classifica o volume semanal de um grupamento em relação aos landmarks.
 * @returns {"below_mev" | "below_mav" | "in_mav" | "above_mrv"}
 */
export function classifyVolume(weeklySets, muscleGroup, profileConfig) {
  const l = getAdjustedLandmarks(muscleGroup, profileConfig);
  if (!l) return "in_mav";
  if (weeklySets < l.mev) return "below_mev";
  if (weeklySets < l.mavMin) return "below_mav";
  if (weeklySets <= l.mrv) return "in_mav";
  return "above_mrv";
}
```

- [ ] **Step 3.2: Commit**

```bash
git add src/data/volumeLandmarks.js
git commit -m "feat: add MEV/MAV/MRV volume landmarks with profile-adjusted thresholds"
```

---

## Task 4: Criar `src/hooks/useGitHubStorage.js`

**Files:**
- Create: `src/hooks/useGitHubStorage.js`

- [ ] **Step 4.1: Criar o hook com leitura, gravação e fallback localStorage**

```js
// src/hooks/useGitHubStorage.js
import { useCallback, useRef } from "react";

const REPO_OWNER = "lucaswmguimaraes";
const REPO_NAME = "ironlog";
const BRANCH = "main";

/**
 * Hook para sincronizar dados de sessões com o GitHub Contents API.
 *
 * Fluxo:
 * 1. loadFromGitHub() → GET /contents/data/{profileId}.json
 *    - Sucesso: retorna sessões parseadas
 *    - 404: retorna [] (arquivo ainda não existe)
 *    - Sem PAT ou offline: retorna null (caller usa localStorage)
 *
 * 2. saveToGitHub(profileId, sessions) → PUT /contents/data/{profileId}.json
 *    - Cria ou atualiza o arquivo com o SHA atual
 *    - Debounce de 3s gerenciado pelo caller (App.jsx)
 *
 * O PAT nunca sai do localStorage e nunca vai para commits.
 */
export function useGitHubStorage() {
  const shaRef = useRef({}); // cache do SHA por profileId

  const getHeaders = (pat) => ({
    Authorization: `token ${pat}`,
    "Content-Type": "application/json",
    Accept: "application/vnd.github.v3+json",
  });

  const loadFromGitHub = useCallback(async (profileId, pat) => {
    if (!pat) return null;
    try {
      const res = await fetch(
        `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/data/${profileId}.json?ref=${BRANCH}`,
        { headers: getHeaders(pat) }
      );
      if (res.status === 404) return [];
      if (!res.ok) return null;
      const json = await res.json();
      shaRef.current[profileId] = json.sha;
      const decoded = JSON.parse(atob(json.content.replace(/\n/g, "")));
      return decoded;
    } catch {
      return null;
    }
  }, []);

  const saveToGitHub = useCallback(async (profileId, sessions, pat) => {
    if (!pat) return false;
    try {
      const content = btoa(unescape(encodeURIComponent(JSON.stringify(sessions, null, 2))));
      const body = {
        message: `chore: sync ${profileId} sessions`,
        content,
        branch: BRANCH,
        ...(shaRef.current[profileId] ? { sha: shaRef.current[profileId] } : {}),
      };
      const res = await fetch(
        `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/data/${profileId}.json`,
        { method: "PUT", headers: getHeaders(pat), body: JSON.stringify(body) }
      );
      if (!res.ok) return false;
      const json = await res.json();
      shaRef.current[profileId] = json.content.sha;
      return true;
    } catch {
      return false;
    }
  }, []);

  return { loadFromGitHub, saveToGitHub };
}
```

- [ ] **Step 4.2: Commit**

```bash
git add src/hooks/useGitHubStorage.js
git commit -m "feat: add useGitHubStorage hook for GitHub Contents API sync"
```

---

## Task 5: Criar `src/hooks/useProfile.js`

**Files:**
- Create: `src/hooks/useProfile.js`

- [ ] **Step 5.1: Criar o hook de perfil com config de onboarding**

```js
// src/hooks/useProfile.js
import { useState, useCallback } from "react";

const PAT_KEY = (profileId) => `ironlog_pat_${profileId}`;
const CONFIG_KEY = (profileId) => `ironlog_config_${profileId}`;

/**
 * Hook para gerenciar o perfil ativo e suas configurações de onboarding.
 *
 * O PAT é armazenado separadamente do perfil (nunca no JSON de sessões).
 * A config (nível, sexo, objetivo, grupos focais) é persistida no localStorage.
 */
export function useProfile() {
  const [profile, setProfile] = useState(() => {
    try {
      return JSON.parse(sessionStorage.getItem("ironlog_profile") || "null");
    } catch {
      return null;
    }
  });

  const selectProfile = useCallback((p) => {
    sessionStorage.setItem("ironlog_profile", JSON.stringify(p));
    setProfile(p);
  }, []);

  const getPAT = useCallback((profileId) => {
    return localStorage.getItem(PAT_KEY(profileId)) || null;
  }, []);

  const setPAT = useCallback((profileId, pat) => {
    localStorage.setItem(PAT_KEY(profileId), pat);
  }, []);

  const getConfig = useCallback((profileId) => {
    try {
      const stored = localStorage.getItem(CONFIG_KEY(profileId));
      if (stored) return JSON.parse(stored);
    } catch {}
    return {
      experienceLevel: null,
      sex: null,
      goal: null,
      focalGroups: [],
      trainingDaysPerWeek: null,
      completedOnboarding: false,
    };
  }, []);

  const saveConfig = useCallback((profileId, config) => {
    localStorage.setItem(CONFIG_KEY(profileId), JSON.stringify(config));
  }, []);

  return { profile, selectProfile, getPAT, setPAT, getConfig, saveConfig };
}
```

- [ ] **Step 5.2: Commit**

```bash
git add src/hooks/useProfile.js
git commit -m "feat: add useProfile hook with PAT and onboarding config management"
```

---

## Task 6: Criar `src/components/GitHubSetup.jsx`

**Files:**
- Create: `src/components/GitHubSetup.jsx`

- [ ] **Step 6.1: Criar a tela de configuração do PAT**

```jsx
// src/components/GitHubSetup.jsx
import { useState } from "react";
import { C } from "../data/constants";

/**
 * Tela exibida quando o PAT não está configurado para o perfil atual.
 * O usuário gera um PAT com permissão contents:write no repo ironlog
 * e cola aqui. O PAT fica salvo só no localStorage.
 */
export function GitHubSetup({ profileId, profileName, onSave, onSkip }) {
  const [pat, setPat] = useState("");
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState(null);

  const handleTest = async () => {
    setTesting(true);
    setError(null);
    try {
      const res = await fetch(
        "https://api.github.com/repos/lucaswmguimaraes/ironlog",
        { headers: { Authorization: `token ${pat.trim()}` } }
      );
      if (res.ok) {
        onSave(pat.trim());
      } else {
        setError("Token inválido ou sem permissão no repositório. Verifique e tente novamente.");
      }
    } catch {
      setError("Erro de conexão. Verifique sua internet e tente novamente.");
    }
    setTesting(false);
  };

  return (
    <div style={{ padding: 24, maxWidth: 480, margin: "0 auto" }}>
      <div style={{ fontSize: 28, textAlign: "center", marginBottom: 8 }}>🔐</div>
      <h2 style={{ color: C.text, textAlign: "center", marginBottom: 4, fontSize: 18 }}>
        Backup automático no GitHub
      </h2>
      <p style={{ color: C.sub, fontSize: 13, textAlign: "center", marginBottom: 20 }}>
        Configure uma vez para que seus treinos fiquem salvos com segurança no repositório, acessíveis em qualquer dispositivo.
      </p>

      <div style={{ background: C.surface, borderRadius: 12, padding: 16, marginBottom: 16 }}>
        <p style={{ color: C.text, fontSize: 13, marginBottom: 8, fontWeight: 600 }}>Como gerar o token:</p>
        <ol style={{ color: C.sub, fontSize: 12, paddingLeft: 18, lineHeight: 1.8 }}>
          <li>Acesse <strong style={{ color: C.accent }}>github.com → Settings → Developer settings</strong></li>
          <li>Clique em <strong style={{ color: C.accent }}>Personal access tokens → Tokens (classic)</strong></li>
          <li>Clique em <strong style={{ color: C.accent }}>Generate new token (classic)</strong></li>
          <li>Selecione o escopo <strong style={{ color: C.accent }}>repo</strong></li>
          <li>Copie o token gerado e cole abaixo</li>
        </ol>
      </div>

      <input
        type="password"
        placeholder="ghp_..."
        value={pat}
        onChange={(e) => setPat(e.target.value)}
        style={{
          width: "100%", padding: "12px 14px", borderRadius: 10,
          background: C.surfaceHigh, border: `1px solid ${C.border}`,
          color: C.text, fontSize: 14, boxSizing: "border-box", marginBottom: 8,
        }}
      />

      {error && (
        <div style={{ color: C.error, fontSize: 12, marginBottom: 8 }}>{error}</div>
      )}

      <button
        onClick={handleTest}
        disabled={pat.trim().length < 10 || testing}
        style={{
          width: "100%", padding: 14, borderRadius: 10, border: "none",
          background: pat.trim().length >= 10 ? C.accent : C.surfaceHigh,
          color: C.bg, fontWeight: 700, fontSize: 15, cursor: "pointer",
          marginBottom: 10, opacity: testing ? 0.7 : 1,
        }}
      >
        {testing ? "Verificando..." : "Salvar e ativar backup"}
      </button>

      <button
        onClick={onSkip}
        style={{
          width: "100%", padding: 12, borderRadius: 10, border: `1px solid ${C.border}`,
          background: "transparent", color: C.sub, fontSize: 13, cursor: "pointer",
        }}
      >
        Pular por agora (dados ficam só no navegador)
      </button>
    </div>
  );
}
```

- [ ] **Step 6.2: Commit**

```bash
git add src/components/GitHubSetup.jsx
git commit -m "feat: add GitHubSetup component for PAT configuration"
```

---

## Task 7: Criar `src/components/ProfileSetup.jsx` (onboarding)

**Files:**
- Create: `src/components/ProfileSetup.jsx`

- [ ] **Step 7.1: Criar a tela de triagem inicial**

```jsx
// src/components/ProfileSetup.jsx
import { useState } from "react";
import { C, MUSCLE_GROUPS } from "../data/constants";

const STEPS = ["level", "sex", "goal", "days", "focal", "done"];

/**
 * Onboarding de perfil — aparece uma única vez por perfil.
 * Coleta: nível de experiência, sexo biológico, objetivo, dias/semana, grupos focais.
 * Os dados moldam thresholds MEV/MAV/MRV e recomendações personalizadas.
 */
export function ProfileSetup({ profileName, onComplete }) {
  const [step, setStep] = useState(0);
  const [config, setConfig] = useState({
    experienceLevel: null,
    sex: null,
    goal: null,
    trainingDaysPerWeek: null,
    focalGroups: [],
    completedOnboarding: false,
  });

  const set = (key, value) => setConfig((p) => ({ ...p, [key]: value }));
  const next = () => setStep((s) => s + 1);

  const muscleOptions = MUSCLE_GROUPS
    .filter((m) => !["Antebraço", "Escapular / Mobilidade", "Adutores / Abdutores", "Trapézio"].includes(m.key))
    .map((m) => m.key);

  const toggleFocal = (g) => {
    set("focalGroups", config.focalGroups.includes(g)
      ? config.focalGroups.filter((x) => x !== g)
      : config.focalGroups.length < 3
        ? [...config.focalGroups, g]
        : config.focalGroups
    );
  };

  const handleDone = () => {
    onComplete({ ...config, completedOnboarding: true });
  };

  const card = (children) => (
    <div style={{ padding: 24, maxWidth: 480, margin: "0 auto" }}>
      <div style={{ color: C.sub, fontSize: 12, textAlign: "center", marginBottom: 20 }}>
        Olá, {profileName} · {step + 1} de {STEPS.length - 1}
      </div>
      {children}
    </div>
  );

  const optBtn = (label, value, current, onClick, desc) => (
    <button
      key={value}
      onClick={onClick}
      style={{
        width: "100%", padding: "14px 16px", borderRadius: 12, marginBottom: 10,
        border: `1px solid ${current === value ? C.accent : C.border}`,
        background: current === value ? `${C.accent}22` : C.surface,
        color: current === value ? C.accent : C.text,
        textAlign: "left", cursor: "pointer",
      }}
    >
      <div style={{ fontWeight: 700, fontSize: 14 }}>{label}</div>
      {desc && <div style={{ fontSize: 11, color: C.sub, marginTop: 3 }}>{desc}</div>}
    </button>
  );

  if (step === 0) return card(
    <>
      <h2 style={{ color: C.text, fontSize: 18, marginBottom: 4 }}>Qual seu nível de experiência?</h2>
      <p style={{ color: C.sub, fontSize: 13, marginBottom: 20 }}>
        Isso ajusta os thresholds de volume (MEV/MAV/MRV) para seu nível atual.
      </p>
      {optBtn("Iniciante", "beginner", config.experienceLevel, () => { set("experienceLevel", "beginner"); next(); }, "Menos de 1 ano de treino consistente")}
      {optBtn("Intermediário", "intermediate", config.experienceLevel, () => { set("experienceLevel", "intermediate"); next(); }, "1 a 3 anos de treino")}
      {optBtn("Avançado", "advanced", config.experienceLevel, () => { set("experienceLevel", "advanced"); next(); }, "Mais de 3 anos de treino sério")}
    </>
  );

  if (step === 1) return card(
    <>
      <h2 style={{ color: C.text, fontSize: 18, marginBottom: 4 }}>Sexo biológico</h2>
      <p style={{ color: C.sub, fontSize: 13, marginBottom: 20 }}>
        Mulheres têm maior resistência à fadiga muscular e recuperação mais rápida — o app aplica +10% no volume ótimo (MAV) para perfis femininos.
        <br /><small style={{ fontSize: 11 }}>Fonte: Hunter (2014), Medicine & Science in Sports & Exercise</small>
      </p>
      {optBtn("Masculino", "male", config.sex, () => { set("sex", "male"); next(); })}
      {optBtn("Feminino", "female", config.sex, () => { set("sex", "female"); next(); })}
    </>
  );

  if (step === 2) return card(
    <>
      <h2 style={{ color: C.text, fontSize: 18, marginBottom: 4 }}>Objetivo principal</h2>
      <p style={{ color: C.sub, fontSize: 13, marginBottom: 20 }}>Direciona as recomendações de volume e progressão.</p>
      {optBtn("Hipertrofia", "hypertrophy", config.goal, () => { set("goal", "hypertrophy"); next(); }, "Foco em ganho de massa muscular — volume no MAV")}
      {optBtn("Força", "strength", config.goal, () => { set("goal", "strength"); next(); }, "Foco em carga máxima — intensidade sobre volume")}
      {optBtn("Manutenção", "maintenance", config.goal, () => { set("goal", "maintenance"); next(); }, "Manter o que tem — volume no MEV")}
    </>
  );

  if (step === 3) return card(
    <>
      <h2 style={{ color: C.text, fontSize: 18, marginBottom: 4 }}>Dias de treino por semana</h2>
      <p style={{ color: C.sub, fontSize: 13, marginBottom: 20 }}>Usado para calcular volume semanal médio e metas.</p>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        {[3, 4, 5, 6].map((d) => (
          <button
            key={d}
            onClick={() => { set("trainingDaysPerWeek", d); next(); }}
            style={{
              flex: 1, padding: 18, borderRadius: 12, fontSize: 22, fontWeight: 800,
              border: `1px solid ${config.trainingDaysPerWeek === d ? C.accent : C.border}`,
              background: config.trainingDaysPerWeek === d ? `${C.accent}22` : C.surface,
              color: config.trainingDaysPerWeek === d ? C.accent : C.text, cursor: "pointer",
            }}
          >
            {d}x
          </button>
        ))}
      </div>
    </>
  );

  if (step === 4) return card(
    <>
      <h2 style={{ color: C.text, fontSize: 18, marginBottom: 4 }}>Grupos focais</h2>
      <p style={{ color: C.sub, fontSize: 13, marginBottom: 20 }}>
        Escolha até 3 grupamentos prioritários. Eles aparecem em destaque nas análises e sobem ao topo ao copiar treinos anteriores.
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 20 }}>
        {muscleOptions.map((g) => {
          const sel = config.focalGroups.includes(g);
          return (
            <button
              key={g}
              onClick={() => toggleFocal(g)}
              style={{
                padding: "8px 14px", borderRadius: 20, fontSize: 13,
                border: `1px solid ${sel ? C.accent : C.border}`,
                background: sel ? `${C.accent}22` : C.surface,
                color: sel ? C.accent : C.text, cursor: "pointer",
              }}
            >
              {g}
            </button>
          );
        })}
      </div>
      <button
        onClick={next}
        disabled={config.focalGroups.length === 0}
        style={{
          width: "100%", padding: 14, borderRadius: 10, border: "none",
          background: config.focalGroups.length > 0 ? C.accent : C.surfaceHigh,
          color: C.bg, fontWeight: 700, fontSize: 15, cursor: "pointer",
        }}
      >
        Confirmar ({config.focalGroups.length}/3 selecionados)
      </button>
    </>
  );

  // step 5 = done
  return card(
    <>
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
      <button
        onClick={handleDone}
        style={{
          width: "100%", padding: 14, borderRadius: 10, border: "none",
          background: C.accent, color: C.bg, fontWeight: 700, fontSize: 15, cursor: "pointer",
        }}
      >
        Começar a treinar 💪
      </button>
    </>
  );
}
```

- [ ] **Step 7.2: Commit**

```bash
git add src/components/ProfileSetup.jsx
git commit -m "feat: add ProfileSetup onboarding component with 5-step triagem"
```

---

## Task 8: Integrar tudo no `App.jsx`

**Files:**
- Modify: `src/App.jsx`

- [ ] **Step 8.1: Substituir imports inline por imports dos novos módulos no topo do App.jsx**

```jsx
// No topo de src/App.jsx — substituir as definições locais por imports:
import { EXERCISE_DB, ALL_EXERCISES } from "./data/exercises";
import {
  C, PROFILES, TRAIN_TYPES, MUSCLE_GROUPS, MONTHS_PT, PERIODIZATION_TIPS,
  uid, fmtDate, dayName, calcVolume, detectTrainType
} from "./data/constants";
import { useGitHubStorage } from "./hooks/useGitHubStorage";
import { useProfile } from "./hooks/useProfile";
import { ProfileSetup } from "./components/ProfileSetup";
import { GitHubSetup } from "./components/GitHubSetup";
```

- [ ] **Step 8.2: Substituir os useState/useEffect de perfil e sessões pela lógica com os novos hooks**

```jsx
// Em App() — substituir o bloco de state atual por:
const { profile, selectProfile, getPAT, setPAT, getConfig, saveConfig } = useProfile();
const { loadFromGitHub, saveToGitHub } = useGitHubStorage();

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

const [githubSetupDone, setGithubSetupDone] = useState(() => {
  if (!profile) return true;
  return !!getPAT(profile.id);
});

const [onboardingDone, setOnboardingDone] = useState(() => {
  if (!profile) return true;
  return getConfig(profile.id).completedOnboarding;
});

// Salvar no localStorage a cada mudança nas sessões
useEffect(() => {
  if (!profile) return;
  try { localStorage.setItem(`wkv3_${profile.id}`, JSON.stringify(sessions)); } catch {}
}, [sessions, profile?.id]);

// Carregar do GitHub ao selecionar perfil
useEffect(() => {
  if (!profile) return;
  const pat = getPAT(profile.id);
  if (!pat) return;
  loadFromGitHub(profile.id, pat).then((data) => {
    if (data && data.length > 0) setSessions(data);
  });
}, [profile?.id]);

// Sync para GitHub com debounce de 3s
const syncTimer = useRef(null);
useEffect(() => {
  if (!profile) return;
  const pat = getPAT(profile.id);
  if (!pat) return;
  clearTimeout(syncTimer.current);
  syncTimer.current = setTimeout(() => {
    saveToGitHub(profile.id, sessions, pat);
  }, 3000);
  return () => clearTimeout(syncTimer.current);
}, [sessions, profile?.id]);
```

- [ ] **Step 8.3: Adicionar renderização condicional do onboarding e GitHubSetup antes do app principal**

```jsx
// Em App() — logo antes do return principal, adicionar:
if (!profile) {
  // tela de seleção de perfil existente — sem mudança
}

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
        onSave={(pat) => {
          setPAT(profile.id, pat);
          setGithubSetupDone(true);
        }}
        onSkip={() => setGithubSetupDone(true)}
      />
    </div>
  );
}
```

- [ ] **Step 8.4: Remover do App.jsx as definições que agora vivem nos módulos**

Remover do App.jsx:
- Definição de `C` (cores)
- Definição de `PROFILES`
- Definição de `TRAIN_TYPES`
- Definição de `MUSCLE_GROUPS`
- Definição de `MONTHS_PT`
- Definição de `PERIODIZATION_TIPS`
- Funções `uid`, `fmtDate`, `dayName`, `calcVolume`, `detectTrainType`
- Definição de `EXERCISE_DB` e `ALL_EXERCISES`

- [ ] **Step 8.5: Verificar que o app compila sem erros**

```bash
npm run dev
```

Esperado: app abre no browser sem erros de console. Testar:
- Selecionar perfil Lucas → onboarding aparece
- Completar onboarding → tela de GitHub PAT aparece
- Pular PAT → app principal abre com sessões do Lucas

- [ ] **Step 8.6: Commit final da Task 8**

```bash
git add src/App.jsx
git commit -m "refactor: integrate modular hooks and components into App.jsx"
```

---

## Task 9: Build e deploy

- [ ] **Step 9.1: Rodar build de produção**

```bash
npm run build
```

Esperado: saída sem erros em `dist/`.

- [ ] **Step 9.2: Verificar que o GitHub Actions faz deploy automaticamente**

Push para main dispara o workflow `.github/workflows/deploy.yml`. Verificar no GitHub Actions que o deploy conclui com sucesso.

- [ ] **Step 9.3: Commit e push**

```bash
git add -A
git commit -m "feat: ironlog v2 foundation — modular architecture, GitHub sync, onboarding"
git push origin main
```
