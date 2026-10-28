import { describe, expect, it } from "vitest";
import {
  formatarDataHora,
  formatarMoeda,
  formatarNumero,
  formatarTelefone,
  linkWhatsApp,
  mascaraTelefone,
  minutosDesde,
} from "@/lib/formatar";
import { T0, depois } from "@/test/fixtures";

describe("formatarNumero", () => {
  it("usa pelo menos 2 dígitos", () => {
    expect(formatarNumero("7")).toBe("07");
    expect(formatarNumero("100")).toBe("100");
  });
});

describe("formatarMoeda", () => {
  it("formata centavos em reais com espaço normal", () => {
    expect(formatarMoeda(80000)).toBe("R$ 800,00");
    expect(formatarMoeda(8000000)).toBe("R$ 80.000,00");
  });
});

describe("formatarTelefone", () => {
  it("formata celular e fixo", () => {
    expect(formatarTelefone("21999998888")).toBe("(21) 99999-8888");
    expect(formatarTelefone("1436221234")).toBe("(14) 3622-1234");
  });
});

describe("mascaraTelefone", () => {
  it("aplica a máscara progressivamente e corta excesso", () => {
    expect(mascaraTelefone("2199999")).toBe("(21) 9999-9");
    expect(mascaraTelefone("21999998888123")).toBe("(21) 99999-8888");
  });
});

describe("linkWhatsApp", () => {
  it("monta o link com 55", () => {
    expect(linkWhatsApp("21999998888")).toBe("https://wa.me/5521999998888");
  });
});

describe("formatarDataHora", () => {
  it("exibe no fuso de São Paulo", () => {
    const s = formatarDataHora("2026-10-28T00:05:00.000Z");
    expect(s).toContain("27/10/2026");
    expect(s).toContain("21:05");
  });
});

describe("minutosDesde", () => {
  it("arredonda para baixo", () => {
    expect(minutosDesde("2026-10-28T00:05:00.000Z", depois(T0, 7 * 60000 + 59000))).toBe(7);
  });
});
