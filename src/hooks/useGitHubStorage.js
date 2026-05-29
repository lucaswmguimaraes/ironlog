// src/hooks/useGitHubStorage.js
import { useCallback, useRef } from "react";

const REPO_OWNER = "lucaswmguimaraes";
const REPO_NAME = "ironlog";
const BRANCH = "main";

const logKey = "ironlog_sync_log";

function addLog(msg) {
  try {
    const logs = JSON.parse(localStorage.getItem(logKey) || "[]");
    const now = new Date(); const h = String(now.getHours()).padStart(2,'0'); const m = String(now.getMinutes()).padStart(2,'0'); const s = String(now.getSeconds()).padStart(2,'0'); logs.unshift(`${h}:${m}:${s} ${msg}`);
    localStorage.setItem(logKey, JSON.stringify(logs.slice(0, 50)));
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
  // savingRef: impede dois saves simultâneos. Se um save já está em andamento,
  // o próximo aguarda ele terminar antes de começar.
  const savingRef = useRef(false);
  const pendingRef = useRef(null); // última sessão pendente enquanto save está em curso

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
        `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/data/${profileId}.json?ref=${BRANCH}&t=${Date.now()}`,
        { headers: getHeaders(pat), cache: "no-store" }
      );
      if (res.status === 404) { addLog(`LOAD ${profileId}: 404`); return []; }
      if (!res.ok) { addLog(`LOAD ${profileId}: erro HTTP ${res.status}`); return null; }
      const json = await res.json();
      const data = decodeContent(json.content);
      addLog(`LOAD ${profileId}: ok, ${data.length} treinos, sha=${json.sha.slice(0,7)}`);
      return data;
    } catch (e) {
      addLog(`LOAD ${profileId}: exception ${e.message}`);
      return null;
    }
  }, []);

  const doSave = useCallback(async (profileId, sessions, pat) => {
    try {
      // Sempre busca SHA atual do GitHub — fonte da verdade
      addLog(`SAVE ${profileId}: ${sessions.length} treinos, buscando sha atual`);
      const headRes = await fetch(
        `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/data/${profileId}.json?ref=${BRANCH}&t=${Date.now()}`,
        { headers: getHeaders(pat), cache: "no-store" }
      );
      let sha = null;
      if (headRes.ok) {
        const headJson = await headRes.json();
        sha = headJson.sha;
      }
      addLog(`SAVE ${profileId}: sha atual=${sha ? sha.slice(0,7) : "NENHUM (arquivo novo)"}`);

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
      addLog(`SAVE ${profileId}: ok, novo sha=${json.content.sha.slice(0,7)}`);
      return true;
    } catch (e) {
      addLog(`SAVE ${profileId}: exception ${e.message}`);
      return false;
    }
  }, []);

  const saveToGitHub = useCallback(async (profileId, sessions, pat) => {
    if (!pat) { addLog(`SAVE ${profileId}: sem PAT`); return false; }

    // Se já há um save em andamento, registra como pendente e aguarda
    if (savingRef.current) {
      addLog(`SAVE ${profileId}: save em andamento, registrando como pendente`);
      pendingRef.current = { profileId, sessions, pat };
      return false;
    }

    savingRef.current = true;
    pendingRef.current = null;

    const result = await doSave(profileId, sessions, pat);
    savingRef.current = false;

    // Se chegou uma requisição pendente durante o save, executa agora
    if (pendingRef.current) {
      const p = pendingRef.current;
      pendingRef.current = null;
      addLog(`SAVE ${p.profileId}: executando save pendente (${p.sessions.length} treinos)`);
      saveToGitHub(p.profileId, p.sessions, p.pat);
    }

    return result;
  }, [doSave]);

  return { loadFromGitHub, saveToGitHub };
}
