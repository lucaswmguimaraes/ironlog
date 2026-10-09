// src/hooks/useGitHubStorage.js
// Leitura/escrita de arquivos JSON em data/ via GitHub Contents API.
// Cada save busca o conteúdo remoto atual e faz MERGE antes de gravar —
// nunca sobrescreve às cegas o que está no GitHub.
import { useCallback, useRef } from "react";

const REPO_OWNER = "lucaswmguimaraes";
const REPO_NAME = "ironlog";
const BRANCH = "main";

const logKey = "ironlog_sync_log";

export function addLog(msg) {
  try {
    const logs = JSON.parse(localStorage.getItem(logKey) || "[]");
    const now = new Date(); const h = String(now.getHours()).padStart(2,'0'); const m = String(now.getMinutes()).padStart(2,'0'); const s = String(now.getSeconds()).padStart(2,'0'); logs.unshift(`${h}:${m}:${s} ${msg}`);
    localStorage.setItem(logKey, JSON.stringify(logs.slice(0, 80)));
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

const fileUrl = (file) => `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/data/${file}`;

export function useGitHubStorage() {
  // Uma fila por arquivo: saves do mesmo arquivo nunca rodam em paralelo.
  const queues = useRef({});

  const getHeaders = (pat) => ({
    Authorization: `token ${pat}`,
    "Content-Type": "application/json",
    Accept: "application/vnd.github.v3+json",
  });

  // Retorna { data, sha } | { data: fallback, sha: null } (404) | null (erro)
  const fetchFile = useCallback(async (file, pat, fallback) => {
    const res = await fetch(`${fileUrl(file)}?ref=${BRANCH}&t=${Date.now()}`, { headers: getHeaders(pat), cache: "no-store" });
    if (res.status === 404) return { data: fallback, sha: null };
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    // Arquivos > 1MB vêm sem content na Contents API — usa o download_url
    if (!json.content && json.download_url) {
      const raw = await fetch(`${json.download_url}?t=${Date.now()}`, { headers: getHeaders(pat), cache: "no-store" });
      return { data: await raw.json(), sha: json.sha };
    }
    return { data: decodeContent(json.content), sha: json.sha };
  }, []);

  const loadFile = useCallback(async (file, pat, fallback = []) => {
    if (!pat) { addLog(`LOAD ${file}: sem PAT`); return null; }
    try {
      const r = await fetchFile(file, pat, fallback);
      addLog(`LOAD ${file}: ok${Array.isArray(r.data) ? `, ${r.data.length} itens` : ""}`);
      return r.data;
    } catch (e) {
      addLog(`LOAD ${file}: erro ${e.message}`);
      return null;
    }
  }, [fetchFile]);

  // merge(remote, local) => conteúdo final. Retorna o conteúdo gravado ou null.
  const doSave = useCallback(async (file, pat, local, merge, fallback) => {
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const remote = await fetchFile(file, pat, fallback);
        const merged = merge(remote.data, local);
        const body = {
          message: `chore: sync ${file.replace(".json", "")}`,
          content: encodeContent(merged),
          branch: BRANCH,
          ...(remote.sha ? { sha: remote.sha } : {}),
        };
        const res = await fetch(fileUrl(file), { method: "PUT", headers: getHeaders(pat), body: JSON.stringify(body) });
        if (res.ok) {
          addLog(`SAVE ${file}: ok${Array.isArray(merged) ? ` (${merged.length} itens)` : ""}`);
          return merged;
        }
        const errBody = await res.text();
        addLog(`SAVE ${file}: tentativa ${attempt} HTTP ${res.status} ${errBody.slice(0, 80)}`);
        // 409/422 = sha mudou entre o GET e o PUT → tenta de novo com merge atualizado
        if (res.status !== 409 && res.status !== 422) return null;
      } catch (e) {
        addLog(`SAVE ${file}: tentativa ${attempt} exception ${e.message}`);
        return null;
      }
    }
    return null;
  }, [fetchFile]);

  const saveFile = useCallback((file, pat, local, merge, fallback = []) => {
    if (!pat) return Promise.resolve(null);
    const prev = queues.current[file] || Promise.resolve();
    const next = prev.catch(() => {}).then(() => doSave(file, pat, local, merge, fallback));
    queues.current[file] = next;
    return next;
  }, [doSave]);

  return { loadFile, saveFile };
}
