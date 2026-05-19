const storageKeys = {
  setores: 'controle-chaves-setores',
  cargos: 'controle-chaves-cargos',
  pessoas: 'controle-chaves-pessoas',
  chaves: 'controle-chaves-chaves'
};

let setores = JSON.parse(localStorage.getItem(storageKeys.setores)) || [];
let cargos = JSON.parse(localStorage.getItem(storageKeys.cargos)) || [];
let pessoas = JSON.parse(localStorage.getItem(storageKeys.pessoas)) || [];
let chaves = JSON.parse(localStorage.getItem(storageKeys.chaves)) || [];

// Elementos
const formSetor = document.getElementById('form-setor');
const inputNovoSetor = document.getElementById('novo-setor');

const formCargo = document.getElementById('form-cargo');
const inputNovoCargo = document.getElementById('novo-cargo');
const checkboxSetoresCargo = document.getElementById('checkbox-setores');

const formPessoa = document.getElementById('form-pessoa');
const inputNomePessoa = document.getElementById('novo-nome-pessoa');
const selectCargoPessoa = document.getElementById('select-cargo-pessoa');

const formChave = document.getElementById('form-chave');
const inputNumeroChave = document.getElementById('numero-chave');
const inputLocalChave = document.getElementById('local-chave');
const checkboxSetoresChave = document.getElementById('checkbox-setores-chave');

function salvarDados() {
  localStorage.setItem(storageKeys.setores, JSON.stringify(setores));
  localStorage.setItem(storageKeys.cargos, JSON.stringify(cargos));
  localStorage.setItem(storageKeys.pessoas, JSON.stringify(pessoas));
  localStorage.setItem(storageKeys.chaves, JSON.stringify(chaves));
}

// Atualiza checkboxes dos setores em cargos e chaves
function atualizarCheckboxesSetores() {
  if (checkboxSetoresCargo) {
    checkboxSetoresCargo.innerHTML = '';
    setores.forEach(setor => {
      const id = `cargo-setor-${setor}`;
      const div = document.createElement('div');
      div.className = 'flex items-center gap-1';

      const input = document.createElement('input');
      input.type = 'checkbox';
      input.id = id;
      input.value = setor;

      const label = document.createElement('label');
      label.htmlFor = id;
      label.textContent = setor;

      div.appendChild(input);
      div.appendChild(label);

      checkboxSetoresCargo.appendChild(div);
    });
  }

  if (checkboxSetoresChave) {
    checkboxSetoresChave.innerHTML = '';
    setores.forEach(setor => {
      const id = `chave-setor-${setor}`;
      const div = document.createElement('div');
      div.className = 'flex items-center gap-1';

      const input = document.createElement('input');
      input.type = 'checkbox';
      input.id = id;
      input.value = setor;

      const label = document.createElement('label');
      label.htmlFor = id;
      label.textContent = setor;

      div.appendChild(input);
      div.appendChild(label);

      checkboxSetoresChave.appendChild(div);
    });
  }
}

// Atualiza select cargos na pessoa
function atualizarSelectCargo() {
  selectCargoPessoa.innerHTML = '<option value=\"\">Selecione o cargo</option>';
  cargos.forEach(cargo => {
    const opt = document.createElement('option');
    opt.value = cargo.nome;
    opt.textContent = cargo.nome;
    selectCargoPessoa.appendChild(opt);
  });
}

// Cadastro Setor
formSetor.addEventListener('submit', e => {
  e.preventDefault();
  const novoSetor = inputNovoSetor.value.trim();
  if (!novoSetor) {
    alert('Digite o nome do setor.');
    return;
  }
  if (setores.includes(novoSetor)) {
    alert('Setor já cadastrado.');
    return;
  }
  setores.push(novoSetor);
  salvarDados();
  atualizarCheckboxesSetores();
  inputNovoSetor.value = '';
  window.location.reload(); // Recarrega a página para atualizar os selects
  alert('Setor cadastrado com sucesso!');
});

