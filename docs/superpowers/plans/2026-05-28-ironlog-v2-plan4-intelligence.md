# IronLog v2 — Plano 4: Inteligência e Periodização

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **Pré-requisito:** Planos 1, 2 e 3 concluídos. `src/data/analyticsHelpers.js` com `weeksAsMainExercise` já existe.

**Goal:** Implementar sugestão de periodização (trocar exercício principal após 8 semanas), tela de configurações do perfil (editável), exportar/importar JSON, e polimento final do sistema de recomendações com "Aplicar no próximo treino".

**Architecture:** Um componente `ProfileSettings.jsx` cobre as configurações editáveis e export/import. A lógica de sugestão de periodização é um card gerado na `AnalysisTab` com base em `weeksAsMainExercise`. O "Aplicar no próximo treino" usa um estado de sugestão pendente que é injetado no `loadFromTemplate` do `SessionView`.

**Tech Stack:** React 18, GitHub Contents API (já implementada no Plano 1), File API do browser para import/export JSON

---

## Mapa de arquivos

| Arquivo | Ação | Responsabilidade |
|---|---|---|
| `src/components/ProfileSettings.jsx` | Criar | Tela de configurações editável + export/import |
| `src/components/AnalysisTab.jsx` | Modificar | Adicionar cards de periodização + botão "Aplicar" |
| `src/App.jsx` | Modificar | Integrar ProfileSettings, estado de sugestão pendente, botão de configurações |

---

## Task 1: Criar `src/components/ProfileSettings.jsx`

**Files:**
- Create: `src/components/ProfileSettings.jsx`

- [ ] **Step 1.1: Criar a tela de configurações**

