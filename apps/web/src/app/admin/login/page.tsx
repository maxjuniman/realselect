"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { clientApi } from "@/lib/client";
import { ErrorText, Field, LoginCard, LoginIntro, LoginKicker, LoginMascot, LoginSwitch, LoginWrap, Muted, PasswordWrap, PrimaryButton, RevealButton, TextInput } from "@/styles/ui";

function EyeIcon({ open }: { open: boolean }) {
  const slash = open ? <path d="M5 19 19 5" stroke="currentColor" strokeWidth="1.8" /> : null;
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M2.2 12S6 6.5 12 6.5 21.8 12 21.8 12 18 17.5 12 17.5 2.2 12 2.2 12Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <circle cx="12" cy="12" r="2.4" fill="none" stroke="currentColor" strokeWidth="1.8" />
      {slash}
    </svg>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [login, setLogin] = useState("");
  const [name, setName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [sent, setSent] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (localStorage.getItem("rs_token")) router.replace("/admin");
  }, [router]);

  function showLogin() {
    setMode("login");
    setError("");
    setSent("");
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setSent("");
    try {
      if (mode === "register") {
        if (password.trim().length < 4) {
          setError("A senha precisa ter pelo menos 4 caracteres.");
          return;
        }
        const result = await clientApi<{ message: string }>("/auth/register", {
          method: "POST",
          body: JSON.stringify({
            name,
            birthDate: birthDate || null,
            password: password.trim(),
          }),
        });
        setSent(result.message);
        setPassword("");
        return;
      }
      const session = await clientApi<{ token: string }>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ login, password }),
      });
      localStorage.setItem("rs_token", session.token);
      router.replace("/admin");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Falha no login.");
    } finally {
      setLoading(false);
    }
  }

  const intro =
    mode === "register"
      ? "Informe seu nome e uma senha. O organizador vincula esse acesso a um jogador que já existe."
      : "Organizador entra com o e-mail. Jogador entra com o nome, depois que o cadastro for aprovado.";

  return (
    <LoginWrap>
      <LoginIntro>
        <LoginKicker>Painel</LoginKicker>
        <h1>{mode === "register" ? "Cadastro" : "Entrar"}</h1>
        <p>{intro}</p>
      </LoginIntro>
      <LoginCard onSubmit={submit}>
        {sent ? <Muted>{sent}</Muted> : null}
        {sent ? null : (
          <>
        {mode === "register" ? (
          <Field>
            Nome
            <TextInput value={name} onChange={(event) => setName(event.target.value)} autoComplete="username" required />
          </Field>
        ) : (
          <Field>
            E-mail ou nome
            <TextInput value={login} onChange={(event) => setLogin(event.target.value)} autoComplete="username" required />
          </Field>
        )}
        {mode === "register" ? (
          <Field>
            Data de nascimento
            <TextInput type="date" value={birthDate} onChange={(event) => setBirthDate(event.target.value)} />
          </Field>
        ) : null}
        <Field>
          Senha
          <PasswordWrap>
            <TextInput
              $reveal
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete={mode === "register" ? "new-password" : "current-password"}
              required
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
            <PrimaryButton disabled={loading}>{loading ? "Enviando..." : mode === "register" ? "Pedir acesso" : "Entrar"}</PrimaryButton>
          </>
        )}
        {mode === "login" ? (
          <LoginSwitch type="button" onClick={() => { setMode("register"); setError(""); setSent(""); }}>
            Quero me cadastrar
          </LoginSwitch>
        ) : (
          <LoginSwitch type="button" onClick={showLogin}>
            Já tenho cadastro
          </LoginSwitch>
        )}
      </LoginCard>
      <LoginMascot>
        <img src="/brand/mascote2.png" alt="Mascote do Real Select" />
      </LoginMascot>
    </LoginWrap>
  );
}
