import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { criarArmazenamentoMemoria, definirArmazenamento, type Armazenamento } from "@/lib/armazenamento";
import { atualizar, invalidarCache, lerEstado, mensagemCommit } from "@/lib/db";
import { reservar } from "@/lib/dominio/reservas";
import { ErroDominio } from "@/lib/erros";
import { estadoNovo } from "@/test/fixtures";

let mem: ReturnType<typeof criarArmazenamentoMemoria>;

beforeEach(() => {
  mem = criarArmazenamentoMemoria(estadoNovo());
  definirArmazenamento(mem);
  invalidarCache();
});

afterEach(() => {
  definirArmazenamento(null);
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("atualizar", () => {
  it("gera exatamente um commit com a mensagem padrão (critério 12)", async () => {
    await atualizar(mensagemCommit, (e, a) => reservar(e, a, "r_aaaaaaaaaa", ["7", "12"]));
    expect(mem.commits).toEqual(["[rifa] reservado r_aaaaaaaaaa 7,12"]);
    const { estado } = await mem.ler();
    expect(estado.numeros["7"].reserva).toBe("r_aaaaaaaaaa");
  });

  it("mutação que retorna false não grava", async () => {
    await atualizar("[rifa] nada", () => false);
    expect(mem.commits).toEqual([]);
  });

  it("ErroDominio sobe sem nova tentativa", async () => {
    const ler = vi.spyOn(mem, "ler");
    await expect(
      atualizar("x", () => {
        throw new ErroDominio("DADOS_INVALIDOS", 400, "m");
      }),
    ).rejects.toMatchObject({ codigo: "DADOS_INVALIDOS" });
    expect(ler).toHaveBeenCalledTimes(1);
    expect(mem.commits).toEqual([]);
  });

  it("tenta de novo após conflito", async () => {
    const ler = vi.spyOn(mem, "ler");
    const original = mem.gravar.bind(mem);
    let primeira = true;
    vi.spyOn(mem, "gravar").mockImplementation(async (...args) => {
      if (primeira) {
        primeira = false;
        return "conflito";
      }
      return original(...args);
    });
    await atualizar("[rifa] x", (e) => {
      e.config.titulo = "Mudou";
    });
    expect(ler).toHaveBeenCalledTimes(2);
    expect(mem.commits).toEqual(["[rifa] x"]);
  });

  it("lança CONFLITO_PERSISTENTE após 5 tentativas", async () => {
    vi.useFakeTimers();
    const sempreConflito: Armazenamento = { ler: mem.ler.bind(mem), gravar: async () => "conflito" };
    const ler = vi.spyOn(sempreConflito, "ler");
    definirArmazenamento(sempreConflito);
    const p = atualizar("x", () => {});
    p.catch(() => {});
    await vi.runAllTimersAsync();
    await expect(p).rejects.toMatchObject({ codigo: "CONFLITO_PERSISTENTE", status: 503 });
    expect(ler).toHaveBeenCalledTimes(5);
  });

  it("duas reservas simultâneas do mesmo número: um sucesso, um 409 (critério 2)", async () => {
    const [a, b] = await Promise.allSettled([
      atualizar(mensagemCommit, (e, ag) => reservar(e, ag, "r_aaaaaaaaaa", ["7"])),
      atualizar(mensagemCommit, (e, ag) => reservar(e, ag, "r_bbbbbbbbbb", ["7"])),
    ]);
    const resultados = [a, b];
    expect(resultados.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    const falha = resultados.find((r) => r.status === "rejected") as PromiseRejectedResult;
    expect(falha.reason).toMatchObject({ codigo: "NUMEROS_INDISPONIVEIS", numeros: ["7"] });
    const { estado } = await mem.ler();
    const donos = Object.values(estado.reservas).filter((r) => estado.numeros["7"].reserva === r.id);
    expect(donos).toHaveLength(1);
    expect(mem.commits).toHaveLength(1);
  });
});

describe("expiração na leitura e na escrita (critério 6)", () => {
  it("leitura mostra livre sem gravar; próxima escrita grava o evento expirado", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-28T00:05:00.000Z"));
    await atualizar(mensagemCommit, (e, a) => reservar(e, a, "r_aaaaaaaaaa", ["7"]));
    vi.setSystemTime(new Date("2026-10-28T00:15:31.000Z"));

    const visao = await lerEstado({ fresco: true });
    expect(visao.numeros["7"].status).toBe("livre");
    expect(mem.commits).toHaveLength(1);

    await atualizar(mensagemCommit, (e, a) => reservar(e, a, "r_bbbbbbbbbb", ["8"]));
    expect(mem.commits).toEqual([
      "[rifa] reservado r_aaaaaaaaaa 7",
      "[rifa] reservado r_bbbbbbbbbb 8",
    ]);
    const { estado } = await mem.ler();
    expect(estado.reservas["r_aaaaaaaaaa"].status).toBe("expirada");
    expect(estado.eventos.filter((e) => e.acao === "expirado")).toHaveLength(1);
  });
});

describe("lerEstado e cache", () => {
  it("cache de 5 s, invalidação e leitura fresca", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    const ler = vi.spyOn(mem, "ler");
    await lerEstado();
    await lerEstado();
    expect(ler).toHaveBeenCalledTimes(1);
    vi.setSystemTime(Date.now() + 5_001);
    await lerEstado();
    expect(ler).toHaveBeenCalledTimes(2);
    invalidarCache();
    await lerEstado();
    expect(ler).toHaveBeenCalledTimes(3);
    await lerEstado({ fresco: true });
    expect(ler).toHaveBeenCalledTimes(4);
  });

  it("retorna cópia: mutar a visão não afeta o cache", async () => {
    const v1 = await lerEstado();
    v1.config.titulo = "alterado";
    const v2 = await lerEstado();
    expect(v2.config.titulo).not.toBe("alterado");
  });

  it("escrita invalida o cache", async () => {
    await lerEstado();
    await atualizar("[rifa] x", (e) => {
      e.config.titulo = "Novo";
    });
    expect((await lerEstado()).config.titulo).toBe("Novo");
  });
});

describe("mensagemCommit", () => {
  it("usa o último evento novo", () => {
    expect(
      mensagemCommit([{ em: "", acao: "perfil_editado", por: "admin", reserva: "r_x", numeros: [] }]),
    ).toBe("[rifa] perfil_editado r_x");
  });
});
