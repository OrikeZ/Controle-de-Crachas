const { hashSenha } = require('../lib/auth');

const senha = process.argv[2];
if (!senha) {
  console.error('Uso: node scripts/gerar-hash-senha.js "sua-senha"');
  process.exit(1);
}

console.log(hashSenha(senha));
