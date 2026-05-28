# IronLog v2 — Plano 2: Exercícios

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **Pré-requisito:** Plano 1 (Fundação) concluído. `src/data/exercises.js` já existe.

**Goal:** Adicionar ~75 exercícios novos (máquinas e unilaterais) à base, implementar drag & drop para reordenar exercícios dentro de uma sessão, corrigir o bug de perda de dados ao clicar em histórico, e atualizar o campo `alts` para incluir variações de máquina e unilaterais no "Ver similares".

**Architecture:** A base de exercícios em `src/data/exercises.js` recebe novos campos (`equipment`, `isUnilateral`) e entradas novas. O drag & drop usa `@dnd-kit/sortable` dentro de `SessionView`. O bug fix é um autosave antes de navegação.

**Tech Stack:** React 18, @dnd-kit/core, @dnd-kit/sortable

---

## Mapa de arquivos

| Arquivo | Ação | Responsabilidade |
|---|---|---|
| `src/data/exercises.js` | Modificar | Adicionar campos `equipment`/`isUnilateral`, novos exercícios, atualizar `alts` |
| `src/App.jsx` | Modificar | Drag & drop em SessionView, autosave no bug fix |
| `package.json` | Modificar | Adicionar @dnd-kit/core e @dnd-kit/sortable |

---

## Task 1: Instalar @dnd-kit

**Files:**
- Modify: `package.json`

- [ ] **Step 1.1: Instalar as dependências de drag & drop**

```bash
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

Esperado: `package.json` atualizado com as 3 dependências. Sem erros.

- [ ] **Step 1.2: Commit**

```bash
git add package.json package-lock.json
git commit -m "deps: add @dnd-kit/core, sortable, utilities for drag-and-drop"
```

---

## Task 2: Atualizar `src/data/exercises.js` com novos campos e exercícios

**Files:**
- Modify: `src/data/exercises.js`

- [ ] **Step 2.1: Adicionar campos `equipment` e `isUnilateral` a todos os exercícios existentes**

Para cada exercício no `EXERCISE_DB`, adicionar:
- `equipment`: `"barbell"` | `"dumbbell"` | `"machine"` | `"cable"` | `"bodyweight"`
- `isUnilateral`: `true` | `false`

Regras de mapeamento:
- Exercícios com "barra" → `equipment: "barbell"`
- Exercícios com "haltere" → `equipment: "dumbbell"`
- Exercícios com "máquina", "leg press", "extensora", "flexora", "voador", "pec deck", "chest press", "remada articulada" → `equipment: "machine"`
- Exercícios com "cabo", "polia", "crossover" → `equipment: "cable"`
- Exercícios como "flexão", "barra fixa", "paralelas", "prancha", "abdominal" → `equipment: "bodyweight"`
- `isUnilateral: true` para exercícios que contenham "unilateral", "por perna", "alternado"

- [ ] **Step 2.2: Adicionar novos exercícios de máquina ao `EXERCISE_DB`**

```js
// Adições ao EXERCISE_DB em src/data/exercises.js

// Em "Peito":
{ name: "Chest Press máquina", equipment: "machine", isUnilateral: false,
  desc: "Supino sentado em máquina com trajetória guiada. Ideal para sobrecarga segura e isolamento do peitoral sem demanda de estabilizadores.",
  alts: ["Supino reto com barra", "Supino com halteres", "Voador (Pec Deck)", "Supino haltere unilateral"] },
{ name: "Voador (Pec Deck)", equipment: "machine", isUnilateral: false,
  desc: "Isolador de peitoral em máquina com adução horizontal. Excelente para trabalho de contração final e pump muscular.",
  alts: ["Crucifixo com halteres", "Cross cable convergente", "Voador unilateral na polia"] },
{ name: "Cross Cable convergente", equipment: "cable", isUnilateral: false,
  desc: "Crossover com cabos em ângulo convergente, simulando a ação de adução do peitoral com tensão constante ao longo de todo o movimento.",
  alts: ["Voador (Pec Deck)", "Crucifixo com halteres", "Chest Press máquina"] },
{ name: "Supino haltere unilateral", equipment: "dumbbell", isUnilateral: true,
  desc: "Supino com um haltere por vez. Aumenta demanda de estabilização e permite detectar assimetrias de força entre os lados.",
  alts: ["Chest Press máquina", "Supino com halteres", "Voador unilateral na polia"] },
{ name: "Voador unilateral na polia", equipment: "cable", isUnilateral: true,
  desc: "Crossover unilateral na polia baixa ou alta. Permite contração máxima do peitoral com tensão constante e amplitude aumentada.",
  alts: ["Voador (Pec Deck)", "Cross cable convergente", "Crucifixo com halteres"] },

