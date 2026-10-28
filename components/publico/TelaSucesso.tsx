"use client";
import { CheckCircle2Icon, CopyIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { DadosPix } from "@/lib/dominio/tipos";
import { formatarMoeda } from "@/lib/formatar";

type Props = {
  numeros: string[];
  valorPorNumeroCentavos: number;
  pix?: DadosPix;
  instrucoesPagamento: string;
  onNovaReserva: () => void;
};

export function TelaSucesso({ numeros, valorPorNumeroCentavos, pix, instrucoesPagamento, onNovaReserva }: Props) {
  async function copiar() {
    if (!pix) return;
    try {
      await navigator.clipboard.writeText(pix.chave);
      toast.success("Chave PIX copiada");
    } catch {
      toast.error("Não foi possível copiar. Selecione a chave e copie manualmente.");
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex gap-3">
        <CheckCircle2Icon className="mt-0.5 size-6 shrink-0 text-primary" />
        <p className="leading-relaxed">
          Recebemos sua reserva dos números {numeros.join(", ")}. Ela está pendente de confirmação pelo organizador.
        </p>
      </div>

      <div className="space-y-4 rounded-xl border border-primary/30 bg-primary/5 p-4">
        <div className="flex items-baseline justify-between">
          <span className="text-sm text-muted-foreground">Total a pagar</span>
          <span className="font-display text-2xl font-bold text-primary">
            {formatarMoeda(numeros.length * valorPorNumeroCentavos)}
          </span>
        </div>
        {pix && (
          <>
            <div className="space-y-1">
              <span className="text-xs tracking-wide text-muted-foreground uppercase">Chave PIX</span>
              <p className="font-display text-xl font-bold tracking-wide select-all">{pix.chave}</p>
              <p className="text-sm text-muted-foreground">
                {pix.titular} · {pix.banco}
              </p>
            </div>
            <Button onClick={copiar} className="h-11 w-full text-base font-bold">
              <CopyIcon />
              Copiar chave PIX
            </Button>
          </>
        )}
        {instrucoesPagamento && <p className="text-sm leading-relaxed whitespace-pre-line">{instrucoesPagamento}</p>}
      </div>

      <Button variant="ghost" className="w-full" onClick={onNovaReserva}>
        Reservar mais números
      </Button>
    </div>
  );
}
