import { parsePhoneNumberFromString } from "libphonenumber-js";

const FUSO = "America/Sao_Paulo";

export function formatarNumero(n: string): string {
  return n.padStart(2, "0");
}

const moeda = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export function formatarMoeda(centavos: number): string {
  return moeda.format(centavos / 100).replace(/\s/g, " ");
}

/** Telefone gravado → texto. Brasil no formato nacional; outros países com +DDI. Sem "+" é o formato antigo (Brasil). */
export function formatarTelefone(telefone: string): string {
  if (!telefone.startsWith("+")) return mascaraTelefone(telefone);
  const p = parsePhoneNumberFromString(telefone);
  if (!p) return telefone;
  return p.country === "BR" ? mascaraTelefone(p.nationalNumber) : p.formatInternational();
}

/** Máscara (00) 0000-0000 / (00) 00000-0000, aplicada enquanto a pessoa digita. */
export function mascaraTelefone(entrada: string): string {
  const d = entrada.replace(/\D/g, "").slice(0, 11);
  if (d.length === 0) return "";
  if (d.length <= 2) return `(${d}`;
  const ddd = d.slice(0, 2);
  const resto = d.slice(2);
  const corte = d.length === 11 ? 5 : 4;
  if (resto.length <= corte) return `(${ddd}) ${resto}`;
  return `(${ddd}) ${resto.slice(0, corte)}-${resto.slice(corte)}`;
}

export function linkWhatsApp(telefone: string): string {
  const digitos = telefone.replace(/\D/g, "");
  return `https://wa.me/${telefone.startsWith("+") ? digitos : `55${digitos}`}`;
}

const dataHora = new Intl.DateTimeFormat("pt-BR", {
  timeZone: FUSO,
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export function formatarDataHora(iso: string): string {
  return dataHora.format(new Date(iso));
}

export function minutosDesde(iso: string, agora: Date): number {
  return Math.max(0, Math.floor((agora.getTime() - new Date(iso).getTime()) / 60000));
}
