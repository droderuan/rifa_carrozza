import { describe, expect, it } from "vitest";
import { visaoPublica } from "@/lib/dominio/publico";
import { confirmarReserva, reservar } from "@/lib/dominio/reservas";
import { T0, estadoNovo } from "@/test/fixtures";

describe("visaoPublica", () => {
  it("lista 100 números em ordem e nunca expõe nome ou telefone (critério 1)", () => {
    const e = estadoNovo();
    reservar(e, T0, "r_aaaaaaaaaa", ["7"]);
    confirmarReserva(e, T0, "r_aaaaaaaaaa", { nome: "Maria", telefone: "21999998888" });
    const v = visaoPublica(e);
    expect(v.numeros).toHaveLength(100);
    expect(v.numeros[0]).toEqual({ numero: "1", status: "livre" });
    expect(v.numeros[6]).toEqual({ numero: "7", status: "pendente" });
    expect(v.numeros[99].numero).toBe("100");
    const json = JSON.stringify(v);
    expect(json).not.toContain("Maria");
    expect(json).not.toContain("21999998888");
    expect(json).not.toContain("r_aaaaaaaaaa");
  });
});
