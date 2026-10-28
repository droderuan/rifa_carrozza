import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const RAIZ = join(__dirname, "..", "app", "admin", "(protegido)");

function paginas(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? paginas(join(dir, e.name)) : e.name === "page.tsx" ? [join(dir, e.name)] : [],
  );
}

// O guard do layout pode ser pulado por renderização parcial (RSC); cada página precisa checar a sessão.
describe("páginas protegidas do admin", () => {
  const arquivos = paginas(RAIZ);

  it("existem", () => {
    expect(arquivos.length).toBeGreaterThanOrEqual(3);
  });

  it.each(arquivos.map((f) => [f.slice(RAIZ.length)]))("%s chama exigirPaginaAdmin() antes de ler dados", (rel) => {
    const codigo = readFileSync(join(RAIZ, rel), "utf8");
    const guarda = codigo.indexOf("await exigirPaginaAdmin()");
    const leitura = codigo.indexOf("lerEstado(");
    expect(guarda).toBeGreaterThan(-1);
    expect(guarda).toBeLessThan(leitura);
  });
});
