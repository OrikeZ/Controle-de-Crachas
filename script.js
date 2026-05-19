const storageKeys = {
  setores: 'controle-chaves-setores',
  cargos: 'controle-chaves-cargos',
  pessoas: 'controle-chaves-pessoas',
  chaves: 'controle-chaves-chaves',
  registros: 'controle-chaves-registros'
};

const API_REGISTROS = () => apiUrl('/api/registros');

const TIPOS_CRACHA = [
  { id: 'provisorio', label: 'Crachá Provisório', palavra: 'provisorio' },
  { id: 'visitante', label: 'Crachá Visitante', palavra: 'visitante' },
  { id: 'terceiros', label: 'Crachá Terceiros', palavra: 'terceiro' }
];

const ORDEM_TIPOS_CRACHA = ['visitante', 'provisorio', 'terceiros'];

function indiceOrdemTipo(tipoId) {
  const idx = ORDEM_TIPOS_CRACHA.indexOf(tipoId);
  return idx === -1 ? ORDEM_TIPOS_CRACHA.length : idx;
}

function numeroOrdemCracha(numero) {
  const match = String(numero || '').match(/(\d+)\s*$/);
  return match ? parseInt(match[1], 10) : 0;
}

function compararCrachas(a, b) {
  const tipoA = obterTipoPorNumero(a.numero);
  const tipoB = obterTipoPorNumero(b.numero);
  const porTipo = indiceOrdemTipo(tipoA) - indiceOrdemTipo(tipoB);
  if (porTipo !== 0) return porTipo;
  const porNumero = numeroOrdemCracha(a.numero) - numeroOrdemCracha(b.numero);
  if (porNumero !== 0) return porNumero;
  return String(a.numero).localeCompare(String(b.numero), 'pt-BR', { numeric: true });
}

