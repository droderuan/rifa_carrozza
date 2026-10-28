import { ArrowDownIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = { titulo: string; subtitulo?: string };

export function Hero({ titulo, subtitulo }: Props) {
  return (
    <header className="relative isolate flex min-h-[min(78svh,560px)] flex-col overflow-hidden">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/img/hero-guitarra.jpg"
        alt=""
        className="absolute inset-0 -z-20 size-full object-cover object-[center_30%]"
        fetchPriority="high"
      />
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-black/30 via-black/40 to-background" />
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-5 pt-6 pb-10">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/img/logo-carrozza-branca.png" alt="Carrozza Custom Guitars" className="h-10 w-auto self-start sm:h-12" />
        <div className="mt-auto space-y-4">
          <span className="inline-block rounded-full border border-primary/40 bg-black/40 px-3 py-1 text-xs font-medium tracking-wide text-primary uppercase backdrop-blur">
            Rifa solidária
          </span>
          <h1 className="font-display text-4xl leading-[1.05] font-bold tracking-tight text-balance sm:text-5xl">
            {titulo}
          </h1>
          {subtitulo && <p className="max-w-md text-base text-white/85 text-pretty">{subtitulo}</p>}
          <Button asChild size="lg" className="h-12 px-5 text-base font-bold">
            <a href="#numeros">
              Escolher meus números
              <ArrowDownIcon />
            </a>
          </Button>
        </div>
      </div>
    </header>
  );
}
