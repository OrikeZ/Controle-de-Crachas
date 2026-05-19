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

const registrosPorPagina = 20;
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

// Preencher select de crachás cadastrados (disponíveis para retirada)
function preencherSelectChave() {
  if (!selectChave) return;

  const tipoSelecionado = obterTipoSelecionado();

  if (!tipoSelecionado) {
    selectChave.innerHTML = '<option value="">Selecione o tipo de crachá primeiro</option>';
    selectChave.disabled = true;
    return;
  }

  selectChave.disabled = false;
  selectChave.innerHTML = '<option value="">Selecione o crachá</option>';

  const chavesDisponiveis = chaves.filter((chaveObj) =>
    crachaPertenceAoTipo(chaveObj.numero, tipoSelecionado) &&
    !registros.some((r) => r.chave === chaveObj.numero && !r.devolvido)
  );

  if (chavesDisponiveis.length === 0) {
    const option = document.createElement('option');
    option.value = '';
    option.textContent = chaves.some((c) => crachaPertenceAoTipo(c.numero, tipoSelecionado))
      ? 'Nenhum crachá disponível deste tipo'
      : 'Nenhum crachá cadastrado deste tipo';
    option.disabled = true;
    selectChave.appendChild(option);
    return;
  }

  chavesDisponiveis.forEach((c) => {
    const option = document.createElement('option');
    option.value = c.numero;
    const local = c.local && c.local !== '-' ? ` (${c.local})` : '';
    option.textContent = `${c.numero}${local}`;
    selectChave.appendChild(option);
  });
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
  const tipoCracha = obterTipoSelecionado();

  if (!tipoCracha) {
    alert('Selecione o tipo de crachá.');
    return;
  }

  if (!pessoaNome || !chaveNumero) {
    alert('Selecione o crachá e informe o nome de quem retira.');
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
  document.querySelectorAll('input[name="tipo-cracha"]').forEach((radio) => {
    radio.addEventListener('change', () => {
      preencherSelectChave();
      if (selectChave) selectChave.value = '';
    });
  });

  preencherSelectChave();
  atualizarListaRetiradas();
}

function initCadastro() {
  preencherSelectSetores();
  preencherSelectCargos();
  preencherSelectSetoresChave();

}

function preencherTabelaRegistros() {
  const tabela = document.getElementById('tabela-registros').querySelector('tbody');
  const filtroNome = document.getElementById('filtro-nome');
  const filtroTipo = document.getElementById('filtro-tipo');
  const filtroChave = document.getElementById('filtro-chave');

  if (!tabela) return;

  tabela.innerHTML = ''; // Limpa a tabela

  let registrosFiltrados = [...registros];

  // Aplica filtros
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
    registrosFiltrados = registrosFiltrados.filter(r => r.chave === filtroChave.value);
  }

  if (registrosFiltrados.length === 0) {
    const row = document.createElement('tr');
    const td = document.createElement('td');
    td.colSpan = 5;
    td.textContent = 'Nenhum registro encontrado.';
    row.appendChild(td);
    tabela.appendChild(row);
    return;
  }

  registrosFiltrados.forEach(registro => {
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

  filtroNome?.addEventListener('input', preencherTabelaRegistros);
  filtroTipo?.addEventListener('change', preencherTabelaRegistros);
  filtroChave?.addEventListener('change', preencherTabelaRegistros);

  preencherTabelaRegistros();
}

function exportarXLSX() {
  const tabela = document.getElementById('tabela-registros');
  if (!tabela) {
    alert('Tabela não encontrada.');
    return;
  }

  // Cria uma planilha a partir da tabela HTML
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.table_to_sheet(tabela);
  XLSX.utils.book_append_sheet(wb, ws, 'Registros');

  // Salva o arquivo
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