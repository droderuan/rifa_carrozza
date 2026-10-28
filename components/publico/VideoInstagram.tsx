type Props = { shortcode: string };

export function VideoInstagram({ shortcode }: Props) {
  return (
    <section className="mx-auto w-full max-w-2xl px-5 pb-10">
      <h2 className="mb-4 font-display text-2xl font-bold">Veja o recado da Carrozza</h2>
      <div className="mx-auto max-w-[400px] overflow-hidden rounded-xl border bg-white">
        <iframe
          src={`https://www.instagram.com/p/${shortcode}/embed`}
          title="Vídeo da Carrozza no Instagram"
          loading="lazy"
          allowFullScreen
          className="block aspect-[4/5.6] w-full border-0"
        />
      </div>
      <p className="mt-2 text-center text-xs text-muted-foreground">
        <a href={`https://www.instagram.com/p/${shortcode}/`} target="_blank" rel="noreferrer" className="underline-offset-4 hover:underline">
          Abrir no Instagram
        </a>
      </p>
    </section>
  );
}