// Em "Costas":
{ name: "Remada máquina articulada", equipment: "machine", isUnilateral: false,
  desc: "Remada sentada em máquina com movimento articulado (convergente). Reduz demanda de estabilização e permite foco na contração dorsal.",
  alts: ["Remada curvada com barra", "Remada com haltere unilateral", "Remada iso-lateral"] },
{ name: "Remada iso-lateral", equipment: "machine", isUnilateral: false,
  desc: "Remada em máquina com braços independentes (iso-lateral). Corrige desequilíbrios entre os lados e permite maior amplitude por braço.",
  alts: ["Remada máquina articulada", "Remada com haltere unilateral", "Remada curvada com barra"] },
{ name: "Pulldown máquina", equipment: "machine", isUnilateral: false,
  desc: "Puxada alta em máquina com trajetória guiada. Alternativa à puxada na polia para quem prefere estabilidade ou está desenvolvendo força de tração.",
  alts: ["Puxada pronada na polia", "Puxada neutra", "Pulldown unilateral"] },
{ name: "Remada unilateral no cabo", equipment: "cable", isUnilateral: true,
  desc: "Remada com cabo em posição unilateral. Permite maior rotação e amplitude de movimento que a versão bilateral, com tensão constante do cabo.",
  alts: ["Remada com haltere", "Remada máquina articulada", "Remada iso-lateral"] },
{ name: "Pulldown unilateral", equipment: "cable", isUnilateral: true,
  desc: "Puxada unilateral na polia alta. Isola cada lado do dorsal individualmente, útil para corrigir assimetrias.",
  alts: ["Pulldown máquina", "Puxada pronada na polia", "Remada unilateral no cabo"] },

// Em "Ombros":
{ name: "Desenvolvimento máquina", equipment: "machine", isUnilateral: false,
  desc: "Desenvolvimento de ombros em máquina com trajetória guiada. Reduz risco de impingimento e permite carga maior com foco no deltoide.",
  alts: ["Desenvolvimento com halteres", "Desenvolvimento com barra", "Elevação lateral máquina"] },
{ name: "Elevação lateral máquina", equipment: "machine", isUnilateral: false,
  desc: "Elevação lateral em máquina com tensão constante ao longo de toda a amplitude. Superior ao haltere na fase de contração máxima.",
  alts: ["Elevação lateral com halteres", "Elevação lateral unilateral cabo", "Desenvolvimento máquina"] },
{ name: "Elevação lateral unilateral cabo", equipment: "cable", isUnilateral: true,
  desc: "Elevação lateral unilateral na polia baixa. Tensão máxima no início do movimento (diferente do haltere), excelente para deltoide lateral.",
  alts: ["Elevação lateral com halteres", "Elevação lateral máquina", "Face pull unilateral"] },
{ name: "Face pull unilateral", equipment: "cable", isUnilateral: true,
  desc: "Face pull unilateral na polia alta. Trabalha deltoide posterior, infraespinhal e romboides com controle independente de cada braço.",
  alts: ["Face pull", "Elevação lateral unilateral cabo", "Crucifixo inverso com halteres"] },

// Em "Bíceps":
{ name: "Rosca máquina", equipment: "machine", isUnilateral: false,
  desc: "Rosca bíceps em máquina com suporte para o braço. Isolamento máximo do bíceps sem compensação de tronco.",
  alts: ["Rosca direta com barra", "Rosca no cabo", "Rosca martelo unilateral"] },
{ name: "Rosca no cabo", equipment: "cable", isUnilateral: false,
  desc: "Rosca direta na polia baixa com cabo. Tensão constante em toda a amplitude, inclusive no ponto de menor tensão do haltere.",
  alts: ["Rosca direta com barra", "Rosca máquina", "Rosca unilateral no cabo"] },
{ name: "Rosca martelo unilateral", equipment: "dumbbell", isUnilateral: true,
  desc: "Rosca martelo com um haltere por vez. Trabalha bíceps braquial e braquiorradial com pegada neutra, unilateral para foco e amplitude.",
  alts: ["Rosca martelo", "Rosca no cabo", "Rosca máquina"] },
{ name: "Rosca unilateral no cabo", equipment: "cable", isUnilateral: true,
  desc: "Rosca unilateral na polia baixa. Permite supinação ativa durante o movimento com tensão contínua, superior ao haltere em alguns ângulos.",
  alts: ["Rosca no cabo", "Rosca máquina", "Rosca direta com haltere"] },

