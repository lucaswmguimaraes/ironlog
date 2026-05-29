// src/hooks/useGitHubStorage.js
import { useCallback } from "react";

const REPO_OWNER = "lucaswmguimaraes";
const REPO_NAME = "ironlog";
const BRANCH = "main";

const shaKey = (profileId) => `ironlog_sha_${profileId}`;
const logKey = "ironlog_sync_log";

function addLog(msg) {
  try {
    const logs = JSON.parse(localStorage.getItem(logKey) || "[]");
    logs.unshift(`${new Date().toISOString().slice(11,19)} ${msg}`);
    localStorage.setItem(logKey, JSON.stringify(logs.slice(0, 30)));
  } catch {}
}

function encodeContent(data) {
  const json = JSON.stringify(data, null, 2);
  const bytes = new TextEncoder().encode(json);
  let binary = "";
  bytes.forEach((b) => { binary += String.fromCharCode(b); });
  return btoa(binary);
}

function decodeContent(b64) {
  const binary = atob(b64.replace(/\n/g, ""));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return JSON.parse(new TextDecoder().decode(bytes));
}

export function useGitHubStorage() {
  const getHeaders = (pat) => ({
    Authorization: `token ${pat}`,
    "Content-Type": "application/json",
    Accept: "application/vnd.github.v3+json",
  });

  const loadFromGitHub = useCallback(async (profileId, pat) => {
    if (!pat) { addLog(`LOAD ${profileId}: sem PAT`); return null; }
    try {
      addLog(`LOAD ${profileId}: iniciando`);
      const res = await fetch(
        `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/data/${profileId}.json?ref=${BRANCH}`,
        { headers: getHeaders(pat) }
      );
      if (res.status === 404) { addLog(`LOAD ${profileId}: 404`); return []; }
      if (!res.ok) { addLog(`LOAD ${profileId}: erro HTTP ${res.status}`); return null; }
      const json = await res.json();
      localStorage.setItem(shaKey(profileId), json.sha);
      const data = decodeContent(json.content);
      addLog(`LOAD ${profileId}: ok, ${data.length} treinos, sha=${json.sha.slice(0,7)}`);
      return data;
    } catch (e) {
      addLog(`LOAD ${profileId}: exception ${e.message}`);
      return null;
    }
  }, []);

  const saveToGitHub = useCallback(async (profileId, sessions, pat) => {
    if (!pat) { addLog(`SAVE ${profileId}: sem PAT`); return false; }
    try {
      // Sempre busca o SHA mais recente do GitHub antes de salvar
      const headRes = await fetch(
        `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/data/${profileId}.json?ref=${BRANCH}`,
        { headers: getHeaders(pat) }
      );
      let sha = localStorage.getItem(shaKey(profileId));
      if (headRes.ok) {
        const headJson = await headRes.json();
        sha = headJson.sha;
        localStorage.setItem(shaKey(profileId), sha);
      }
      addLog(`SAVE ${profileId}: ${sessions.length} treinos, sha=${sha ? sha.slice(0,7) : "NENHUM"}`);
      const content = encodeContent(sessions);
      const body = {
        message: `chore: sync ${profileId} sessions`,
        content,
        branch: BRANCH,
        ...(sha ? { sha } : {}),
      };
      const res = await fetch(
        `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/data/${profileId}.json`,
        { method: "PUT", headers: getHeaders(pat), body: JSON.stringify(body) }
      );
      if (!res.ok) {
        const errBody = await res.text();
        addLog(`SAVE ${profileId}: ERRO ${res.status} — ${errBody.slice(0, 120)}`);
        return false;
      }
      const json = await res.json();
      localStorage.setItem(shaKey(profileId), json.content.sha);
      addLog(`SAVE ${profileId}: ok, novo sha=${json.content.sha.slice(0,7)}`);
      return true;
    } catch (e) {
      addLog(`SAVE ${profileId}: exception ${e.message}`);
      return false;
    }
  }, []);

  return { loadFromGitHub, saveToGitHub };
}
