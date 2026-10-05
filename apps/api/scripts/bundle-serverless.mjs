import esbuild from 'esbuild';

await esbuild.build({
  entryPoints: ['apps/api/src/serverless.ts'],
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'esm',
  banner: {
    js: "import { createRequire } from 'module'; const require = createRequire(import.meta.url);",
  },
  outfile: 'api/index.js',
  external: ['@prisma/client'],
});

console.log('✔ Bundled serverless API into api/index.js');