// Cadastro Cargo
formCargo.addEventListener('submit', e => {
  e.preventDefault();
  const novoCargo = inputNovoCargo.value.trim();
  if (!novoCargo) {
    alert('Digite o nome do cargo.');
    return;
  }
  if (cargos.some(c => c.nome === novoCargo)) {
    alert('Cargo já cadastrado.');
    return;
  }
  // Pega setores selecionados
  const setoresSelecionados = Array.from(checkboxSetoresCargo.querySelectorAll('input[type=checkbox]:checked'))
    .map(chk => chk.value);

  if (setoresSelecionados.length === 0) {
    alert('Selecione pelo menos um setor para o cargo.');
    return;
  }

  cargos.push({ nome: novoCargo, setoresAutorizados: setoresSelecionados });
  salvarDados();
  atualizarSelectCargo();
  inputNovoCargo.value = '';
  // desmarca checkboxes
  checkboxSetoresCargo.querySelectorAll('input[type=checkbox]').forEach(chk => chk.checked = false);
  window.location.reload(); // Recarrega a página para atualizar os selects
  alert('Cargo cadastrado com sucesso!');
});

// Cadastro Pessoa
formPessoa.addEventListener('submit', e => {
  e.preventDefault();
  const nomePessoa = inputNomePessoa.value.trim();
  const cargoSelecionado = selectCargoPessoa.value;

  if (!nomePessoa) {
    alert('Digite o nome da pessoa.');
    return;
  }
  if (!cargoSelecionado) {
    alert('Selecione um cargo para a pessoa.');
    return;
  }
  if (pessoas.some(p => p.nome === nomePessoa)) {
    alert('Pessoa já cadastrada.');
    return;
  }

  pessoas.push({ nome: nomePessoa, cargo: cargoSelecionado });
  salvarDados();
  inputNomePessoa.value = '';
  selectCargoPessoa.value = '';
  window.location.reload(); // Recarrega a página para atualizar os selects
  alert('Pessoa cadastrada com sucesso!');
});

// Cadastro Chave
formChave.addEventListener('submit', e => {
  e.preventDefault();
  const numero = inputNumeroChave.value.trim();
  const local = inputLocalChave.value.trim();
const setoresAutorizados = Array.from(checkboxSetoresChave.querySelectorAll('input[type=checkbox]:checked')).map(chk => chk.value);


if (setoresAutorizados.length === 0) {
  alert('Selecione pelo menos um setor autorizado para a chave.');
  return;
}

  if (!numero) {
    alert('Digite o número da chave.');
    return;
  }
  if (!local) {
    alert('Digite o local da chave.');
    return;
  }
  if (setoresAutorizados.length === 0) {
    alert('Selecione pelo menos um setor autorizado para a chave.');
    return;
  }
  if (chaves.some(c => c.numero === numero)) {
    alert('Chave já cadastrada.');
    return;
  }

  chaves.push({ numero, local, setoresAutorizados });
  salvarDados();
  inputNumeroChave.value = '';
  inputLocalChave.value = '';
  checkboxSetoresChave.querySelectorAll('input[type=checkbox]').forEach(chk => chk.checked = false);
  window.location.reload(); // Recarrega a página para atualizar os selects
  alert('Chave cadastrada com sucesso!');
});

// Inicialização
function init() {
  atualizarCheckboxesSetores();
  atualizarSelectCargo();
  atualizarSelectCargoEditar();
  atualizarSelectPessoaEditar();
atualizarSelectChaveEditar();
}

const selectCargoEditar = document.getElementById('select-cargo-editar');
const checkboxEditarSetores = document.getElementById('editar-checkbox-setores');

function atualizarSelectCargoEditar() {
  selectCargoEditar.innerHTML = '<option value="">Selecione um cargo</option>';
  cargos.forEach(cargo => {
    const opt = document.createElement('option');
    opt.value = cargo.nome;
    opt.textContent = cargo.nome;
    selectCargoEditar.appendChild(opt);
  });
}

selectCargoEditar.addEventListener('change', () => {
  const cargoSelecionado = cargos.find(c => c.nome === selectCargoEditar.value);
  checkboxEditarSetores.innerHTML = '';
  setores.forEach(setor => {
    const id = `editar-cargo-setor-${setor}`;
    const div = document.createElement('div');

    const input = document.createElement('input');
    input.type = 'checkbox';
    input.id = id;
    input.value = setor;
    input.checked = cargoSelecionado?.setoresAutorizados.includes(setor);

    const label = document.createElement('label');
    label.htmlFor = id;
    label.textContent = setor;

    div.appendChild(input);
    div.appendChild(label);
    checkboxEditarSetores.appendChild(div);
  });
});