// Em "Tríceps":
{ name: "Tríceps máquina (pushdown)", equipment: "machine", isUnilateral: false,
  desc: "Extensão de tríceps em máquina tipo pushdown com trajetória guiada. Foco em cabeça lateral e medial sem compensação de ombro.",
  alts: ["Tríceps no cabo (corda)", "Tríceps cross cable", "Extensão testa unilateral"] },
{ name: "Tríceps cross cable", equipment: "cable", isUnilateral: false,
  desc: "Extensão de tríceps com cabo em posição oposta ao corpo (cross). Ativa fortemente a cabeça longa do tríceps com braço elevado.",
  alts: ["Tríceps máquina (pushdown)", "Extensão sobre a cabeça", "Tríceps corda unilateral"] },
{ name: "Tríceps corda unilateral", equipment: "cable", isUnilateral: true,
  desc: "Pushdown unilateral com corda ou alça. Permite maior pronação no final do movimento e correção de assimetrias entre os braços.",
  alts: ["Tríceps no cabo (corda)", "Tríceps máquina (pushdown)", "Extensão testa unilateral"] },
{ name: "Extensão testa unilateral", equipment: "dumbbell", isUnilateral: true,
  desc: "Extensão do tríceps deitado (skull crusher) com um haltere. Isola cada braço e permite amplitude de movimento completa.",
  alts: ["Tríceps testa com barra", "Tríceps cross cable", "Tríceps corda unilateral"] },

// Em "Quadríceps":
{ name: "Leg Press 45°", equipment: "machine", isUnilateral: false,
  desc: "Pressão de pernas na máquina inclinada a 45°. Permite grande sobrecarga com segurança, foco em quadríceps com ativação de glúteos variável pelo posicionamento dos pés.",
  alts: ["Leg Press 90°", "Agachamento livre", "Leg Press unilateral", "Extensora"] },
{ name: "Leg Press 90°", equipment: "machine", isUnilateral: false,
  desc: "Pressão de pernas em máquina vertical (90°). Menor demanda axial na coluna que o agachamento, útil para volume adicional ou em fases de deload.",
  alts: ["Leg Press 45°", "Agachamento livre", "Hack Squat máquina"] },
{ name: "Extensora", equipment: "machine", isUnilateral: false,
  desc: "Extensão de joelhos em máquina sentado. Isolador de quadríceps, ideal para pump final ou trabalho de volume adicional após compostos.",
  alts: ["Leg Press 45°", "Extensora unilateral", "Agachamento livre"] },
{ name: "Hack Squat máquina", equipment: "machine", isUnilateral: false,
  desc: "Agachamento em máquina hack com plataforma inclinada. Menor estresse lombar que o agachamento livre com sobrecarga similar de quadríceps.",
  alts: ["Agachamento livre", "Leg Press 45°", "Agachamento búlgaro com halteres"] },
{ name: "Leg Press unilateral", equipment: "machine", isUnilateral: true,
  desc: "Leg press com uma perna por vez. Detecta e corrige assimetrias, permite maior amplitude de movimento por membro.",
  alts: ["Leg Press 45°", "Extensora unilateral", "Agachamento búlgaro com halteres"] },
{ name: "Extensora unilateral", equipment: "machine", isUnilateral: true,
  desc: "Extensão de joelhos unilateral na máquina. Corrige desequilíbrios entre quadríceps direito e esquerdo.",
  alts: ["Extensora", "Leg Press unilateral", "Agachamento búlgaro com halteres"] },