```jsx
// src/components/ProfileSettings.jsx
import { useState } from "react";
import { C, MUSCLE_GROUPS } from "../data/constants";

/**
 * Tela de configurações do perfil — reedita todos os campos do onboarding,
 * mais export/import de JSON e reconexão do PAT do GitHub.
 */
export function ProfileSettings({ profileId, profileName, currentConfig, currentPAT, onSave, onSavePAT, onBack }) {
  const [config, setConfig] = useState({ ...currentConfig });
  const [patValue, setPatValue] = useState("");
  const [patSection, setPatSection] = useState(false);
  const [importError, setImportError] = useState(null);

  const set = (key, value) => setConfig((p) => ({ ...p, [key]: value }));

  const toggleFocal = (g) => {
    set("focalGroups", config.focalGroups.includes(g)
      ? config.focalGroups.filter((x) => x !== g)
      : config.focalGroups.length < 3
        ? [...config.focalGroups, g]
        : config.focalGroups
    );
  };

  const muscleOptions = MUSCLE_GROUPS
    .filter((m) => !["Antebraço", "Escapular / Mobilidade", "Adutores / Abdutores", "Trapézio"].includes(m.key))
    .map((m) => m.key);

  const handleExport = (sessions) => {
    const blob = new Blob([JSON.stringify(sessions, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ironlog-${profileId}-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (e, onImport) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        if (!Array.isArray(data)) throw new Error("Formato inválido");
        onImport(data);
        setImportError(null);
      } catch {
        setImportError("Arquivo inválido. Certifique-se de que é um backup do IronLog.");
      }
    };
    reader.readAsText(file);
  };

  return (
    <div style={{ padding: "0 16px 80px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "16px 0" }}>
        <button onClick={onBack} style={{ background: "none", border: "none", color: C.sub, fontSize: 20, cursor: "pointer" }}>←</button>
        <div style={{ fontSize: 16, fontWeight: 700, color: C.text }}>Configurações — {profileName}</div>
      </div>

      {/* Nível de experiência */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 12, color: C.sub, marginBottom: 8 }}>Nível de experiência</div>
        {[
          ["beginner", "Iniciante", "< 1 ano"],
          ["intermediate", "Intermediário", "1–3 anos"],
          ["advanced", "Avançado", "> 3 anos"],
        ].map(([value, label, desc]) => (
          <button
            key={value}
            onClick={() => set("experienceLevel", value)}
            style={{
              width: "100%", padding: "12px 14px", borderRadius: 10, marginBottom: 8, textAlign: "left",
              border: `1px solid ${config.experienceLevel === value ? C.accent : C.border}`,
              background: config.experienceLevel === value ? `${C.accent}22` : C.surface,
              color: config.experienceLevel === value ? C.accent : C.text, cursor: "pointer",
            }}
          >
            <span style={{ fontWeight: 700 }}>{label}</span>
            <span style={{ fontSize: 11, color: C.sub, marginLeft: 8 }}>{desc}</span>
          </button>
        ))}
      </div>

      {/* Sexo */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 12, color: C.sub, marginBottom: 8 }}>Sexo biológico</div>
        <div style={{ display: "flex", gap: 8 }}>
          {[["male", "Masculino"], ["female", "Feminino"]].map(([value, label]) => (
            <button
              key={value}
              onClick={() => set("sex", value)}
              style={{
                flex: 1, padding: 12, borderRadius: 10,
                border: `1px solid ${config.sex === value ? C.accent : C.border}`,
                background: config.sex === value ? `${C.accent}22` : C.surface,
                color: config.sex === value ? C.accent : C.text, cursor: "pointer",
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Objetivo */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 12, color: C.sub, marginBottom: 8 }}>Objetivo principal</div>
        {[
          ["hypertrophy", "Hipertrofia"],
          ["strength", "Força"],
          ["maintenance", "Manutenção"],
        ].map(([value, label]) => (
          <button
            key={value}
            onClick={() => set("goal", value)}
            style={{
              width: "100%", padding: 12, borderRadius: 10, marginBottom: 8,
              border: `1px solid ${config.goal === value ? C.accent : C.border}`,
              background: config.goal === value ? `${C.accent}22` : C.surface,
              color: config.goal === value ? C.accent : C.text, cursor: "pointer", textAlign: "left",
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Dias por semana */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 12, color: C.sub, marginBottom: 8 }}>Dias de treino por semana</div>
        <div style={{ display: "flex", gap: 8 }}>
          {[3, 4, 5, 6].map((d) => (
            <button
              key={d}
              onClick={() => set("trainingDaysPerWeek", d)}
              style={{
                flex: 1, padding: 14, borderRadius: 10, fontSize: 18, fontWeight: 800,
                border: `1px solid ${config.trainingDaysPerWeek === d ? C.accent : C.border}`,
                background: config.trainingDaysPerWeek === d ? `${C.accent}22` : C.surface,
                color: config.trainingDaysPerWeek === d ? C.accent : C.text, cursor: "pointer",
              }}
            >
              {d}x
            </button>
          ))}
        </div>
      </div>

      {/* Grupos focais */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 12, color: C.sub, marginBottom: 8 }}>Grupos focais (até 3)</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
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
      </div>

      {/* Salvar configurações */}
      <button
        onClick={() => onSave(config)}
        style={{
          width: "100%", padding: 14, borderRadius: 10, border: "none",
          background: C.accent, color: C.bg, fontWeight: 700, fontSize: 15, cursor: "pointer",
          marginBottom: 20,
        }}
      >
        Salvar configurações
      </button>

      {/* GitHub PAT */}
      <div style={{ background: C.surface, borderRadius: 12, padding: 16, marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 8 }}>🔐 Backup GitHub</div>
        <div style={{ fontSize: 12, color: C.sub, marginBottom: 12 }}>
          {currentPAT ? "✅ Token configurado — backup automático ativo" : "⚠️ Sem token — dados ficam só no navegador"}
        </div>
        {!patSection ? (
          <button
            onClick={() => setPatSection(true)}
            style={{
              width: "100%", padding: 10, borderRadius: 8,
              border: `1px solid ${C.border}`, background: "transparent",
              color: C.sub, fontSize: 12, cursor: "pointer",
            }}
          >
            {currentPAT ? "Trocar token" : "Configurar token"}
          </button>
        ) : (
          <>
            <input
              type="password"
              placeholder="ghp_..."
              value={patValue}
              onChange={(e) => setPatValue(e.target.value)}
              style={{
                width: "100%", padding: "10px 12px", borderRadius: 8, boxSizing: "border-box",
                background: C.surfaceHigh, border: `1px solid ${C.border}`,
                color: C.text, fontSize: 13, marginBottom: 8,
              }}
            />
            <button
              onClick={() => { onSavePAT(patValue.trim()); setPatSection(false); setPatValue(""); }}
              disabled={patValue.trim().length < 10}
              style={{
                width: "100%", padding: 10, borderRadius: 8, border: "none",
                background: patValue.trim().length >= 10 ? C.accent : C.surfaceHigh,
                color: C.bg, fontWeight: 700, cursor: "pointer", fontSize: 13,
              }}
            >
              Salvar token
            </button>
          </>
        )}
      </div>

      {/* Export/Import */}
      <div style={{ background: C.surface, borderRadius: 12, padding: 16, marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 8 }}>💾 Backup manual</div>
        <button
          onClick={() => {
            // onExport é injetado pelo App como () => sessions
            if (typeof window.__ironlog_export === "function") {
              handleExport(window.__ironlog_export());
            }
          }}
          style={{
            width: "100%", padding: 10, borderRadius: 8, marginBottom: 8,
            border: `1px solid ${C.border}`, background: "transparent",
            color: C.text, fontSize: 12, cursor: "pointer",
          }}
        >
          ⬇️ Exportar JSON (download)
        </button>
        <label style={{
          display: "block", width: "100%", padding: 10, borderRadius: 8, boxSizing: "border-box",
          border: `1px solid ${C.border}`, background: "transparent",
          color: C.sub, fontSize: 12, cursor: "pointer", textAlign: "center",
        }}>
          ⬆️ Importar JSON (restaurar backup)
          <input
            type="file"
            accept=".json"
            style={{ display: "none" }}
            onChange={(e) => {
              if (typeof window.__ironlog_import === "function") {
                handleImport(e, window.__ironlog_import);
              }
            }}
          />
        </label>
        {importError && <div style={{ color: C.error, fontSize: 12, marginTop: 8 }}>{importError}</div>}
      </div>
    </div>
  );
}
```

