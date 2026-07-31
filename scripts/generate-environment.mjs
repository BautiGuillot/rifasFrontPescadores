import { writeFile } from 'node:fs/promises';

const localBuild = process.argv.includes('--local');
const rawApiUrl = localBuild ? '/api' : process.env.API_URL?.trim();

if (!rawApiUrl) {
  throw new Error(
    'Falta API_URL. En Render configúrala, por ejemplo: https://tu-backend.onrender.com/api',
  );
}

const apiUrl = rawApiUrl.replace(/\/+$/, '');
let parsedUrl = null;

if (!localBuild) {
  try {
    parsedUrl = new URL(apiUrl);
  } catch {
    throw new Error('API_URL debe ser una URL absoluta válida');
  }

  if (
    parsedUrl.protocol !== 'https:' ||
    parsedUrl.username ||
    parsedUrl.password ||
    parsedUrl.search ||
    parsedUrl.hash
  ) {
    throw new Error('API_URL debe ser una URL HTTPS sin credenciales, query ni fragmento');
  }

  if (!parsedUrl.pathname.endsWith('/api')) {
    throw new Error('API_URL debe terminar en /api');
  }
}

const environmentSource = `// Generado durante el build. No editar ni versionar.
export const environment = {
  production: true,
  apiUrl: ${JSON.stringify(apiUrl)},
};
`;

await writeFile(
  new URL('../src/environments/environment.render.ts', import.meta.url),
  environmentSource,
  'utf8',
);

console.log(
  localBuild
    ? 'Entorno productivo local generado con /api'
    : `Entorno productivo generado para ${parsedUrl.origin}`,
);
