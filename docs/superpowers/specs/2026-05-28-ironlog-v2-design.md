# IronLog v2 — Design Spec

**Data:** 2026-05-28  
**Status:** Aprovado — aguardando implementação  
**Escopo:** 17 features + refatoração arquitetural  
**Repositório:** https://github.com/lucaswmguimaraes/ironlog

---

## Índice

1. [Arquitetura e Persistência](#1-arquitetura-e-persistência)
2. [Base de Exercícios, Drag & Drop e Bug Fix](#2-base-de-exercícios-drag--drop-e-bug-fix)
3. [Analytics, KPIs e Análises Inteligentes](#3-analytics-kpis-e-análises-inteligentes)
4. [Perfil, Onboarding e Grupos Focais](#4-perfil-onboarding-e-grupos-focais)
5. [Conceitos Técnicos de Referência](#5-conceitos-técnicos-de-referência)
6. [Tabela de Features](#6-tabela-de-features)

---

## 1. Arquitetura e Persistência

### 1.1 Estrutura de arquivos (refatoração)

O `App.jsx` atual (~2000 linhas) será refatorado em módulos:

```
src/
  data/
    exercises.js          ← base de exercícios (livre, máquina, unilateral)
    volumeLandmarks.js    ← tabela MEV/MAV/MRV por grupamento
  hooks/
    useGitHubStorage.js   ← leitura/gravação no GitHub
    useProfile.js         ← perfil ativo + configurações
  components/
    HomeTab.jsx
    SessionView.jsx
    AnalysisTab.jsx
    CalendarTab.jsx
    ExerciseHistory.jsx
    ProfileSetup.jsx      ← tela de onboarding/triagem
  App.jsx                 ← roteamento entre abas, estado global
```

### 1.2 Persistência via GitHub Contents API

**Por que GitHub:**
- Zero custo, zero servidor
- O repositório já existe e está sendo usado para deploy
- Versionamento gratuito — cada save gera um commit (backup em git)
- Funciona em qualquer dispositivo com o PAT configurado

**Como funciona:**

O app usa a [GitHub Contents API](https://docs.github.com/en/rest/repos/contents) para ler e gravar arquivos JSON diretamente no repositório. Cada perfil tem seu próprio arquivo:

```
data/
  lucas.json       ← todas as sessões do Lucas
  namorada.json    ← todas as sessões da namorada
```

**Fluxo de dados:**
1. App abre → carrega do GitHub → fallback para localStorage se offline
2. Cada save → grava no localStorage imediatamente (UX rápida) + enfileira gravação no GitHub (debounce 3s)
3. Se GitHub offline/lento → localStorage mantém tudo → sync ao reconectar

**Configuração (uma vez por dispositivo):**
- Tela pede o GitHub Personal Access Token (PAT) com permissão `contents:write` no repo `ironlog`
- PAT salvo apenas no localStorage (nunca vai para o código ou commit)
- Tela aparece apenas se o PAT não estiver configurado

### 1.3 Estrutura de dados

```js
// Sessão — formato atual preservado, campos novos opcionais
{
  id: "s1",
  date: "2025-04-04",
  name: "Treino B – Push",
  trainType: "B",
  exercises: [
    {
      id: "e1",
      name: "Supino reto com barra",
      category: "Peito",
      isUnilateral: false,      // NOVO
      equipment: "barbell",     // NOVO: barbell | dumbbell | machine | cable | bodyweight
      notes: "...",
      sets: [{ reps: 10, weight: 80 }]
    }
  ]
}

// Perfil — ampliado com config de onboarding
{
  id: "lucas",
  name: "Lucas",
  // githubPAT salvo separado no localStorage, nunca no JSON do perfil
  config: {
    experienceLevel: "intermediate",  // beginner | intermediate | advanced
    sex: "male",                       // male | female
    goal: "hypertrophy",              // hypertrophy | strength | maintenance
    focalGroups: ["Peito", "Costas"], // até 3 grupamentos prioritários
    trainingDaysPerWeek: 5,
    completedOnboarding: true
  }
}
```

---

## 2. Base de Exercícios, Drag & Drop e Bug Fix

### 2.1 Novos exercícios: máquinas e unilaterais

**Flag `equipment`:** cada exercício terá campo indicando o equipamento principal.

**Flag `isUnilateral`:** exercícios unilaterais são entradas separadas na base, com nome explícito.

**Novos exercícios por grupamento (mínimo):**

| Grupamento | Máquinas adicionadas | Unilaterais adicionados |
|---|---|---|
| Peito | Chest Press máquina, Voador (Pec Deck), Cross Cable convergente | Supino haltere unilateral, Voador unilateral na polia |
| Costas | Remada máquina articulada, Pulldown máquina, Remada iso-lateral | Remada unilateral no cabo, Pulldown unilateral |
| Ombros | Desenvolvimento máquina, Elevação lateral máquina | Elevação lateral unilateral cabo, Face pull unilateral |
| Bíceps | Rosca máquina, Rosca no cabo | Rosca martelo unilateral, Rosca 21 unilateral |
| Tríceps | Tríceps máquina (pushdown), Tríceps cross cable | Tríceps corda unilateral, Extensão testa unilateral |
| Quadríceps | Leg Press 45°, Leg Press 90°, Extensora, Hack Squat máquina | Leg Press unilateral, Extensora unilateral |
| Posterior | Flexora deitada, Flexora sentada, Mesa flexora | Flexora unilateral, Stiff unilateral haltere |
| Glúteos | Abdutora máquina, Glúteo máquina (kickback) | Elevação pélvica unilateral, Abdução cabo unilateral |
| Panturrilha | Panturrilha sentado máquina, Leg Press panturrilha | Panturrilha unilateral em pé |
| Core | Crunch máquina, Rotação torácica máquina | Oblíquo cabo unilateral |

**"Ver similares" atualizado:** o campo `alts` de cada exercício passará a incluir suas variações de máquina e unilaterais como sugestões. Ex: "Supino reto com barra" → `alts: ["Chest Press máquina", "Supino haltere unilateral", "Supino inclinado com barra", ...]`

### 2.2 Drag & drop para reordenar exercícios

**Problema:** ao excluir e readicionar um exercício feito no início do treino, ele vai para o final. A posição importa para comparabilidade histórica de carga (fadiga acumulada afeta o peso possível em cada posição).

**Solução:** drag & drop na lista de exercícios dentro de uma sessão.

**Biblioteca:** `@dnd-kit/core` + `@dnd-kit/sortable` — leve (~15kb), suporte a touch/mobile, padrão React moderno.

**Comportamento:**
- Segurar e arrastar qualquer exercício para reposicionar
- A ordem é salva como parte da sessão (campo `exercises` já é array ordenado)
- Ao copiar treino anterior para novo treino: exercícios dos **grupos focais** do perfil sobem automaticamente para o topo, demais exercícios mantêm ordem original
- Drag & drop disponível para ajuste manual após o reordenamento automático

### 2.3 Bug fix: perda de dados ao clicar em histórico durante edição

**Root cause:** `onHistClick` navega para a aba de histórico sem persistir o estado atual da sessão em edição. Tudo preenchido se perde.

**Fix:** autosave antes de qualquer navegação para fora da sessão:

```js
// Antes (bugado):
onClick={() => onHistClick(ex.name)}

// Depois (corrigido):
onClick={() => {
  saveCurrentSession(data); // persiste imediatamente
  onHistClick(ex.name);
}}
```

Aplicar em: botão de histórico, troca de aba, botão voltar — qualquer saída da tela de edição aciona autosave antes de navegar.

---

## 3. Analytics, KPIs e Análises Inteligentes

### 3.1 Aba de Análise (reformulada em 4 blocos)

**Bloco 1 — Volume semanal por grupamento com status MEV/MAV/MRV**

Cada grupamento exibe séries/semana com indicador de zona:
- 🔴 Abaixo do MEV — ex: "Posterior de coxa: 4 séries/sem (mín. 6)"
- 🟡 Entre MEV e MAV — ex: "Peito: 11 séries/sem (ótimo: 14–18)"
- 🟢 Dentro do MAV — ex: "Costas: 16 séries/sem ✓"
- 🔴 Acima do MRV — ex: "Ombros: 26 séries/sem — atenção ao overtraining"

Os thresholds são ajustados pelo nível do perfil:
- Iniciante: 70% dos valores da tabela base
- Intermediário: 100%
- Avançado: até 120% do MAV
- Perfil feminino: +10% no MAV

**Bloco 2 — Volume acumulado: semana vs. semana / mês vs. mês**

Comparativo de volume total (séries × reps × carga = tonelagem em kg) e número de séries por grupamento:
- Semana atual vs. anterior — delta em % e valor absoluto
- Mês atual vs. anterior — mesma lógica
- Filtrável por grupamento ou treino completo

**Bloco 3 — Tendência de progressão de carga**

Por exercício, variação de carga média nos últimos 4, 8 e 12 semanas:
- 📈 Progredindo bem (≥5% em 4 semanas)
- ➡️ Progressão lenta (1–4% em 4 semanas) — sugestão de aumentar intensidade
- ⚠️ Estagnado (<1% em 4 semanas) — sugestão de trocar exercício ou mudar rep range
- 📉 Regressão — sinal de overtraining ou fadiga acumulada

**Bloco 4 — Cards de recomendação inteligente**

Cards baseados nos dados + configuração do perfil. Exemplos:
- *"Quadríceps está abaixo do MEV há 2 semanas. No próximo Treino C, considere adicionar 1 série a mais na Extensora ou incluir o Leg Press 45°."*
- *"Você está fazendo os mesmos exercícios de costas há 10 semanas. Considere trocar a Remada curvada por Remada máquina articulada para novo estímulo."*
- *"Seu volume de peito subiu 40% esta semana — monitore a recuperação."*
- *"[Grupo focal: Peito] está dentro do MAV. Bom ritmo."*

Cada card tem:
- Botão **"Aplicar no próximo treino"** — adiciona exercício sugerido ao template do próximo treino daquele tipo (removível por drag ou antes de salvar)
- Botão **"Ignorar por 2 semanas"** — snooze
- Ícone **ℹ️** — abre explicação inline do conceito técnico por trás, com citação da fonte (ver Seção 5)

### 3.2 KPIs do Home (reformulados)

| Card | Conteúdo |
|---|---|
| **Sessões do mês** | Número de treinos no mês corrente vs. meta semanal (ex: "12 treinos — 3/semana ✓") |
| **Média exercícios/treino** | Média de exercícios por sessão no mês atual |
| **Volume por grupamento** | Mini barra comparando volume mês atual vs. mês anterior por grupos focais do perfil |

### 3.3 Calendário com visualização rápida

Ao clicar em qualquer dia com treino registrado, abre um painel/modal com:
- Nome do treino, data
- Lista de exercícios com séries/reps/carga registrados
- Botão para abrir o treino completo em edição

---

## 4. Perfil, Onboarding e Grupos Focais

### 4.1 Tela de Onboarding (triagem inicial)

Aparece uma única vez por perfil na primeira abertura. Editável depois nas configurações.

**Perguntas:**
1. Nome
2. Sexo biológico (masculino / feminino)
3. Nível de experiência: Iniciante (<1 ano) / Intermediário (1–3 anos) / Avançado (>3 anos)
4. Objetivo: Hipertrofia / Força / Manutenção
5. Dias de treino por semana: 3 / 4 / 5 / 6
6. Grupos focais (múltipla escolha, até 3 grupamentos)
7. GitHub PAT (com link de instrução para geração)

### 4.2 Grupos Focais no fluxo de treino

**Ao copiar um treino anterior:**
1. Exercícios dos grupos focais sobem automaticamente para o topo
2. Dentro dos grupos focais, ordem preservada do treino anterior
3. Exercícios de outros grupamentos ficam abaixo, na ordem original
4. Drag & drop disponível para ajuste manual

**Nas análises:** cards de grupos focais aparecem primeiro, com destaque visual.

### 4.3 Sugestão de periodização

O app rastreia há quantas semanas cada exercício aparece como principal (1º ou 2º na sessão) em cada tipo de treino.

**Gatilho:** 8 semanas consecutivas com o mesmo exercício principal.

**Card de sugestão:**
- Exercício atual + sugestões de `alts` (incluindo máquinas e unilaterais)
- Botão "Aplicar no próximo treino X" — troca automaticamente no template
- Botão "Ignorar por 2 semanas"

### 4.4 Configurações do perfil

Acessível pelo ícone de perfil. Campos editáveis do onboarding, mais:
- **Exportar dados** — download do JSON completo das sessões
- **Importar dados** — subir JSON de backup
- **Reconectar GitHub** — atualizar PAT
- **Resetar onboarding** — refazer a triagem

---

## 5. Conceitos Técnicos de Referência

Esta seção documenta os conceitos científicos usados como base para as análises e recomendações do app. Cada recomendação no app exibe um ícone ℹ️ que aponta para o conceito relevante desta seção.

### MEV — Volume Mínimo Efetivo

Quantidade mínima de séries semanais por grupamento muscular para gerar adaptação (hipertrofia ou ganho de força). Abaixo do MEV, o treino mantém o músculo mas não gera progresso novo.

**Fonte:** Mike Israetel & James Hoffmann — *Renaissance Periodization (RP Strength)*, "Training Volume Landmarks for Muscle Growth"

### MAV — Volume Máximo Adaptativo

A faixa ótima de séries semanais onde o estímulo é alto o suficiente para crescimento e a recuperação ainda acontece completamente antes do próximo estímulo. É onde você quer passar a maior parte do tempo de treino.

**Fonte:** RP Strength; corroborado por Schoenfeld et al. (2017) — *"Dose-response relationship between weekly resistance training volume and increases in muscle mass"*, Journal of Sports Sciences.

### MRV — Volume Máximo Recuperável

O teto de séries semanais que o organismo consegue absorver e ainda se recuperar adequadamente. Acima do MRV surgem sinais de overtraining: queda de performance, risco de lesão, sono ruim, perda de massa muscular.

**Fonte:** RP Strength; Kreher & Schwartz (2012) — *"Overtraining Syndrome"*, Sports Health.

### Tabela MEV / MAV / MRV por grupamento (base intermediário)

| Grupamento | MEV | MAV | MRV |
|---|---|---|---|
| Peito | 10 | 14–18 | 22 |
| Costas | 10 | 14–20 | 25 |
| Ombros (lateral) | 8 | 12–20 | 24 |
| Ombros (posterior) | 6 | 10–16 | 20 |
| Bíceps | 6 | 10–14 | 20 |
| Tríceps | 6 | 10–14 | 18 |
| Quadríceps | 8 | 12–16 | 20 |
| Posterior de coxa | 6 | 10–12 | 16 |
| Glúteos | 4 | 8–12 | 16 |
| Panturrilha | 8 | 12–16 | 20 |

Valores em séries semanais (hard sets, próximos à falha). Ajustes: iniciante ×0,7 / avançado MAV ×1,2 / feminino MAV +10%.

### Sobrecarga Progressiva

Princípio fundamental de adaptação muscular: para continuar progredindo, o estímulo precisa aumentar ao longo do tempo (mais carga, mais repetições, mais séries ou menor descanso). Para naturais, a progressão de carga ideal é de **5–10% por mesociclo** (4–6 semanas).

**Fonte:** Haff & Triplett (2015) — *Essentials of Strength Training and Conditioning*, NSCA. Reforçado por Caio Bottura (Strength & Conditioning, EUA) e Fabrício Pacholok (naturalismo e periodização prática).

### Variação de Exercício e Periodização

Após 8–12 semanas repetindo os mesmos exercícios principais, o organismo se adapta ao padrão de movimento (adaptação neural) e ao estímulo metabólico específico. Trocar 1–2 exercícios acessórios por grupamento — mantendo o padrão de movimento (push/pull/hinge/squat) — é suficiente para renovar o estímulo.

**Fonte:** Fonseca et al. (2014) — *"Resistance Training with Different Volumes and Exercise Variations"*, Journal of Strength and Conditioning Research. Alinhado com metodologia de Fabrício Pacholok: trocar exercício acessório a cada mesociclo, manter exercício base.

### Diferenças fisiológicas feminino/masculino no treino de força

Mulheres têm maior proporção de fibras tipo I (resistência à fadiga), recuperam mais rápido entre séries e sessões, e respondem bem a volumes ligeiramente maiores por grupamento. Por isso o app aplica +10% no MAV para perfis femininos.

**Fonte:** Schoenfeld et al. (2017); Aaberg (2007) — *Resistance Training Instruction*; Hunter (2014) — *"The Relevance of Sex Differences in Performance Fatigability"*, Medicine & Science in Sports & Exercise.

---

## 6. Tabela de Features

| # | Feature | Seção |
|---|---|---|
| 1 | Drag & drop para reordenar exercícios | 2.2 |
| 2 | Exercícios de máquina (~40 novos) | 2.1 |
| 3 | Variações unilaterais (~35 novas) | 2.1 |
| 4 | "Ver similares" inclui máquinas e unilaterais | 2.1 |
| 5 | Bug fix: perda de dados ao ver histórico durante edição | 2.3 |
| 6 | Volume semanal com status MEV/MAV/MRV personalizado | 3.1 |
| 7 | Comparativo semana vs. semana e mês vs. mês | 3.1 |
| 8 | Tendência de progressão de carga por exercício | 3.1 |
| 9 | Cards de recomendação com conceito referenciado (ℹ️) | 3.1 |
| 10 | KPIs do Home reformulados | 3.2 |
| 11 | Calendário com visualização rápida do treino | 3.3 |
| 12 | Onboarding/triagem por perfil | 4.1 |
| 13 | Grupos focais priorizam exercícios ao copiar treino | 4.2 |
| 14 | Sugestão de periodização por tempo de exercício | 4.3 |
| 15 | Persistência via GitHub (backup automático) | 1.2 |
| 16 | Refatoração em módulos | 1.1 |
| 17 | Exportar/Importar JSON manual | 4.4 |
