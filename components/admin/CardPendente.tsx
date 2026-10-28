"use client";
import { CheckIcon, ExternalLinkIcon, PencilIcon, Trash2Icon } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { ConfirmarAcao } from "@/components/admin/ConfirmarAcao";
import { FormPerfil } from "@/components/admin/FormPerfil";
import { urlAcao, useAcaoAdmin } from "@/components/admin/useAcaoAdmin";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import type { Reserva } from "@/lib/dominio/tipos";
import { formatarMoeda, formatarNumero, formatarTelefone, linkWhatsApp } from "@/lib/formatar";

type Props = { reserva: Reserva; pendentes: string[]; valorPorNumeroCentavos: number; minutos: number };

export function CardPendente({ reserva, pendentes, valorPorNumeroCentavos, minutos }: Props) {
  const { executar, executando } = useAcaoAdmin();
  const [editando, setEditando] = useState(false);
  const telefone = reserva.telefone ?? "";

  return (
    <li className="space-y-3 rounded-xl border bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-semibold">{reserva.nome}</p>
          <a
            href={linkWhatsApp(telefone)}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-sm text-primary underline-offset-4 hover:underline"
          >
            {formatarTelefone(telefone)}
            <ExternalLinkIcon className="size-3.5" />
          </a>
        </div>
        <div className="text-right">
          <p className="font-display font-bold">{formatarMoeda(pendentes.length * valorPorNumeroCentavos)}</p>
          <p className="text-xs text-muted-foreground">solicitada há {minutos} min</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {pendentes.map((n) => (
          <span key={n} className="rounded-md bg-pendente px-2 py-0.5 text-sm font-semibold text-pendente-texto tabular-nums">
            {formatarNumero(n)}
          </span>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          disabled={executando !== null}
          onClick={() => executar("confirmar", urlAcao(reserva.id, "confirmar"), { method: "POST" }, "Números confirmados")}
        >
          <CheckIcon />
          Confirmar todos
        </Button>
        <ConfirmarAcao
          titulo="Remover todos os números?"
          descricao={`Os números ${pendentes.join(", ")} de ${reserva.nome} voltam a ficar livres.`}
          confirmar="Remover"
          onConfirmar={() => executar("remover", urlAcao(reserva.id, "remover"), { method: "POST" }, "Atribuição removida")}
        >
          <Button size="sm" variant="outline" disabled={executando !== null}>
            <Trash2Icon />
            Remover todos
          </Button>
        </ConfirmarAcao>
        <Dialog open={editando} onOpenChange={setEditando}>
          <DialogTrigger asChild>
            <Button size="sm" variant="ghost">
              <PencilIcon />
              Editar perfil
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Editar perfil</DialogTitle>
            </DialogHeader>
            <FormPerfil id={reserva.id} nome={reserva.nome ?? ""} telefone={telefone} onSalvo={() => setEditando(false)} />
          </DialogContent>
        </Dialog>
        <Button size="sm" variant="ghost" asChild>
          <Link href={`/admin/reservas/${reserva.id}`}>Detalhes</Link>
        </Button>
      </div>
    </li>
  );
}
