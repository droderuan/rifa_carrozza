"use client";
import { useState } from "react";
import { ListaEventos } from "@/components/admin/ListaEventos";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { filtrarPorAcao, ordenarPorData, ROTULOS_ACAO } from "@/lib/dominio/historico";
import type { AcaoEvento, Evento } from "@/lib/dominio/tipos";

export function HistoricoGeral({ eventos }: { eventos: Evento[] }) {
  const [acao, setAcao] = useState<AcaoEvento | "todas">("todas");
  const lista = filtrarPorAcao(ordenarPorData(eventos), acao).reverse();
  return (
    <div className="space-y-3">
      <Select value={acao} onValueChange={(v) => setAcao(v as AcaoEvento | "todas")}>
        <SelectTrigger className="w-56" aria-label="Filtrar por ação">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="todas">Todas as ações</SelectItem>
          {(Object.keys(ROTULOS_ACAO) as AcaoEvento[]).map((a) => (
            <SelectItem key={a} value={a}>
              {ROTULOS_ACAO[a]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <ListaEventos eventos={lista} />
    </div>
  );
}
