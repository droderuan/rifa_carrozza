import type { AcaoEvento, Evento } from "@/lib/dominio/tipos";
import { formatarTelefone } from "@/lib/formatar";

export const ROTULOS_ACAO: Record<AcaoEvento, string> = {
  reservado: "Reservado",
  solicitado: "Solicitado",
  cancelado: "Cancelado",
  expirado: "Expirado",
  confirmado: "Confirmado",
  desconfirmado: "Desconfirmado",
  removido: "Removido",
  perfil_editado: "Perfil editado",
};

export function descreverEvento(e: Evento): string {
  const nome = e.nome ?? "?";
  switch (e.acao) {
    case "reservado":
      return `Reservado (reserva ${e.reserva})`;
    case "solicitado":
      return `Reserva confirmada por ${nome} — ${formatarTelefone(e.telefone ?? "")} — aguardando confirmação`;
    case "cancelado":
      return "Reserva cancelada pelo comprador — liberado";
    case "expirado":
      return "Reserva expirou sem confirmação — liberado";
    case "confirmado":
      return `Confirmado pelo admin (${nome})`;
    case "desconfirmado":
      return `Confirmação desfeita pelo admin (${nome}) — voltou a pendente`;
    case "removido":
      return `Atribuição removida pelo admin (${nome}) — liberado`;
    case "perfil_editado": {
      const partes: string[] = [];
      if (e.para?.nome !== undefined) partes.push(`nome "${e.de?.nome ?? ""}" → "${e.para.nome}"`);
      if (e.para?.telefone !== undefined) {
        partes.push(
          `telefone "${formatarTelefone(e.de?.telefone ?? "")}" → "${formatarTelefone(e.para.telefone)}"`,
        );
      }
      return `Perfil corrigido: ${partes.join("; ")}`;
    }
  }
}

/** Ordem cronológica por `em`, estável para eventos com a mesma data. */
export function ordenarPorData(eventos: Evento[]): Evento[] {
  return eventos
    .map((e, i) => [e, i] as const)
    .sort(([a, ia], [b, ib]) => a.em.localeCompare(b.em) || ia - ib)
    .map(([e]) => e);
}

export function eventosDoNumero(eventos: Evento[], n: string): Evento[] {
  return ordenarPorData(eventos.filter((e) => e.numeros.includes(n)));
}

export function eventosDaReserva(eventos: Evento[], id: string): Evento[] {
  return ordenarPorData(eventos.filter((e) => e.reserva === id));
}

export function filtrarPorAcao(eventos: Evento[], acao: AcaoEvento | "todas"): Evento[] {
  return acao === "todas" ? eventos : eventos.filter((e) => e.acao === acao);
}
