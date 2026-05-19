# Chaves
ClaviculárioVirtual — controle de crachás.

## Arquitetura (Vercel + servidor local)

| Onde roda | O quê |
|-----------|--------|
| **Vercel** | Site estático (HTML, CSS, JS) |
| **Seu PC / servidor** | API Node (`npm start`) + arquivos em `database/` |

A Vercel **não guarda** o banco em arquivo JSON de forma persistente. Os dados ficam no seu servidor, nos arquivos:

- `database/chaves.json` — crachás cadastrados
- `database/registros.json` — retiradas e devoluções

O site na Vercel chama a API do seu servidor pela internet (túnel ou IP público).

### Posso usar o banco no meu PC com o site na Vercel?

**Sim**, desde que:

1. O servidor Node esteja ligado (`npm start`).
2. A API seja acessível pela internet (não basta `localhost` — o navegador de quem acessa a Vercel não alcança seu PC).
3. Use um túnel, por exemplo:
   - [ngrok](https://ngrok.com): `ngrok http 3000`
   - [Cloudflare Tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/)
4. Configure a URL pública na Vercel (variável `API_URL`).
5. Configure CORS no servidor (variável `ALLOWED_ORIGINS` com a URL do seu site na Vercel).

**Limitações:** o PC precisa estar ligado; se a internet cair, o sistema para de salvar dados.

---

## Uso local (desenvolvimento)

1. Copie `.env.example` para `.env` e defina usuário/senha (o `.env` não vai para o Git).
2. Inicie o servidor (escolha uma opção):

**Opção A — duplo clique (Windows):** abra `iniciar.bat`

**Opção B — terminal:**

```bash
node server.js
```

ou, se tiver npm instalado:

```bash
npm start
```

Não é necessário `npm install` — o servidor usa apenas Node.js.

3. Acesse **http://localhost:3000** (front e API na mesma origem; `config.js` com `API_BASE_URL` vazio).
4. Faça login em **login.html** antes de cadastrar crachás ou registrar retiradas/devoluções.

### `npm start` não funciona?

| Problema | Solução |
|----------|---------|
| `Cannot find module 'express'` | Use `node server.js` ou `iniciar.bat` (versão atual não usa Express) |
| `'npm' não é reconhecido` | Instale [Node.js](https://nodejs.org) ou use `node server.js` direto |
| Porta 3000 em uso | O servidor tenta 3001, 3002… automaticamente. Ou execute `parar-servidor.bat` e inicie de novo |

### Autenticação e banco local

| Item | Descrição |
|------|-----------|
| **Banco** | Arquivos JSON em `database/` na máquina onde roda `npm start` |
| **Leitura** | Qualquer um pode consultar crachás e histórico (GET) |
| **Alteração** | Cadastro, retirada e devolução exigem login (POST/PATCH com token) |
| **Credenciais** | `AUTH_USER` e `AUTH_PASSWORD` no arquivo `.env` |

Para gerar hash da senha (opcional, mais seguro que texto puro no `.env`):

```bash
node scripts/gerar-hash-senha.js "SuaSenha"
```

Coloque o resultado em `AUTH_PASSWORD_HASH` no `.env` e remova `AUTH_PASSWORD`.

---

## Deploy na Vercel

1. Conecte o repositório na Vercel.
2. Em **Settings → Environment Variables**, crie:

| Variável | Exemplo | Descrição |
|----------|---------|-----------|
| `API_URL` | `https://abc123.ngrok-free.app` | URL pública do seu servidor (sem barra no final) |
| `ALLOWED_ORIGINS` | `https://seu-projeto.vercel.app` | No **servidor local**, mesma URL para CORS |

3. Faça o deploy. O build gera `config.js` com `API_URL`.

4. No PC, com o túnel apontando para a porta 3000:

```bash
set ALLOWED_ORIGINS=https://seu-projeto.vercel.app
npm start
```

(No PowerShell: `$env:ALLOWED_ORIGINS="https://seu-projeto.vercel.app"`)

---

## Migração automática

Na primeira conexão com a API, crachás e registros antigos do `localStorage` são copiados para os arquivos JSON e removidos do navegador.
