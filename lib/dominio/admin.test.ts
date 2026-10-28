import { describe, expect, it } from "vitest";
import {
  ACOES_ADMIN,
  confirmarNumeros,
  desconfirmarNumeros,
  editarPerfil,
  removerNumeros,
} from "@/lib/dominio/admin";
import { confirmarReserva, reservar } from "@/lib/dominio/reservas";
import type { Estado } from "@/lib/dominio/tipos";
import { ErroDominio } from "@/lib/erros";
import { T0, depois, estadoNovo } from "@/test/fixtures";

const A = "r_aaaaaaaaaa";
const B = "r_bbbbbbbbbb";

function solicitada(e: Estado, id: string, numeros: string[], nome = "Ana Lima", telefone = "21999998888") {
  reservar(e, T0, id, numeros);
  confirmarReserva(e, T0, id, { nome, telefone });
}

function codigoDe(fn: () => unknown): string {
  try {
    fn();
  } catch (e) {
    if (e instanceof ErroDominio) return e.codigo;
    throw e;
  }
  return "NAO_LANCOU";
}

const T1 = depois(T0, 60_000);

describe("confirmarNumeros", () => {
  it("pendente → confirmado com snapshot", () => {
    const e = estadoNovo();
    solicitada(e, A, ["7", "12"]);
    confirmarNumeros(e, T1, A, ["7"]);
    expect(e.numeros["7"].status).toBe("confirmado");
    expect(e.numeros["12"].status).toBe("pendente");
    expect(e.eventos.at(-1)).toEqual({
      em: T1.toISOString(),
      acao: "confirmado",
      por: "admin",
      reserva: A,
      numeros: ["7"],
      nome: "Ana Lima",
      telefone: "+5521999998888",
    });
  });

  it("sem numeros aplica a todos os pendentes", () => {
    const e = estadoNovo();
    solicitada(e, A, ["7", "12"]);
    confirmarNumeros(e, T1, A);
    expect(e.numeros["7"].status).toBe("confirmado");
    expect(e.numeros["12"].status).toBe("confirmado");
  });

  it("rejeita número já confirmado e quando não há pendentes", () => {
    const e = estadoNovo();
    solicitada(e, A, ["7"]);
    confirmarNumeros(e, T1, A);
    expect(codigoDe(() => confirmarNumeros(e, T1, A, ["7"]))).toBe("TRANSICAO_INVALIDA");
    expect(codigoDe(() => confirmarNumeros(e, T1, A))).toBe("TRANSICAO_INVALIDA");
  });

  it("falha por inteiro se algum número não pertence à reserva", () => {
    const e = estadoNovo();
    solicitada(e, A, ["7"]);
    solicitada(e, B, ["12"]);
    expect(codigoDe(() => confirmarNumeros(e, T1, A, ["7", "12"]))).toBe("TRANSICAO_INVALIDA");
    expect(e.numeros["7"].status).toBe("pendente");
  });

  it("rejeita reserva aberta e entrada malformada", () => {
    const e = estadoNovo();
    reservar(e, T0, A, ["7"]);
    expect(codigoDe(() => confirmarNumeros(e, T1, A, ["7"]))).toBe("TRANSICAO_INVALIDA");
    solicitada(e, B, ["12"]);
    expect(codigoDe(() => confirmarNumeros(e, T1, B, "12"))).toBe("DADOS_INVALIDOS");
    expect(codigoDe(() => confirmarNumeros(e, T1, "r_zzzzzzzzzz"))).toBe("RESERVA_NAO_ENCONTRADA");
  });
});

describe("desconfirmarNumeros", () => {
  it("confirmado → pendente", () => {
    const e = estadoNovo();
    solicitada(e, A, ["7"]);
    confirmarNumeros(e, T1, A);
    desconfirmarNumeros(e, T1, A, ["7"]);
    expect(e.numeros["7"].status).toBe("pendente");
    expect(e.eventos.at(-1)).toMatchObject({ acao: "desconfirmado", por: "admin", nome: "Ana Lima" });
  });

  it("rejeita pendente", () => {
    const e = estadoNovo();
    solicitada(e, A, ["7"]);
    expect(codigoDe(() => desconfirmarNumeros(e, T1, A, ["7"]))).toBe("TRANSICAO_INVALIDA");
  });
});

describe("removerNumeros", () => {
  it("pendente e confirmado → livre; reserva continua solicitada", () => {
    const e = estadoNovo();
    solicitada(e, A, ["7", "12"]);
    confirmarNumeros(e, T1, A, ["12"]);
    removerNumeros(e, T1, A);
    expect(e.numeros["7"]).toEqual({ status: "livre", reserva: null });
    expect(e.numeros["12"]).toEqual({ status: "livre", reserva: null });
    expect(e.reservas[A].status).toBe("solicitada");
    expect(e.eventos.at(-1)).toMatchObject({ acao: "removido", numeros: ["7", "12"], nome: "Ana Lima" });
  });

  it("rejeita reservado e reserva sem números", () => {
    const e = estadoNovo();
    reservar(e, T0, A, ["7"]);
    expect(codigoDe(() => removerNumeros(e, T1, A, ["7"]))).toBe("TRANSICAO_INVALIDA");
    solicitada(e, B, ["12"]);
    removerNumeros(e, T1, B);
    expect(codigoDe(() => removerNumeros(e, T1, B))).toBe("TRANSICAO_INVALIDA");
  });
});

describe("ACOES_ADMIN", () => {
  it("mapeia as três ações", () => {
    expect(ACOES_ADMIN.confirmar).toBe(confirmarNumeros);
    expect(ACOES_ADMIN.desconfirmar).toBe(desconfirmarNumeros);
    expect(ACOES_ADMIN.remover).toBe(removerNumeros);
  });
});

describe("editarPerfil", () => {
  it("grava perfil_editado com de/para só dos campos alterados", () => {
    const e = estadoNovo();
    solicitada(e, A, ["7"], "Ana Lima");
    expect(editarPerfil(e, T1, A, { nome: "Ana  Souza", telefone: "(21) 99999-8888" })).toBe(true);
    expect(e.reservas[A].nome).toBe("Ana Souza");
    expect(e.eventos.at(-1)).toEqual({
      em: T1.toISOString(),
      acao: "perfil_editado",
      por: "admin",
      reserva: A,
      numeros: [],
      de: { nome: "Ana Lima" },
      para: { nome: "Ana Souza" },
    });
  });

  it("retorna false sem evento quando nada mudou", () => {
    const e = estadoNovo();
    solicitada(e, A, ["7"]);
    const antes = e.eventos.length;
    expect(editarPerfil(e, T1, A, { nome: "Ana Lima" })).toBe(false);
    expect(e.eventos).toHaveLength(antes);
  });

  it("só vale para reservas solicitadas e valida dados", () => {
    const e = estadoNovo();
    reservar(e, T0, A, ["7"]);
    expect(codigoDe(() => editarPerfil(e, T1, A, { nome: "Bia" }))).toBe("TRANSICAO_INVALIDA");
    solicitada(e, B, ["12"]);
    expect(codigoDe(() => editarPerfil(e, T1, B, { telefone: "123" }))).toBe("DADOS_INVALIDOS");
  });
});
