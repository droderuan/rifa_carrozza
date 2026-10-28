import { criarEstadoInicial } from "@/lib/dominio/estado-inicial";
import { inicializarDados } from "@/lib/github";

async function main() {
  const faltando = ["GITHUB_TOKEN", "GITHUB_OWNER", "GITHUB_REPO", "GITHUB_BRANCH"].filter((v) => !process.env[v]);
  if (faltando.length) {
    console.error(`Variáveis ausentes: ${faltando.join(", ")}`);
    process.exit(1);
  }
  const { GITHUB_OWNER: owner, GITHUB_REPO: repo, GITHUB_BRANCH: branch } = process.env;
  const path = process.env.GITHUB_DB_PATH || "rifa.json";
  const destino = `${owner}/${repo}@${branch}:${path}`;

  const r = await inicializarDados(criarEstadoInicial(), "[rifa] inicialização");
  if (r === "ja-existe") {
    console.error(`${destino} já existe — nada a fazer.`);
    process.exit(1);
  }
  console.log(r === "branch-criado" ? `Branch ${branch} criado (só com ${path}).` : `Criado ${destino}.`);
  console.log(`https://github.com/${owner}/${repo}/blob/${branch}/${path}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
