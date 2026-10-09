// src/data/cardio.js
// Estimativa de gasto calórico de cardio/esportes.
//
// Método 1 — MET (padrão): Compendium of Physical Activities 2024
//   Herrmann SD et al. (2024) J Sport Health Sci 13(1):6-12 — pacompendium.com
//   kcal brutas = MET × 3,5 ml/kg/min × peso × min ÷ 200
// Correção individual (Kozey et al. 2010, MSSE; Byrne et al. 2005, MSSE):
//   o MET padrão assume RMR de 3,5 ml/kg/min, o que superestima o repouso de muita
//   gente. Usamos o RMR individual (Mifflin-St Jeor, 1990) para separar as kcal
//   "ativas" (acima do repouso, comparável às "calorias ativas" do Apple Watch).
// Método 2 — Frequência cardíaca média (quando informada):
//   Keytel LR et al. (2005) J Sports Sci 23(3):289-297 — equação por sexo, idade,
//   peso e FC. Mais individual que MET em esforço contínuo (FC ~90–180 bpm).
// Método 3 — Valor do relógio: se informado, é exibido como medição do dispositivo.

export const INTENSITIES = [
  { key: "light", label: "Leve" },
  { key: "moderate", label: "Moderada" },
  { key: "vigorous", label: "Vigorosa" },
];

// MET por intensidade [leve, moderada, vigorosa] — valores do Compendium 2024
// (atividade mais próxima; esportes recreativos ≈ aproximação)
export const CARDIO_ACTIVITIES = [
  { key: "caminhada", label: "Caminhada", icon: "🚶", met: [3.0, 4.3, 5.0], hint: "≈4 / 5,5 / 6,5 km/h" },
  { key: "esteira_inclinada", label: "Esteira inclinada", icon: "⛰️", met: [5.3, 6.0, 8.0], hint: "caminhada em subida 5–15%" },
  { key: "corrida", label: "Corrida", icon: "🏃", met: [8.3, 9.8, 11.0], hint: "≈8 / 9,7 / 11,3 km/h" },
  { key: "eliptico", label: "Elíptico", icon: "🌀", met: [4.5, 5.0, 7.0], hint: "" },
  { key: "escada", label: "Escada (simulador)", icon: "🪜", met: [6.0, 9.0, 10.5], hint: "stair climber / escada rolante" },
  { key: "bike", label: "Bike ergométrica", icon: "🚴", met: [3.5, 6.8, 8.8], hint: "≈50–100 / 100–160 / 160–200 W" },
  { key: "spinning", label: "Spinning / bike indoor", icon: "🔥", met: [6.8, 8.5, 10.0], hint: "aula" },
  { key: "ciclismo", label: "Ciclismo (rua)", icon: "🚵", met: [4.0, 8.0, 10.0], hint: "<16 / 19–22 / 22–25 km/h" },
  { key: "remo", label: "Remo ergômetro", icon: "🚣", met: [4.8, 7.0, 8.5], hint: "" },
  { key: "natacao", label: "Natação", icon: "🏊", met: [5.8, 8.3, 9.8], hint: "crawl leve / moderado / forte" },
  { key: "corda", label: "Pular corda", icon: "🪢", met: [8.8, 11.8, 12.3], hint: "" },
  { key: "hiit", label: "HIIT / Funcional", icon: "⚡", met: [3.8, 5.0, 8.0], hint: "circuito" },
  { key: "futebol", label: "Futebol", icon: "⚽", met: [5.0, 7.0, 10.0], hint: "recreativo → competitivo" },
  { key: "beach_tennis", label: "Beach tennis", icon: "🏖️", met: [5.0, 6.5, 8.0], hint: "aprox. tênis" },
  { key: "tenis", label: "Tênis", icon: "🎾", met: [4.5, 6.8, 8.0], hint: "duplas → simples" },
  { key: "volei", label: "Vôlei", icon: "🏐", met: [3.0, 4.0, 8.0], hint: "quadra → praia" },
  { key: "basquete", label: "Basquete", icon: "🏀", met: [4.5, 6.5, 8.0], hint: "" },
  { key: "lutas", label: "Lutas / Muay thai", icon: "🥊", met: [5.5, 7.3, 10.3], hint: "" },
  { key: "danca", label: "Dança", icon: "💃", met: [4.5, 5.5, 7.8], hint: "" },
  { key: "trilha", label: "Trilha", icon: "🥾", met: [5.3, 6.0, 7.8], hint: "" },
  { key: "yoga", label: "Yoga", icon: "🧘", met: [2.5, 3.0, 4.0], hint: "" },
  { key: "pilates", label: "Pilates", icon: "🤸", met: [2.8, 3.0, 3.8], hint: "" },
  { key: "outro", label: "Outro", icon: "✨", met: [3.5, 5.0, 8.0], hint: "" },
];

