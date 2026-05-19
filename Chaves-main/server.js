const http = require('http');
const fs = require('fs').promises;
const path = require('path');
const { URL } = require('url');
const { criarRepositorio, proximoId } = require('./lib/db');
const {
  obterCredenciais,
  validarCredenciais,
  criarSessao,
  encerrarSessao,
  extrairToken,
  validarSessao,
  requerAutenticacao
} = require('./lib/auth');

const PORTA_PADRAO = 3000;
const PORTA_INICIAL = Number(process.env.PORT) || PORTA_PADRAO;
const PORTA_MAXIMA = process.env.PORT ? PORTA_INICIAL : PORTA_INICIAL + 10;
let portaAtual = PORTA_INICIAL;
const RAIZ = __dirname;
const credenciais = obterCredenciais();

const repoRegistros = criarRepositorio('registros.json');
const repoChaves = criarRepositorio('chaves.json');

const origensPermitidas = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.svg': 'image/svg+xml'
};

function enviarJson(res, status, dados) {
  const corpo = JSON.stringify(dados);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(corpo)
  });
  res.end(corpo);
}

function origemPermitida(origem) {
  if (!origem) return false;
  if (origensPermitidas.includes(origem)) return true;
  return /^http:\/\/localhost:\d+$/.test(origem) || /^http:\/\/127\.0\.0\.1:\d+$/.test(origem);
}

