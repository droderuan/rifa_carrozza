import { criarEstadoInicial } from "@/lib/dominio/estado-inicial";
import { arquivoExiste, gravarArquivo } from "@/lib/github";

async function main() {
  const faltando = ["GITHUB_TOKEN", "GITHUB_OWNER", "GITHUB_REPO"].filter((v) => !process.env[v]);
  if (faltando.length) {
    console.error(`Variáveis ausentes em .env.local: ${faltando.join(", ")}`);
    process.exit(1);
  }
  const path = process.env.GITHUB_DB_PATH || "rifa.json";
  const branch = process.env.GITHUB_BRANCH || "main";
  const destino = `${process.env.GITHUB_OWNER}/${process.env.GITHUB_REPO}@${branch}:${path}`;

  if (await arquivoExiste()) {
    console.error(`${path} já existe em ${destino} — nada a fazer.`);
    process.exit(1);
  }
  const r = await gravarArquivo(criarEstadoInicial(), null, "[rifa] inicialização");
  if (r !== "ok") {
    console.error("Conflito ao criar o arquivo. Rode de novo.");
    process.exit(1);
  }
  console.log(`Criado ${destino}`);
  console.log(`https://github.com/${process.env.GITHUB_OWNER}/${process.env.GITHUB_REPO}/blob/${branch}/${path}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