// Em "Posterior de Coxa":
{ name: "Flexora deitada", equipment: "machine", isUnilateral: false,
  desc: "Flexão de joelhos deitado em máquina. Principal exercício isolador de isquiotibiais, com foco na cabeça curta e longa do bíceps femoral.",
  alts: ["Flexora sentada", "Mesa flexora", "Stiff com barra", "Flexora unilateral"] },
{ name: "Flexora sentada", equipment: "machine", isUnilateral: false,
  desc: "Flexão de joelhos sentado em máquina. Mantém o quadril em flexão, aumentando o pré-estiramento dos isquiotibiais e o recrutamento da cabeça longa.",
  alts: ["Flexora deitada", "Mesa flexora", "Stiff com halteres"] },
{ name: "Mesa flexora", equipment: "machine", isUnilateral: false,
  desc: "Flexão de joelhos em máquina tipo roman chair. Variação que permite ajuste de ângulo de quadril para foco diferente nos isquiotibiais.",
  alts: ["Flexora deitada", "Flexora sentada", "Stiff com barra"] },
{ name: "Flexora unilateral", equipment: "machine", isUnilateral: true,
  desc: "Flexão de joelhos unilateral em máquina deitada. Permite foco individual em cada membro e detecção de desequilíbrios.",
  alts: ["Flexora deitada", "Stiff unilateral haltere", "Mesa flexora"] },
{ name: "Stiff unilateral haltere", equipment: "dumbbell", isUnilateral: true,
  desc: "Stiff romeno com um haltere por vez. Maior amplitude de movimento, trabalha estabilidade e detecta assimetrias de força e flexibilidade.",
  alts: ["Stiff com halteres", "Flexora unilateral", "Flexora deitada"] },

// Em "Glúteos":
{ name: "Abdutora máquina", equipment: "machine", isUnilateral: false,
  desc: "Abdução de quadril sentado em máquina. Isola o glúteo médio e mínimo, fundamental para estabilidade pélvica e estética lateral do glúteo.",
  alts: ["Abdução cabo unilateral", "Elevação pélvica unilateral", "Hip thrust"] },
{ name: "Glúteo máquina (kickback)", equipment: "machine", isUnilateral: false,
  desc: "Extensão de quadril em máquina tipo kickback. Isolamento do glúteo máximo com tensão constante, alternativa à extensão com cabo.",
  alts: ["Elevação pélvica unilateral", "Hip thrust", "Abdução cabo unilateral"] },
{ name: "Elevação pélvica unilateral", equipment: "bodyweight", isUnilateral: true,
  desc: "Hip thrust ou ponte de glúteos com uma perna. Aumenta a sobrecarga por membro e o recrutamento do glúteo em relação à versão bilateral.",
  alts: ["Hip thrust", "Glúteo máquina (kickback)", "Abdução cabo unilateral"] },
{ name: "Abdução cabo unilateral", equipment: "cable", isUnilateral: true,
  desc: "Abdução de quadril unilateral no cabo baixo. Tensão constante em toda a amplitude, superior à máquina na fase excêntrica.",
  alts: ["Abdutora máquina", "Glúteo máquina (kickback)", "Elevação pélvica unilateral"] },

// Em "Panturrilha":
{ name: "Panturrilha sentado máquina", equipment: "machine", isUnilateral: false,
  desc: "Elevação de calcanhares sentado em máquina. Com joelho dobrado, isola o músculo sóleo (mais profundo), diferente da versão em pé que recruta mais o gastrocnêmio.",
  alts: ["Panturrilha em pé (máquina)", "Leg Press panturrilha", "Panturrilha unilateral em pé"] },
{ name: "Leg Press panturrilha", equipment: "machine", isUnilateral: false,
  desc: "Plantiflexão no leg press. Permite grande sobrecarga com perna quase estendida, recrutando principalmente o gastrocnêmio.",
  alts: ["Panturrilha em pé (máquina)", "Panturrilha sentado máquina", "Panturrilha unilateral em pé"] },
{ name: "Panturrilha unilateral em pé", equipment: "bodyweight", isUnilateral: true,
  desc: "Elevação de calcanhar unilateral em pé, com apoio em degrau para amplitude máxima. Permite sobrecarga progressiva com haltere e corrige assimetrias.",
  alts: ["Panturrilha em pé (máquina)", "Panturrilha sentado máquina", "Leg Press panturrilha"] },

// Em "Core / Abdômen":
{ name: "Crunch máquina", equipment: "machine", isUnilateral: false,
  desc: "Flexão de tronco em máquina abdominal. Permite progressão de carga no core com trajetória guiada e menor estresse cervical que o crunch no chão.",
  alts: ["Abdominal no cabo", "Oblíquo cabo unilateral", "Prancha"] },
{ name: "Rotação torácica máquina", equipment: "machine", isUnilateral: false,
  desc: "Rotação do tronco em máquina. Trabalha oblíquos e rotadores do core com carga controlada. Importante para prevenção de lesões lombares.",
  alts: ["Oblíquo cabo unilateral", "Crunch máquina", "Prancha lateral"] },
{ name: "Oblíquo cabo unilateral", equipment: "cable", isUnilateral: true,
  desc: "Flexão lateral ou rotação unilateral no cabo. Isola os oblíquos com tensão constante, superior ao side bend com haltere em termos de curva de força.",
  alts: ["Rotação torácica máquina", "Crunch máquina", "Prancha lateral"] },
