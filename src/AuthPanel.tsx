import { useEffect, useState, type FormEvent } from "react";
import { isSupabaseConfigured, supabase } from "./supabaseClient";

export type AuthRole = "representante" | "marceneiro";
export type AuthUser = {
  id: string;
  email?: string | null;
  displayName?: string | null;
  roles: AuthRole[];
  profileReady: boolean;
};

async function loadUserProfile(user: { id: string; email?: string | null }): Promise<AuthUser> {
  if (!supabase) return { id: user.id, email: user.email, roles: [], profileReady: false };
  const profileResult = await supabase.from("profiles").select("display_name").eq("id", user.id).maybeSingle();
  const rolesResult = await supabase.from("profile_roles").select("role").eq("profile_id", user.id);
  const roles = (rolesResult.data ?? [])
    .map((row) => row.role)
    .filter((role): role is AuthRole => role === "representante" || role === "marceneiro");
  return {
    id: user.id,
    email: user.email,
    displayName: profileResult.data?.display_name ?? null,
    roles,
    profileReady: !profileResult.error && Boolean(profileResult.data),
  };
}

export function AuthPanel({ onUserChange }: { onUserChange?: (user: AuthUser | null) => void }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!supabase) return undefined;
    let active = true;
    void supabase.auth.getUser().then(async ({ data }) => {
      if (active) {
        const nextUser = data.user ? await loadUserProfile(data.user) : null;
        setUser(nextUser);
        onUserChange?.(nextUser);
      }
    });
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) {
        setUser(null);
        onUserChange?.(null);
        return;
      }
      void loadUserProfile(session.user).then((nextUser) => {
        setUser(nextUser);
        onUserChange?.(nextUser);
      });
    });
    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, [onUserChange]);

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) return;
    setBusy(true);
    setMessage(null);
    const result = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (result.error) {
      setMessage("Não foi possível entrar. Confira o e-mail e a senha.");
      return;
    }
    setPassword("");
    setMessage("Sessão iniciada. O rascunho continua local até a sincronização explícita.");
  }

  async function signOut() {
    if (!supabase) return;
    setBusy(true);
    await supabase.auth.signOut();
    setBusy(false);
    setMessage("Sessão encerrada. O rascunho local foi preservado.");
  }

  return (
    <section className="auth-panel" aria-labelledby="auth-title">
      <div>
        <span className="small-label">ACESSO</span>
        <h2 id="auth-title">Conta da equipe</h2>
      </div>
      {!isSupabaseConfigured || !supabase ? (
        <p className="auth-muted">Login remoto aguardando a configuração pública do Supabase no ambiente.</p>
      ) : user ? (
        <div className="auth-session">
          <span>Conectado como <strong>{user.email ?? "usuário autenticado"}</strong>.</span>
          <button type="button" onClick={() => void signOut()} disabled={busy}>Sair</button>
        </div>
      ) : (
        <form className="auth-form" onSubmit={(event) => void signIn(event)}>
          <label>
            E-mail
            <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required autoComplete="username" />
          </label>
          <label>
            Senha
            <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required autoComplete="current-password" />
          </label>
          <button type="submit" disabled={busy}>{busy ? "Entrando…" : "Entrar"}</button>
        </form>
      )}
      {message ? <p className="auth-message" role="status">{message}</p> : null}
    </section>
  );
}
