import type { Estado, StatusNumero } from "@/lib/dominio/tipos";
import { formatarMoeda } from "@/lib/formatar";

export function Resumo({ estado }: { estado: Estado }) {
  const contagem: Record<StatusNumero, number> = { livre: 0, reservado: 0, pendente: 0, confirmado: 0 };
  for (const n of Object.values(estado.numeros)) contagem[n.status]++;
  const valor = estado.config.valorPorNumeroCentavos;
  const itens = [
    ["Livres", contagem.livre],
    ["Reservados", contagem.reservado],
    ["Pendentes", contagem.pendente],
    ["Confirmados", contagem.confirmado],
  ] as const;
  return (
    <section className="space-y-3">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {itens.map(([rotulo, n]) => (
          <div key={rotulo} className="rounded-xl border bg-card p-4">
            <p className="text-xs text-muted-foreground">{rotulo}</p>
            <p className="font-display text-2xl font-bold tabular-nums">{n}</p>
          </div>
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border bg-card p-4">
          <p className="text-xs text-muted-foreground">Valor pendente</p>
          <p className="font-display text-xl font-bold text-pendente-texto">{formatarMoeda(contagem.pendente * valor)}</p>
        </div>
        <div className="rounded-xl border border-primary/30 bg-card p-4">
          <p className="text-xs text-muted-foreground">Valor confirmado</p>
          <p className="font-display text-xl font-bold text-primary">{formatarMoeda(contagem.confirmado * valor)}</p>
        </div>
      </div>
    </section>
  );
}
