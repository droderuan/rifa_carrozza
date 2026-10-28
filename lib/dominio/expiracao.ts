import type { Estado, Reserva } from "@/lib/dominio/tipos";

export const TOLERANCIA_MS = 30_000;

export function estaEfetivamenteExpirada(r: Reserva, agora: Date): boolean {
  return r.status === "aberta" && agora.getTime() > new Date(r.expiraEm).getTime() + TOLERANCIA_MS;
}

/** Expira reservas abertas vencidas, liberando seus números. Muta o estado. */
export function aplicarExpiracoes(estado: Estado, agora: Date): void {
  for (const r of Object.values(estado.reservas)) {
    if (!estaEfetivamenteExpirada(r, agora)) continue;
    r.status = "expirada";
    const liberados: string[] = [];
    for (const [n, num] of Object.entries(estado.numeros)) {
      if (num.reserva === r.id && num.status === "reservado") {
        estado.numeros[n] = { status: "livre", reserva: null };
        liberados.push(n);
      }
    }
    liberados.sort((a, b) => Number(a) - Number(b));
    estado.eventos.push({ em: r.expiraEm, acao: "expirado", por: "sistema", reserva: r.id, numeros: liberados });
  }
}
