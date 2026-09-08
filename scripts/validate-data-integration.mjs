import fs from 'node:fs';
import path from 'node:path';

const pagesDir = path.resolve('apps/web/src/pages');
const files = fs.readdirSync(pagesDir).filter((file) => file.endsWith('.jsx'));

const excluded = new Set(['Login.jsx', 'ModulePlaceholder.jsx']);
const rows = [];

for (const file of files) {
  const source = fs.readFileSync(path.join(pagesDir, file), 'utf8');
  const connected = /apiRequest\s*\(|api\.(get|post|put|patch|delete)\s*\(/.test(source);
  rows.push({file, connected, excluded: excluded.has(file)});
}

const functional = rows.filter((row) => !row.excluded);
const disconnected = functional.filter((row) => !row.connected);

console.log(`Pantallas funcionales revisadas: ${functional.length}`);
console.log(`Conectadas a API: ${functional.length - disconnected.length}`);
console.log(`Sin consumo de API: ${disconnected.length}`);

if (disconnected.length) {
  disconnected.forEach((row) => console.log(`- ${row.file}`));
  process.exitCode = 1;
} else {
  console.log('OK: todas las pantallas funcionales consumen la API.');
}
