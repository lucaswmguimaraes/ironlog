// src/hooks/useSyncedData.js
// Estado local (localStorage) + sincronização com GitHub à prova de perda:
//  - mudanças do usuário marcam "dirty" no localStorage (sobrevive a fechar o app)
//  - o load do GitHub faz MERGE com mudanças pendentes, nunca as descarta
//  - saves que falham ficam pendentes e são reenviados (online / app volta / a cada 20s)
//  - exclusões viram "tombstones" para o merge não ressuscitar o item
import { useState, useEffect, useRef, useCallback } from "react";
import { addLog } from "./useGitHubStorage";

const ts = (x) => (x && x.updatedAt) || 0;

export function mergeById(remote, local, tombstones = []) {
  const tomb = new Set(tombstones);
  const byId = new Map();
  (Array.isArray(remote) ? remote : []).forEach((r) => { if (!tomb.has(r.id)) byId.set(r.id, r); });
  (Array.isArray(local) ? local : []).forEach((l) => {
    if (tomb.has(l.id)) return;
    const r = byId.get(l.id);
    if (!r || ts(l) >= ts(r)) byId.set(l.id, l);
  });
  return [...byId.values()];
}

export function mergeObject(remote, local) {
  if (!remote) return local;
  if (!local) return remote;
  return ts(local) >= ts(remote) ? local : remote;
}

const read = (k, fb) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : fb; } catch { return fb; } };
const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };

/**
 * kind: "array" (itens com id) | "object" (documento único com updatedAt)
 */
export function useSyncedData({ profileId, pat, file, lsKey, kind = "array", loadFile, saveFile }) {
  const fallback = kind === "array" ? [] : null;
  const dirtyKey = `${lsKey}__dirty`;
  const tombKey = `${lsKey}__tomb`;

  const [data, setData] = useState(() => (profileId ? read(lsKey, fallback) : fallback));
  const [status, setStatus] = useState("idle"); // idle | saving | saved | pending | error | offline
  const [ready, setReady] = useState(false); // 1ª carga do servidor concluída (ou impossível)
  const version = useRef(0);
  const timer = useRef(null);
  const dataRef = useRef(data);
  dataRef.current = data;

  const merge = useCallback((remote, local) => (
    kind === "array" ? mergeById(remote, local, read(tombKey, [])) : mergeObject(remote, local)
  ), [kind, tombKey]);

  // Persistência local: SEMPRE junto do setData (nunca via efeito — na troca de
  // perfil um efeito gravaria o estado do perfil anterior na chave do novo).
  const setBoth = useCallback((v) => { write(lsKey, v); setData(v); }, [lsKey]);

  const save = useCallback(async () => {
    if (!profileId || !pat) { setStatus(pat ? "idle" : "offline"); return; }
    if (!read(dirtyKey, false)) return;
    const v = version.current;
    const tombs = read(tombKey, []);
    setStatus("saving");
    const result = await saveFile(file, pat, dataRef.current, merge, fallback);
    if (result === null) { setStatus("error"); addLog(`SYNC ${file}: falhou, mantido como pendente`); return; }
    if (version.current === v) {
      write(dirtyKey, false);
      write(tombKey, read(tombKey, []).filter((id) => !tombs.includes(id)));
      setBoth(result); // traz itens que só existiam no remoto
      setStatus("saved");
    } else {
      setStatus("pending"); // houve mudança durante o save; outro save já foi agendado
    }
  }, [profileId, pat, file, merge, saveFile, dirtyKey, tombKey, setBoth]);

  const schedule = useCallback((ms = 1500) => {
    clearTimeout(timer.current);
    setStatus("pending");
    timer.current = setTimeout(save, ms);
  }, [save]);

  // Mudança feita pelo usuário
  const update = useCallback((fn, { deletedIds = [] } = {}) => {
    version.current++;
    write(dirtyKey, true);
    if (deletedIds.length) write(tombKey, [...new Set([...read(tombKey, []), ...deletedIds])]);
    setData((prev) => {
      const next = fn(prev);
      write(lsKey, next);
      return next;
    });
    schedule();
  }, [dirtyKey, tombKey, lsKey, schedule]);

  // Troca de perfil: recarrega local e depois GitHub (com merge)
  useEffect(() => {
    if (!profileId) return;
    setData(read(lsKey, fallback));
    setReady(false);
    if (!pat) { setStatus("offline"); setReady(true); return; }
    let cancelled = false;
    const firstRunKey = `${lsKey}__synced_once`;
    loadFile(file, pat, fallback).then((remote) => {
      if (cancelled) return;
      setReady(true);
      if (remote === null) { setStatus(read(dirtyKey, false) ? "error" : "idle"); return; }
      const local = read(lsKey, fallback);
      const hasLocal = kind === "array" ? local.length > 0 : !!local;
      // 1ª vez com esta versão: trata dados locais como pendentes (não perde nada que nunca subiu)
      const dirty = read(dirtyKey, false) || (!read(firstRunKey, false) && hasLocal);
      write(firstRunKey, true);
      if (dirty) {
        write(dirtyKey, true);
        setBoth(merge(remote, local));
        schedule(500);
      } else {
        setBoth(remote ?? fallback);
        setStatus("saved");
      }
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileId, pat, file]);

  // Reenvio automático de pendências
  useEffect(() => {
    if (!profileId) return;
    const retry = () => { if (read(dirtyKey, false)) save(); };
    const onVis = () => { if (document.visibilityState === "visible") retry(); else { clearTimeout(timer.current); retry(); } };
    window.addEventListener("online", retry);
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("pagehide", retry);
    const iv = setInterval(() => { if (read(dirtyKey, false) && status !== "saving") retry(); }, 20000);
    return () => {
      window.removeEventListener("online", retry);
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("pagehide", retry);
      clearInterval(iv);
    };
  }, [profileId, save, dirtyKey, status]);

  return { data, update, status, ready, retry: save };
}
