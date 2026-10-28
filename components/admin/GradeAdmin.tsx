"use client";
import { useState } from "react";
import { GradeNumeros, LegendaGrade } from "@/components/GradeNumeros";
import { ListaEventos } from "@/components/admin/ListaEventos";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { eventosDoNumero } from "@/lib/dominio/historico";
import type { NumeroPublico } from "@/lib/dominio/publico";
import type { Evento } from "@/lib/dominio/tipos";
import { formatarNumero } from "@/lib/formatar";

type Props = { numeros: NumeroPublico[]; donos: Record<string, string>; eventos: Evento[] };

export function GradeAdmin({ numeros, donos, eventos }: Props) {
  const [aberto, setAberto] = useState<string | null>(null);
  return (
    <>
      <GradeNumeros
        numeros={numeros}
        clicavel={() => true}
        onClicar={setAberto}
        envolver={(n, botao) =>
          donos[n.numero] ? (
            <Tooltip>
              <TooltipTrigger asChild>{botao}</TooltipTrigger>
              <TooltipContent>{donos[n.numero]}</TooltipContent>
            </Tooltip>
          ) : (
            botao
          )
        }
      />
      <LegendaGrade />
      <Dialog open={aberto !== null} onOpenChange={(o) => !o && setAberto(null)}>
        <DialogContent className="max-h-[85svh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Número {aberto && formatarNumero(aberto)}</DialogTitle>
            <DialogDescription>{(aberto && donos[aberto]) || "Livre"}</DialogDescription>
          </DialogHeader>
          {aberto && <ListaEventos eventos={eventosDoNumero(eventos, aberto)} mostrarNumeros={false} />}
        </DialogContent>
      </Dialog>
    </>
  );
}
