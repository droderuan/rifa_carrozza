import Link from "next/link";
import { redirect } from "next/navigation";
import { BotaoSair } from "@/components/admin/BotaoSair";
import { estaLogado } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function LayoutAdmin({ children }: LayoutProps<"/admin">) {
  if (!(await estaLogado())) redirect("/admin/login");
  return (
    <div className="flex flex-1 flex-col">
      <header className="sticky top-0 z-30 border-b bg-background/90 backdrop-blur">
        <nav className="mx-auto flex max-w-5xl items-center gap-1 px-4 py-2">
          <Link href="/admin" className="mr-auto font-display font-bold whitespace-nowrap">
            Rifa · Painel
          </Link>
          <Link
            href="/admin"
            className="hidden rounded-md px-2.5 py-1.5 text-sm text-muted-foreground hover:text-foreground sm:block"
          >
            Visão geral
          </Link>
          <Link
            href="/admin/configuracoes"
            className="rounded-md px-2.5 py-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            Configurações
          </Link>
          <BotaoSair />
        </nav>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 space-y-8 px-4 py-6">{children}</main>
    </div>
  );
}
