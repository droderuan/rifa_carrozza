"use client";
import { ChevronDownIcon } from "lucide-react";
import type { CountryCode } from "libphonenumber-js";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { digitarTelefone, paisesTelefone } from "@/lib/telefone";
import { cn } from "@/lib/utils";

export type ValorTelefone = { pais: CountryCode; numero: string };

type Props = {
  id: string;
  valor: ValorTelefone;
  onChange: (v: ValorTelefone) => void;
  invalido?: boolean;
  className?: string;
};

const PLACEHOLDER: Partial<Record<CountryCode, string>> = { BR: "(00) 00000-0000" };

/** Seletor de país (com busca) + número nacional formatado conforme o país. */
export function CampoTelefone({ id, valor, onChange, invalido, className }: Props) {
  const [aberto, setAberto] = useState(false);
  const paises = useMemo(() => paisesTelefone(), []);
  const atual = paises.find((p) => p.codigo === valor.pais) ?? paises[0];

  return (
    <div className={cn("flex gap-2", className)}>
      <Popover open={aberto} onOpenChange={setAberto}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={aberto}
            aria-label={`País do telefone: ${atual.nome} (+${atual.ddi})`}
            className="h-11 shrink-0 gap-1.5 px-3"
          >
            <span className="text-lg leading-none">{atual.bandeira}</span>
            <span className="tabular-nums">+{atual.ddi}</span>
            <ChevronDownIcon className="size-4 opacity-60" />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-72 p-0">
          <Command
            filter={(item, busca) => {
              const b = busca.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().replace(/^\+/, "");
              return item.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().includes(b) ? 1 : 0;
            }}
          >
            <CommandInput placeholder="Buscar país ou código" />
            <CommandList className="max-h-64">
              <CommandEmpty>Nenhum país encontrado.</CommandEmpty>
              {paises.map((p) => (
                <CommandItem
                  key={p.codigo}
                  value={`${p.nome} ${p.ddi} ${p.codigo}`}
                  onSelect={() => {
                    onChange({ pais: p.codigo, numero: digitarTelefone(p.codigo, valor.numero) });
                    setAberto(false);
                  }}
                  data-checked={p.codigo === valor.pais}
                >
                  <span className="text-lg leading-none">{p.bandeira}</span>
                  <span className="flex-1 truncate">{p.nome}</span>
                  <span className="text-muted-foreground tabular-nums">+{p.ddi}</span>
                </CommandItem>
              ))}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      <Input
        id={id}
        type="tel"
        inputMode="numeric"
        autoComplete="tel-national"
        required
        value={valor.numero}
        onChange={(e) => onChange({ pais: valor.pais, numero: digitarTelefone(valor.pais, e.target.value) })}
        placeholder={PLACEHOLDER[valor.pais] ?? "Número com código de área"}
        aria-invalid={invalido}
        className="h-11 min-w-0 flex-1"
      />
    </div>
  );
}
