import { parsePhoneNumberFromString } from "libphonenumber-js";
import { ErroDominio } from "@/lib/erros";

function invalido(mensagem: string): never {
  throw new ErroDominio("DADOS_INVALIDOS", 400, mensagem);
}

export function normalizarNome(v: unknown): string {
  if (typeof v !== "string") invalido("Informe o nome.");
  const nome = v.trim().replace(/\s+/g, " ");
  if (nome.length < 2 || nome.length > 80) invalido("O nome precisa ter entre 2 e 80 caracteres.");
  return nome;
}

function telefoneBrasil(nacional: string): string {
  const ddd = Number(nacional.slice(0, 2));
  if ((nacional.length !== 10 && nacional.length !== 11) || ddd < 11 || ddd > 99) {
    invalido("Telefone inválido. Use DDD + número, ex.: (21) 99999-8888.");
  }
  return `+55${nacional}`;
}

/**
 * Normaliza para o formato internacional (+DDI e dígitos), ex.: "+5521999998888".
 * Com "+" vale o país do DDI; sem "+" é Brasil (com ou sem o 55 na frente).
 */
export function normalizarTelefone(v: unknown): string {
  if (typeof v !== "string") invalido("Informe o telefone.");
  const d = v.replace(/\D/g, "");
  if (v.trim().startsWith("+")) {
    if (d.startsWith("55")) return telefoneBrasil(d.slice(2));
    const p = parsePhoneNumberFromString(`+${d}`);
    if (!p?.isValid()) invalido("Telefone inválido para o país escolhido.");
    return p.number;
  }
  return telefoneBrasil(d.startsWith("55") && (d.length === 12 || d.length === 13) ? d.slice(2) : d);
}
