import { describe, expect, it } from "vitest";
import { confirmarNumeros, desconfirmarNumeros, editarPerfil, removerNumeros } from "@/lib/dominio/admin";
import {
  descreverEvento,
  eventosDaReserva,
  eventosDoNumero,
  filtrarPorAcao,
  ordenarPorData,
} from "@/lib/dominio/historico";
import { confirmarReserva, reservar } from "@/lib/dominio/reservas";
import type { Evento } from "@/lib/dominio/tipos";
import { T0, depois, estadoNovo } from "@/test/fixtures";

const A = "r_aaaaaaaaaa";
const B = "r_bbbbbbbbbb";
const t = (min: number) => depois(T0, min * 60_000);

describe("descreverEvento", () => {
  const base = { em: T0.toISOString(), reserva: "r_x", numeros: ["7"], nome: "Ana", telefone: "21999998888" };
  it.each<[Partial<Evento>, string]>([
    [{ acao: "reservado", por: "comprador" }, "Reservado (reserva r_x)"],
    [
      { acao: "solicitado", por: "comprador" },
      "Reserva confirmada por Ana — (21) 99999-8888 — aguardando confirmação",
    ],
    [{ acao: "cancelado", por: "comprador" }, "Reserva cancelada pelo comprador — liberado"],
    [{ acao: "expirado", por: "sistema" }, "Reserva expirou sem confirmação — liberado"],
    [{ acao: "confirmado", por: "admin" }, "Confirmado pelo admin (Ana)"],
    [{ acao: "desconfirmado", por: "admin" }, "Confirmação desfeita pelo admin (Ana) — voltou a pendente"],
    [{ acao: "removido", por: "admin" }, "Atribuição removida pelo admin (Ana) — liberado"],
  ])("%j", (parcial, texto) => {
    expect(descreverEvento({ ...base, ...parcial } as Evento)).toBe(texto);
  });

  it("perfil_editado com dois campos", () => {
    const ev: Evento = {
      em: T0.toISOString(),
      acao: "perfil_editado",
      por: "admin",
      reserva: "r_x",
      numeros: [],
      de: { nome: "A", telefone: "21999998888" },
      para: { nome: "B", telefone: "21988887777" },
    };
    expect(descreverEvento(ev)).toBe(
      'Perfil corrigido: nome "A" → "B"; telefone "(21) 99999-8888" → "(21) 98888-7777"',
    );
  });
});

describe("cenário do histórico (critério 11)", () => {
  it("mostra a sequência completa do número 7 e termina livre", () => {
    const e = estadoNovo();
    reservar(e, t(0), A, ["7"]);
    confirmarReserva(e, t(1), A, { nome: "Alice Prado", telefone: "21999998888" });
    removerNumeros(e, t(2), A);
    reservar(e, t(3), B, ["7"]);
    confirmarReserva(e, t(4), B, { nome: "Bruno Melo", telefone: "11988887777" });
    confirmarNumeros(e, t(5), B);
    desconfirmarNumeros(e, t(6), B);
    removerNumeros(e, t(7), B);

    const h = eventosDoNumero(e.eventos, "7");
    expect(h.map((x) => x.acao)).toEqual([
      "reservado",
      "solicitado",
      "removido",
      "reservado",
      "solicitado",
      "confirmado",
      "desconfirmado",
      "removido",
    ]);
    expect(h.slice(1, 3).map((x) => x.nome)).toEqual(["Alice Prado", "Alice Prado"]);
    expect(h.slice(4).map((x) => x.nome)).toEqual(["Bruno Melo", "Bruno Melo", "Bruno Melo", "Bruno Melo"]);
    expect(e.numeros["7"]).toEqual({ status: "livre", reserva: null });
  });
});

describe("perfil editado preserva snapshots (critério 10)", () => {
  it("eventos anteriores mantêm o nome antigo", () => {
    const e = estadoNovo();
    reservar(e, t(0), A, ["7", "8"]);
    confirmarReserva(e, t(1), A, { nome: "Alice Prado", telefone: "21999998888" });
    confirmarNumeros(e, t(2), A, ["7"]);
    editarPerfil(e, t(3), A, { nome: "Alice Prado Souza" });
    confirmarNumeros(e, t(4), A, ["8"]);
    const r = eventosDaReserva(e.eventos, A);
    expect(r.find((x) => x.acao === "solicitado")!.nome).toBe("Alice Prado");
    expect(r.filter((x) => x.acao === "confirmado").map((x) => x.nome)).toEqual([
      "Alice Prado",
      "Alice Prado Souza",
    ]);
    expect(r.find((x) => x.acao === "perfil_editado")).toMatchObject({
      de: { nome: "Alice Prado" },
      para: { nome: "Alice Prado Souza" },
    });
  });
});

describe("ordenação e filtros", () => {
  const ev = (em: string, acao: Evento["acao"], reserva = "r_x"): Evento => ({
    em,
    acao,
    por: "comprador",
    reserva,
    numeros: ["1"],
  });

  it("ordenarPorData é estável e não muta a entrada", () => {
    const lista = [ev("2026-01-02T00:00:00Z", "cancelado"), ev("2026-01-01T00:00:00Z", "reservado"), ev("2026-01-01T00:00:00Z", "solicitado")];
    const copia = [...lista];
    expect(ordenarPorData(lista).map((x) => x.acao)).toEqual(["reservado", "solicitado", "cancelado"]);
    expect(lista).toEqual(copia);
  });

  it("evento expirado com data anterior aparece na ordem certa", () => {
    const lista = [ev("2026-01-01T00:00:00Z", "reservado"), ev("2026-01-01T00:20:00Z", "reservado", "r_y"), ev("2026-01-01T00:10:00Z", "expirado")];
    expect(eventosDoNumero(lista, "1").map((x) => x.em)).toEqual([
      "2026-01-01T00:00:00Z",
      "2026-01-01T00:10:00Z",
      "2026-01-01T00:20:00Z",
    ]);
  });

  it("filtrarPorAcao", () => {
    const lista = [ev("2026-01-01T00:00:00Z", "reservado"), ev("2026-01-01T00:01:00Z", "cancelado")];
    expect(filtrarPorAcao(lista, "todas")).toHaveLength(2);
    expect(filtrarPorAcao(lista, "cancelado").map((x) => x.acao)).toEqual(["cancelado"]);
  });
});
