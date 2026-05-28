// src/hooks/useProfile.js
import { useState, useCallback } from "react";

const PAT_KEY = (profileId) => `ironlog_pat_${profileId}`;
const CONFIG_KEY = (profileId) => `ironlog_config_${profileId}`;

export function useProfile() {
  const [profile, setProfile] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem("ironlog_profile") || "null"); }
    catch { return null; }
  });

  const selectProfile = useCallback((p) => {
    sessionStorage.setItem("ironlog_profile", JSON.stringify(p));
    setProfile(p);
  }, []);

  const getPAT = useCallback((profileId) => localStorage.getItem(PAT_KEY(profileId)) || null, []);
  const setPAT = useCallback((profileId, pat) => localStorage.setItem(PAT_KEY(profileId), pat), []);

  const getConfig = useCallback((profileId) => {
    try {
      const stored = localStorage.getItem(CONFIG_KEY(profileId));
      if (stored) return JSON.parse(stored);
    } catch {}
    return {
      experienceLevel: null, sex: null, goal: null,
      focalGroups: [], trainingDaysPerWeek: null, completedOnboarding: false,
    };
  }, []);

  const saveConfig = useCallback((profileId, config) => {
    localStorage.setItem(CONFIG_KEY(profileId), JSON.stringify(config));
  }, []);

  return { profile, selectProfile, getPAT, setPAT, getConfig, saveConfig };
}
