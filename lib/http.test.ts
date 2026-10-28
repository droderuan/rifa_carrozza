import { describe, expect, it, vi } from "vitest";
import { lerCorpo, rota } from "@/lib/http";
import { ErroDominio } from "@/lib/erros";

const req = (body: string) => new Request("http://x/", { method: "POST", body });

describe("lerCorpo", () => {
  it.each(["{", "[]", "null", "3"])("rejeita %s", async (body) => {
    await expect(lerCorpo(req(body))).rejects.toMatchObject({ codigo: "DADOS_INVALIDOS", status: 400 });
  });

  it("aceita objeto e corpo vazio", async () => {
    expect(await lerCorpo(req('{"a":1}'))).toEqual({ a: 1 });
    expect(await lerCorpo(req(""))).toEqual({});
  });
});

describe("rota", () => {
  it("converte ErroDominio no formato padrão", async () => {
    const h = rota(async () => {
      throw new ErroDominio("NUMEROS_INDISPONIVEIS", 409, "m", ["7"]);
    });
    const res = await h(req(""), {});
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ erro: { codigo: "NUMEROS_INDISPONIVEIS", mensagem: "m", numeros: ["7"] } });
  });

  it("erro comum vira 500 INTERNO", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await rota(async () => {
      throw new Error("boom");
    })(req(""), {});
    expect(res.status).toBe(500);
    expect((await res.json()).erro.codigo).toBe("INTERNO");
  });
});
