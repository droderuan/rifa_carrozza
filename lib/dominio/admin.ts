import { numerosDaReserva, obterReserva } from "@/lib/dominio/reservas";
import type { AcaoEvento, Estado, Reserva, StatusNumero } from "@/lib/dominio/tipos";
import { normalizarNome, normalizarTelefone } from "@/lib/dominio/validacao";
import { ErroDominio } from "@/lib/erros";

type Transicao = { de: StatusNumero[]; para: StatusNumero; acao: AcaoEvento };

function transicaoInvalida(mensagem: string): ErroDominio {
  return new ErroDominio("TRANSICAO_INVALIDA", 409, mensagem);
}

function snapshot(r: Reserva) {
  return { ...(r.nome ? { nome: r.nome } : {}), ...(r.telefone ? { telefone: r.telefone } : {}) };
}

function aplicarTransicao(estado: Estado, agora: Date, id: string, numeros: unknown, t: Transicao): void {
  const r = obterReserva(estado, id);
  const daReserva = numerosDaReserva(estado, id);
  let alvo: string[];
  if (numeros === undefined || numeros === null) {
    alvo = daReserva.filter((n) => t.de.includes(estado.numeros[n].status));
    if (alvo.length === 0) throw transicaoInvalida("Nenhum número desta reserva está no status exigido.");
  } else {
    if (
      !Array.isArray(numeros) ||
      numeros.length === 0 ||
      !numeros.every((n) => typeof n === "string") ||
      new Set(numeros).size !== numeros.length
    ) {
      throw new ErroDominio("DADOS_INVALIDOS", 400, "Lista de números inválida.");
    }
    alvo = (numeros as string[]).slice().sort((a, b) => Number(a) - Number(b));
    const invalidos = alvo.filter((n) => !daReserva.includes(n) || !t.de.includes(estado.numeros[n].status));
    if (invalidos.length) {
      throw transicaoInvalida(`Ação não permitida para os números ${invalidos.join(", ")}.`);
    }
  }
  for (const n of alvo) {
    estado.numeros[n] = t.para === "livre" ? { status: "livre", reserva: null } : { status: t.para, reserva: id };
  }
  estado.eventos.push({
    em: agora.toISOString(),
    acao: t.acao,
    por: "admin",
    reserva: id,
    numeros: alvo,
    ...snapshot(r),
  });
}

export function confirmarNumeros(estado: Estado, agora: Date, id: string, numeros?: unknown): void {
  aplicarTransicao(estado, agora, id, numeros, { de: ["pendente"], para: "confirmado", acao: "confirmado" });
}

export function desconfirmarNumeros(estado: Estado, agora: Date, id: string, numeros?: unknown): void {
  aplicarTransicao(estado, agora, id, numeros, { de: ["confirmado"], para: "pendente", acao: "desconfirmado" });
}

export function removerNumeros(estado: Estado, agora: Date, id: string, numeros?: unknown): void {
  aplicarTransicao(estado, agora, id, numeros, { de: ["pendente", "confirmado"], para: "livre", acao: "removido" });
}

export type AcaoAdmin = "confirmar" | "desconfirmar" | "remover";

export const ACOES_ADMIN: Record<AcaoAdmin, typeof confirmarNumeros> = {
  confirmar: confirmarNumeros,
  desconfirmar: desconfirmarNumeros,
  remover: removerNumeros,
};

/** Corrige nome/telefone de uma reserva solicitada. Retorna false se nada mudou. */
export function editarPerfil(
  estado: Estado,
  agora: Date,
  id: string,
  dados: { nome?: unknown; telefone?: unknown },
): boolean {
  const r = obterReserva(estado, id);
  if (r.status !== "solicitada") throw transicaoInvalida("Só é possível editar reservas confirmadas pelo comprador.");
  const nome = dados.nome === undefined ? undefined : normalizarNome(dados.nome);
  const telefone = dados.telefone === undefined ? undefined : normalizarTelefone(dados.telefone);
  const de: { nome?: string; telefone?: string } = {};
  const para: { nome?: string; telefone?: string } = {};
  if (nome !== undefined && nome !== r.nome) {
    de.nome = r.nome ?? "";
    para.nome = nome;
  }
  if (telefone !== undefined && telefone !== r.telefone) {
    de.telefone = r.telefone ?? "";
    para.telefone = telefone;
  }
  if (Object.keys(para).length === 0) return false;
  if (para.nome !== undefined) r.nome = para.nome;
  if (para.telefone !== undefined) r.telefone = para.telefone;
  estado.eventos.push({ em: agora.toISOString(), acao: "perfil_editado", por: "admin", reserva: id, numeros: [], de, para });
  return true;
}
