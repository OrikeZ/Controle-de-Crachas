const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const SESSOES = new Map();
const DURACAO_SESSAO_MS = 12 * 60 * 60 * 1000; // 12 horas

function carregarEnv() {
  const envPath = path.join(__dirname, '..', '.env');
  try {
    const conteudo = fs.readFileSync(envPath, 'utf8');
    for (const linha of conteudo.split(/\r?\n/)) {
      const limpa = linha.trim();
      if (!limpa || limpa.startsWith('#')) continue;
      const indice = limpa.indexOf('=');
      if (indice === -1) continue;
      const chave = limpa.slice(0, indice).trim();
      let valor = limpa.slice(indice + 1).trim();
      if (
        (valor.startsWith('"') && valor.endsWith('"')) ||
        (valor.startsWith("'") && valor.endsWith("'"))
      ) {
        valor = valor.slice(1, -1);
      }
      if (!process.env[chave]) process.env[chave] = valor;
    }
  } catch {
    // .env opcional
  }
}

function hashSenha(senha) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(senha, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function verificarSenha(senha, armazenado) {
  if (!senha || !armazenado || !armazenado.includes(':')) return false;
  const [salt, hash] = armazenado.split(':');
  const hashInformado = crypto.scryptSync(senha, salt, 64).toString('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(hashInformado, 'hex'));
  } catch {
    return false;
  }
}

function obterCredenciais() {
  carregarEnv();

  const usuario = process.env.AUTH_USER || 'vinicius.ouriques';
  const hash = process.env.AUTH_PASSWORD_HASH || null;
  const senhaPlana = !hash && process.env.AUTH_PASSWORD ? process.env.AUTH_PASSWORD : null;

  return { usuario, hash, senhaPlana };
}

function validarCredenciais(usuario, senha) {
  const credenciais = obterCredenciais();

  if (usuario !== credenciais.usuario) return false;
  if (credenciais.hash) return verificarSenha(senha, credenciais.hash);
  if (credenciais.senhaPlana) return senha === credenciais.senhaPlana;
  return false;
}

function criarSessao(usuario) {
  const token = crypto.randomBytes(32).toString('hex');
  SESSOES.set(token, { usuario, expira: Date.now() + DURACAO_SESSAO_MS });
  return token;
}

function validarSessao(token) {
  if (!token) return null;
  const sessao = SESSOES.get(token);
  if (!sessao) return null;
  if (Date.now() > sessao.expira) {
    SESSOES.delete(token);
    return null;
  }
  return sessao.usuario;
}

function encerrarSessao(token) {
  if (token) SESSOES.delete(token);
}

function extrairToken(req) {
  const cabecalho = req.headers.authorization || '';
  if (cabecalho.startsWith('Bearer ')) {
    return cabecalho.slice(7).trim();
  }
  return null;
}

function requerAutenticacao(req) {
  const usuario = validarSessao(extrairToken(req));
  if (!usuario) {
    return {
      ok: false,
      status: 401,
      erro: 'Não autorizado. Faça login para alterar os dados.'
    };
  }
  return { ok: true, usuario };
}

module.exports = {
  carregarEnv,
  hashSenha,
  verificarSenha,
  obterCredenciais,
  validarCredenciais,
  criarSessao,
  validarSessao,
  encerrarSessao,
  extrairToken,
  requerAutenticacao
};
