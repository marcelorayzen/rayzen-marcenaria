import { useEffect, useState, type FormEvent } from "react";
import { isSupabaseConfigured, supabase } from "./supabaseClient";

export type AuthUser = { email?: string | null };

export function AuthPanel({ onUserChange }: { onUserChange?: (user: AuthUser | null) => void }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!supabase) return undefined;
    let active = true;
    void supabase.auth.getUser().then(({ data }) => {
      if (active) {
        const nextUser = data.user ? { email: data.user.email } : null;
        setUser(nextUser);
        onUserChange?.(nextUser);
      }
    });
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      const nextUser = session?.user ? { email: session.user.email } : null;
      setUser(nextUser);
      onUserChange?.(nextUser);
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
