// O build do OpenNext embute os .env* locais (inclusive .env.local) no worker, em next-env.mjs.
// Em produção toda configuração vem das vars do wrangler.jsonc e dos segredos do Cloudflare,
// então esvaziamos o arquivo: nenhum segredo local sobe no deploy.
import { existsSync, writeFileSync } from "node:fs";

const arquivo = ".open-next/cloudflare/next-env.mjs";
if (!existsSync(arquivo)) {
  console.error(`${arquivo} não encontrado — rode o build do OpenNext antes.`);
  process.exit(1);
}
writeFileSync(arquivo, ["production", "development", "test"].map((m) => `export const ${m} = {};\n`).join(""));
console.log("next-env.mjs esvaziado: nenhum valor de .env local vai para o worker.");