function aplicarCors(req, res) {
  const origem = req.headers.origin;
  if (origemPermitida(origem)) {
    res.setHeader('Access-Control-Allow-Origin', origem);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

function lerCorpo(req) {
  return new Promise((resolve, reject) => {
    const partes = [];
    req.on('data', (chunk) => partes.push(chunk));
    req.on('end', () => {
      const texto = Buffer.concat(partes).toString('utf8');
      if (!texto) return resolve({});
      try {
        resolve(JSON.parse(texto));
      } catch {
        resolve(null);
      }
    });
    req.on('error', reject);
  });
}

async function servirArquivoEstatico(req, res) {
  const url = new URL(req.url, `http://localhost:${portaAtual}`);
  let caminhoUrl = decodeURIComponent(url.pathname);
  if (caminhoUrl === '/') caminhoUrl = '/index.html';

  const arquivo = path.normalize(path.join(RAIZ, caminhoUrl));
  const raizNorm = path.normalize(RAIZ + path.sep);
  if (!arquivo.startsWith(raizNorm)) {
    res.writeHead(403);
    res.end('Acesso negado');
    return true;
  }

  try {
    const stat = await fs.stat(arquivo);
    if (!stat.isFile()) return false;

    const ext = path.extname(arquivo).toLowerCase();
    const tipo = MIME[ext] || 'application/octet-stream';
    const conteudo = await fs.readFile(arquivo);

    res.writeHead(200, { 'Content-Type': tipo });
    res.end(conteudo);
    return true;
  } catch {
    return false;
  }
}

async function tratarApi(req, res, url) {
  const metodo = req.method;
  const caminho = url.pathname;

  if (metodo === 'POST' && caminho === '/api/login') {
    const corpo = await lerCorpo(req);
    if (corpo === null) return enviarJson(res, 400, { erro: 'JSON inválido.' });

    const { usuario, senha } = corpo;
    if (!credenciais.hash && !credenciais.senhaPlana) {
      return enviarJson(res, 500, {
        erro: 'Servidor sem credenciais. Configure AUTH_PASSWORD no arquivo .env.'
      });
    }
    if (!validarCredenciais(usuario, senha)) {
      return enviarJson(res, 401, { erro: 'Usuário ou senha incorretos.' });
    }
    const token = criarSessao(usuario);
    return enviarJson(res, 200, { token, usuario });
  }

  if (metodo === 'POST' && caminho === '/api/logout') {
    encerrarSessao(extrairToken(req));
    return enviarJson(res, 200, { ok: true });
  }

  if (metodo === 'GET' && caminho === '/api/auth/verificar') {
    const usuario = validarSessao(extrairToken(req));
    if (!usuario) return enviarJson(res, 401, { autenticado: false });
    return enviarJson(res, 200, { autenticado: true, usuario });
  }

  if (caminho === '/api/registros') {
    if (metodo === 'GET') {
      try {
        return enviarJson(res, 200, await repoRegistros.ler());
      } catch {
        return enviarJson(res, 500, { erro: 'Erro ao ler registros.' });
      }
    }

    if (metodo === 'POST') {
      const auth = requerAutenticacao(req);
      if (!auth.ok) return enviarJson(res, auth.status, { erro: auth.erro });

      const corpo = await lerCorpo(req);
      if (corpo === null) return enviarJson(res, 400, { erro: 'JSON inválido.' });

      const { pessoa, chave, retirada, devolvido } = corpo;
      if (!pessoa || !chave || !retirada) {
        return enviarJson(res, 400, { erro: 'Dados incompletos para o registro.' });
      }

      try {
        const registros = await repoRegistros.ler();
        const novo = {
          id: proximoId(registros),
          pessoa,
          chave,
          retirada,
          devolvido: devolvido ?? null
        };
        registros.push(novo);
        await repoRegistros.gravar(registros);
        return enviarJson(res, 201, novo);
      } catch {
        return enviarJson(res, 500, { erro: 'Erro ao salvar registro.' });
      }
    }
  }

  const matchRegistro = caminho.match(/^\/api\/registros\/(\d+)$/);
  if (matchRegistro && metodo === 'PATCH') {
    const auth = requerAutenticacao(req);
    if (!auth.ok) return enviarJson(res, auth.status, { erro: auth.erro });

    const corpo = await lerCorpo(req);
    if (corpo === null) return enviarJson(res, 400, { erro: 'JSON inválido.' });

    const id = Number(matchRegistro[1]);
    try {
      const registros = await repoRegistros.ler();
      const indice = registros.findIndex((r) => r.id === id);
      if (indice === -1) {
        return enviarJson(res, 404, { erro: 'Registro não encontrado.' });
      }
      registros[indice] = { ...registros[indice], ...corpo };
      await repoRegistros.gravar(registros);
      return enviarJson(res, 200, registros[indice]);
    } catch {
      return enviarJson(res, 500, { erro: 'Erro ao atualizar registro.' });
    }
  }

  if (caminho === '/api/chaves') {
    if (metodo === 'GET') {
      try {
        return enviarJson(res, 200, await repoChaves.ler());
      } catch {
        return enviarJson(res, 500, { erro: 'Erro ao ler crachás.' });
      }
    }

    if (metodo === 'POST') {
      const auth = requerAutenticacao(req);
      if (!auth.ok) return enviarJson(res, auth.status, { erro: auth.erro });

      const corpo = await lerCorpo(req);
      if (corpo === null) return enviarJson(res, 400, { erro: 'JSON inválido.' });

      const { numero, local, setoresAutorizados } = corpo;
      if (!numero || !String(numero).trim()) {
        return enviarJson(res, 400, { erro: 'Informe o número do crachá.' });
      }

      const numeroLimpo = String(numero).trim();
      try {
        const chaves = await repoChaves.ler();
        if (chaves.some((c) => c.numero === numeroLimpo)) {
          return enviarJson(res, 409, { erro: 'Crachá já cadastrado.' });
        }
        const novo = {
          numero: numeroLimpo,
          local: local || '-',
          setoresAutorizados: setoresAutorizados || []
        };
        chaves.push(novo);
        await repoChaves.gravar(chaves);
        return enviarJson(res, 201, novo);
      } catch {
        return enviarJson(res, 500, { erro: 'Erro ao salvar crachá.' });
      }
    }
  }

  const matchChave = caminho.match(/^\/api\/chaves\/(.+)$/);
  if (matchChave && (metodo === 'PATCH' || metodo === 'DELETE')) {
    const auth = requerAutenticacao(req);
    if (!auth.ok) return enviarJson(res, auth.status, { erro: auth.erro });

    const numero = decodeURIComponent(matchChave[1]);

    if (metodo === 'DELETE') {
      try {
        const chaves = await repoChaves.ler();
        const indice = chaves.findIndex((c) => c.numero === numero);
        if (indice === -1) {
          return enviarJson(res, 404, { erro: 'Crachá não encontrado.' });
        }

        const registros = await repoRegistros.ler();
        const emUso = registros.some((r) => r.chave === numero && !r.devolvido);
        if (emUso) {
          return enviarJson(res, 409, {
            erro: 'Não é possível excluir: este crachá está retirado no momento. Registre a devolução antes.'
          });
        }

        chaves.splice(indice, 1);
        await repoChaves.gravar(chaves);
        return enviarJson(res, 200, { ok: true, numero });
      } catch {
        return enviarJson(res, 500, { erro: 'Erro ao excluir crachá.' });
      }
    }

    const corpo = await lerCorpo(req);
    if (corpo === null) return enviarJson(res, 400, { erro: 'JSON inválido.' });

    try {
      const chaves = await repoChaves.ler();
      const indice = chaves.findIndex((c) => c.numero === numero);
      if (indice === -1) {
        return enviarJson(res, 404, { erro: 'Crachá não encontrado.' });
      }
      chaves[indice] = { ...chaves[indice], ...corpo, numero };
      await repoChaves.gravar(chaves);
      return enviarJson(res, 200, chaves[indice]);
    } catch {
      return enviarJson(res, 500, { erro: 'Erro ao atualizar crachá.' });
    }
  }

  return false;
}

const servidor = http.createServer(async (req, res) => {
  aplicarCors(req, res);

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url, `http://localhost:${portaAtual}`);

  if (url.pathname.startsWith('/api/')) {
    const tratado = await tratarApi(req, res, url);
    if (tratado !== false) return;
    return enviarJson(res, 404, { erro: 'Rota não encontrada.' });
  }

  const servido = await servirArquivoEstatico(req, res);
  if (!servido) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Arquivo não encontrado');
  }
});