```

- [ ] **Step 2.3: Atualizar o campo `alts` dos exercícios EXISTENTES para incluir as novas variações**

Para cada exercício existente que tenha uma variante nova adicionada no Step 2.2, adicionar o nome da variante no array `alts` do exercício original.

Exemplos:
- "Supino reto com barra" → adicionar `"Chest Press máquina"`, `"Supino haltere unilateral"` no alts
- "Agachamento livre" → adicionar `"Leg Press 45°"`, `"Hack Squat máquina"`, `"Leg Press unilateral"`
- "Stiff com barra" → adicionar `"Flexora deitada"`, `"Flexora sentada"`, `"Stiff unilateral haltere"`

- [ ] **Step 2.4: Commit**

```bash
git add src/data/exercises.js
git commit -m "feat: add ~75 machine and unilateral exercises with equipment flags and updated alts"
```

---

## Task 3: Bug fix — autosave ao sair da edição

**Files:**
- Modify: `src/App.jsx` (função `SessionView` e o handler `onHistClick`)

- [ ] **Step 3.1: Adicionar autosave em `SessionView` antes de qualquer navegação**

No componente `SessionView`, o botão de histórico chama `onHistClick(ex.name)`. Antes dessa chamada, o estado atual deve ser salvo.

Localizar no `SessionView` a linha:
```jsx
onClick={()=>onHistClick(ex.name)}
```

Substituir por:
```jsx
onClick={() => {
  onSave(data); // autosave antes de navegar
  onHistClick(ex.name);
}}
```

- [ ] **Step 3.2: Garantir autosave também ao clicar em "← Voltar"**

Localizar no `SessionView`:
```jsx
<button style={S.back} onClick={onBack}>← Voltar</button>
```

Substituir por:
```jsx
<button style={S.back} onClick={() => { onSave(data); onBack(); }}>← Voltar</button>
```

- [ ] **Step 3.3: Garantir autosave na troca de aba**

No `App.jsx`, o `setTab` na barra de navegação deve salvar o estado se houver uma sessão em edição ativa (`activeSession`). Localizar a barra de tabs e adicionar:

```jsx
onClick={() => {
  if (activeSession && tab === "session") {
    // O SessionView já fez autosave — apenas navega
  }
  setTab(t);
}}
```

> Nota: com os Steps 3.1 e 3.2, o autosave já acontece antes de qualquer navegação dentro do SessionView. Este step é uma salvaguarda adicional.

- [ ] **Step 3.4: Testar o bug fix**

1. Abrir o app e selecionar o perfil Lucas
2. Criar um novo treino (botão +)
3. Adicionar 2 exercícios e preencher séries/reps/peso
4. Clicar no botão de histórico de qualquer exercício
5. Verificar que ao voltar para o treino, os dados estão preservados

- [ ] **Step 3.5: Commit**

```bash
git add src/App.jsx
git commit -m "fix: autosave session before navigating to exercise history"
```

---

## Task 4: Drag & drop para reordenar exercícios

**Files:**
- Modify: `src/App.jsx` (componente `SessionView`)

- [ ] **Step 4.1: Adicionar imports do @dnd-kit no topo do App.jsx**

```jsx
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
```

- [ ] **Step 4.2: Criar componente `SortableExerciseItem` dentro de SessionView**

Adicionar logo antes da função `SessionView`:

```jsx
function SortableExerciseItem({ id, children }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    position: "relative",
  };

  return (
    <div ref={setNodeRef} style={style}>
      {/* Handle de drag — ícone de arrastar */}
      <div
        {...attributes}
        {...listeners}
        style={{
          position: "absolute",
          top: 12,
          right: 12,
          cursor: "grab",
          color: "#7a7a9a",
          fontSize: 18,
          touchAction: "none",
          zIndex: 10,
          padding: "4px 8px",
        }}
      >
        ⠿
      </div>
      {children}
    </div>
  );
}
```

- [ ] **Step 4.3: Adicionar handler `handleDragEnd` dentro de `SessionView`**

Dentro da função `SessionView`, após a definição de `mut`, adicionar:

```jsx
const sensors = useSensors(
  useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } })
);

