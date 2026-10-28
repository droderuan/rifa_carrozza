import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { codificar, decodificar, gravarArquivo, inicializarDados, lerArquivo } from "@/lib/github";
import { estadoNovo } from "@/test/fixtures";

beforeEach(() => {
  vi.stubEnv("GITHUB_TOKEN", "tok");
  vi.stubEnv("GITHUB_OWNER", "droderuan");
  vi.stubEnv("GITHUB_REPO", "rifa_carrozza");
  vi.stubEnv("GITHUB_BRANCH", "dados-teste");
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
    expect(url).toBe("https://api.github.com/repos/droderuan/rifa_carrozza/contents/rifa.json?ref=dados-teste");
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
    expect(body).toMatchObject({ message: "[rifa] x", branch: "dados-teste", sha: "abc" });
  });
});

describe("branch de dados", () => {
  it("GITHUB_BRANCH é obrigatório (nunca cai no main sem avisar)", async () => {
    vi.stubEnv("GITHUB_BRANCH", "");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await expect(lerArquivo()).rejects.toThrow("GITHUB_BRANCH");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("inicializarDados", () => {
  const API = "https://api.github.com/repos/droderuan/rifa_carrozza";

  it("cria branch órfão só com o rifa.json quando o branch não existe", async () => {
    const chamadas: [string, RequestInit | undefined][] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, init?: RequestInit) => {
        chamadas.push([url, init]);
        if (url.endsWith("/git/ref/heads/dados-teste")) return new Response("{}", { status: 404 });
        if (url.endsWith("/git/trees")) return Response.json({ sha: "tree1" }, { status: 201 });
        if (url.endsWith("/git/commits")) return Response.json({ sha: "commit1" }, { status: 201 });
        if (url.endsWith("/git/refs")) return Response.json({}, { status: 201 });
        throw new Error("inesperado: " + url);
      }),
    );
    const e = estadoNovo();
    expect(await inicializarDados(e, "[rifa] inicialização")).toBe("branch-criado");
    const corpo = (fim: string) => JSON.parse(chamadas.find(([u]) => u === API + fim)![1]!.body as string);
    const tree = corpo("/git/trees");
    expect(tree).not.toHaveProperty("base_tree");
    expect(tree.tree).toEqual([{ path: "rifa.json", mode: "100644", type: "blob", content: JSON.stringify(e, null, 2) }]);
    expect(corpo("/git/commits")).toEqual({ message: "[rifa] inicialização", tree: "tree1", parents: [] });
    expect(corpo("/git/refs")).toEqual({ ref: "refs/heads/dados-teste", sha: "commit1" });
  });

  it("cria só o arquivo quando o branch existe sem ele", async () => {
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (url.endsWith("/git/ref/heads/dados-teste")) return Response.json({});
      if (url.includes("/contents/rifa.json?ref=")) return new Response("{}", { status: 404 });
      if (url.endsWith("/contents/rifa.json") && init?.method === "PUT") return Response.json({});
      throw new Error("inesperado: " + url);
    });
    vi.stubGlobal("fetch", fetchMock);
    expect(await inicializarDados(estadoNovo(), "m")).toBe("arquivo-criado");
  });

  it("não sobrescreve quando o arquivo já existe", async () => {
    const fetchMock = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>(async (url) => {
      if (url.endsWith("/git/ref/heads/dados-teste")) return Response.json({});
      if (url.includes("/contents/rifa.json?ref=")) return Response.json({ content: "", encoding: "base64", sha: "x" });
      throw new Error("inesperado: " + url);
    });
    vi.stubGlobal("fetch", fetchMock);
    expect(await inicializarDados(estadoNovo(), "m")).toBe("ja-existe");
    expect(fetchMock.mock.calls.every(([, init]) => !init?.method)).toBe(true);
  });
});
