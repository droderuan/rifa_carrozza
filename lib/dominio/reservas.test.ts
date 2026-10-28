import { describe, expect, it } from "vitest";
import {
  cancelarReserva,
  confirmarReserva,
  gerarIdReserva,
  numerosDaReserva,
  reservar,
  segundosRestantes,
} from "@/lib/dominio/reservas";
import { aplicarExpiracoes } from "@/lib/dominio/expiracao";
import { ErroDominio } from "@/lib/erros";
import { T0, depois, estadoNovo } from "@/test/fixtures";

const ID = "r_aaaaaaaaaa";
const MIN = 60_000;

function erroDe(fn: () => unknown): ErroDominio {
  try {
    fn();
  } catch (e) {
    if (e instanceof ErroDominio) return e;
    throw e;
  }
  throw new Error("não lançou");
}

describe("reservar", () => {
  it("marca os números como reservados e cria a reserva aberta", () => {
    const e = estadoNovo();
    reservar(e, T0, ID, ["7", "12"]);
    expect(e.numeros["7"]).toEqual({ status: "reservado", reserva: ID });
    expect(e.numeros["12"]).toEqual({ status: "reservado", reserva: ID });
    expect(e.reservas[ID]).toEqual({
      id: ID,
      status: "aberta",
      nome: null,
      telefone: null,
      criadaEm: T0.toISOString(),
      expiraEm: depois(T0, 10 * MIN).toISOString(),
      solicitadaEm: null,
    });
    const ev = e.eventos.at(-1)!;
    expect(ev).toEqual({
      em: T0.toISOString(),
      acao: "reservado",
      por: "comprador",
      reserva: ID,
      numeros: ["7", "12"],
    });
    expect(ev).not.toHaveProperty("nome");
  });

  it.each([[["7", "7"]], [[]], ["7"], [["0"]], [["101"]], [[7]]])(
    "rejeita entrada inválida %j",
    (numeros) => {
      expect(erroDe(() => reservar(estadoNovo(), T0, ID, numeros)).codigo).toBe("DADOS_INVALIDOS");
    },
  );

  it("respeita maxPorReserva", () => {
    const e = estadoNovo({ maxPorReserva: 2 });
    expect(erroDe(() => reservar(e, T0, ID, ["1", "2", "3"])).codigo).toBe("LIMITE_EXCEDIDO");
  });

  it("falha por inteiro se algum número estiver ocupado (critério 3)", () => {
    const e = estadoNovo();
    reservar(e, T0, "r_bbbbbbbbbb", ["12"]);
    const err = erroDe(() => reservar(e, T0, ID, ["7", "12"]));
    expect(err.codigo).toBe("NUMEROS_INDISPONIVEIS");
    expect(err.status).toBe(409);
    expect(err.numeros).toEqual(["12"]);
    expect(e.numeros["7"]).toEqual({ status: "livre", reserva: null });
    expect(e.reservas[ID]).toBeUndefined();
  });

  it("permite reservar número de reserva vencida após aplicarExpiracoes", () => {
    const e = estadoNovo();
    reservar(e, T0, "r_bbbbbbbbbb", ["7"]);
    const agora = depois(T0, 10 * MIN + 31_000);
    aplicarExpiracoes(e, agora);
    reservar(e, agora, ID, ["7"]);
    expect(e.numeros["7"].reserva).toBe(ID);
  });

  it("rejeita id que já existe", () => {
    const e = estadoNovo();
    reservar(e, T0, ID, ["1"]);
    expect(() => reservar(e, T0, ID, ["2"])).toThrow();
  });
});

