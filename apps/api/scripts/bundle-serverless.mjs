import esbuild from 'esbuild';
import { writeFileSync } from 'node:fs';

// The whole API is bundled into api/_server.mjs (underscore = not exposed as its own function).
await esbuild.build({
  entryPoints: ['apps/api/src/serverless.ts'],
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'esm',
  banner: {
    js: "import { createRequire } from 'module'; const require = createRequire(import.meta.url);",
  },
  outfile: 'api/_server.mjs',
  external: ['@prisma/client'],
});

// api/index.js is a thin entry that loads the bundle lazily. Static imports (@prisma/client, env validation…)
// would otherwise crash the function at load time with an opaque FUNCTION_INVOCATION_FAILED; here the real error is reported.
writeFileSync(
  'api/index.js',
  `export default async function handler(req, res) {
  if (req.url && req.url.startsWith('/api/ping')) {
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify({ ok: true, node: process.version }));
  }
  try {
    const mod = await import('./_server.mjs');
    return mod.default(req, res);
  } catch (err) {
    console.error('API failed to load:', err);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'API_LOAD_FAILED', message: String((err && err.message) || err).slice(0, 2000) }));
  }
}
`,
);

console.log('✔ Bundled serverless API into api/_server.mjs (+ api/index.js entry)');
