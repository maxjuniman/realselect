"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { clientApi } from "@/lib/client";
import { ErrorText, Field, LoginCard, LoginWrap, Muted, PasswordWrap, PrimaryButton, RevealButton, TextInput } from "@/styles/ui";

function EyeIcon({ open }: { open: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M2.2 12S6 6.5 12 6.5 21.8 12 21.8 12 18 17.5 12 17.5 2.2 12 2.2 12Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <circle cx="12" cy="12" r="2.4" fill="none" stroke="currentColor" strokeWidth="1.8" />
      {open ? <path d="M5 19 19 5" stroke="currentColor" strokeWidth="1.8" /> : null}
    </svg>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (localStorage.getItem("rs_token")) router.replace("/admin");
  }, [router]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const session = await clientApi<{ token: string }>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      localStorage.setItem("rs_token", session.token);
      router.replace("/admin");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Falha no login.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <LoginWrap>
      <img src="/brand/mascot.png" alt="Mascote do Real Select" />
      <LoginCard onSubmit={submit}>
        <h1>Entrar</h1>
        <Muted>Quem lança a terça entra aqui. A classificação fica aberta para o grupo.</Muted>
        <Field>
          E-mail
          <TextInput value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="username" />
        </Field>
        <Field>
          Senha
          <PasswordWrap>
            <TextInput
              $reveal
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
            />
            <RevealButton
              type="button"
              aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
              aria-pressed={showPassword}
              onClick={() => setShowPassword((current) => !current)}
            >
              <EyeIcon open={showPassword} />
            </RevealButton>
          </PasswordWrap>
        </Field>
        {error ? <ErrorText>{error}</ErrorText> : null}
        <PrimaryButton disabled={loading}>{loading ? "Entrando..." : "Entrar"}</PrimaryButton>
      </LoginCard>
    </LoginWrap>
  );
}