describe("confirmarReserva", () => {
  it("leva números a pendente e grava perfil normalizado (critério 7)", () => {
    const e = estadoNovo();
    reservar(e, T0, ID, ["7", "12"]);
    const agora = depois(T0, 9 * MIN);
    confirmarReserva(e, agora, ID, { nome: " Maria  Souza", telefone: "(21) 99999-8888" });
    expect(e.numeros["7"].status).toBe("pendente");
    expect(e.numeros["12"].status).toBe("pendente");
    const r = e.reservas[ID];
    expect(r.status).toBe("solicitada");
    expect(r.nome).toBe("Maria Souza");
    expect(r.telefone).toBe("21999998888");
    expect(r.solicitadaEm).toBe(agora.toISOString());
    expect(e.eventos.at(-1)).toEqual({
      em: agora.toISOString(),
      acao: "solicitado",
      por: "comprador",
      reserva: ID,
      numeros: ["7", "12"],
      nome: "Maria Souza",
      telefone: "21999998888",
    });
  });

  it("aceita até 30 s após expiraEm e rejeita depois (critério 5)", () => {
    const ok = estadoNovo();
    reservar(ok, T0, ID, ["7"]);
    confirmarReserva(ok, depois(T0, 10 * MIN + 29_000), ID, { nome: "Ana", telefone: "21999998888" });
    expect(ok.reservas[ID].status).toBe("solicitada");

    const tarde = estadoNovo();
    reservar(tarde, T0, ID, ["7"]);
    const err = erroDe(() =>
      confirmarReserva(tarde, depois(T0, 10 * MIN + 31_000), ID, { nome: "Ana", telefone: "21999998888" }),
    );
    expect(err.codigo).toBe("RESERVA_EXPIRADA");
    expect(err.status).toBe(410);
  });

  it("rejeita reserva não aberta e inexistente", () => {
    const e = estadoNovo();
    reservar(e, T0, ID, ["7"]);
    confirmarReserva(e, T0, ID, { nome: "Ana", telefone: "21999998888" });
    expect(erroDe(() => confirmarReserva(e, T0, ID, { nome: "Ana", telefone: "21999998888" })).codigo).toBe(
      "RESERVA_NAO_ABERTA",
    );
    const nf = erroDe(() => confirmarReserva(e, T0, "r_zzzzzzzzzz", { nome: "Ana", telefone: "21999998888" }));
    expect(nf.codigo).toBe("RESERVA_NAO_ENCONTRADA");
    expect(nf.status).toBe(404);
  });

  it("não muda nada com dados inválidos", () => {
    const e = estadoNovo();
    reservar(e, T0, ID, ["7"]);
    expect(erroDe(() => confirmarReserva(e, T0, ID, { nome: "A", telefone: "21999998888" })).codigo).toBe(
      "DADOS_INVALIDOS",
    );
    expect(e.reservas[ID].status).toBe("aberta");
  });
});

describe("cancelarReserva", () => {
  it("libera números e registra cancelado", () => {
    const e = estadoNovo();
    reservar(e, T0, ID, ["7", "12"]);
    cancelarReserva(e, depois(T0, MIN), ID);
    expect(e.numeros["7"]).toEqual({ status: "livre", reserva: null });
    expect(e.reservas[ID].status).toBe("cancelada");
    expect(e.eventos.at(-1)).toMatchObject({ acao: "cancelado", por: "comprador", numeros: ["7", "12"] });
  });

  it("rejeita reserva solicitada com 409 (critério 8)", () => {
    const e = estadoNovo();
    reservar(e, T0, ID, ["7"]);
    confirmarReserva(e, T0, ID, { nome: "Ana", telefone: "21999998888" });
    const err = erroDe(() => cancelarReserva(e, T0, ID));
    expect(err.codigo).toBe("RESERVA_NAO_ABERTA");
    expect(err.status).toBe(409);
  });
});

describe("segundosRestantes", () => {
  it("conta até expiraEm sem tolerância", () => {
    const e = estadoNovo();
    reservar(e, T0, ID, ["7"]);
    const r = e.reservas[ID];
    expect(segundosRestantes(r, depois(T0, 1000))).toBe(599);
    expect(segundosRestantes(r, depois(T0, 11 * MIN))).toBe(0);
    confirmarReserva(e, T0, ID, { nome: "Ana", telefone: "21999998888" });
    expect(segundosRestantes(e.reservas[ID], T0)).toBe(0);
  });
});

describe("numerosDaReserva", () => {
  it("retorna em ordem numérica", () => {
    const e = estadoNovo();
    reservar(e, T0, ID, ["12", "7", "100"]);
    expect(numerosDaReserva(e, ID)).toEqual(["7", "12", "100"]);
  });
});

describe("gerarIdReserva", () => {
  it("tem o formato r_ + 10 [a-z0-9] e não colide", () => {
    const e = estadoNovo();
    const id = gerarIdReserva(e.reservas);
    expect(id).toMatch(/^r_[a-z0-9]{10}$/);
    reservar(e, T0, id, ["1"]);
    for (let i = 0; i < 50; i++) expect(gerarIdReserva(e.reservas)).not.toBe(id);
  });
});
