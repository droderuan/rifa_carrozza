import { ComoFunciona } from "@/components/publico/ComoFunciona";
import { Hero } from "@/components/publico/Hero";
import { Historia } from "@/components/publico/Historia";
import { SecaoReserva } from "@/components/publico/SecaoReserva";
import { VideoInstagram } from "@/components/publico/VideoInstagram";
import { lerEstado } from "@/lib/db";
import { visaoPublica, type VisaoPublica } from "@/lib/dominio/publico";
import { ErroDominio } from "@/lib/erros";
import { shortcodeInstagram } from "@/lib/instagram";

export const dynamic = "force-dynamic";

async function carregar(): Promise<VisaoPublica | null> {
  try {
    return visaoPublica(await lerEstado());
  } catch (e) {
    if (e instanceof ErroDominio && e.codigo === "RIFA_NAO_INICIALIZADA") return null;
    throw e;
  }
}

export default async function Home() {
  const visao = await carregar();
  if (!visao) {
    return (
      <main className="grid flex-1 place-items-center p-6 text-center">
        <div className="space-y-2">
          <h1 className="font-display text-2xl font-bold">Rifa ainda não inicializada</h1>
          <p className="text-muted-foreground">Volte em instantes.</p>
        </div>
      </main>
    );
  }
  const { config, numeros } = visao;
  const shortcode = shortcodeInstagram(config.instagramUrl);
  const vendidos = numeros.filter((n) => n.status === "confirmado").length;

  return (
    <main className="flex-1">
      <Hero titulo={config.titulo} subtitulo={config.subtitulo} />
      <Historia historia={config.historia} vendidos={vendidos} total={numeros.length} />
      {shortcode && <VideoInstagram shortcode={shortcode} />}
      <ComoFunciona minutosReserva={config.minutosReserva} />
      <SecaoReserva config={config} numerosIniciais={numeros} />
    </main>
  );
}