document.getElementById('form-editar-cargo').addEventListener('submit', e => {
  e.preventDefault();
  const nome = selectCargoEditar.value;
  if (!nome) return;

  const selecionados = Array.from(checkboxEditarSetores.querySelectorAll('input:checked')).map(chk => chk.value);

  const cargo = cargos.find(c => c.nome === nome);
  if (cargo) {
    cargo.setoresAutorizados = selecionados;
    salvarDados();
    alert('Cargo atualizado!');
    window.location.reload(); // Recarrega a página para atualizar os selects
  }
});

function atualizarSelectPessoaEditar() {
  const select = document.getElementById('select-pessoa-editar');
  select.innerHTML = '<option value="">Selecione uma pessoa</option>';
  pessoas.forEach(p => {
    const opt = document.createElement('option');
    opt.value = p.nome;
    opt.textContent = p.nome;
    select.appendChild(opt);
  });

  // Também atualizar cargos no select de edição
  const selectCargoEditarPessoa = document.getElementById('editar-cargo-pessoa');
  selectCargoEditarPessoa.innerHTML = '<option value="">Selecione o cargo</option>';
  cargos.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c.nome;
    opt.textContent = c.nome;
    selectCargoEditarPessoa.appendChild(opt);
  });
}

document.getElementById('select-pessoa-editar').addEventListener('change', () => {
  const nome = document.getElementById('select-pessoa-editar').value;
  const pessoa = pessoas.find(p => p.nome === nome);
  if (pessoa) {
    document.getElementById('editar-nome-pessoa').value = pessoa.nome;
    document.getElementById('editar-cargo-pessoa').value = pessoa.cargo;
  }
});

document.getElementById('form-editar-pessoa').addEventListener('submit', e => {
  e.preventDefault();
  const nomeOriginal = document.getElementById('select-pessoa-editar').value;
  const novoNome = document.getElementById('editar-nome-pessoa').value.trim();
  const novoCargo = document.getElementById('editar-cargo-pessoa').value;

  const pessoa = pessoas.find(p => p.nome === nomeOriginal);
  if (pessoa) {
    pessoa.nome = novoNome;
    pessoa.cargo = novoCargo;
    salvarDados();
    alert('Pessoa atualizada!');
    atualizarSelectPessoaEditar();
    window.location.reload(); // Recarrega a página para atualizar os selects
  }
});

function atualizarSelectChaveEditar() {
  const select = document.getElementById('select-chave-editar');
  select.innerHTML = '<option value="">Selecione uma chave</option>';
  chaves.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c.numero;
    opt.textContent = `Chave ${c.numero}`;
    select.appendChild(opt);
  });
}

document.getElementById('select-chave-editar').addEventListener('change', () => {
  const numero = document.getElementById('select-chave-editar').value;
  const chave = chaves.find(c => c.numero === numero);
  document.getElementById('editar-local-chave').value = chave?.local || '';

  const container = document.getElementById('editar-checkbox-setores-chave');
  container.innerHTML = '';
  setores.forEach(setor => {
    const id = `editar-chave-${setor}`;
    const div = document.createElement('div');
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.id = id;
    input.value = setor;
    input.checked = chave?.setoresAutorizados.includes(setor);
    const label = document.createElement('label');
    label.htmlFor = id;
    label.textContent = setor;

    div.appendChild(input);
    div.appendChild(label);
    container.appendChild(div);
  });
});

document.getElementById('form-editar-chave').addEventListener('submit', e => {
  e.preventDefault();
  const numero = document.getElementById('select-chave-editar').value;
  const novoLocal = document.getElementById('editar-local-chave').value.trim();
  const setoresSelecionados = Array.from(document.querySelectorAll('#editar-checkbox-setores-chave input:checked')).map(chk => chk.value);

  const chave = chaves.find(c => c.numero === numero);
  if (chave) {
    chave.local = novoLocal;
    chave.setoresAutorizados = setoresSelecionados;
    salvarDados();
    alert('Chave atualizada!');
    atualizarSelectChaveEditar();
    window.location.reload(); // Recarrega a página para atualizar os selects
  }
});

window.addEventListener('load', () => {
  init();
});