- [ ] **Step 1.2: Commit**

```bash
git add src/components/ProfileSettings.jsx
git commit -m "feat: add ProfileSettings component with config editing, PAT, export/import"
```

---

## Task 2: Adicionar cards de periodização na AnalysisTab

**Files:**
- Modify: `src/components/AnalysisTab.jsx`

- [ ] **Step 2.1: Importar `weeksAsMainExercise` no AnalysisTab**

```jsx
import { ..., weeksAsMainExercise } from "../data/analyticsHelpers";
import { ALL_EXERCISES } from "../data/exercises";
```

- [ ] **Step 2.2: Adicionar estado para sugestão de periodização**

Dentro de `AnalysisTab`, após os outros `useState`:
```jsx
const [snoozed, setSnoozed] = useState(() => {
  try { return JSON.parse(localStorage.getItem("ironlog_snoozed") || "{}"); } catch { return {}; }
});

const snoozeKey = (exerciseName, trainType) => `${exerciseName}__${trainType}`;

const snoozeUntil = (exerciseName, trainType) => {
  const until = new Date();
  until.setDate(until.getDate() + 14);
  const updated = { ...snoozed, [snoozeKey(exerciseName, trainType)]: until.toISOString().slice(0, 10) };
  setSnoozed(updated);
  localStorage.setItem("ironlog_snoozed", JSON.stringify(updated));
};

const isSnoozed = (exerciseName, trainType) => {
  const until = snoozed[snoozeKey(exerciseName, trainType)];
  if (!until) return false;
  return today <= until;
};
```

- [ ] **Step 2.3: Calcular sugestões de periodização antes do return**

