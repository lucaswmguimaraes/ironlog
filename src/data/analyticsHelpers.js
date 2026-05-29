// src/data/analyticsHelpers.js
import { calcVolume } from "./constants";

export function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

export function sessionsInRange(sessions, fromDate, toDate) {
  return sessions.filter((s) => s.date >= fromDate && s.date <= toDate);
}

export function weeklySetsByMuscle(sessions) {
  const result = {};
  sessions.forEach((s) =>
    s.exercises.forEach((e) => {
      if (!result[e.category]) result[e.category] = 0;
      result[e.category] += e.sets.length;
    })
  );
  return result;
}

export function totalVolume(sessions) {
  return sessions.reduce(
    (acc, s) => acc + s.exercises.reduce((a, e) => a + calcVolume(e.sets), 0),
    0
  );
}

export function volumeByMuscle(sessions) {
  const result = {};
  sessions.forEach((s) =>
    s.exercises.forEach((e) => {
      if (!result[e.category]) result[e.category] = 0;
      result[e.category] += calcVolume(e.sets);
    })
  );
  return result;
}

export function deltaPct(current, previous) {
  if (!previous || previous === 0) return null;
  return ((current - previous) / previous) * 100;
}

/**
 * Tendência de progressão de carga para um exercício.
 * Progressão saudável para naturais: 5-10% por mesociclo (4-6 semanas).
 * Fonte: Haff & Triplett (2015) — NSCA; Fabrício Pacholok; Caio Bottura
 */
export function exerciseProgressionTrend(exerciseName, sessions, weeksBack = 8) {
  const cutoff = daysAgo(weeksBack * 7);
  const relevant = sessions
    .filter((s) => s.date >= cutoff)
    .flatMap((s) =>
      s.exercises
        .filter((e) => e.name === exerciseName)
        .map((e) => ({
          date: s.date,
          avgWeight:
            e.sets.length > 0
              ? e.sets.reduce((a, set) => a + (parseFloat(set.weight) || 0), 0) / e.sets.length
              : 0,
        }))
    )
    .sort((a, b) => a.date.localeCompare(b.date));

  if (relevant.length < 2) return { trend: "stagnant", pctChange: 0, dataPoints: relevant.length };

  const first = relevant[0].avgWeight;
  const last = relevant[relevant.length - 1].avgWeight;
  if (first === 0) return { trend: "stagnant", pctChange: 0, dataPoints: relevant.length };

  const pctChange = ((last - first) / first) * 100;
  let trend;
  if (pctChange >= 5) trend = "progressing";
  else if (pctChange >= 1) trend = "slow";
  else if (pctChange >= -1) trend = "stagnant";
  else trend = "regressing";

  return { trend, pctChange: Math.round(pctChange * 10) / 10, dataPoints: relevant.length };
}

export function topExercisesTrends(sessions, topN = 8) {
  const freq = {};
  sessions.forEach((s) =>
    s.exercises.forEach((e) => { freq[e.name] = (freq[e.name] || 0) + 1; })
  );
  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([name, count]) => ({
      name, count, ...exerciseProgressionTrend(name, sessions, 8),
    }));
}

/**
 * Quantas sessões consecutivas um exercício aparece como 1º ou 2º no tipo de treino.
 * Gatilho de periodização: 8 sessões.
 * Fonte: Fonseca et al. (2014) — Journal of Strength and Conditioning Research
 */
export function weeksAsMainExercise(exerciseName, trainType, sessions) {
  const relevant = sessions
    .filter((s) => (s.trainType || "") === trainType)
    .sort((a, b) => b.date.localeCompare(a.date));
  let count = 0;
  for (const s of relevant) {
    const idx = s.exercises.findIndex((e) => e.name === exerciseName);
    if (idx === 0 || idx === 1) count++;
    else break;
  }
  return count;
}
