// src/data/volumeLandmarks.js
// Valores base para intermediário (séries semanais — hard sets próximos à falha)
// Fonte: RP Strength / Mike Israetel — Training Volume Landmarks for Muscle Growth
// Schoenfeld et al. (2017) — Journal of Sports Sciences
export const VOLUME_LANDMARKS = {
  "Peito":               { mev: 10, mavMin: 14, mavMax: 18, mrv: 22 },
  "Costas":              { mev: 10, mavMin: 14, mavMax: 20, mrv: 25 },
  "Ombros":              { mev: 8,  mavMin: 12, mavMax: 20, mrv: 24 },
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

export function classifyVolume(weeklySets, muscleGroup, profileConfig) {
  const l = getAdjustedLandmarks(muscleGroup, profileConfig);
  if (!l) return "in_mav";
  if (weeklySets < l.mev) return "below_mev";
  if (weeklySets < l.mavMin) return "below_mav";
  if (weeklySets <= l.mrv) return "in_mav";
  return "above_mrv";
}
