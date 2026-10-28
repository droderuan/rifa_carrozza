"use client";
import { Loader2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatarMoeda } from "@/lib/formatar";

type Props = { quantidade: number; valorPorNumeroCentavos: number; reservando: boolean; onReservar: () => void };

export function BarraSelecao({ quantidade, valorPorNumeroCentavos, reservando, onReservar }: Props) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
      <div className="mx-auto flex max-w-2xl items-center justify-between gap-3 px-5 py-3">
        <p className="text-sm">
          <strong>
            {quantidade} {quantidade === 1 ? "número" : "números"}
          </strong>{" "}
          <span className="text-muted-foreground">— {formatarMoeda(quantidade * valorPorNumeroCentavos)}</span>
        </p>
        <Button onClick={onReservar} disabled={reservando} className="h-11 px-6 text-base font-bold">
          {reservando && <Loader2Icon className="animate-spin" />}
          Reservar
        </Button>
      </div>
    </div>
  );
}
