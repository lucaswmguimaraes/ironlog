// src/lib/supabase.js
// Chave PUBLICÁVEL (feita para ficar no navegador). Quem protege os dados são
// as políticas RLS da tabela docs: cada usuário só lê/grava as próprias linhas.
import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  "https://vgcakvxtwlcthqnhckvw.supabase.co",
  "sb_publishable_TSpuafU4mtzp-rNSWCIEbQ_2u0U_B3P",
  { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } }
);

export const APP_URL = "https://lucaswmguimaraes.github.io/ironlog/";
