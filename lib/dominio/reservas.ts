import { TOLERANCIA_MS } from "@/lib/dominio/expiracao";
import type { Estado, Reserva } from "@/lib/dominio/tipos";
import { normalizarNome, normalizarTelefone } from "@/lib/dominio/validacao";
import { ErroDominio } from "@/lib/erros";

const ALFABETO = "abcdefghijklmnopqrstuvwxyz0123456789";

export function gerarIdReserva(existentes: Record<string, Reserva>): string {
  for (;;) {
    const bytes = crypto.getRandomValues(new Uint8Array(10));
    const id = "r_" + Array.from(bytes, (b) => ALFABETO[b % ALFABETO.length]).join("");
    if (!existentes[id]) return id;
  }
}

export function obterReserva(estado: Estado, id: string): Reserva {
  const r = estado.reservas[id];
  if (!r) throw new ErroDominio("RESERVA_NAO_ENCONTRADA", 404, "Reserva não encontrada.");
  return r;
}

export function numerosDaReserva(estado: Estado, id: string): string[] {
  return Object.keys(estado.numeros)
    .filter((n) => estado.numeros[n].reserva === id)
    .sort((a, b) => Number(a) - Number(b));
}

export function reservaComNumeros(estado: Estado, id: string) {
  const reserva = obterReserva(estado, id);
  const numeros = numerosDaReserva(estado, id).map((numero) => ({ numero, status: estado.numeros[numero].status }));
  return { reserva, numeros };
}

export function segundosRestantes(r: Reserva, agora: Date): number {
  if (r.status !== "aberta") return 0;
  return Math.max(0, Math.floor((new Date(r.expiraEm).getTime() - agora.getTime()) / 1000));
}

function validarNumeros(estado: Estado, numeros: unknown): string[] {
  const invalido = (m: string) => new ErroDominio("DADOS_INVALIDOS", 400, m);
  if (!Array.isArray(numeros) || numeros.length === 0) throw invalido("Escolha pelo menos um número.");
  if (!numeros.every((n) => typeof n === "string")) throw invalido("Números inválidos.");
  const lista = numeros as string[];
  if (new Set(lista).size !== lista.length) throw invalido("Há números repetidos.");
  const inexistentes = lista.filter((n) => !estado.numeros[n]);
  if (inexistentes.length) throw invalido(`Números inexistentes: ${inexistentes.join(", ")}.`);
  const max = estado.config.maxPorReserva;
  if (max !== null && lista.length > max) {
    throw new ErroDominio("LIMITE_EXCEDIDO", 400, `Você pode reservar no máximo ${max} números por vez.`);
  }
  return lista;
}

export function reservar(estado: Estado, agora: Date, id: string, numeros: unknown): void {
  const lista = validarNumeros(estado, numeros);
  if (estado.reservas[id]) throw new Error(`Id de reserva já existe: ${id}`);
  const indisponiveis = lista.filter((n) => estado.numeros[n].status !== "livre");
  if (indisponiveis.length) {
    throw new ErroDominio(
      "NUMEROS_INDISPONIVEIS",
      409,
      `Os números ${indisponiveis.join(", ")} acabaram de ser reservados por outra pessoa.`,
      indisponiveis,
    );
  }
  const expira = new Date(agora.getTime() + estado.config.minutosReserva * 60_000);
  estado.reservas[id] = {
    id,
    status: "aberta",
    nome: null,
    telefone: null,
    criadaEm: agora.toISOString(),
    expiraEm: expira.toISOString(),
    solicitadaEm: null,
  };
  for (const n of lista) estado.numeros[n] = { status: "reservado", reserva: id };
  estado.eventos.push({ em: agora.toISOString(), acao: "reservado", por: "comprador", reserva: id, numeros: lista });
}

function exigirAberta(r: Reserva): void {
  if (r.status !== "aberta") throw new ErroDominio("RESERVA_NAO_ABERTA", 409, "Esta reserva não está mais aberta.");
}

export function confirmarReserva(
  estado: Estado,
  agora: Date,
  id: string,
  dados: { nome: unknown; telefone: unknown },
): void {
  const r = obterReserva(estado, id);
  // Na escrita, aplicarExpiracoes já roda antes e marca a reserva como "expirada".
  if (r.status === "expirada") throw new ErroDominio("RESERVA_EXPIRADA", 410, "O prazo da reserva acabou.");
  exigirAberta(r);
  if (agora.getTime() > new Date(r.expiraEm).getTime() + TOLERANCIA_MS) {
    throw new ErroDominio("RESERVA_EXPIRADA", 410, "O prazo da reserva acabou.");
  }
  const nome = normalizarNome(dados.nome);
  const telefone = normalizarTelefone(dados.telefone);
  const numeros = numerosDaReserva(estado, id);
  if (numeros.some((n) => estado.numeros[n].status !== "reservado")) {
    throw new ErroDominio("RESERVA_NAO_ABERTA", 409, "Esta reserva não está mais aberta.");
  }
  for (const n of numeros) estado.numeros[n].status = "pendente";
  r.status = "solicitada";
  r.nome = nome;
  r.telefone = telefone;
  r.solicitadaEm = agora.toISOString();
  estado.eventos.push({
    em: agora.toISOString(),
    acao: "solicitado",
    por: "comprador",
    reserva: id,
    numeros,
    nome,
    telefone,
  });
}

export function cancelarReserva(estado: Estado, agora: Date, id: string): void {
  const r = obterReserva(estado, id);
  exigirAberta(r);
  const numeros = numerosDaReserva(estado, id);
  for (const n of numeros) estado.numeros[n] = { status: "livre", reserva: null };
  r.status = "cancelada";
  estado.eventos.push({ em: agora.toISOString(), acao: "cancelado", por: "comprador", reserva: id, numeros });
}
