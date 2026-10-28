import { describe, expect, it } from "vitest";
import {
  CHAVE_RESERVA,
  lerReservaAtiva,
  limparReservaAtiva,
  salvarReservaAtiva,
} from "@/lib/cliente/reserva-ativa";

function storage(inicial: string | null) {
  const dados = new Map<string, string>();
  if (inicial !== null) dados.set(CHAVE_RESERVA, inicial);
  return {
    dados,
    getItem: (k: string) => dados.get(k) ?? null,
    setItem: (k: string, v: string) => void dados.set(k, v),
    removeItem: (k: string) => void dados.delete(k),
  };
}

describe("lerReservaAtiva", () => {
  it.each(["{", '{"id":1}', '{"id":"r_x","numeros":"7","prazo":1}', "null", '{"id":"r_x","numeros":[7],"prazo":1}'])(
    "descarta valor corrompido %s",
    (valor) => {
      const s = storage(valor);
      expect(lerReservaAtiva(s)).toBeNull();
      expect(s.dados.has(CHAVE_RESERVA)).toBe(false);
    },
  );

  it("retorna null sem chave", () => {
    expect(lerReservaAtiva(storage(null))).toBeNull();
  });

  it("lê valor válido e faz ida e volta", () => {
    const s = storage(null);
    salvarReservaAtiva(s, { id: "r_abc", numeros: ["7", "12"], prazo: 123 });
    expect(lerReservaAtiva(s)).toEqual({ id: "r_abc", numeros: ["7", "12"], prazo: 123 });
    limparReservaAtiva(s);
    expect(lerReservaAtiva(s)).toBeNull();
  });

  it("não quebra se o storage lançar", () => {
    const quebrado = {
      getItem: () => {
        throw new Error("bloqueado");
      },
      removeItem: () => {
        throw new Error("bloqueado");
      },
    };
    expect(lerReservaAtiva(quebrado)).toBeNull();
  });
});
