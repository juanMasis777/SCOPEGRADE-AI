"use client";

import type { User } from "@supabase/supabase-js";
import { type FormEvent, type ReactNode, useEffect, useState } from "react";
import { createClient, isSupabaseConfigured } from "../utils/supabase/client";

type AuthMode = "signin" | "signup";

type AuthGateProps = {
  children: (user: User, signOut: () => Promise<void>) => ReactNode;
};

export default function AuthGate({ children }: AuthGateProps) {
  const [user, setUser] = useState<User | null>(null);
  // Nothing to check when the keys are missing: the setup notice renders instead.
  const [checkingSession, setCheckingSession] = useState(isSupabaseConfigured);
  const [mode, setMode] = useState<AuthMode>("signin");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!isSupabaseConfigured()) return;

    const supabase = createClient();

    void supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      setCheckingSession(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setCheckingSession(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (mode === "signup" && fullName.trim().length < 2) {
      setError("Please enter your full name.");
      return;
    }

    if (password.length < 8) {
      setError("Your password must contain at least 8 characters.");
      return;
    }

    setSubmitting(true);
    const supabase = createClient();

    if (mode === "signup") {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: { full_name: fullName.trim() },
          emailRedirectTo: window.location.origin,
        },
      });

      if (signUpError) {
        setError(signUpError.message);
      } else if (!data.session) {
        setMessage("Account created. Check your email to confirm your address, then sign in.");
        setMode("signin");
        setPassword("");
      }
    } else {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (signInError) {
        setError(signInError.message);
      }
    }

    setSubmitting(false);
  }

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    setUser(null);
    setPassword("");
    setMessage("You have signed out successfully.");
  }

  function changeMode(nextMode: AuthMode) {
    setMode(nextMode);
    setError("");
    setMessage("");
  }

  if (!isSupabaseConfigured()) {
    return (
      <main className="setup-notice">
        <div>
          <span className="brand-mark">SG</span>
          <h1>ScopeGrade AI needs its database keys</h1>
          <p>
            Copy <code>.env.example</code> to <code>.env.local</code>, then add your
            Supabase project URL and publishable key. Restart the server afterwards.
          </p>
          <ol>
            <li>Run every file in <code>supabase/migrations/</code> in order, from the Supabase SQL Editor.</li>
            <li>Copy <code>NEXT_PUBLIC_SUPABASE_URL</code> and <code>NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY</code> from Project Settings → API.</li>
            <li>Enable the email provider under Authentication → Providers.</li>
          </ol>
          <small>Full steps are in README.md and INSTRUCCIONES.txt.</small>
        </div>
      </main>
    );
  }

  if (checkingSession) {
    return (
      <main className="auth-loading" aria-live="polite">
        <span className="auth-spinner" />
        <p>Opening your ScopeGrade workspace…</p>
      </main>
    );
  }

  if (user) {
    return <>{children(user, signOut)}</>;
  }

  return (
    <main className="auth-shell">
      <section className="auth-story">
        <div className="auth-brand">
          <span className="brand-mark">SG</span>
          <span>
            <strong>ScopeGrade AI</strong>
            <small>Qualify the project. Protect your price.</small>
          </span>
        </div>

        <div className="auth-story-copy">
          <span className="auth-kicker">Built for agencies and freelancers</span>
          <h1>Turn every client request into a protected scope.</h1>
          <p>
            Grade project complexity, recommend the correct package and create
            consistent proposals without underpricing your work.
          </p>
        </div>

        <div className="auth-benefits">
          <div><span>01</span><p><strong>Qualify faster</strong><small>Transform intake answers into a clear project grade.</small></p></div>
          <div><span>02</span><p><strong>Protect margins</strong><small>Move advanced requests beyond promotional pricing.</small></p></div>
          <div><span>03</span><p><strong>Quote consistently</strong><small>Build every proposal from the same pricing guardrails.</small></p></div>
        </div>
      </section>

      <section className="auth-panel">
        <div className="auth-card">
          <div className="auth-card-heading">
            <span className="section-kicker">Secure workspace</span>
            <h2>{mode === "signin" ? "Welcome back" : "Create your account"}</h2>
            <p>
              {mode === "signin"
                ? "Sign in to continue to your projects and proposals."
                : "Start protecting your project pricing in minutes."}
            </p>
          </div>

          <div className="auth-tabs" role="tablist" aria-label="Account access">
            <button type="button" role="tab" aria-selected={mode === "signin"} className={mode === "signin" ? "active" : ""} onClick={() => changeMode("signin")}>Sign in</button>
            <button type="button" role="tab" aria-selected={mode === "signup"} className={mode === "signup" ? "active" : ""} onClick={() => changeMode("signup")}>Create account</button>
          </div>

          <form className="auth-form" onSubmit={handleSubmit}>
            {mode === "signup" && (
              <label>
                <span>Full name</span>
                <input type="text" value={fullName} onChange={(event) => setFullName(event.target.value)} placeholder="Your full name" autoComplete="name" required />
              </label>
            )}

            <label>
              <span>Email address</span>
              <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@company.com" autoComplete="email" required />
            </label>

            <label>
              <span>Password</span>
              <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 8 characters" autoComplete={mode === "signin" ? "current-password" : "new-password"} minLength={8} required />
            </label>

            {error && <p className="auth-alert error" role="alert">{error}</p>}
            {message && <p className="auth-alert success" role="status">{message}</p>}

            <button className="auth-submit" type="submit" disabled={submitting}>
              {submitting ? "Please wait…" : mode === "signin" ? "Sign in to ScopeGrade" : "Create my account"}
              {!submitting && <span>→</span>}
            </button>
          </form>

          <p className="auth-security"><span>✓</span> Your workspace data is protected by account-level security.</p>
        </div>
      </section>
    </main>
  );
}
