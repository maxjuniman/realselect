"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { clientApi } from "@/lib/client";
import { shrinkPhoto } from "@/lib/photo";
import { POSITIONS } from "@/lib/roster";
import { ErrorText, Field, LoginCard, LoginIntro, LoginKicker, LoginMascot, LoginMode, LoginModes, LoginSwitch, LoginWrap, Muted, PasswordWrap, PrimaryButton, RevealButton, Select, TextInput } from "@/styles/ui";

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
  const [mode, setMode] = useState<"admin" | "player" | "register">("admin");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [nickname, setNickname] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [first, setFirst] = useState("");
  const [second, setSecond] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [sent, setSent] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (localStorage.getItem("rs_token")) router.replace("/admin");
  }, [router]);

  function choose(next: "admin" | "player") {
    setMode(next);
    setError("");
    setSent("");
  }

  async function pickPhoto(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Envie uma imagem.");
      return;
    }
    try {
      setPhoto(await shrinkPhoto(file));
      setError("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não consegui ler a foto.");
    }
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
            nickname: nickname.trim() || null,
            birthDate: birthDate || null,
            positions: [first, second].filter(Boolean),
            password: password.trim(),
            ...(photo ? { photo } : {}),
          }),
        });
        setSent(result.message);
        setPassword("");
        return;
      }
      const session = await clientApi<{ token: string }>(mode === "player" ? "/auth/player" : "/auth/login", {
        method: "POST",
        body: JSON.stringify(mode === "player" ? { name, password } : { email, password }),
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
      ? "Use o nome que já está na lista. O organizador aprova antes de liberar a entrada."
      : mode === "player"
        ? "Mensalista entra com o nome do elenco, depois que o cadastro for aprovado."
        : "Quem lança a terça entra aqui. A classificação fica aberta para o grupo.";

  return (
    <LoginWrap>
      <LoginIntro>
        <LoginKicker>Painel</LoginKicker>
        <h1>{mode === "register" ? "Cadastro" : "Entrar"}</h1>
        <p>{intro}</p>
      </LoginIntro>
      <LoginModes>
        <LoginMode type="button" $on={mode === "admin"} aria-pressed={mode === "admin"} onClick={() => choose("admin")}>
          Organizador
        </LoginMode>
        <LoginMode type="button" $on={mode !== "admin"} aria-pressed={mode !== "admin"} onClick={() => choose("player")}>
          Jogador
        </LoginMode>
      </LoginModes>
      <LoginCard onSubmit={submit}>
        {sent ? <Muted>{sent}</Muted> : null}
        {sent ? null : (
          <>
        {mode === "admin" ? (
          <Field>
            E-mail
            <TextInput value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="username" />
          </Field>
        ) : (
          <Field>
            Nome
            <TextInput value={name} onChange={(event) => setName(event.target.value)} autoComplete="username" required />
          </Field>
        )}
        {mode === "register" ? (
          <>
            <Field>
              Apelido
              <TextInput value={nickname} onChange={(event) => setNickname(event.target.value)} />
            </Field>
            <Field>
              Data de nascimento
              <TextInput type="date" value={birthDate} onChange={(event) => setBirthDate(event.target.value)} />
            </Field>
            <Field>
              1ª posição
              <Select value={first} onChange={(event) => { const value = event.target.value; setFirst(value); if (value === second) setSecond(""); }}>
                <option value="">Sem posição</option>
                {POSITIONS.map((position) => (
                  <option key={position} value={position}>
                    {position}
                  </option>
                ))}
              </Select>
            </Field>
            <Field>
              2ª posição
              <Select value={second} onChange={(event) => setSecond(event.target.value)}>
                <option value="">Nenhuma</option>
                {POSITIONS.filter((position) => position !== first).map((position) => (
                  <option key={position} value={position}>
                    {position}
                  </option>
                ))}
              </Select>
            </Field>
            <Field>
              Foto
              <TextInput type="file" accept="image/*" onChange={(event) => pickPhoto(event.target.files?.[0])} />
            </Field>
          </>
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
        {mode === "player" ? (
          <LoginSwitch type="button" onClick={() => { setMode("register"); setError(""); setSent(""); }}>
            Quero me cadastrar
          </LoginSwitch>
        ) : null}
        {mode === "register" ? (
          <LoginSwitch type="button" onClick={() => choose("player")}>
            Já tenho cadastro
          </LoginSwitch>
        ) : null}
      </LoginCard>
      <LoginMascot>
        <img src="/brand/mascote2.png" alt="Mascote do Real Select" />
      </LoginMascot>
    </LoginWrap>
  );
}
