// src/data/constants.js
export const C = {
  bg: "#0a0a0c",
  surface: "#14151a",
  surfaceHigh: "#1c1d24",
  border: "#252630",
  text: "#e8e8ef",
  sub: "#7a7a95",
  accent: "#f5a623",
  accentD: "rgba(245,166,35,.12)",
  success: "#2ecc71",
  warn: "#ffb74d",
  error: "#ff4455",
  green: "#2ecc71",
  danger: "#ff4455",
};

export const PROFILES = [
  { id: "lucas", name: "Lucas", emoji: "⚡", color: "#f5a623" },
  { id: "namorada", name: "Isadora", emoji: "🌸", color: "#f06292" },
];

export const TRAIN_TYPES = {
  A: { label: "A – Pull", color: "#4fc3f7", emoji: "🔵", muscles: ["Costas", "Bíceps", "Antebraço", "Escapular / Mobilidade"] },
  B: { label: "B – Push", color: "#f06292", emoji: "🔴", muscles: ["Peito", "Ombros", "Tríceps"] },
  C: { label: "C – Legs Quad", color: "#81c784", emoji: "🟢", muscles: ["Quadríceps", "Panturrilha", "Adutores / Abdutores"] },
  D: { label: "D – Upper", color: "#ffb74d", emoji: "🟡", muscles: ["Peito", "Costas", "Ombros", "Bíceps", "Tríceps"] },
  E: { label: "E – Legs Post", color: "#ce93d8", emoji: "🟣", muscles: ["Posterior de Coxa", "Glúteos", "Panturrilha", "Core / Abdômen"] },
};

export const MUSCLE_GROUPS = [
  { key: "Peito", label: "Peito", icon: "💪" },
  { key: "Costas", label: "Costas", icon: "🔙" },
  { key: "Ombros", label: "Ombros", icon: "🔝" },
  { key: "Bíceps", label: "Bíceps", icon: "💙" },
  { key: "Tríceps", label: "Tríceps", icon: "❤️" },
  { key: "Antebraço", label: "Antebraço", icon: "🦾" },
  { key: "Quadríceps", label: "Quadríceps", icon: "🦵" },
  { key: "Posterior de Coxa", label: "Posterior", icon: "🦶" },
  { key: "Glúteos", label: "Glúteos", icon: "🍑" },
  { key: "Panturrilha", label: "Panturrilha", icon: "🦿" },
  { key: "Core / Abdômen", label: "Core", icon: "🎯" },
  { key: "Adutores / Abdutores", label: "Adutores", icon: "🦵" },
  { key: "Trapézio", label: "Trapézio", icon: "🔺" },
  { key: "Escapular / Mobilidade", label: "Mobilidade", icon: "🔄" },
];

export const MONTHS_PT = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

export const PERIODIZATION_TIPS = {
  A: [
    { phase: "Semanas 1-4 · Acumulação", tip: "Foque em volume total. Priorize puxadas verticais (puxada/barra fixa) e remadas horizontais pesadas. Use 3-4 séries de 10-12 reps. Inclua um exercício de bíceps com ênfase no alongamento (rosca 45° inclinada)." },
    { phase: "Semanas 5-8 · Intensificação", tip: "Reduza o número de exercícios, aumente a carga. Barra fixa com carga extra, remada pendlay pesada. 4×6-8 reps. Intensificadores: rest-pause na puxada, drop set na rosca." },
    { phase: "Semanas 9-12 · Realização", tip: "Volume máximo de séries. Inclua cluster sets na barra fixa, myo-reps na rosca. Semana 12: deload com 60% do volume total mantendo intensidade." },
  ],
  B: [
    { phase: "Semanas 1-4 · Acumulação", tip: "Volume em peitoral superior (inclinado) e desenvolvimento. 3-4×10-12. Priorize tríceps em overhead (cabeça longa) e um exercício de extensão de cotovelo." },
    { phase: "Semanas 5-8 · Intensificação", tip: "Supino pesado como exercício principal 4-5×5-8. Mantenha lateral com drops e overhead para tríceps. Reduza total de exercícios por treino." },
    { phase: "Semanas 9-12 · Realização", tip: "Maior volume em ombro (deltoide medial é frequentemente o ponto fraco). Giant sets de ombro: lateral + frontal + posterior consecutivos. Tríceps finalizador com drop set." },
  ],
  C: [
    { phase: "Semanas 1-4 · Acumulação", tip: "Base em agachamento livre + leg press. 3×10-12 em extensora como finalizador. Panturrilha: 4-5 séries com ênfase no sóleo (sentado)." },
    { phase: "Semanas 5-8 · Intensificação", tip: "Agachamento pesado 4×6-8 + búlgaro pesado 3×8. Use extensora como pré-exaustão antes do agachamento. Panturrilha: cargas máximas em pé." },
    { phase: "Semanas 9-12 · Realização", tip: "Volume máximo: 5-6 séries de leg press com diferentes posições de pé. Giant set de panturrilha: sentado + em pé + no leg press sem descanso entre exercícios." },
  ],
  D: [
    { phase: "Semanas 1-4 · Acumulação", tip: "Treino Upper equilibrado: 2 exercícios puxada/costas, 2 empurrar, 1-2 braços, 1-2 ombros. Volume moderado 3×10-12 cada grupamento." },
    { phase: "Semanas 5-8 · Intensificação", tip: "Selecione movimentos mais pesados e reduza variedade. Remada pesada + supino inclinado + desenvolvimento + rosca + tríceps overhead. 4×6-8." },
    { phase: "Semanas 9-12 · Realização", tip: "Foque no que menos progrediu nas semanas anteriores. Adicione técnica de intensidade (rest-pause, drop set) nos exercícios principais do treino D." },
  ],
  E: [
    { phase: "Semanas 1-4 · Acumulação", tip: "Volume em mesa flexora + stiff. Inclua hip thrust para glúteos. 3×10-12 em cada. Panturrilha em pé 4-5 séries. Core: 2-3 exercícios ao final." },
    { phase: "Semanas 5-8 · Intensificação", tip: "Stiff pesado como principal 4×6-8. Mesa flexora com isometria. Hip thrust com carga máxima. Abdutora pesada para glúteo médio." },
    { phase: "Semanas 9-12 · Realização", tip: "Volume máximo de ísquios. Superset: mesa flexora + stiff sem descanso entre exercícios. Nordic curl excêntrico para prevenção e pico de hipertrofia." },
  ],
};

export const uid = () => Math.random().toString(36).slice(2, 9);

export const fmtDate = (d) => {
  if (!d) return "";
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
};

export const dayName = (d) => {
  const DAYS_PT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
  return DAYS_PT[new Date(d + "T12:00:00").getDay()];
};

export const calcVolume = (sets) =>
  sets.reduce((a, s) => a + ((+s.reps || 0) * (+s.weight || 0)), 0);

export const detectTrainType = (name) => {
  const n = (name || "").toUpperCase();
  if (n.includes("TREINO A") || n.includes("PULL")) return "A";
  if (n.includes("TREINO B") || n.includes("PUSH")) return "B";
  if ((n.includes("TREINO C") || n.includes("QUAD")) && !n.includes("UPPER")) return "C";
  if (n.includes("TREINO D") || n.includes("UPPER") || n.includes("SUPERIOR")) return "D";
  if (n.includes("TREINO E") || n.includes("POST") || n.includes("LOWER")) return "E";
  return null;
};
