"use client";
import { Loader2Icon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { chamar } from "@/lib/cliente/api";

export default function LoginAdmin() {
  const router = useRouter();
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function entrar(e: FormEvent) {
    e.preventDefault();
    setEnviando(true);
    setErro(null);
    try {
      await chamar("/api/admin/login", { method: "POST", body: JSON.stringify({ senha }) });
      router.replace("/admin");
      router.refresh();
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro inesperado.");
      setEnviando(false);
    }
  }

  return (
    <main className="grid flex-1 place-items-center p-5">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="font-display text-xl">Painel da rifa</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={entrar} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="senha">Senha</Label>
              <Input
                id="senha"
                type="password"
                autoComplete="current-password"
                autoFocus
                required
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                aria-invalid={!!erro}
                className="h-11"
              />
              {erro && <p className="text-sm text-destructive">{erro}</p>}
            </div>
            <Button type="submit" disabled={enviando} className="h-11 w-full font-bold">
              {enviando && <Loader2Icon className="animate-spin" />}
              Entrar
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
