"use client";
import { Loader2Icon } from "lucide-react";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { useAcaoAdmin } from "@/components/admin/useAcaoAdmin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Config } from "@/lib/dominio/tipos";

type Campos = {
  titulo: string;
  subtitulo: string;
  historia: string;
  instagramUrl: string;
  instrucoesPagamento: string;
  chave: string;
  titular: string;
  banco: string;
};

function camposDe(c: Config): Campos {
  return {
    titulo: c.titulo,
    subtitulo: c.subtitulo ?? "",
    historia: c.historia ?? "",
    instagramUrl: c.instagramUrl ?? "",
    instrucoesPagamento: c.instrucoesPagamento,
    chave: c.pix?.chave ?? "",
    titular: c.pix?.titular ?? "",
    banco: c.pix?.banco ?? "",
  };
}

/** Só os campos alterados, no formato de PATCH /api/admin/config. */
function diferencas(original: Campos, atual: Campos): Record<string, unknown> {
  const corpo: Record<string, unknown> = {};
  for (const k of ["titulo", "subtitulo", "historia", "instagramUrl", "instrucoesPagamento"] as const) {
    if (atual[k] !== original[k]) corpo[k] = atual[k];
  }
  const pix: Record<string, string> = {};
  for (const k of ["chave", "titular", "banco"] as const) {
    if (atual[k] !== original[k]) pix[k] = atual[k];
  }
  if (Object.keys(pix).length) corpo.pix = pix;
  return corpo;
}

export function FormConfig({ config }: { config: Config }) {
  const [original, setOriginal] = useState(() => camposDe(config));
  const [campos, setCampos] = useState(original);
  const { executar, executando } = useAcaoAdmin();
  const set = (k: keyof Campos) => (e: { target: { value: string } }) => setCampos((c) => ({ ...c, [k]: e.target.value }));

  async function salvar(e: FormEvent) {
    e.preventDefault();
    const corpo = diferencas(original, campos);
    if (Object.keys(corpo).length === 0) {
      toast("Nada para salvar.");
      return;
    }
    const ok = await executar("config", "/api/admin/config", { method: "PATCH", body: JSON.stringify(corpo) }, "Configurações salvas");
    if (ok) setOriginal(campos);
  }

  return (
    <form onSubmit={salvar} className="space-y-8">
      <fieldset className="space-y-4 rounded-xl border bg-card p-4">
        <legend className="px-1 font-display text-lg font-bold">Página</legend>
        <div className="space-y-1.5">
          <Label htmlFor="titulo">Título</Label>
          <Input id="titulo" value={campos.titulo} onChange={set("titulo")} maxLength={80} required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="subtitulo">Subtítulo</Label>
          <Input id="subtitulo" value={campos.subtitulo} onChange={set("subtitulo")} maxLength={160} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="historia">O que aconteceu</Label>
          <Textarea id="historia" value={campos.historia} onChange={set("historia")} maxLength={4000} rows={8} />
          <p className="text-xs text-muted-foreground">Deixe uma linha em branco para separar parágrafos.</p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="instagramUrl">Link do vídeo no Instagram</Label>
          <Input
            id="instagramUrl"
            type="url"
            value={campos.instagramUrl}
            onChange={set("instagramUrl")}
            placeholder="https://www.instagram.com/p/..."
          />
          <p className="text-xs text-muted-foreground">Deixe vazio para esconder a seção de vídeo.</p>
        </div>
      </fieldset>

      <fieldset className="space-y-4 rounded-xl border bg-card p-4">
        <legend className="px-1 font-display text-lg font-bold">Pagamento</legend>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="chave">Chave PIX</Label>
            <Input id="chave" value={campos.chave} onChange={set("chave")} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="titular">Titular</Label>
            <Input id="titular" value={campos.titular} onChange={set("titular")} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="banco">Banco</Label>
            <Input id="banco" value={campos.banco} onChange={set("banco")} required />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="instrucoesPagamento">Instruções após a reserva</Label>
          <Textarea
            id="instrucoesPagamento"
            value={campos.instrucoesPagamento}
            onChange={set("instrucoesPagamento")}
            maxLength={2000}
            rows={3}
          />
        </div>
      </fieldset>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={executando !== null} className="h-10 px-6 font-bold">
          {executando && <Loader2Icon className="animate-spin" />}
          Salvar
        </Button>
        <p className="text-xs text-muted-foreground">
          Valor por número, quantidade de números e tempo de reserva só mudam editando o rifa.json no GitHub.
        </p>
      </div>
    </form>
  );
}
