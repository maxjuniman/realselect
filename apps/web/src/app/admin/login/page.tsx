"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { clientApi } from "@/lib/client";
import { ErrorText, Field, LoginCard, LoginWrap, Muted, PrimaryButton, TextInput } from "@/styles/ui";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("admin@realselect.fc");
  const [password, setPassword] = useState("");
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
          <TextInput type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" />
        </Field>
        {error ? <ErrorText>{error}</ErrorText> : null}
        <PrimaryButton disabled={loading}>{loading ? "Entrando..." : "Entrar"}</PrimaryButton>
      </LoginCard>
    </LoginWrap>
  );
}
