import { obterArmazenamento } from "@/lib/armazenamento";
import { aplicarExpiracoes } from "@/lib/dominio/expiracao";
import type { Estado, Evento } from "@/lib/dominio/tipos";
import { ErroDominio } from "@/lib/erros";

const TTL_CACHE_MS = 5_000;
const TENTATIVAS = 5;

let cache: { estado: Estado; em: number } | null = null;

export function invalidarCache(): void {
  cache = null;
}

function visao(estado: Estado): Estado {
  const copia = structuredClone(estado);
  aplicarExpiracoes(copia, new Date());
  return copia;
}

/** Visão do estado com expirações aplicadas em memória (nada é gravado). */
export async function lerEstado(opts: { fresco?: boolean } = {}): Promise<Estado> {
  if (!opts.fresco && cache && Date.now() - cache.em < TTL_CACHE_MS) return visao(cache.estado);
  const { estado } = await obterArmazenamento().ler();
  cache = { estado, em: Date.now() };
  return visao(estado);
}

/** `[rifa] <acao> <idReserva> <numeros>` a partir do último evento gerado pela mutação. */
export function mensagemCommit(novos: Evento[]): string {
  const ev = novos.at(-1);
  if (!ev) return "[rifa] atualização";
  return `[rifa] ${ev.acao} ${ev.reserva} ${ev.numeros.join(",")}`.trim();
}

const esperar = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Lê, aplica expirações, roda a mutação e grava com controle otimista pelo sha.
 * A mutação deve ser determinística em relação a (estado, agora): pode rodar mais de uma vez.
 * Se ela retornar `false`, nada é gravado.
 */
export async function atualizar(
  mensagem: string | ((novos: Evento[]) => string),
  mutacao: (estado: Estado, agora: Date) => void | boolean,
): Promise<Estado> {
  const armazenamento = obterArmazenamento();
  for (let tentativa = 1; tentativa <= TENTATIVAS; tentativa++) {
    const { estado, sha } = await armazenamento.ler();
    const agora = new Date();
    aplicarExpiracoes(estado, agora);
    const antes = estado.eventos.length;
    if (mutacao(estado, agora) === false) return estado;
    const texto = typeof mensagem === "string" ? mensagem : mensagem(estado.eventos.slice(antes));
    const r = await armazenamento.gravar(estado, sha, texto);
    if (r === "ok") {
      invalidarCache();
      return estado;
    }
    if (tentativa < TENTATIVAS) await esperar(150 * tentativa + Math.random() * 150);
  }
  throw new ErroDominio("CONFLITO_PERSISTENTE", 503, "Muitas alterações ao mesmo tempo, tente novamente.");
}
