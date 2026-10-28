import type { ReactNode } from "react";
import type { NumeroPublico } from "@/lib/dominio/publico";
import type { StatusNumero } from "@/lib/dominio/tipos";
import { formatarNumero } from "@/lib/formatar";
import { cn } from "@/lib/utils";

const CLASSES: Record<StatusNumero | "selecionado", string> = {
  livre: "bg-livre border-livre-borda text-livre-texto",
  selecionado: "bg-selecionado border-selecionado text-selecionado-texto ring-2 ring-selecionado/30",
  reservado: "bg-reservado border-reservado text-reservado-texto",
  pendente: "bg-pendente border-pendente text-pendente-texto",
  confirmado: "bg-confirmado border-confirmado text-confirmado-texto line-through",
};

const ROTULOS: Record<StatusNumero, string> = {
  livre: "livre",
  reservado: "reservado temporariamente",
  pendente: "indisponível",
  confirmado: "vendido",
};

type Props = {
  numeros: NumeroPublico[];
  selecionados?: Set<string>;
  /** Números com uma ação em andamento (pulsam). */
  carregando?: Set<string>;
  /** Quais números aceitam clique. Padrão: nenhum. */
  clicavel?: (n: NumeroPublico) => boolean;
  onClicar?: (numero: string) => void;
  /** Envolve cada botão (ex.: tooltip com o nome no admin). */
  envolver?: (n: NumeroPublico, botao: ReactNode) => ReactNode;
};

export function GradeNumeros({ numeros, selecionados, carregando, clicavel, onClicar, envolver }: Props) {
  return (
    <div className="grid grid-cols-10 gap-1 sm:gap-1.5">
      {numeros.map((n) => {
        const selecionado = selecionados?.has(n.numero) ?? false;
        const ativo = clicavel?.(n) ?? false;
        const botao = (
          <button
            type="button"
            disabled={!ativo}
            aria-pressed={selecionado}
            aria-label={`Número ${n.numero}, ${selecionado ? "selecionado" : ROTULOS[n.status]}`}
            onClick={() => onClicar?.(n.numero)}
            className={cn(
              "aspect-square w-full rounded-md border text-[11px] font-semibold tabular-nums transition-colors sm:text-sm",
              CLASSES[selecionado ? "selecionado" : n.status],
              ativo ? "cursor-pointer hover:border-primary" : "cursor-default",
              ativo && !selecionado && "active:scale-95",
              carregando?.has(n.numero) && "animate-pulse",
            )}
          >
            {formatarNumero(n.numero)}
          </button>
        );
        return <div key={n.numero}>{envolver ? envolver(n, botao) : botao}</div>;
      })}
    </div>
  );
}

export function LegendaGrade({ comSelecionado = false }: { comSelecionado?: boolean }) {
  const itens: [keyof typeof CLASSES, string][] = [
    ["livre", "Livre"],
    ...(comSelecionado ? [["selecionado", "Seus números"] as [keyof typeof CLASSES, string]] : []),
    ["reservado", "Reservado"],
    ["pendente", "Pendente"],
    ["confirmado", "Vendido"],
  ];
  return (
    <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
      {itens.map(([status, rotulo]) => (
        <li key={status} className="inline-flex items-center gap-1.5">
          <span className={cn("size-3 rounded-sm border", CLASSES[status])} aria-hidden />
          {rotulo}
        </li>
      ))}
    </ul>
  );
}
