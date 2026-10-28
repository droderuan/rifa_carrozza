import { describe, expect, it } from "vitest";
import { aplicarExpiracoes, estaEfetivamenteExpirada } from "@/lib/dominio/expiracao";
import { reservar } from "@/lib/dominio/reservas";
import { T0, depois, estadoNovo } from "@/test/fixtures";

const ID = "r_aaaaaaaaaa";
const EXPIRA = depois(T0, 10 * 60_000);

describe("aplicarExpiracoes", () => {
  it("expira reserva vencida além da tolerância", () => {
    const e = estadoNovo();
    reservar(e, T0, ID, ["7", "12"]);
    aplicarExpiracoes(e, depois(EXPIRA, 31_000));
    expect(e.reservas[ID].status).toBe("expirada");
    expect(e.numeros["7"]).toEqual({ status: "livre", reserva: null });
    expect(e.numeros["12"]).toEqual({ status: "livre", reserva: null });
    expect(e.eventos.at(-1)).toEqual({
      em: EXPIRA.toISOString(),
      acao: "expirado",
      por: "sistema",
      reserva: ID,
      numeros: ["7", "12"],
    });
  });

  it("não expira dentro da tolerância", () => {
    const e = estadoNovo();
    reservar(e, T0, ID, ["7"]);
    aplicarExpiracoes(e, depois(EXPIRA, 29_000));
    expect(e.reservas[ID].status).toBe("aberta");
    expect(estaEfetivamenteExpirada(e.reservas[ID], depois(EXPIRA, 29_000))).toBe(false);
  });

  it("é idempotente", () => {
    const e = estadoNovo();
    reservar(e, T0, ID, ["7"]);
    aplicarExpiracoes(e, depois(EXPIRA, 31_000));
    aplicarExpiracoes(e, depois(EXPIRA, 60_000));
    expect(e.eventos.filter((x) => x.acao === "expirado")).toHaveLength(1);
  });
});
