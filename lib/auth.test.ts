import { describe, expect, it } from "vitest";
import { criarValorSessao, senhaConfere, validarValorSessao, VALIDADE_SESSAO_S } from "@/lib/auth";

const SEGREDO = "segredo-longo";
const AGORA = Date.parse("2026-10-28T00:00:00Z");

describe("sessão do admin", () => {
  it("valor recém-criado é válido", async () => {
    const v = await criarValorSessao(AGORA, SEGREDO);
    expect(v).toMatch(/^\d+\.[0-9a-f]{64}$/);
    expect(await validarValorSessao(v, AGORA, SEGREDO)).toBe(true);
  });

  it("expira após 7 dias", async () => {
    const v = await criarValorSessao(AGORA, SEGREDO);
    expect(VALIDADE_SESSAO_S).toBe(604800);
    expect(await validarValorSessao(v, AGORA + (VALIDADE_SESSAO_S + 1) * 1000, SEGREDO)).toBe(false);
  });

  it("rejeita assinatura ou validade adulteradas", async () => {
    const v = await criarValorSessao(AGORA, SEGREDO);
    const [exp, sig] = v.split(".");
    const sigTrocada = (sig[0] === "a" ? "b" : "a") + sig.slice(1);
    expect(await validarValorSessao(`${exp}.${sigTrocada}`, AGORA, SEGREDO)).toBe(false);
    expect(await validarValorSessao(`${Number(exp) + 1000}.${sig}`, AGORA, SEGREDO)).toBe(false);
  });

  it("rejeita valores vazios, malformados e outro segredo", async () => {
    for (const v of [undefined, "", "abc", "1.2.3"]) {
      expect(await validarValorSessao(v, AGORA, SEGREDO)).toBe(false);
    }
    const v = await criarValorSessao(AGORA, SEGREDO);
    expect(await validarValorSessao(v, AGORA, "outro")).toBe(false);
  });
});

describe("senhaConfere", () => {
  it("compara senhas", async () => {
    expect(await senhaConfere("x", "x")).toBe(true);
    expect(await senhaConfere("x", "y")).toBe(false);
    expect(await senhaConfere("", "y")).toBe(false);
  });
});