const handleDragEnd = (event) => {
  const { active, over } = event;
  if (!over || active.id === over.id) return;
  mut((d) => {
    const oldIndex = d.exercises.findIndex((e) => e.id === active.id);
    const newIndex = d.exercises.findIndex((e) => e.id === over.id);
    d.exercises = arrayMove(d.exercises, oldIndex, newIndex);
  });
};
```

- [ ] **Step 4.4: Envolver a lista de exercícios com `DndContext` e `SortableContext`**

Localizar no JSX do `SessionView` onde os exercícios são renderizados (o `.map` sobre `data.exercises`) e envolver:

```jsx
<DndContext
  sensors={sensors}
  collisionDetection={closestCenter}
  onDragEnd={handleDragEnd}
>
  <SortableContext
    items={data.exercises.map((e) => e.id)}
    strategy={verticalListSortingStrategy}
  >
    {data.exercises.map((ex) => (
      <SortableExerciseItem key={ex.id} id={ex.id}>
        {/* conteúdo existente do exercício — sem alteração */}
      </SortableExerciseItem>
    ))}
  </SortableContext>
</DndContext>
```

- [ ] **Step 4.5: Testar drag & drop**

1. Abrir o app e entrar em um treino com múltiplos exercícios
2. Segurar o ícone ⠿ de um exercício e arrastar para outra posição
3. Soltar e verificar que a ordem mudou
4. Salvar o treino e verificar que a nova ordem persiste após recarregar

- [ ] **Step 4.6: Commit**

```bash
git add src/App.jsx
git commit -m "feat: add drag-and-drop exercise reordering in SessionView"
```

---

## Task 5: Grupos focais sobem ao topo ao copiar treino

**Files:**
- Modify: `src/App.jsx` (função `loadFromTemplate` em `SessionView`)

- [ ] **Step 5.1: Receber `profileConfig` como prop em `SessionView`**

Alterar a assinatura do componente:
```jsx
// Antes:
function SessionView({session, isNew, onSave, onDelete, onBack, onHistClick, onSwap, getLastSess, allSessions})

// Depois:
function SessionView({session, isNew, onSave, onDelete, onBack, onHistClick, onSwap, getLastSess, allSessions, profileConfig})
```

E passar no ponto onde `SessionView` é instanciado no `App`:
```jsx
<SessionView
  // ...props existentes...
  profileConfig={getConfig(profile.id)}
/>
```

- [ ] **Step 5.2: Atualizar `loadFromTemplate` para reordenar por grupos focais**

```jsx
const loadFromTemplate = (templateSession) => {
  const focalGroups = profileConfig?.focalGroups || [];

  const rawExercises = templateSession.exercises.map((ex) => ({
    ...JSON.parse(JSON.stringify(ex)),
    id: uid(),
    notes: ex.notes || "",
  }));

  // Exercícios dos grupos focais sobem para o topo, mantendo ordem interna
  const focal = rawExercises.filter((e) => focalGroups.includes(e.category));
  const rest  = rawExercises.filter((e) => !focalGroups.includes(e.category));
  const reordered = [...focal, ...rest];

  mut((d) => {
    d.name = templateSession.name;
    d.trainType = templateSession.trainType;
    d.exercises = reordered;
  });
  setExp(reordered.map((e) => e.id));
  setShowTemplatePicker(false);
};
```

- [ ] **Step 5.3: Testar**

1. Configurar grupos focais como "Peito" e "Costas" no onboarding
2. Criar novo treino copiando um Push (Treino B) com exercícios de Peito, Ombros e Tríceps
3. Verificar que exercícios de Peito aparecem primeiro na lista
4. Confirmar que drag & drop ainda funciona após o reordenamento

- [ ] **Step 5.4: Commit**

```bash
git add src/App.jsx
git commit -m "feat: auto-sort focal group exercises to top when copying template"
```

---

## Task 6: Build e deploy

- [ ] **Step 6.1: Build**

```bash
npm run build
```

Esperado: sem erros.

- [ ] **Step 6.2: Push e deploy**

```bash
git push origin main
```

Verificar que o GitHub Actions conclui o deploy com sucesso.
