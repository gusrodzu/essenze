import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const navigationPath = path.join(
  root,
  'apps',
  'web',
  'src',
  'data',
  'navigation.js',
);
const appPath = path.join(root, 'apps', 'web', 'src', 'App.jsx');

const navigation = fs.readFileSync(navigationPath, 'utf8');
const app = fs.readFileSync(appPath, 'utf8');

const menuRoutes = [
  ...navigation.matchAll(/to:\s*['"]([^'"]+)['"]/g),
].map((match) => match[1]);

const rawAppRoutes = [
  ...app.matchAll(/<Route\s+path=['"]([^'"]+)['"]/g),
].map((match) => match[1]);

const exactRoutes = new Set(['/']);
const wildcardPrefixes = [];

for (const route of rawAppRoutes) {
  const normalized = `/${route}`.replace(/\/+$/, '');

  if (normalized.endsWith('/*')) {
    wildcardPrefixes.push(normalized.slice(0, -2));
  } else {
    exactRoutes.add(normalized);
  }
}

function isCovered(route) {
  if (exactRoutes.has(route)) return true;

  return wildcardPrefixes.some(
    (prefix) => route === prefix || route.startsWith(`${prefix}/`),
  );
}

const missingInApp = menuRoutes.filter((route) => !isCovered(route));

if (missingInApp.length) {
  console.error('Rutas del menú ausentes en App.jsx:');
  missingInApp.forEach((route) => console.error(`- ${route}`));
  process.exit(1);
}

console.log(
  `Navegación válida: ${menuRoutes.length} enlaces están cubiertos por rutas exactas o comodines.`,
);