export const findActivity = (key) => CARDIO_ACTIVITIES.find((a) => a.key === key) || CARDIO_ACTIVITIES[CARDIO_ACTIVITIES.length - 1];

export function ageFromBirthYear(birthYear, now = new Date()) {
  return birthYear ? now.getFullYear() - birthYear : null;
}

// RMR (kcal/dia) — Mifflin-St Jeor (1990), Am J Clin Nutr 51:241-247
export function restingKcalPerDay({ weightKg, heightCm, age, sex }) {
  if (!weightKg || !heightCm || !age || !sex) return null;
  return 10 * weightKg + 6.25 * heightCm - 5 * age + (sex === "female" ? -161 : 5);
}

/**
 * body: { weightKg, heightCm, birthYear, sex }
 * entry: { activity, intensity, durationMin, avgHr?, watchKcal? }
 * Retorna { gross, active, method, met, missing[] } — kcal arredondadas
 */
export function estimateCardioKcal(entry, body = {}) {
  const missing = [];
  const w = +body.weightKg || 0;
  const min = +entry.durationMin || 0;
  const age = ageFromBirthYear(+body.birthYear);
  if (!w) missing.push("peso");
  if (!min) return { gross: null, active: null, method: null, missing: ["duração"] };
  if (!w) return { gross: null, active: null, method: null, missing };

  const act = findActivity(entry.activity);
  const idx = Math.max(0, INTENSITIES.findIndex((i) => i.key === (entry.intensity || "moderate")));
  const met = act.met[idx];
  const rmrDay = restingKcalPerDay({ weightKg: w, heightCm: +body.heightCm, age, sex: body.sex });
  if (!rmrDay) {
    if (!body.heightCm) missing.push("altura");
    if (!age) missing.push("ano de nascimento");
    if (!body.sex) missing.push("sexo");
  }
  // Sem RMR individual, assume 1 MET = 3,5 ml/kg/min (repouso padrão do Compendium)
  const restPerMin = rmrDay ? rmrDay / 1440 : (3.5 * w) / 200;

  let grossPerMin = (met * 3.5 * w) / 200;
  let method = "met";
  const hr = +entry.avgHr || 0;
  if (hr >= 90 && hr <= 190 && age && body.sex) {
    const kj = body.sex === "female"
      ? -20.4022 + 0.4472 * hr - 0.1263 * w + 0.074 * age
      : -55.0969 + 0.6309 * hr + 0.1988 * w + 0.2017 * age;
    const kcal = kj / 4.184;
    if (kcal > restPerMin) { grossPerMin = kcal; method = "hr"; }
  }
  const gross = grossPerMin * min;
  const active = Math.max(0, gross - restPerMin * min);
  const watch = +entry.watchKcal || 0;
  return {
    gross: Math.round(gross),
    active: Math.round(active),
    watch: watch || null,
    method: watch ? "watch" : method,
    estimateMethod: method,
    met,
    missing,
  };
}

export const METHOD_LABEL = {
  met: "MET (Compendium 2024) + RMR individual",
  hr: "Frequência cardíaca (Keytel 2005)",
  watch: "Valor do relógio",
};
