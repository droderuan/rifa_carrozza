import { Progress } from "@/components/ui/progress";

type Props = { historia?: string; vendidos: number; total: number };

export function Historia({ historia, vendidos, total }: Props) {
  const paragrafos = (historia ?? "").split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  return (
    <section className="mx-auto w-full max-w-2xl space-y-5 px-5 py-10">
      {paragrafos.length > 0 && (
        <div className="space-y-3">
          <h2 className="font-display text-2xl font-bold">O que aconteceu</h2>
          {paragrafos.map((p, i) => (
            <p key={i} className="leading-relaxed whitespace-pre-line text-muted-foreground">
              {p}
            </p>
          ))}
        </div>
      )}
      <div className="rounded-xl border bg-card p-4">
        <div className="flex items-baseline justify-between text-sm">
          <span>
            <strong className="font-display text-xl text-primary">{vendidos}</strong>{" "}
            <span className="text-muted-foreground">de {total} números vendidos</span>
          </span>
          <span className="text-muted-foreground tabular-nums">{Math.round((vendidos / total) * 100)}%</span>
        </div>
        <Progress value={(vendidos / total) * 100} className="mt-3 h-2" aria-label="Números vendidos" />
      </div>
    </section>
  );
}
