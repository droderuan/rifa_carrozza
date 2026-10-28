import { describe, expect, it } from "vitest";
import { digitarTelefone, montarTelefone, paisesTelefone, separarTelefone, telefoneValido } from "@/lib/telefone";

describe("paisesTelefone", () => {
  it("lista Brasil, Portugal e EUA primeiro, com nome em português e código", () => {
    const lista = paisesTelefone();
    expect(lista.slice(0, 3).map((p) => p.codigo)).toEqual(["BR", "PT", "US"]);
    expect(lista[0]).toEqual({ codigo: "BR", nome: "Brasil", ddi: "55", bandeira: "🇧🇷" });
    expect(lista.find((p) => p.codigo === "DE")?.nome).toBe("Alemanha");
    expect(lista.length).toBeGreaterThan(200);
  });
});

describe("digitarTelefone", () => {
  it("usa a máscara brasileira para BR e o formato do país nos outros", () => {
    expect(digitarTelefone("BR", "21999998888")).toBe("(21) 99999-8888");
    expect(digitarTelefone("PT", "912345678")).toBe("912 345 678");
  });
});

describe("montarTelefone / telefoneValido / separarTelefone", () => {
  it("monta o número internacional e valida", () => {
    expect(montarTelefone("BR", "(21) 99999-8888")).toBe("+5521999998888");
    expect(montarTelefone("PT", "912 345 678")).toBe("+351912345678");
    expect(telefoneValido("+5521999998888")).toBe(true);
    expect(telefoneValido("+351912")).toBe(false);
  });

  it("separa país e número nacional, inclusive do formato antigo", () => {
    expect(separarTelefone("+351912345678")).toEqual({ pais: "PT", numero: "912 345 678" });
    expect(separarTelefone("+5521999998888")).toEqual({ pais: "BR", numero: "(21) 99999-8888" });
    expect(separarTelefone("21999998888")).toEqual({ pais: "BR", numero: "(21) 99999-8888" });
  });
});
