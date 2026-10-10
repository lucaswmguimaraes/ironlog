// src/hooks/useSupabaseStorage.js
// Mesma interface do antigo useGitHubStorage ({ loadFile, saveFile }), agora
// gravando na tabela docs do Supabase. "file" = kind: session | cardio | meta.
// Cada save: lê o remoto, faz MERGE (useSyncedData) e envia só o que mudou.
import { useCallback, useRef } from "react";
import { supabase } from "../lib/supabase";
import { addLog } from "./useGitHubStorage";

const PAGE = 1000;

async function fetchKind(kind) {
  const rows = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase.from("docs").select("id,data,updated_at").eq("kind", kind).range(from, from + PAGE - 1);
    if (error) throw error;
    rows.push(...data);
    if (data.length < PAGE) break;
  }
  return rows;
}

export function useSupabaseStorage() {
  const queues = useRef({});

  const loadFile = useCallback(async (kind, token, fallback = []) => {
    if (!token) return null;
    try {
      const rows = await fetchKind(kind);
      addLog(`LOAD ${kind}: ok, ${rows.length} itens`);
      if (kind === "meta") return rows[0]?.data ?? fallback;
      return rows.map((r) => r.data);
    } catch (e) {
      addLog(`LOAD ${kind}: erro ${e.message}`);
      return null;
    }
  }, []);

  const doSave = useCallback(async (kind, local, merge, fallback) => {
    try {
      const rows = await fetchKind(kind);
      if (kind === "meta") {
        const remote = rows[0]?.data ?? fallback;
        const merged = merge(remote, local);
        if (merged && JSON.stringify(merged) !== JSON.stringify(remote)) {
          const { error } = await supabase.from("docs").upsert({ kind, id: "meta", data: merged, updated_at: merged.updatedAt || Date.now() });
          if (error) throw error;
        }
        addLog(`SAVE meta: ok`);
        return merged;
      }
      const remoteById = new Map(rows.map((r) => [r.id, r.data]));
      const merged = merge(rows.map((r) => r.data), local);
      const mergedIds = new Set(merged.map((x) => x.id));
      const changed = merged.filter((x) => JSON.stringify(x) !== JSON.stringify(remoteById.get(x.id)))
        .map((x) => ({ kind, id: x.id, data: x, updated_at: x.updatedAt || 0 }));
      for (let i = 0; i < changed.length; i += 200) {
        const { error } = await supabase.from("docs").upsert(changed.slice(i, i + 200));
        if (error) throw error;
      }
      const removed = rows.map((r) => r.id).filter((id) => !mergedIds.has(id));
      if (removed.length) {
        const { error } = await supabase.from("docs").delete().eq("kind", kind).in("id", removed);
        if (error) throw error;
      }
      addLog(`SAVE ${kind}: ok (${changed.length} alterados, ${removed.length} removidos, ${merged.length} total)`);
      return merged;
    } catch (e) {
      addLog(`SAVE ${kind}: erro ${e.message}`);
      return null;
    }
  }, []);

  const saveFile = useCallback((kind, token, local, merge, fallback = []) => {
    if (!token) return Promise.resolve(null);
    const prev = queues.current[kind] || Promise.resolve();
    const next = prev.catch(() => {}).then(() => doSave(kind, local, merge, fallback));
    queues.current[kind] = next;
    return next;
  }, [doSave]);

  return { loadFile, saveFile };
}
