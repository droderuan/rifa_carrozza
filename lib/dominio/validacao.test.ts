import { describe, expect, it } from "vitest";
import { normalizarNome, normalizarTelefone } from "@/lib/dominio/validacao";
import { ErroDominio } from "@/lib/erros";

function codigoDe(fn: () => unknown): string | undefined {
  try {
    fn();
  } catch (e) {
    return e instanceof ErroDominio ? e.codigo : "OUTRO";
  }
  return undefined;
}

describe("normalizarNome", () => {
  it("faz trim e colapsa espaços", () => {
    expect(normalizarNome("  Maria   Souza ")).toBe("Maria Souza");
  });

  it("exige entre 2 e 80 caracteres", () => {
    expect(codigoDe(() => normalizarNome("A"))).toBe("DADOS_INVALIDOS");
    expect(codigoDe(() => normalizarNome("a".repeat(81)))).toBe("DADOS_INVALIDOS");
    expect(normalizarNome("a".repeat(80))).toHaveLength(80);
  });

  it("rejeita não-string", () => {
    expect(codigoDe(() => normalizarNome(42))).toBe("DADOS_INVALIDOS");
  });
});

describe("normalizarTelefone", () => {
  it("guarda só dígitos, sem 55", () => {
    expect(normalizarTelefone("(21) 99999-8888")).toBe("21999998888");
    expect(normalizarTelefone("+55 21 99999-8888")).toBe("21999998888");
    expect(normalizarTelefone("5521999998888")).toBe("21999998888");
    expect(normalizarTelefone("551436221234")).toBe("1436221234");
  });

  it("rejeita DDD inválido, tamanho errado e não-string", () => {
    expect(codigoDe(() => normalizarTelefone("10999998888"))).toBe("DADOS_INVALIDOS");
    expect(codigoDe(() => normalizarTelefone("999998888"))).toBe("DADOS_INVALIDOS");
    expect(codigoDe(() => normalizarTelefone(123))).toBe("DADOS_INVALIDOS");
  });
});
