const fs = require('fs');
const path = require('path');

const url = (process.env.API_URL || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
const conteudo = `window.API_BASE_URL = '${url}';\n`;
const destino = path.join(__dirname, '..', 'config.js');

fs.writeFileSync(destino, conteudo, 'utf8');
console.log(`config.js gerado com API_BASE_URL = "${process.env.API_URL || ''}"`);
