import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const src = path.join(root, 'apps', 'web', 'src');

const requiredFiles = [
  'main.jsx',
  'App.jsx',
  'providers/AppProviders.jsx',
  'framework/ThemeContext.jsx',
  'framework/AppErrorBoundary.jsx',
  'layout/AppShell.jsx',
  'layout/Topbar.jsx',
  'layout/Sidebar.jsx',
];

const missingFiles = requiredFiles.filter(
  (relativePath) => !fs.existsSync(path.join(src, relativePath)),
);

if (missingFiles.length) {
  console.error('Archivos Foundation ausentes:');
  missingFiles.forEach((item) => console.error(`- ${item}`));
  process.exit(1);
}

const main = fs.readFileSync(path.join(src, 'main.jsx'), 'utf8');
const providers = fs.readFileSync(
  path.join(src, 'providers', 'AppProviders.jsx'),
  'utf8',
);
const theme = fs.readFileSync(
  path.join(src, 'framework', 'ThemeContext.jsx'),
  'utf8',
);

const checks = [
  ['main importa AppProviders', /import AppProviders from ['"]\.\/providers\/AppProviders['"]/.test(main)],
  ['main usa AppProviders', /<AppProviders>/.test(main)],
  ['main usa AppErrorBoundary', /<AppErrorBoundary>/.test(main)],
  ['AppProviders importa ThemeProvider', /import \{ThemeProvider\}/.test(providers)],
  ['ThemeContext exporta ThemeProvider', /export function ThemeProvider/.test(theme)],
  ['ThemeContext exporta useTheme', /export function useTheme/.test(theme)],
];

const failures = checks.filter(([, passed]) => !passed);

if (failures.length) {
  console.error('Validación Foundation fallida:');
  failures.forEach(([label]) => console.error(`- ${label}`));
  process.exit(1);
}

console.log('Foundation válida: providers, tema y error boundary están conectados.');