function normalizarTexto(texto) {
  return (texto || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function obterTipoPorNumero(numero) {
  const normalizado = normalizarTexto(numero);
  const tipo = TIPOS_CRACHA.find((t) => normalizado.includes(t.palavra));
  return tipo ? tipo.id : null;
}

function crachaPertenceAoTipo(numero, tipoId) {
  return obterTipoPorNumero(numero) === tipoId;
}

function labelTipo(id) {
  return TIPOS_CRACHA.find((t) => t.id === id)?.label || '—';
}

function textoBadgeTipo(tipoId) {
  return labelTipo(tipoId).replace(/^Crachá\s+/i, '');
}

function criarBadgeTipo(tipoId) {
  const span = document.createElement('span');
  span.className = tipoId ? `badge-tipo badge-tipo--${tipoId}` : 'badge-tipo';
  span.textContent = textoBadgeTipo(tipoId);
  return span;
}

function obterTipoRegistro(registro) {
  return registro.tipo || obterTipoPorNumero(registro.chave);
}

function obterTipoSelecionado() {
  const selecionado = document.querySelector('input[name="tipo-cracha"]:checked');
  return selecionado ? selecionado.value : null;
}

let resolverModalConfirmacao = null;
let sincronizandoTipoPeloCracha = false;

function fecharModalConfirmacao(resultado) {
  const modal = document.getElementById('modal-confirmacao');
  if (!modal) return;

  modal.hidden = true;
  modal.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';

  if (resolverModalConfirmacao) {
    const resolver = resolverModalConfirmacao;
    resolverModalConfirmacao = null;
    resolver(resultado);
  }
}

function configurarModalConfirmacao() {
  const modal = document.getElementById('modal-confirmacao');
  if (!modal || modal.dataset.inicializado) return;

  modal.dataset.inicializado = 'true';

  modal.querySelectorAll('[data-modal-fechar]').forEach((el) => {
    el.addEventListener('click', () => fecharModalConfirmacao(false));
  });

  document.getElementById('modal-confirmacao-ok')?.addEventListener('click', () => {
    fecharModalConfirmacao(true);
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !modal.hidden) {
      fecharModalConfirmacao(false);
    }
  });
}

function mostrarModalConfirmacao({
  titulo,
  mensagem = '',
  detalhes = {},
  textoConfirmar = 'Confirmar',
  textoCancelar = 'Cancelar',
  variante = 'primaria'
}) {
  configurarModalConfirmacao();

  const modal = document.getElementById('modal-confirmacao');
  if (!modal) return Promise.resolve(false);

  const tituloEl = document.getElementById('modal-confirmacao-titulo');
  const mensagemEl = document.getElementById('modal-confirmacao-mensagem');
  const detalhesEl = document.getElementById('modal-confirmacao-detalhes');
  const btnOk = document.getElementById('modal-confirmacao-ok');
  const btnCancelar = modal.querySelector('.btn-modal-cancelar');

  if (tituloEl) tituloEl.textContent = titulo;
  if (mensagemEl) {
    mensagemEl.textContent = mensagem;
    mensagemEl.hidden = !mensagem;
  }

  if (detalhesEl) {
    detalhesEl.innerHTML = '';
    Object.entries(detalhes).forEach(([rotulo, valor]) => {
      const dt = document.createElement('dt');
      dt.textContent = rotulo;
      const dd = document.createElement('dd');
      dd.textContent = valor;
      detalhesEl.appendChild(dt);
      detalhesEl.appendChild(dd);
    });
  }

  if (btnOk) {
    btnOk.textContent = textoConfirmar;
    btnOk.classList.toggle('btn-modal-confirmar--perigo', variante === 'perigo');
  }
  if (btnCancelar) btnCancelar.textContent = textoCancelar;

  modal.hidden = false;
  modal.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
  btnOk?.focus();

  return new Promise((resolve) => {
    resolverModalConfirmacao = resolve;
  });
}

const registrosPorPagina = 15;
let paginaAtual = 1;
let totalPaginas = 1;

// Arrays para armazenar dados
let setores = JSON.parse(localStorage.getItem(storageKeys.setores)) || [];
let cargos = JSON.parse(localStorage.getItem(storageKeys.cargos)) || [];
let pessoas = JSON.parse(localStorage.getItem(storageKeys.pessoas)) || [];
let chaves = [];
let registros = [];

// ELEMENTOS DOM index.html
const inputNomeRetirada = document.getElementById('nome-retirada');
const selectChave = document.getElementById('chave');
const listaRetiradas = document.getElementById('lista-retiradas');
const formRegistro = document.getElementById('form-registro');

// ELEMENTOS DOM cadastro.html
const selectSetorCargo = document.getElementById('cargo-setor');
const selectSetorPessoa = document.getElementById('pessoa-setor');
const selectCargoPessoa = document.getElementById('pessoa-cargo');
const selectSetoresChave = document.getElementById('chave-setores');

const formSetor = document.getElementById('form-setor');
const formCargo = document.getElementById('form-cargo');
const formPessoa = document.getElementById('form-pessoa');
const formChave = document.getElementById('form-chave');

const inputNovoSetor = document.getElementById('novo-setor');
const inputNovoCargo = document.getElementById('novo-cargo');
const inputNovaPessoa = document.getElementById('nova-pessoa');
const inputNovaChave = document.getElementById('nova-chave');

// Setores, cargos e pessoas ainda no localStorage; crachás e registros ficam no servidor (database/*.json)
function salvarDados() {
  localStorage.setItem(storageKeys.setores, JSON.stringify(setores));
  localStorage.setItem(storageKeys.cargos, JSON.stringify(cargos));
  localStorage.setItem(storageKeys.pessoas, JSON.stringify(pessoas));
}

async function carregarChaves() {
  try {
    chaves = await buscarChaves();
    if (await migrarChavesDoLocalStorage()) {
      chaves = await buscarChaves();
    }
  } catch {
    alert(mensagemErroApi());
    chaves = [];
  }
}

async function carregarRegistros() {
  try {
    const resposta = await fetch(API_REGISTROS());
    if (!resposta.ok) throw new Error('Falha ao carregar registros');
    registros = await resposta.json();
    await migrarRegistrosDoLocalStorage();
  } catch {
    alert(mensagemErroApi());
    registros = [];
  }
}

async function migrarRegistrosDoLocalStorage() {
  const antigos = JSON.parse(localStorage.getItem(storageKeys.registros)) || [];
  if (antigos.length === 0 || registros.length > 0) return;

  for (const registro of antigos) {
    await fetch(API_REGISTROS(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pessoa: registro.pessoa,
        chave: registro.chave,
        retirada: registro.retirada,
        devolvido: registro.devolvido
      })
    });
  }

  localStorage.removeItem(storageKeys.registros);

  const resposta = await fetch(API_REGISTROS());
  if (resposta.ok) registros = await resposta.json();
}

