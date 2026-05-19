const STORAGE_KEY_CHAVES = 'controle-chaves-chaves';

function apiUrl(caminho) {
  const base = (window.API_BASE_URL || '').replace(/\/$/, '');
  return `${base}${caminho}`;
}

async function buscarChaves() {
  const resposta = await fetch(apiUrl('/api/chaves'));
  if (!resposta.ok) throw new Error('Falha ao carregar crachás');
  return resposta.json();
}

async function cadastrarChave(dados) {
  const resposta = await fetch(apiUrl('/api/chaves'), {
    method: 'POST',
    headers: headersAutenticados({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(dados)
  });

  const corpo = await resposta.json().catch(() => ({}));
  if (!resposta.ok) throw new Error(corpo.erro || 'Falha ao cadastrar crachá');
  return corpo;
}

async function atualizarChave(numero, dados) {
  const resposta = await fetch(apiUrl(`/api/chaves/${encodeURIComponent(numero)}`), {
    method: 'PATCH',
    headers: headersAutenticados({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(dados)
  });

  const corpo = await resposta.json().catch(() => ({}));
  if (!resposta.ok) throw new Error(corpo.erro || 'Falha ao atualizar crachá');
  return corpo;
}

async function excluirChave(numero) {
  const resposta = await fetch(apiUrl(`/api/chaves/${encodeURIComponent(numero)}`), {
    method: 'DELETE',
    headers: headersAutenticados()
  });

  const corpo = await resposta.json().catch(() => ({}));
  if (resposta.status === 401) {
    encerrarSessao();
    throw new Error(corpo.erro || 'Sessão expirada. Faça login novamente.');
  }
  if (!resposta.ok) throw new Error(corpo.erro || 'Falha ao excluir crachá');
  return corpo;
}

async function migrarChavesDoLocalStorage() {
  const antigos = JSON.parse(localStorage.getItem(STORAGE_KEY_CHAVES)) || [];
  if (antigos.length === 0) return false;

  const atuais = await buscarChaves();
  if (atuais.length > 0) {
    localStorage.removeItem(STORAGE_KEY_CHAVES);
    return false;
  }

  for (const chave of antigos) {
    await cadastrarChave({
      numero: chave.numero,
      local: chave.local || '-',
      setoresAutorizados: chave.setoresAutorizados || []
    });
  }

  localStorage.removeItem(STORAGE_KEY_CHAVES);
  return true;
}

function mensagemErroApi() {
  const base = window.API_BASE_URL || 'este computador (npm start)';
  return `Não foi possível conectar à API (${base}). Verifique se o servidor está ligado e acessível.`;
}
