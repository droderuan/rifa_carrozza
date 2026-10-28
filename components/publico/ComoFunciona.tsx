type Props = { minutosReserva: number };

export function ComoFunciona({ minutosReserva }: Props) {
  const passos = [
    <>
      Escolha seus números na grade abaixo e toque em <strong className="text-foreground">Reservar</strong>.
    </>,
    <>
      Você tem {minutosReserva} minutos para informar seu nome e o telefone que usa no grupo do WhatsApp.
    </>,
    <>Faça o PIX e mande o comprovante no grupo. O organizador confirma seus números.</>,
  ];
  return (
    <section className="mx-auto w-full max-w-2xl px-5 pb-10">
      <h2 className="mb-4 font-display text-2xl font-bold">Como funciona</h2>
      <ol className="space-y-3">
        {passos.map((p, i) => (
          <li key={i} className="flex gap-3 rounded-xl border bg-card p-4">
            <span className="grid size-7 shrink-0 place-items-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
              {i + 1}
            </span>
            <span className="pt-0.5 text-sm leading-relaxed text-muted-foreground">{p}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}
