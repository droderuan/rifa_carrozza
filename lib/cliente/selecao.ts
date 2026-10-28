import type { NumeroPublico } from "@/lib/dominio/publico";

/** Separa a seleção entre números que continuam livres e os que alguém pegou. */
export function podarSelecao(selecao: string[], numeros: NumeroPublico[]): { mantidos: string[]; removidos: string[] } {
  const livres = new Set(numeros.filter((n) => n.status === "livre").map((n) => n.numero));
  return {
    mantidos: selecao.filter((n) => livres.has(n)),
    removidos: selecao.filter((n) => !livres.has(n)),
  };
}
