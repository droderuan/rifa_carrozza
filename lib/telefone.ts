import { AsYouType, getCountries, getCountryCallingCode, parsePhoneNumberFromString, type CountryCode } from "libphonenumber-js";
import { mascaraTelefone } from "@/lib/formatar";

export type Pais = { codigo: CountryCode; nome: string; ddi: string; bandeira: string };

const PRIMEIROS: CountryCode[] = ["BR", "PT", "US"];

function bandeira(codigo: string): string {
  return String.fromCodePoint(...[...codigo].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));
}

let cache: Pais[] | null = null;

/** Países com DDI, nomes em português; Brasil, Portugal e EUA primeiro. */
export function paisesTelefone(): Pais[] {
  if (cache) return cache;
  const nomes = new Intl.DisplayNames(["pt-BR"], { type: "region" });
  const todos = getCountries().map((codigo) => ({
    codigo,
    nome: nomes.of(codigo) ?? codigo,
    ddi: getCountryCallingCode(codigo),
    bandeira: bandeira(codigo),
  }));
  const primeiros = PRIMEIROS.map((c) => todos.find((p) => p.codigo === c)!);
  const resto = todos.filter((p) => !PRIMEIROS.includes(p.codigo)).sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  cache = [...primeiros, ...resto];
  return cache;
}

/** Formata o número nacional enquanto a pessoa digita. */
export function digitarTelefone(pais: CountryCode, texto: string): string {
  if (pais === "BR") return mascaraTelefone(texto);
  return new AsYouType(pais).input(texto.replace(/\D/g, "").slice(0, 15));
}

/** Número internacional (+DDI + número nacional, só dígitos). */
export function montarTelefone(pais: CountryCode, numero: string): string {
  return `+${getCountryCallingCode(pais)}${numero.replace(/\D/g, "")}`;
}

export function telefoneValido(internacional: string): boolean {
  return parsePhoneNumberFromString(internacional)?.isValid() ?? false;
}

/** Separa um telefone gravado em país + número nacional formatado. Sem "+" é o formato antigo (Brasil). */
export function separarTelefone(gravado: string): { pais: CountryCode; numero: string } {
  if (!gravado.startsWith("+")) return { pais: "BR", numero: mascaraTelefone(gravado) };
  const p = parsePhoneNumberFromString(gravado);
  const pais = p?.country ?? "BR";
  return { pais, numero: digitarTelefone(pais, p?.nationalNumber ?? "") };
}
