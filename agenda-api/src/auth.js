/* Senha do painel (PBKDF2) e token de sessão assinado (HMAC). Sem dependências. */

const enc = new TextEncoder();
const b64url = buf => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const deB64url = s => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/")), c => c.charCodeAt(0));
const b64 = buf => btoa(String.fromCharCode(...new Uint8Array(buf)));
const deB64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));

// Workers têm pouco tempo de CPU por requisição; 10 mil iterações cabe com folga.
// A segurança vem principalmente de uma senha longa (o README pede no mínimo 12 caracteres).
const ITERACOES = 10000;

async function pbkdf2(senha, sal, iteracoes) {
  const chave = await crypto.subtle.importKey("raw", enc.encode(senha), "PBKDF2", false, ["deriveBits"]);
  return crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: sal, iterations: iteracoes }, chave, 256);
}

export async function gerarHash(senha) {
  const sal = crypto.getRandomValues(new Uint8Array(16));
  return `pbkdf2$${ITERACOES}$${b64(sal)}$${b64(await pbkdf2(senha, sal, ITERACOES))}`;
}

export async function conferirSenha(senha, guardado) {
  const [tipo, it, sal, hash] = (guardado || "").split("$");
  if (tipo !== "pbkdf2" || !senha) return false;
  const calc = new Uint8Array(await pbkdf2(senha, deB64(sal), +it)), ref = deB64(hash);
  if (calc.length !== ref.length) return false;
  let dif = 0; for (let i = 0; i < calc.length; i++) dif |= calc[i] ^ ref[i];
  return dif === 0;
}

async function chaveHmac(segredo) {
  return crypto.subtle.importKey("raw", enc.encode(segredo), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}

export async function criarToken(clinicaId, segredo, horas = 12) {
  const corpo = b64url(enc.encode(JSON.stringify({ c: clinicaId, exp: Date.now() + horas * 3600e3 })));
  const assinatura = await crypto.subtle.sign("HMAC", await chaveHmac(segredo), enc.encode(corpo));
  return `${corpo}.${b64url(assinatura)}`;
}

/** Devolve o id da clínica se o token for válido, senão null. */
export async function lerToken(token, segredo) {
  const [corpo, assinatura] = (token || "").split(".");
  if (!corpo || !assinatura) return null;
  try {
    const ok = await crypto.subtle.verify("HMAC", await chaveHmac(segredo), deB64url(assinatura), enc.encode(corpo));
    if (!ok) return null;
    const dados = JSON.parse(new TextDecoder().decode(deB64url(corpo)));
    return dados.exp > Date.now() ? dados.c : null;
  } catch { return null; }
}
