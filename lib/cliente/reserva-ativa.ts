export const CHAVE_RESERVA = "rifa:reservaAtiva";

export type ReservaAtiva = { id: string; numeros: string[]; prazo: number };

type Leitura = Pick<Storage, "getItem" | "removeItem">;

function valida(v: unknown): v is ReservaAtiva {
  if (typeof v !== "object" || v === null) return false;
  const r = v as Record<string, unknown>;
  return (
    typeof r.id === "string" &&
    Array.isArray(r.numeros) &&
    r.numeros.every((n) => typeof n === "string") &&
    typeof r.prazo === "number" &&
    Number.isFinite(r.prazo)
  );
}

/** Lê a reserva ativa do navegador; valor corrompido é descartado. */
export function lerReservaAtiva(s: Leitura): ReservaAtiva | null {
  try {
    const bruto = s.getItem(CHAVE_RESERVA);
    if (bruto === null) return null;
    let v: unknown = null;
    try {
      v = JSON.parse(bruto);
    } catch {}
    if (valida(v)) return { id: v.id, numeros: v.numeros, prazo: v.prazo };
    s.removeItem(CHAVE_RESERVA);
    return null;
  } catch {
    return null;
  }
}

export function salvarReservaAtiva(s: Pick<Storage, "setItem">, r: ReservaAtiva): void {
  try {
    s.setItem(CHAVE_RESERVA, JSON.stringify(r));
  } catch {}
}

export function limparReservaAtiva(s: Pick<Storage, "removeItem">): void {
  try {
    s.removeItem(CHAVE_RESERVA);
  } catch {}
}
