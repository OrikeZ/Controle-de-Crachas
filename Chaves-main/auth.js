const AUTH_TOKEN_KEY = 'authToken';
const AUTH_USER_KEY = 'usuarioLogado';

function obterToken() {
  return sessionStorage.getItem(AUTH_TOKEN_KEY);
}

function obterUsuario() {
  return sessionStorage.getItem(AUTH_USER_KEY);
}

function estaAutenticado() {
  return Boolean(obterToken());
}

function salvarSessao(token, usuario) {
  sessionStorage.setItem(AUTH_TOKEN_KEY, token);
  sessionStorage.setItem(AUTH_USER_KEY, usuario);
}

function encerrarSessao() {
  sessionStorage.removeItem(AUTH_TOKEN_KEY);
  sessionStorage.removeItem(AUTH_USER_KEY);
}

function headersAutenticados(extra = {}) {
  const headers = { ...extra };
  const token = obterToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

async function fazerLogin(usuario, senha) {
  const resposta = await fetch(apiUrl('/api/login'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ usuario, senha })
  });

  const corpo = await resposta.json().catch(() => ({}));
  if (!resposta.ok) {
    throw new Error(corpo.erro || 'Usuário ou senha incorretos.');
  }

  salvarSessao(corpo.token, corpo.usuario);
  return corpo;
}

async function fazerLogout() {
  const token = obterToken();
  if (token) {
    await fetch(apiUrl('/api/logout'), {
      method: 'POST',
      headers: headersAutenticados({ 'Content-Type': 'application/json' })
    }).catch(() => {});
  }
  encerrarSessao();
}

function exigirLogin(redirect = 'login.html') {
  if (!estaAutenticado()) {
    window.location.href = redirect;
    return false;
  }
  return true;
}

function configurarBotaoLogout(botaoId = 'logout') {
  const botao = document.getElementById(botaoId);
  if (!botao) return;
  botao.addEventListener('click', async () => {
    await fazerLogout();
    window.location.href = 'login.html';
  });
}