```jsx
// Sugestões de periodização — exercícios principais há 8+ semanas
const periodizationSuggestions = [];
Object.keys(TRAIN_TYPES).forEach((trainType) => {
  const typeSessions = sessions.filter((s) => (s.trainType || "") === trainType);
  if (typeSessions.length < 3) return;

  // Exercícios que aparecem como 1º ou 2º com frequência
  const mainExFreq = {};
  typeSessions.forEach((s) => {
    [0, 1].forEach((idx) => {
      const ex = s.exercises[idx];
      if (ex) mainExFreq[ex.name] = (mainExFreq[ex.name] || 0) + 1;
    });
  });

  Object.keys(mainExFreq).forEach((exName) => {
    if (isSnoozed(exName, trainType)) return;
    const weeks = weeksAsMainExercise(exName, trainType, sessions);
    if (weeks >= 8) {
      const exData = ALL_EXERCISES.find((e) => e.name === exName);
      const suggestions = exData?.alts?.slice(0, 3) || [];
      periodizationSuggestions.push({ exName, trainType, weeks, suggestions });
    }
  });
});
```

- [ ] **Step 2.4: Renderizar bloco de periodização no JSX após o Bloco 4**

```jsx
{/* BLOCO 5 — Sugestões de periodização */}
{periodizationSuggestions.length > 0 && (
  <div style={{ padding: "0 16px 16px" }}>
    <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 4 }}>
      🔄 Hora de variar?
      <button onClick={() => setActiveConcept("periodization")} style={{ marginLeft: 8, background: "none", border: "none", color: C.accent, cursor: "pointer", fontSize: 12 }}>ℹ️</button>
    </div>
    <div style={{ fontSize: 11, color: C.sub, marginBottom: 12 }}>
      Exercícios principais há 8+ semanas — considere alternar para novo estímulo
    </div>
    {periodizationSuggestions.map((p, i) => (
      <div key={i} style={{ background: C.surface, borderRadius: 12, padding: 14, marginBottom: 10 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 4 }}>
          {p.exName}
          <span style={{ fontSize: 11, color: C.sub, marginLeft: 8 }}>
            {TRAIN_TYPES[p.trainType]?.emoji} Treino {p.trainType} · {p.weeks} semanas
          </span>
        </div>
        {p.suggestions.length > 0 && (
          <div style={{ fontSize: 12, color: C.sub, marginBottom: 10 }}>
            Alternativas: <strong style={{ color: C.text }}>{p.suggestions.join(", ")}</strong>
          </div>
        )}
        <button
          onClick={() => snoozeUntil(p.exName, p.trainType)}
          style={{
            padding: "6px 12px", borderRadius: 8,
            border: `1px solid ${C.border}`, background: "transparent",
            color: C.sub, fontSize: 11, cursor: "pointer",
          }}
        >
          Ignorar por 2 semanas
        </button>
      </div>
    ))}
  </div>
)}
```

- [ ] **Step 2.5: Adicionar conceito de periodização ao objeto `CONCEPTS` no AnalysisTab**

```jsx
// Dentro do objeto CONCEPTS em AnalysisTab.jsx:
periodization: {
  title: "Variação de Exercício e Periodização",
  body: "Após 8–12 semanas com os mesmos exercícios principais, o organismo se adapta ao padrão de movimento (adaptação neural e metabólica). Trocar 1–2 exercícios acessórios por grupamento renova o estímulo sem abandonar o que funciona.",
  source: "Fonseca et al. (2014) — Journal of Strength and Conditioning Research; Fabrício Pacholok — metodologia de periodização prática para naturais",
},
```

- [ ] **Step 2.6: Commit**

```bash
git add src/components/AnalysisTab.jsx
git commit -m "feat: add periodization suggestions with 8-week trigger and snooze"
```

---

## Task 3: Integrar ProfileSettings no App.jsx

**Files:**
- Modify: `src/App.jsx`

- [ ] **Step 3.1: Importar ProfileSettings**

```jsx
import { ProfileSettings } from "./components/ProfileSettings";
```

- [ ] **Step 3.2: Adicionar estado para mostrar configurações**

```jsx
const [showSettings, setShowSettings] = useState(false);
```

- [ ] **Step 3.3: Adicionar botão de configurações no header ou na tela de seleção de perfil**

No header do app (quando há perfil ativo), adicionar ícone de engrenagem:

```jsx
<button
  onClick={() => setShowSettings(true)}
  style={{ background: "none", border: "none", color: C.sub, fontSize: 20, cursor: "pointer", padding: "4px 8px" }}
>
  ⚙️
</button>
```

