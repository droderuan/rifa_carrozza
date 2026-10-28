import type { VisaoPublica } from "@/lib/dominio/publico";
import type { StatusReserva } from "@/lib/dominio/tipos";

export class ErroApi extends Error {
  constructor(
    public readonly codigo: string,
    mensagem: string,
    public readonly numeros?: string[],
  ) {
    super(mensagem);
  }
}

export async function chamar<T>(url: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, {
      ...init,
      headers: { "Content-Type": "application/json", ...init?.headers },
      cache: "no-store",
    });
  } catch {
    throw new ErroApi("REDE", "Sem conexão. Verifique a internet e tente de novo.");
  }
  const corpo = await res.json().catch(() => null);
  if (!res.ok) {
    const erro = corpo?.erro;
    throw new ErroApi(erro?.codigo ?? "INTERNO", erro?.mensagem ?? "Erro inesperado, tente novamente.", erro?.numeros);
  }
  return corpo as T;
}

export const obterRifa = () => chamar<VisaoPublica>("/api/rifa");

export const criarReserva = (numeros: string[]) =>
  chamar<{ id: string; numeros: string[]; segundosRestantes: number }>("/api/reservas", {
    method: "POST",
    body: JSON.stringify({ numeros }),
  });

export const obterReserva = (id: string) =>
  chamar<{ id: string; status: StatusReserva; numeros: string[]; segundosRestantes: number }>(
    `/api/reservas/${encodeURIComponent(id)}`,
  );

type RespostaReserva = { id: string; status: StatusReserva; numeros: string[]; segundosRestantes: number };

export const adicionarNumeros = (id: string, numeros: string[]) =>
  chamar<RespostaReserva>(`/api/reservas/${encodeURIComponent(id)}/numeros`, {
    method: "POST",
    body: JSON.stringify({ numeros }),
  });

export const liberarNumeros = (id: string, numeros: string[]) =>
  chamar<RespostaReserva>(`/api/reservas/${encodeURIComponent(id)}/liberar`, {
    method: "POST",
    body: JSON.stringify({ numeros }),
  });

export const confirmar = (id: string, dados: { nome: string; telefone: string }) =>
  chamar<{ id: string; status: StatusReserva; numeros: string[] }>(
    `/api/reservas/${encodeURIComponent(id)}/confirmar`,
    { method: "POST", body: JSON.stringify(dados) },
  );

export const cancelar = (id: string) =>
  chamar<{ id: string; status: StatusReserva }>(`/api/reservas/${encodeURIComponent(id)}`, { method: "DELETE" });
