// src/components/GitHubSetup.jsx
import { useState } from "react";
import { C } from "../data/constants";

export function GitHubSetup({ profileId, profileName, onSave, onSkip }) {
  const [pat, setPat] = useState("");
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState(null);

  const handleTest = async () => {
    setTesting(true);
    setError(null);
    try {
      // Verificar se o token é válido consultando a API do usuário autenticado
      const res = await fetch(
        "https://api.github.com/user",
        { headers: { Authorization: `token ${pat.trim()}` } }
      );
      if (res.ok) { onSave(pat.trim()); }
      else { setError("Token inválido. Verifique se copiou corretamente e tente novamente."); }
    } catch {
      setError("Erro de conexão. Verifique sua internet e tente novamente.");
    }
    setTesting(false);
  };

  return (
    <div style={{ padding: 24, maxWidth: 480, margin: "0 auto" }}>
      <div style={{ fontSize: 28, textAlign: "center", marginBottom: 8 }}>🔐</div>
      <h2 style={{ color: C.text, textAlign: "center", marginBottom: 4, fontSize: 18 }}>
        Backup automático no GitHub
      </h2>
      <p style={{ color: C.sub, fontSize: 13, textAlign: "center", marginBottom: 20 }}>
        Configure uma vez para que seus treinos fiquem salvos com segurança no repositório, acessíveis em qualquer dispositivo.
      </p>
      <div style={{ background: C.surface, borderRadius: 12, padding: 16, marginBottom: 16 }}>
        <p style={{ color: C.text, fontSize: 13, marginBottom: 8, fontWeight: 600 }}>Como gerar o token:</p>
        <ol style={{ color: C.sub, fontSize: 12, paddingLeft: 18, lineHeight: 1.8 }}>
          <li>Acesse <strong style={{ color: C.accent }}>github.com → Settings → Developer settings</strong></li>
          <li>Clique em <strong style={{ color: C.accent }}>Personal access tokens → Tokens (classic)</strong></li>
          <li>Clique em <strong style={{ color: C.accent }}>Generate new token (classic)</strong></li>
          <li>Selecione o escopo <strong style={{ color: C.accent }}>repo</strong></li>
          <li>Copie o token gerado e cole abaixo</li>
        </ol>
      </div>
      <input
        type="password" placeholder="ghp_..." value={pat}
        onChange={(e) => setPat(e.target.value)}
        style={{
          width: "100%", padding: "12px 14px", borderRadius: 10, boxSizing: "border-box",
          background: C.surfaceHigh, border: `1px solid ${C.border}`,
          color: C.text, fontSize: 14, marginBottom: 8, outline: "none",
        }}
      />
      {error && <div style={{ color: C.error, fontSize: 12, marginBottom: 8 }}>{error}</div>}
      <button
        onClick={handleTest} disabled={pat.trim().length < 10 || testing}
        style={{
          width: "100%", padding: 14, borderRadius: 10, border: "none",
          background: pat.trim().length >= 10 ? C.accent : C.surfaceHigh,
          color: "#000", fontWeight: 700, fontSize: 15, cursor: "pointer",
          marginBottom: 10, opacity: testing ? 0.7 : 1,
        }}
      >
        {testing ? "Verificando..." : "Salvar e ativar backup"}
      </button>
      <button
        onClick={onSkip}
        style={{
          width: "100%", padding: 12, borderRadius: 10, border: `1px solid ${C.border}`,
          background: "transparent", color: C.sub, fontSize: 13, cursor: "pointer",
        }}
      >
        Pular por agora (dados ficam só no navegador)
      </button>
    </div>
  );
}
