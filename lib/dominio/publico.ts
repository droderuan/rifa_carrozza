import type { Config, Estado, StatusNumero } from "@/lib/dominio/tipos";

export interface NumeroPublico {
  numero: string;
  status: StatusNumero;
}

export interface VisaoPublica {
  config: Config;
  numeros: NumeroPublico[];
}

/** Dados da grade pública: sem reservas, nomes ou telefones. */
export function visaoPublica(estado: Estado): VisaoPublica {
  const numeros = Object.keys(estado.numeros)
    .sort((a, b) => Number(a) - Number(b))
    .map((numero) => ({ numero, status: estado.numeros[numero].status }));
  return { config: structuredClone(estado.config), numeros };
}
