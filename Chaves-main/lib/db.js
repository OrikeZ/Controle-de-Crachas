const fs = require('fs').promises;
const path = require('path');

function criarRepositorio(nomeArquivo) {
  const caminho = path.join(__dirname, '..', 'database', nomeArquivo);

  async function ler() {
    try {
      const conteudo = await fs.readFile(caminho, 'utf8');
      return JSON.parse(conteudo);
    } catch (erro) {
      if (erro.code === 'ENOENT') return [];
      throw erro;
    }
  }

  async function gravar(dados) {
    await fs.mkdir(path.dirname(caminho), { recursive: true });
    await fs.writeFile(caminho, JSON.stringify(dados, null, 2), 'utf8');
  }

  return { ler, gravar, caminho };
}

function proximoId(lista) {
  if (lista.length === 0) return 1;
  return Math.max(...lista.map((item) => item.id || 0)) + 1;
}

module.exports = { criarRepositorio, proximoId };
