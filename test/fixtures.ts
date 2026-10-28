import { CONFIG_PADRAO, criarEstadoInicial } from "@/lib/dominio/estado-inicial";
import type { Config, Estado } from "@/lib/dominio/tipos";

export const T0 = new Date("2026-10-28T00:05:00.000Z");

export function depois(base: Date, ms: number): Date {
  return new Date(base.getTime() + ms);
}

export function estadoNovo(parcial: Partial<Config> = {}): Estado {
  return criarEstadoInicial({ ...CONFIG_PADRAO, ...parcial });
}
