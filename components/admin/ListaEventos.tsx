import { descreverEvento } from "@/lib/dominio/historico";
import type { Evento } from "@/lib/dominio/tipos";
import { formatarDataHora } from "@/lib/formatar";

export function ListaEventos({ eventos, mostrarNumeros = true }: { eventos: Evento[]; mostrarNumeros?: boolean }) {
  if (eventos.length === 0) return <p className="text-sm text-muted-foreground">Nenhum evento.</p>;
  return (
    <ol className="space-y-2">
      {eventos.map((e, i) => (
        <li key={`${e.em}-${i}`} className="rounded-lg border bg-card px-3 py-2 text-sm">
          <div className="flex flex-wrap justify-between gap-x-3 text-xs text-muted-foreground">
            <span>{formatarDataHora(e.em)}</span>
            {mostrarNumeros && e.numeros.length > 0 && <span>Números {e.numeros.join(", ")}</span>}
          </div>
          <p className="mt-0.5">{descreverEvento(e)}</p>
        </li>
      ))}
    </ol>
  );
}