function tentarPorta(porta) {
  return new Promise((resolve, reject) => {
    const aoErro = (erro) => {
      servidor.removeListener('listening', aoOuvir);
      reject(erro);
    };
    const aoOuvir = () => {
      servidor.removeListener('error', aoErro);
      resolve(porta);
    };
    servidor.once('error', aoErro);
    servidor.once('listening', aoOuvir);
    servidor.listen(porta);
  });
}

async function iniciarServidor() {
  for (let porta = PORTA_INICIAL; porta <= PORTA_MAXIMA; porta += 1) {
    try {
      portaAtual = await tentarPorta(porta);

      console.log('');
      console.log('  Controle de Crachás — servidor ligado');
      if (portaAtual !== PORTA_INICIAL) {
        console.log(`  (Porta ${PORTA_INICIAL} ocupada — usando a ${portaAtual})`);
      }
      console.log(`  Acesse:  http://localhost:${portaAtual}`);
      console.log(`  Login:   http://localhost:${portaAtual}/login.html`);
      console.log('');
      console.log(`  Banco registros: ${repoRegistros.caminho}`);
      console.log(`  Banco crachás:   ${repoChaves.caminho}`);
      console.log(`  Usuário login:   ${credenciais.usuario}`);
      if (!credenciais.hash && !credenciais.senhaPlana) {
        console.warn('  AVISO: crie o arquivo .env com AUTH_PASSWORD para habilitar o login.');
      }
      console.log('');
      console.log('  Para parar: Ctrl+C');
      console.log('');
      return;
    } catch (erro) {
      if (erro.code === 'EADDRINUSE' && !process.env.PORT && porta < PORTA_MAXIMA) {
        continue;
      }
      if (erro.code === 'EADDRINUSE') {
        console.error(`\n  ERRO: a porta ${porta} já está em uso.`);
        console.error('  Feche a outra janela do servidor (Ctrl+C) ou execute parar-servidor.bat');
        console.error('  Ou force outra porta: set PORT=3001 && node server.js\n');
      } else {
        console.error('\n  ERRO ao iniciar servidor:', erro.message, '\n');
      }
      process.exit(1);
    }
  }
}

iniciarServidor();
