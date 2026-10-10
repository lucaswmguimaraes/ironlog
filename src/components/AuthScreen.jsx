// src/components/AuthScreen.jsx
import { useState } from "react";
import { Mail, Lock, User, ArrowLeft, Loader2 } from "lucide-react";
import { C } from "../data/constants";
import { supabase, APP_URL } from "../lib/supabase";

const EMOJIS = ["⚡", "🌸", "🔥", "💪", "🦍", "🐺", "🦁", "🌙", "🍑", "🏋️"];
const COLORS = ["#f5a623", "#f06292", "#4fc3f7", "#81c784", "#ce93d8", "#ff7043"];

const ERR = {
  "Invalid login credentials": "E-mail ou senha incorretos.",
  "Email not confirmed": "Confirme seu e-mail antes de entrar — veja a caixa de entrada (e o spam).",
  "User already registered": "Já existe uma conta com este e-mail. Tente entrar ou recuperar a senha.",
  "Password should be at least 6 characters.": "A senha precisa ter pelo menos 6 caracteres.",
};
const tr = (m) => ERR[m] || (/sending confirmation|sending recovery|send email|smtp/i.test(m) ? "Não conseguimos enviar o e-mail agora. Avise o Lucas — é configuração do servidor, não algo que você fez." : null) || (/rate limit/i.test(m) ? "Muitas tentativas por e-mail agora. Aguarde alguns minutos e tente de novo." : m);

const field = { display: "flex", alignItems: "center", gap: 10, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: "0 14px", marginBottom: 10 };
const input = { flex: 1, background: "transparent", border: "none", outline: "none", color: C.text, fontSize: 16, padding: "14px 0", minWidth: 0 };
const primary = (on) => ({ width: "100%", padding: 15, borderRadius: 12, border: "none", background: on ? "linear-gradient(135deg,#ffb547,#f07d12)" : C.border, color: "#000", fontWeight: 700, fontSize: 15, cursor: on ? "pointer" : "default", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 });
const link = { background: "none", border: "none", color: C.accent, fontSize: 13, cursor: "pointer", padding: 6 };

export function AuthScreen({ recovery, onRecovered }) {
  const [mode, setMode] = useState(recovery ? "newpass" : "login"); // login | signup | forgot | newpass
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState(EMOJIS[0]);
  const [color, setColor] = useState(COLORS[0]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null); // { ok, text }

  const go = (m) => { setMode(m); setMsg(null); };
  const run = async (fn) => { setBusy(true); setMsg(null); try { await fn(); } catch (e) { setMsg({ ok: false, text: tr(e.message) }); } setBusy(false); };

  const login = () => run(async () => {
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: pass });
    if (error) throw error;
  });
  const signup = () => run(async () => {
    const { data, error } = await supabase.auth.signUp({ email: email.trim(), password: pass, options: { emailRedirectTo: APP_URL, data: { name: name.trim(), emoji, color } } });
    if (error) throw error;
    if (!data.session) setMsg({ ok: true, text: `Conta criada! Enviamos um link de confirmação para ${email.trim()}. Abra o e-mail (veja também o spam) e depois entre aqui.` });
  });
  const forgot = () => run(async () => {
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: APP_URL });
    if (error) throw error;
    setMsg({ ok: true, text: "Se existir uma conta com este e-mail, você vai receber um link para criar uma nova senha." });
  });
  const newpass = () => run(async () => {
    const { error } = await supabase.auth.updateUser({ password: pass });
    if (error) throw error;
    onRecovered && onRecovered();
  });

  const validEmail = /\S+@\S+\.\S+/.test(email);
  const can = { login: validEmail && pass.length >= 6, signup: validEmail && pass.length >= 6 && name.trim().length > 0, forgot: validEmail, newpass: pass.length >= 6 }[mode];
  const submit = { login, signup, forgot, newpass }[mode];

  return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", padding: "calc(24px + env(safe-area-inset-top)) 20px 24px" }}>
      <form className="fade" onSubmit={(e) => { e.preventDefault(); if (can && !busy) submit(); }} style={{ width: "100%", maxWidth: 400 }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <img src={`${import.meta.env.BASE_URL}icon.svg`} alt="" width="64" height="64" style={{ borderRadius: 16, marginBottom: 12 }} />
          <div style={{ fontSize: 24, fontWeight: 800, color: C.text, letterSpacing: ".5px" }}>IRON LOG</div>
          <div style={{ fontSize: 13, color: C.sub, marginTop: 2 }}>
            {{ login: "Entre para ver seus treinos", signup: "Crie sua conta", forgot: "Recuperar senha", newpass: "Defina sua nova senha" }[mode]}
          </div>
        </div>

        {(mode === "forgot" || mode === "signup") && (
          <button type="button" onClick={() => go("login")} style={{ ...link, color: C.sub, display: "flex", alignItems: "center", gap: 4, marginBottom: 8, paddingLeft: 0 }}><ArrowLeft size={14} /> Voltar</button>
        )}

        {mode === "signup" && (<>
          <label style={field}><User size={18} color={C.sub} /><input style={input} placeholder="Seu nome" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" /></label>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
            {EMOJIS.map((e) => <button type="button" key={e} onClick={() => setEmoji(e)} style={{ width: 38, height: 38, borderRadius: 10, fontSize: 18, cursor: "pointer", border: `1px solid ${emoji === e ? color : C.border}`, background: emoji === e ? `${color}22` : C.surface }}>{e}</button>)}
          </div>
          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            {COLORS.map((c) => <button type="button" key={c} aria-label={c} onClick={() => setColor(c)} style={{ width: 28, height: 28, borderRadius: "50%", cursor: "pointer", background: c, border: color === c ? "3px solid #fff" : "3px solid transparent" }} />)}
          </div>
        </>)}

        {mode !== "newpass" && (
          <label style={field}><Mail size={18} color={C.sub} /><input style={input} type="email" inputMode="email" autoCapitalize="none" placeholder="E-mail" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" /></label>
        )}
        {mode !== "forgot" && (
          <label style={field}><Lock size={18} color={C.sub} /><input style={input} type="password" placeholder={mode === "newpass" ? "Nova senha (mín. 6)" : "Senha (mín. 6)"} value={pass} onChange={(e) => setPass(e.target.value)} autoComplete={mode === "login" ? "current-password" : "new-password"} /></label>
        )}

        {msg && <div style={{ fontSize: 13, lineHeight: 1.5, color: msg.ok ? C.success : "#ff6677", background: msg.ok ? "rgba(46,204,113,.08)" : "rgba(255,68,85,.08)", border: `1px solid ${msg.ok ? "rgba(46,204,113,.3)" : "rgba(255,68,85,.3)"}`, borderRadius: 10, padding: "10px 12px", marginBottom: 12 }}>{msg.text}</div>}

        <button type="submit" disabled={!can || busy} className="press" style={primary(can && !busy)}>
          {busy && <Loader2 size={16} className="spin" />}
          {{ login: "Entrar", signup: "Criar conta", forgot: "Enviar link de recuperação", newpass: "Salvar nova senha" }[mode]}
        </button>

        {mode === "login" && (
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 14 }}>
            <button type="button" style={link} onClick={() => go("forgot")}>Esqueci minha senha</button>
            <button type="button" style={{ ...link, fontWeight: 700 }} onClick={() => go("signup")}>Criar conta</button>
          </div>
        )}
      </form>
    </div>
  );
}
