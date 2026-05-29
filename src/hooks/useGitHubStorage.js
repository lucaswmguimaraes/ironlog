// src/hooks/useGitHubStorage.js
import { useCallback } from "react";

const REPO_OWNER = "lucaswmguimaraes";
const REPO_NAME = "ironlog";
const BRANCH = "main";

const shaKey = (profileId) => `ironlog_sha_${profileId}`;

export function useGitHubStorage() {
  const getHeaders = (pat) => ({
    Authorization: `token ${pat}`,
    "Content-Type": "application/json",
    Accept: "application/vnd.github.v3+json",
  });

  const loadFromGitHub = useCallback(async (profileId, pat) => {
    if (!pat) return null;
    try {
      const res = await fetch(
        `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/data/${profileId}.json?ref=${BRANCH}`,
        { headers: getHeaders(pat) }
      );
      if (res.status === 404) return [];
      if (!res.ok) return null;
      const json = await res.json();
      localStorage.setItem(shaKey(profileId), json.sha);
      return JSON.parse(atob(json.content.replace(/
/g, "")));
    } catch {
      return null;
    }
  }, []);

  const saveToGitHub = useCallback(async (profileId, sessions, pat) => {
    if (!pat) return false;
    try {
      const content = btoa(unescape(encodeURIComponent(JSON.stringify(sessions, null, 2))));
      const sha = localStorage.getItem(shaKey(profileId));
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
      if (!res.ok) return false;
      const json = await res.json();
      localStorage.setItem(shaKey(profileId), json.content.sha);
      return true;
    } catch {
      return false;
    }
  }, []);

  return { loadFromGitHub, saveToGitHub };
}
