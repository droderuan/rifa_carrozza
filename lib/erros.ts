export type CodigoErro =
  | "DADOS_INVALIDOS"
  | "LIMITE_EXCEDIDO"
  | "NAO_AUTORIZADO"
  | "RESERVA_NAO_ENCONTRADA"
  | "NUMEROS_INDISPONIVEIS"
  | "RESERVA_NAO_ABERTA"
  | "TRANSICAO_INVALIDA"
  | "RESERVA_EXPIRADA"
  | "CONFLITO_PERSISTENTE"
  | "RIFA_NAO_INICIALIZADA"
  | "INTERNO";

export class ErroDominio extends Error {
  constructor(
    public readonly codigo: CodigoErro,
    public readonly status: number,
    mensagem: string,
    public readonly numeros?: string[],
  ) {
    super(mensagem);
    this.name = "ErroDominio";
  }
}

export function respostaErro(e: unknown): Response {
  if (e instanceof ErroDominio) {
    return Response.json(
      {
        erro: {
          codigo: e.codigo,
          mensagem: e.message,
          ...(e.numeros ? { numeros: e.numeros } : {}),
        },
      },
      { status: e.status },
    );
  }
  console.error(e);
  return Response.json(
    { erro: { codigo: "INTERNO", mensagem: "Erro inesperado, tente novamente." } },
    { status: 500 },
  );
}