- [ ] **Step 3.4: Renderizar ProfileSettings quando `showSettings` é true**

```jsx
if (showSettings && profile) {
  return (
    <div style={{ background: C.bg, minHeight: "100vh" }}>
      <div style={S.grain} />
      <ProfileSettings
        profileId={profile.id}
        profileName={profile.name}
        currentConfig={getConfig(profile.id)}
        currentPAT={getPAT(profile.id)}
        onSave={(config) => {
          saveConfig(profile.id, { ...config, completedOnboarding: true });
          setShowSettings(false);
        }}
        onSavePAT={(pat) => {
          setPAT(profile.id, pat);
        }}
        onBack={() => setShowSettings(false)}
      />
    </div>
  );
}
```

- [ ] **Step 3.5: Expor funções de export/import via `window.__ironlog_*`**

Logo após os useState principais no App:
```jsx
// Expõe para o ProfileSettings (componente filho sem acesso direto ao estado)
window.__ironlog_export = () => sessions;
window.__ironlog_import = (data) => {
  setSessions(data);
};
```

> Nota: usar `window.__ironlog_*` é uma solução pragmática para evitar prop drilling profundo. Se o código for refatorado com Context API no futuro, substituir por isso.

- [ ] **Step 3.6: Commit**

```bash
git add src/App.jsx
git commit -m "feat: integrate ProfileSettings with settings toggle, export and import"
```

---

## Task 4: Self-review e polimento final

**Files:**
- Modify: `src/App.jsx`, `src/components/AnalysisTab.jsx`

- [ ] **Step 4.1: Verificar consistência de nomes de funções e props entre planos**

Conferir:
- `getConfig(profile.id)` existe no `useProfile` hook — ✓ Plano 1, Task 5
- `saveConfig(profile.id, config)` existe — ✓ Plano 1, Task 5
- `getPAT` / `setPAT` existem — ✓ Plano 1, Task 5
- `loadFromGitHub` / `saveToGitHub` no hook — ✓ Plano 1, Task 4
- `weeksAsMainExercise` no analyticsHelpers — ✓ Plano 3, Task 1
- `profileConfig` passado para `AnalysisTab`, `HomeTab`, `SessionView` — ✓ Planos 2 e 3

- [ ] **Step 4.2: Verificar que INITIAL_SESSIONS_LUCAS ainda carrega corretamente**

No App.jsx, o fallback para `INITIAL_SESSIONS_LUCAS` deve continuar funcionando para o perfil Lucas antes de ter GitHub configurado.

- [ ] **Step 4.3: Testar fluxo completo do zero (novo dispositivo)**

1. Limpar localStorage e sessionStorage do browser
2. Abrir o app
3. Selecionar perfil Lucas
4. Onboarding aparece → completar
5. Tela de GitHub PAT aparece → pular
6. App principal abre com sessões do Lucas (INITIAL_SESSIONS_LUCAS)
7. Criar novo treino → drag & drop funciona → salvar
8. Abrir Análise → blocos 1, 2, 3, 4 aparecem corretamente
9. Abrir ⚙️ → configurações aparecem → exportar JSON → download ocorre
10. Abrir Calendário → clicar em dia com treino → exercícios e séries aparecem

- [ ] **Step 4.4: Commit de polimento**

```bash
git add -A
git commit -m "feat: ironlog v2 complete — intelligence, periodization, settings, export/import"
```

---

## Task 5: Build e deploy final

- [ ] **Step 5.1: Build de produção**

```bash
npm run build
```

Esperado: sem erros em `dist/`.

- [ ] **Step 5.2: Push e deploy**

```bash
git push origin main
```

Verificar no GitHub Actions que o deploy conclui.

- [ ] **Step 5.3: Teste de smoke no app em produção**

Abrir a URL do GitHub Pages do repositório e verificar:
- Seleção de perfil funciona
- Onboarding aparece para perfil novo (ou vai direto se já completou)
- Criar novo treino, adicionar exercício, salvar — sem erros
- Análise mostra os 4 blocos
- Configurações abrem e fecham corretamente
