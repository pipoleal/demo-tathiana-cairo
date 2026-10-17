// Gera o comando SQL que define a senha do painel de uma clínica.
// Uso: npm run senha -- tathiana-cairo "uma senha longa e só dela"
import { gerarHash } from "../src/auth.js";
const [clinica, senha] = process.argv.slice(2);
if (!clinica || !senha || senha.length < 12) {
  console.error('Uso: npm run senha -- <id-da-clinica> "<senha com 12+ caracteres>"');
  process.exit(1);
}
const hash = await gerarHash(senha);
console.log(`UPDATE clinicas SET senha_hash = '${hash}' WHERE id = '${clinica.replace(/'/g, "")}';`);
