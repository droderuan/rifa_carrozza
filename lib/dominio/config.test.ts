import { describe, expect, it } from "vitest";
import { editarConfig } from "@/lib/dominio/config";
import { ErroDominio } from "@/lib/erros";
import { estadoNovo } from "@/test/fixtures";

function codigoDe(fn: () => unknown): string {
  try {
    fn();
  } catch (e) {
    if (e instanceof ErroDominio) return e.codigo;
    throw e;
  }
  return "NAO_LANCOU";
}

describe("editarConfig", () => {
  it("faz trim, grava e retorna false quando repetido", () => {
    const e = estadoNovo();
    expect(editarConfig(e, { historia: "  Novo texto  " })).toBe(true);
    expect(e.config.historia).toBe("Novo texto");
    expect(editarConfig(e, { historia: "Novo texto" })).toBe(false);
  });

  it("mescla pix parcial", () => {
    const e = estadoNovo();
    editarConfig(e, { pix: { chave: "123" } });
    expect(e.config.pix).toEqual({ chave: "123", titular: "Alexandre Carrozza", banco: "Banco do Brasil" });
  });

  it("rejeita pix vazio", () => {
    expect(codigoDe(() => editarConfig(estadoNovo(), { pix: { banco: "  " } }))).toBe("DADOS_INVALIDOS");
  });

  it("valida tamanhos", () => {
    expect(codigoDe(() => editarConfig(estadoNovo(), { titulo: "A" }))).toBe("DADOS_INVALIDOS");
    expect(codigoDe(() => editarConfig(estadoNovo(), { historia: "x".repeat(4001) }))).toBe("DADOS_INVALIDOS");
    expect(codigoDe(() => editarConfig(estadoNovo(), { subtitulo: "x".repeat(161) }))).toBe("DADOS_INVALIDOS");
    expect(codigoDe(() => editarConfig(estadoNovo(), { instrucoesPagamento: "x".repeat(2001) }))).toBe(
      "DADOS_INVALIDOS",
    );
  });

  it("valida e remove instagramUrl", () => {
    expect(codigoDe(() => editarConfig(estadoNovo(), { instagramUrl: "https://youtube.com/x" }))).toBe(
      "DADOS_INVALIDOS",
    );
    const e = estadoNovo();
    expect(editarConfig(e, { instagramUrl: "" })).toBe(true);
    expect(e.config).not.toHaveProperty("instagramUrl");
  });

  it("rejeita campos não editáveis sem alterar nada", () => {
    const e = estadoNovo();
    expect(codigoDe(() => editarConfig(e, { valorPorNumeroCentavos: 1 }))).toBe("DADOS_INVALIDOS");
    expect(codigoDe(() => editarConfig(e, { historia: "ok", ultimo: 50 }))).toBe("DADOS_INVALIDOS");
    expect(e.config.valorPorNumeroCentavos).toBe(80000);
    expect(e.config.historia).not.toBe("ok");
  });

  it("rejeita corpo malformado e tipos errados", () => {
    expect(codigoDe(() => editarConfig(estadoNovo(), null))).toBe("DADOS_INVALIDOS");
    expect(codigoDe(() => editarConfig(estadoNovo(), { titulo: 5 }))).toBe("DADOS_INVALIDOS");
    expect(codigoDe(() => editarConfig(estadoNovo(), { pix: "x" }))).toBe("DADOS_INVALIDOS");
  });

  it("não gera eventos", () => {
    const e = estadoNovo();
    editarConfig(e, { titulo: "Outro título" });
    expect(e.eventos).toHaveLength(0);
  });
});
