import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { codificar, decodificar, gravarArquivo, lerArquivo } from "@/lib/github";
import { estadoNovo } from "@/test/fixtures";

beforeEach(() => {
  vi.stubEnv("GITHUB_TOKEN", "tok");
  vi.stubEnv("GITHUB_OWNER", "droderuan");
  vi.stubEnv("GITHUB_REPO", "rifa_carrozza");
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("codificar/decodificar", () => {
  it("preserva acentos e emoji", () => {
    const e = estadoNovo();
    e.config.titulo = "João Conceição 🎸";
    expect(decodificar(codificar(e)).config.titulo).toBe("João Conceição 🎸");
  });
});

describe("lerArquivo", () => {
  it("envia auth, user-agent e ref, e decodifica", async () => {
    const e = estadoNovo();
    const fetchMock = vi.fn(async () => Response.json({ content: codificar(e), encoding: "base64", sha: "abc" }));
    vi.stubGlobal("fetch", fetchMock);
    const r = await lerArquivo();
    expect(r.sha).toBe("abc");
    expect(r.estado.config.titulo).toBe(e.config.titulo);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://api.github.com/repos/droderuan/rifa_carrozza/contents/rifa.json?ref=main");
    const h = init.headers as Record<string, string>;
    expect(h.Authorization).toBe("Bearer tok");
    expect(h["User-Agent"]).toBe("rifa-carrozza");
  });

  it("arquivo acima de 1 MB (encoding none) é lido pelo formato raw", async () => {
    const e = estadoNovo();
    e.config.titulo = "Grande 🎸";
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(Response.json({ content: "", encoding: "none", sha: "big" }))
      .mockResolvedValueOnce(new Response(JSON.stringify(e)));
    vi.stubGlobal("fetch", fetchMock);
    const r = await lerArquivo();
    expect(r).toMatchObject({ sha: "big", estado: { config: { titulo: "Grande 🎸" } } });
    const init = fetchMock.mock.calls[1][1] as RequestInit;
    expect((init.headers as Record<string, string>).Accept).toBe("application/vnd.github.raw+json");
  });

  it("404 vira RIFA_NAO_INICIALIZADA", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("{}", { status: 404 })));
    await expect(lerArquivo()).rejects.toMatchObject({ codigo: "RIFA_NAO_INICIALIZADA", status: 503 });
  });
});

describe("gravarArquivo", () => {
  it("409 retorna conflito", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("{}", { status: 409 })));
    expect(await gravarArquivo(estadoNovo(), "abc", "m")).toBe("conflito");
  });

  it("200 retorna ok e envia sha, branch e mensagem", async () => {
    const fetchMock = vi.fn(async () => Response.json({}));
    vi.stubGlobal("fetch", fetchMock);
    expect(await gravarArquivo(estadoNovo(), "abc", "[rifa] x")).toBe("ok");
    const init = (fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1];
    const body = JSON.parse(init.body as string);
    expect(init.method).toBe("PUT");
    expect(body).toMatchObject({ message: "[rifa] x", branch: "main", sha: "abc" });
  });
});
