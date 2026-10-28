import { cookies } from "next/headers";
import { ErroDominio } from "@/lib/erros";

export const COOKIE_SESSAO = "admin_session";
export const VALIDADE_SESSAO_S = 7 * 24 * 60 * 60;

const encoder = new TextEncoder();

async function hmacBytes(mensagem: string, segredo: string): Promise<Uint8Array> {
  const chave = await crypto.subtle.importKey(
    "raw",
    encoder.encode(segredo),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return new Uint8Array(await crypto.subtle.sign("HMAC", chave, encoder.encode(mensagem)));
}

async function hmacHex(mensagem: string, segredo: string): Promise<string> {
  return Array.from(await hmacBytes(mensagem, segredo), (b) => b.toString(16).padStart(2, "0")).join("");
}

function iguaisTempoConstante(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

export async function criarValorSessao(agoraMs: number, segredo: string): Promise<string> {
  const exp = Math.floor(agoraMs / 1000) + VALIDADE_SESSAO_S;
  return `${exp}.${await hmacHex(String(exp), segredo)}`;
}

export async function validarValorSessao(
  valor: string | undefined,
  agoraMs: number,
  segredo: string,
): Promise<boolean> {
  const partes = valor?.split(".");
  if (!partes || partes.length !== 2 || !/^\d+$/.test(partes[0])) return false;
  const [exp, assinatura] = partes;
  const esperada = await hmacHex(exp, segredo);
  if (!iguaisTempoConstante(encoder.encode(assinatura), encoder.encode(esperada))) return false;
  return Number(exp) * 1000 > agoraMs;
}

/** Compara os HMACs das duas senhas, para que o tempo não dependa do conteúdo nem do tamanho. */
export async function senhaConfere(informada: string, correta: string): Promise<boolean> {
  if (!correta) return false;
  const chave = crypto.getRandomValues(new Uint8Array(32)).join(",");
  const [a, b] = await Promise.all([hmacBytes(informada, chave), hmacBytes(correta, chave)]);
  return iguaisTempoConstante(a, b);
}

export function opcoesCookie() {
  return {
    httpOnly: true as const,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/" as const,
    maxAge: VALIDADE_SESSAO_S,
  };
}

function segredoSessao(): string {
  const s = process.env.ADMIN_SESSION_SECRET;
  if (!s) throw new Error("ADMIN_SESSION_SECRET não configurado.");
  return s;
}

export async function estaLogado(): Promise<boolean> {
  const valor = (await cookies()).get(COOKIE_SESSAO)?.value;
  return validarValorSessao(valor, Date.now(), segredoSessao());
}

export async function exigirAdmin(): Promise<void> {
  if (!(await estaLogado())) throw new ErroDominio("NAO_AUTORIZADO", 401, "Faça login no painel.");
}
