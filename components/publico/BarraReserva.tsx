"use client";
import { TimerIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { formatarMoeda } from "@/lib/formatar";

type Props = { quantidade: number; valorPorNumeroCentavos: number; prazo: number; onFinalizar: () => void };

function formatarRestante(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/** Barra fixa com o resumo da reserva aberta e a contagem regressiva. */
export function BarraReserva({ quantidade, valorPorNumeroCentavos, prazo, onFinalizar }: Props) {
  const [restante, setRestante] = useState(() => prazo - Date.now());

  useEffect(() => {
    const id = setInterval(() => setRestante(prazo - Date.now()), 1000);
    return () => clearInterval(id);
  }, [prazo]);

  const acabando = restante < 60_000;
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
      <div className="mx-auto flex max-w-2xl items-center justify-between gap-3 px-4 py-3 sm:px-5">
        <div className="min-w-0 text-sm">
          <p>
            <strong>
              {quantidade} {quantidade === 1 ? "número" : "números"}
            </strong>{" "}
            <span className="text-muted-foreground">— {formatarMoeda(quantidade * valorPorNumeroCentavos)}</span>
          </p>
          <p
            className={`flex items-center gap-1 font-display font-bold tabular-nums ${acabando ? "text-destructive" : "text-primary"}`}
            aria-live="off"
          >
            <TimerIcon className="size-3.5" />
            {formatarRestante(restante)} para confirmar
          </p>
        </div>
        <Button onClick={onFinalizar} className="h-11 shrink-0 px-5 text-base font-bold">
          Continuar
        </Button>
      </div>
    </div>
  );
}
