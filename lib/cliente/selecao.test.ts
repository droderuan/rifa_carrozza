import { describe, expect, it } from "vitest";
import { podarSelecao } from "@/lib/cliente/selecao";

describe("podarSelecao", () => {
  it("remove da seleção números que deixaram de estar livres", () => {
    expect(
      podarSelecao(
        ["7", "12"],
        [
          { numero: "7", status: "livre" },
          { numero: "12", status: "reservado" },
        ],
      ),
    ).toEqual({ mantidos: ["7"], removidos: ["12"] });
  });

  it("remove números que não existem mais", () => {
    expect(podarSelecao(["200"], [{ numero: "1", status: "livre" }])).toEqual({ mantidos: [], removidos: ["200"] });
  });
});