async function criarRegistro(dados) {
  const resposta = await fetch(API_REGISTROS(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dados)
  });

  const corpo = await resposta.json().catch(() => ({}));
  if (!resposta.ok) throw new Error(corpo.erro || 'Falha ao salvar registro');
  return corpo;
}

async function atualizarRegistro(id, dados) {
  const resposta = await fetch(`${API_REGISTROS()}/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dados)
  });

  const corpo = await resposta.json().catch(() => ({}));
  if (!resposta.ok) throw new Error(corpo.erro || 'Falha ao atualizar registro');
  return corpo;
}

// --- Funções de preenchimento dos selects ---

function adicionarOptionCracha(selectOuGrupo, chaveObj) {
  const option = document.createElement('option');
  option.value = chaveObj.numero;
  const local = chaveObj.local && chaveObj.local !== '-' ? ` (${chaveObj.local})` : '';
  option.textContent = `${chaveObj.numero}${local}`;
  selectOuGrupo.appendChild(option);
}

// Preencher select de crachás cadastrados (disponíveis para retirada)
function preencherSelectChave() {
  if (!selectChave) return;

  const tipoSelecionado = obterTipoSelecionado();
  const valorAtual = selectChave.value;

  selectChave.disabled = false;
  selectChave.innerHTML = '<option value="">Selecione o crachá</option>';

  let chavesDisponiveis = chaves.filter(
    (chaveObj) =>
      obterTipoPorNumero(chaveObj.numero) &&
      !registros.some((r) => r.chave === chaveObj.numero && !r.devolvido)
  );

  if (tipoSelecionado) {
    chavesDisponiveis = chavesDisponiveis.filter((chaveObj) =>
      crachaPertenceAoTipo(chaveObj.numero, tipoSelecionado)
    );
  }

  chavesDisponiveis.sort(compararCrachas);

  if (chavesDisponiveis.length === 0) {
    const option = document.createElement('option');
    option.value = '';
    option.textContent = tipoSelecionado
      ? (chaves.some((c) => crachaPertenceAoTipo(c.numero, tipoSelecionado))
        ? 'Nenhum crachá disponível deste tipo'
        : 'Nenhum crachá cadastrado deste tipo')
      : 'Nenhum crachá disponível no momento';
    option.disabled = true;
    selectChave.appendChild(option);
    return;
  }

  if (!tipoSelecionado) {
    ORDEM_TIPOS_CRACHA.forEach((tipo) => {
      const doTipo = chavesDisponiveis.filter((c) => obterTipoPorNumero(c.numero) === tipo);
      if (doTipo.length === 0) return;

      const optgroup = document.createElement('optgroup');
      optgroup.label = labelTipo(tipo);
      doTipo.forEach((c) => adicionarOptionCracha(optgroup, c));
      selectChave.appendChild(optgroup);
    });
  } else {
    chavesDisponiveis.forEach((c) => adicionarOptionCracha(selectChave, c));
  }

  if (valorAtual && [...selectChave.options].some((o) => o.value === valorAtual)) {
    selectChave.value = valorAtual;
  }
}

// Preencher lista de retiradas abertas no index
function atualizarListaRetiradas() {
  if (!listaRetiradas) return;

  listaRetiradas.innerHTML = '';

  const abertos = registros.filter(r => !r.devolvido);

  if (abertos.length === 0) {
    listaRetiradas.innerHTML = '<li>Nenhum crachá retirado no momento.</li>';
    return;
  }

 abertos.forEach((r) => {
  const li = document.createElement('li');

  const info = document.createElement('span');
  info.className = 'retirada-info';
  info.appendChild(criarBadgeTipo(obterTipoRegistro(r)));
  info.appendChild(document.createTextNode(' '));
  const detalhe = document.createElement('span');
  detalhe.innerHTML = `<strong>${r.chave}</strong> — ${r.pessoa}<br><small>Retirada: ${new Date(r.retirada).toLocaleString()}</small>`;
  info.appendChild(detalhe);
  li.appendChild(info);

  const btnDevolver = document.createElement('button');
  btnDevolver.textContent = 'Devolver';
  btnDevolver.title = 'Registrar devolução da chave';

  btnDevolver.addEventListener('click', async () => {
    const confirmar = await mostrarModalConfirmacao({
      titulo: 'Confirmar devolução',
      mensagem: 'Deseja registrar a devolução deste crachá?',
      detalhes: {
        Crachá: r.chave,
        'Retirado por': r.pessoa,
        Tipo: textoBadgeTipo(obterTipoRegistro(r))
      },
      textoConfirmar: 'Confirmar devolução',
      variante: 'perigo'
    });
    if (!confirmar) return;

    const devolvido = new Date().toISOString();

    try {
      await atualizarRegistro(r.id, { devolvido });
      r.devolvido = devolvido;
    } catch (erro) {
      alert(erro.message || 'Erro ao registrar a devolução. Verifique se o servidor está rodando.');
      return;
    }

    preencherSelectChave();
    atualizarListaRetiradas();
  });

  li.appendChild(btnDevolver);
  listaRetiradas.appendChild(li);
});

}

// --- Funções para cadastro e selects da página cadastro.html ---

// Preencher select de setores (uso geral)
function preencherSelectSetores() {
  if (selectSetorCargo) {
    selectSetorCargo.innerHTML = '<option value="">Selecione o setor</option>';
    setores.forEach(setor => {
      const opt = document.createElement('option');
      opt.value = setor;
      opt.textContent = setor;
      selectSetorCargo.appendChild(opt);
    });
  }

  if (selectSetorPessoa) {
    selectSetorPessoa.innerHTML = '<option value="">Selecione o setor</option>';
    setores.forEach(setor => {
      const opt = document.createElement('option');
      opt.value = setor;
      opt.textContent = setor;
      selectSetorPessoa.appendChild(opt);
    });
  }
}

// Preencher select de cargos (uso geral)
function preencherSelectCargos() {
  if (selectCargoPessoa) {
    selectCargoPessoa.innerHTML = '<option value="">Selecione o cargo</option>';
    cargos.forEach(cargo => {
      const opt = document.createElement('option');
      opt.value = cargo.nome;
      opt.textContent = cargo.nome;
      selectCargoPessoa.appendChild(opt);
    });
  }
}

// Preencher select múltiplo de setores autorizados na chave
function preencherSelectSetoresChave() {
  if (!selectSetoresChave) return;

  selectSetoresChave.innerHTML = '';

  setores.forEach(setor => {
    const opt = document.createElement('option');
    opt.value = setor;
    opt.textContent = setor;
    selectSetoresChave.appendChild(opt);
  });
}

// Preencher select de pessoas no cadastro para mostrar (se precisar)
function preencherSelectPessoas() {
  // Se quiser, implementar para outras ações
}

// --- Eventos cadastro ---

// Cadastrar setor
formSetor?.addEventListener('submit', e => {
  e.preventDefault();
  const nomeSetor = inputNovoSetor.value.trim();
  if (!nomeSetor) {
    alert('Digite o nome do setor.');
    return;
  }
  if (setores.includes(nomeSetor)) {
    alert('Setor já cadastrado.');
    return;
  }
  setores.push(nomeSetor);
  salvarDados();
  preencherSelectSetores();
  inputNovoSetor.value = '';
});

// Cadastrar cargo com autorização de setores
formCargo?.addEventListener('submit', e => {
  e.preventDefault();
  const nomeCargo = inputNovoCargo.value.trim();
  const setorSelecionado = selectSetorCargo.value;

  if (!nomeCargo) {
    alert('Digite o nome do cargo.');
    return;
  }
  if (!setorSelecionado) {
    alert('Selecione o setor autorizado para este cargo.');
    return;
  }

  if (cargos.some(c => c.nome === nomeCargo)) {
    alert('Cargo já cadastrado.');
    return;
  }

  cargos.push({ nome: nomeCargo, setoresAutorizados: [setorSelecionado] });
  salvarDados();
  preencherSelectCargos();
  inputNovoCargo.value = '';
  selectSetorCargo.value = '';
});

// Cadastrar pessoa com cargo
formPessoa?.addEventListener('submit', e => {
  e.preventDefault();
  const nomePessoa = inputNovaPessoa.value.trim();
  const cargoPessoa = selectCargoPessoa.value;

  if (!nomePessoa) {
    alert('Digite o nome da pessoa.');
    return;
  }
  if (!cargoPessoa) {
    alert('Selecione o cargo da pessoa.');
    return;
  }

  if (pessoas.some(p => p.nome === nomePessoa)) {
    alert('Pessoa já cadastrada.');
    return;
  }

  pessoas.push({ nome: nomePessoa, cargo: cargoPessoa });
  salvarDados();
  inputNovaPessoa.value = '';
  selectCargoPessoa.value = '';
});

// Cadastrar chave com setores autorizados (múltiplos)
formChave?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const numeroChave = inputNovaChave.value.trim();
  const setoresSelecionados = Array.from(selectSetoresChave?.selectedOptions || []).map(opt => opt.value);

  if (!numeroChave) {
    alert('Digite a identificação da chave.');
    return;
  }
  if (selectSetoresChave && setoresSelecionados.length === 0) {
    alert('Selecione ao menos um setor autorizado para esta chave.');
    return;
  }
  if (chaves.some(c => c.numero === numeroChave)) {
    alert('Chave já cadastrada.');
    return;
  }

  try {
    const novo = await cadastrarChave({
      numero: numeroChave,
      local: '-',
      setoresAutorizados: setoresSelecionados
    });
    chaves.push(novo);
  } catch (erro) {
    alert(erro.message || 'Erro ao cadastrar crachá.');
    return;
  }

  inputNovaChave.value = '';
});

// --- Validação na hora da retirada ---

formRegistro?.addEventListener('submit', async (e) => {
  e.preventDefault();

  await carregarChaves();

  const pessoaNome = inputNomeRetirada?.value.trim() || '';
  const chaveNumero = selectChave.value;
  const tipoCracha = obterTipoSelecionado() || obterTipoPorNumero(chaveNumero);

  if (!pessoaNome || !chaveNumero) {
    alert('Selecione o crachá e informe o nome de quem retira.');
    return;
  }

  if (!tipoCracha) {
    alert('Selecione um crachá válido.');
    return;
  }

  const chaveObj = chaves.find(c => c.numero === chaveNumero);
  if (!chaveObj) {
    alert('Crachá inválido.');
    return;
  }

  if (!crachaPertenceAoTipo(chaveNumero, tipoCracha)) {
    alert('O crachá selecionado não corresponde ao tipo escolhido.');
    return;
  }

  if (registros.some(r => r.chave === chaveNumero && !r.devolvido)) {
    alert('Este crachá já está retirado.');
    return;
  }

  const confirmar = await mostrarModalConfirmacao({
    titulo: 'Confirmar retirada',
    mensagem: 'Confira os dados antes de registrar a retirada do crachá.',
    detalhes: {
      Tipo: labelTipo(tipoCracha),
      Crachá: chaveNumero,
      'Nome de quem retira': pessoaNome
    },
    textoConfirmar: 'Registrar retirada'
  });
  if (!confirmar) return;

  try {
    const novo = await criarRegistro({
      pessoa: pessoaNome,
      chave: chaveNumero,
      tipo: tipoCracha,
      retirada: new Date().toISOString(),
      devolvido: null
    });
    registros.push(novo);
  } catch (erro) {
    alert(erro.message || 'Erro ao registrar a retirada. Verifique se o servidor está rodando.');
    return;
  }

  preencherSelectChave();
  atualizarListaRetiradas();
  formRegistro.reset();
  preencherSelectChave();
});

// --- Inicialização ---

function initIndex() {
  configurarModalConfirmacao();

  document.querySelectorAll('input[name="tipo-cracha"]').forEach((radio) => {
    radio.addEventListener('change', () => {
      if (sincronizandoTipoPeloCracha) return;
      preencherSelectChave();
    });
  });

  selectChave?.addEventListener('change', () => {
    const numero = selectChave.value;
    if (!numero) return;

    const tipo = obterTipoPorNumero(numero);
    if (!tipo) return;

    const radio = document.querySelector(`input[name="tipo-cracha"][value="${tipo}"]`);
    if (!radio || radio.checked) return;

    sincronizandoTipoPeloCracha = true;
    radio.checked = true;
    preencherSelectChave();
    selectChave.value = numero;
    sincronizandoTipoPeloCracha = false;
  });

  preencherSelectChave();
  atualizarListaRetiradas();
}

function initCadastro() {
  preencherSelectSetores();
  preencherSelectCargos();
  preencherSelectSetoresChave();

}

function obterRegistrosFiltrados() {
  let registrosFiltrados = [...registros];
  const filtroNome = document.getElementById('filtro-nome');
  const filtroTipo = document.getElementById('filtro-tipo');
  const filtroChave = document.getElementById('filtro-chave');

  if (filtroNome && filtroNome.value.trim()) {
    const termo = normalizarTexto(filtroNome.value.trim());
    registrosFiltrados = registrosFiltrados.filter((r) =>
      normalizarTexto(r.pessoa).includes(termo)
    );
  }
  if (filtroTipo && filtroTipo.value) {
    registrosFiltrados = registrosFiltrados.filter(
      (r) => obterTipoRegistro(r) === filtroTipo.value
    );
  }
  if (filtroChave && filtroChave.value) {
    registrosFiltrados = registrosFiltrados.filter((r) => r.chave === filtroChave.value);
  }

  return registrosFiltrados;
}

function atualizarControlesPaginacao(totalItens) {
  totalPaginas = Math.max(1, Math.ceil(totalItens / registrosPorPagina));
  if (paginaAtual > totalPaginas) paginaAtual = totalPaginas;
  if (paginaAtual < 1) paginaAtual = 1;

  const container = document.querySelector('.paginacao-registros');
  const btnAnt = document.getElementById('pagina-anterior');
  const btnProx = document.getElementById('pagina-proxima');
  const info = document.getElementById('info-pagina');
  const seletor = document.getElementById('seletor-pagina');

  if (container) container.hidden = totalItens === 0;

  if (btnAnt) btnAnt.disabled = paginaAtual <= 1;
  if (btnProx) btnProx.disabled = paginaAtual >= totalPaginas;

  if (info) {
    if (totalItens === 0) {
      info.textContent = '';
    } else {
      const inicio = (paginaAtual - 1) * registrosPorPagina + 1;
      const fim = Math.min(paginaAtual * registrosPorPagina, totalItens);
      info.textContent = `${inicio}–${fim} de ${totalItens}`;
    }
  }

  if (seletor) {
    seletor.innerHTML = '';
    for (let i = 1; i <= totalPaginas; i++) {
      const opt = document.createElement('option');
      opt.value = String(i);
      opt.textContent = `Página ${i} de ${totalPaginas}`;
      seletor.appendChild(opt);
    }
    seletor.value = String(paginaAtual);
    seletor.disabled = totalPaginas <= 1;
  }
}

function irParaPaginaRegistros(novaPagina) {
  paginaAtual = novaPagina;
  preencherTabelaRegistros(false);
}

function preencherTabelaRegistros(resetarPagina = false) {
  const tabela = document.getElementById('tabela-registros')?.querySelector('tbody');

  if (!tabela) return;

  if (resetarPagina) paginaAtual = 1;

  tabela.innerHTML = '';

  const registrosFiltrados = obterRegistrosFiltrados();
  atualizarControlesPaginacao(registrosFiltrados.length);

  if (registrosFiltrados.length === 0) {
    const row = document.createElement('tr');
    const td = document.createElement('td');
    td.colSpan = 5;
    td.textContent = 'Nenhum registro encontrado.';
    row.appendChild(td);
    tabela.appendChild(row);
    return;
  }

  const inicio = (paginaAtual - 1) * registrosPorPagina;
  const registrosPagina = registrosFiltrados.slice(inicio, inicio + registrosPorPagina);

  registrosPagina.forEach(registro => {
    const tr = document.createElement('tr');

    const tdPessoa = document.createElement('td');
    tdPessoa.textContent = registro.pessoa;
    tr.appendChild(tdPessoa);

    const tdTipo = document.createElement('td');
    tdTipo.appendChild(criarBadgeTipo(obterTipoRegistro(registro)));
    tr.appendChild(tdTipo);

    const tdChave = document.createElement('td');
    tdChave.textContent = registro.chave;
    tr.appendChild(tdChave);

    const tdRetirada = document.createElement('td');
    tdRetirada.textContent = new Date(registro.retirada).toLocaleString();
    tr.appendChild(tdRetirada);

    const tdDevolucao = document.createElement('td');
    tdDevolucao.textContent = registro.devolvido
      ? new Date(registro.devolvido).toLocaleString()
      : '—';
    tr.appendChild(tdDevolucao);

    tabela.appendChild(tr);
  });
}
function initRegistros() {
  const filtroNome = document.getElementById('filtro-nome');
  const filtroTipo = document.getElementById('filtro-tipo');
  const filtroChave = document.getElementById('filtro-chave');

  chaves.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c.numero;
    opt.textContent = c.numero;
    filtroChave?.appendChild(opt);
  });

  filtroNome?.addEventListener('input', () => preencherTabelaRegistros(true));
  filtroTipo?.addEventListener('change', () => preencherTabelaRegistros(true));
  filtroChave?.addEventListener('change', () => preencherTabelaRegistros(true));

  document.getElementById('pagina-anterior')?.addEventListener('click', () => {
    if (paginaAtual > 1) irParaPaginaRegistros(paginaAtual - 1);
  });

  document.getElementById('pagina-proxima')?.addEventListener('click', () => {
    if (paginaAtual < totalPaginas) irParaPaginaRegistros(paginaAtual + 1);
  });

  document.getElementById('seletor-pagina')?.addEventListener('change', (e) => {
    const pagina = parseInt(e.target.value, 10);
    if (pagina >= 1 && pagina <= totalPaginas) irParaPaginaRegistros(pagina);
  });

  preencherTabelaRegistros();
}

function exportarXLSX() {
  if (typeof XLSX === 'undefined') {
    alert('Biblioteca de exportação não carregada.');
    return;
  }

  const registrosFiltrados = obterRegistrosFiltrados();
  if (registrosFiltrados.length === 0) {
    alert('Não há registros para exportar.');
    return;
  }

  const linhas = registrosFiltrados.map((registro) => ({
    Pessoa: registro.pessoa,
    Tipo: labelTipo(obterTipoRegistro(registro)),
    Crachá: registro.chave,
    'Data/Hora Retirada': new Date(registro.retirada).toLocaleString(),
    'Data/Hora Devolução': registro.devolvido
      ? new Date(registro.devolvido).toLocaleString()
      : '—'
  }));

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(linhas);
  XLSX.utils.book_append_sheet(wb, ws, 'Registros');
  XLSX.writeFile(wb, 'registros_chaves.xlsx');
}


window.onload = async () => {
  const precisaRegistros = formRegistro || document.getElementById('tabela-registros');
  const precisaChaves = formRegistro || formChave || document.getElementById('tabela-registros');

  if (precisaChaves) await carregarChaves();
  if (precisaRegistros) await carregarRegistros();

  if (formRegistro) {
    initIndex();
  } else if (formSetor || formCargo || formPessoa || formChave) {
    initCadastro();
  } else if (document.getElementById('tabela-registros')) {
    initRegistros();
  }
};